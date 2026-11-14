import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { resolveAdbInstallPath } from "./dev-adb.mjs";
import { assertHumanRoom } from "./dev-autoplay-mode.mjs";
import { readDevelopmentRoomSessionIds, readDevelopmentDuoAccountProof } from "./dev-room-database.mjs";
import { parseDuoArguments, preflightDuoDevices, installDuoDevices, selectNewDuoRoom } from "./dev-android-duo-tools.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const baseUrl = "http://127.0.0.1:3000";
const googleClientId = "762107394725-hm57vr8pmccle3j8amhsrgp46hpd8i7k.apps.googleusercontent.com";
let child;
let interrupted = false;
const abort = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  interrupted = true;
  abort.abort();
  child?.kill("SIGTERM");
});

function run(command, args, { cwd = root, capture = false, timeoutMs = 180_000 } = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: timeoutMs,
    stdio: capture ? "pipe" : "inherit" });
  if (result.error || result.status !== 0) {
    if (capture) console.error((result.stderr || result.stdout || "ADB sans réponse.").trim());
    throw new Error(`Échec de ${command === process.env.ATOUTIA_ADB ? "ADB" : command}. Vérifier la sortie précédente.`, { cause: result.error });
  }
  return result.stdout || "";
}

async function getJson(path) {
  const response = await fetch(baseUrl + path, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5_000)]) });
  if (!response.ok) throw new Error(`Backend local : HTTP ${response.status}.`);
  return response.json();
}

async function main() {
  const selected = parseDuoArguments(process.argv.slice(2));
  if (process.env.ATOUTIA_API_BASE_URL && process.env.ATOUTIA_API_BASE_URL !== baseUrl) {
    throw new Error("Ce lanceur utilise seulement http://127.0.0.1:3000, comme l’APK debug.");
  }
  const adb = process.env.ATOUTIA_ADB;
  if (!adb) throw new Error("Définir ATOUTIA_ADB avec le chemin de l’exécutable ADB.");
  const runAdb = (args) => run(adb, args, { capture: true, timeoutMs: args.includes("install") ? 120_000 : 15_000 });
  if (!process.env.ATOUTIA_DATABASE_PATH) throw new Error("Définir ATOUTIA_DATABASE_PATH avec une base de test existante, utilisée par le backend.");
  const database = realpathSync(resolve(process.env.ATOUTIA_DATABASE_PATH));
  const actualDatabase = resolve(root, "apps/backend/data/atoutia.sqlite");
  if (database === actualDatabase || (existsSync(actualDatabase) && database === realpathSync(actualDatabase))) {
    throw new Error("Utiliser une base de test dédiée ; la base habituelle est refusée par ce lanceur.");
  }
  const health = await getJson("/health");
  if (health.status !== "ok" || health.service !== "@atoutia/backend") throw new Error("Le backend Atoutia local n’est pas prêt.");
  await readDevelopmentRoomSessionIds(database);
  preflightDuoDevices(runAdb, selected);
  console.log(`Hôte : ${selected.host} ; invité : ${selected.guest}. Deux comptes Google distincts seront nécessaires.`);
  console.log("Build unique, PLAYER_0 et PLAYER_1 manuels. Installation en conservant les données.");
  run("./gradlew", ["--no-daemon", "--max-workers=2", ":app:assembleDebug", "-PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false",
    `-PATOUTIA_GOOGLE_CLIENT_ID=${process.env.ATOUTIA_GOOGLE_CLIENT_ID || googleClientId}`], { cwd: resolve(root, "apps/android") });
  const config = readFileSync(resolve(root, "apps/android/app/build/generated/source/buildConfig/debug/tech/devoo/atoutia/BuildConfig.java"), "utf8");
  if (!/ATOUTIA_TEST_AUTOPLAY_PLAYER_0\s*=\s*false\s*;/.test(config)) throw new Error("Autoplay humain doit rester désactivé.");
  const apk = resolve(root, "apps/android/app/build/outputs/apk/debug/app-debug.apk");
  if (!existsSync(apk)) throw new Error("APK debug introuvable après le build.");
  preflightDuoDevices(runAdb, selected);
  installDuoDevices(runAdb, selected, resolveAdbInstallPath(adb, apk));
  if (interrupted) return;
  const existing = new Set(await readDevelopmentRoomSessionIds(database));
  console.log("\nATTENTE DU NOUVEAU SALON — dix minutes maximum.");
  console.log("Fermer tout ancien lanceur de PNJ et le relais de coupure avant cet essai.");
  console.log("Sur chaque Android : Jouer en ligne, compte Google différent, puis Jouer.");
  console.log("Hôte : Créer une partie, puis Copier. Transmettre l’invitation à l’invité de votre choix.");
  console.log("Invité : Coller une invitation, puis Rejoindre la partie. Ne pas créer un second salon.");
  console.log("Le presse-papiers de deux émulateurs n’est pas garanti partagé ; le code peut aussi être saisi dans le champ.");
  console.log("Attendre 4/4 avant de démarrer sur l’hôte. Garder ce terminal et le backend ouverts.");
  let sessionId = null;
  let announced = false;
  const deadline = Date.now() + 600_000;
  while (!interrupted && Date.now() < deadline) {
    sessionId = selectNewDuoRoom(await readDevelopmentRoomSessionIds(database), existing, sessionId);
    if (sessionId) {
      const room = await getJson(`/api/v1/rooms/${sessionId}`);
      if (!announced) { console.log("Nouveau salon détecté ; attente du second compte à la place Joueur 2."); announced = true; }
      if (room.mode !== "PRIVATE" || !["WAITING_FOR_PLAYERS", "READY"].includes(room.phase)) throw new Error("Créer un nouveau salon privé sans le démarrer avant 4/4.");
      if (room.occupiedSeats >= 2) {
        assertHumanRoom(room, "ANDROID_PLAYERS_0_1");
        if (await readDevelopmentDuoAccountProof(database, sessionId)) {
          console.log("Deux comptes distincts dans le même salon confirmés ; ajout des PNJ Joueurs 3 et 4.");
          child = spawn(process.execPath, [resolve(root, "apps/backend/scripts/dev-autoplay-room.mjs"), sessionId, "--android-players-0-1"], {
            cwd: root, stdio: "inherit", env: { ...process.env, ATOUTIA_API_BASE_URL: baseUrl },
          });
          const result = await new Promise((resolveChild, reject) => {
            child.once("error", reject);
            child.once("exit", (code, signal) => resolveChild({ code, signal }));
          });
          if (!interrupted && result.code !== 0) throw new Error("Les PNJ se sont arrêtés avant la fin. Consulter la sortie précédente.");
          return;
        }
      }
    }
    await delay(500, undefined, { signal: abort.signal });
  }
  if (!interrupted) throw new Error("Délai dépassé : relancer le test puis créer un seul nouveau salon et le rejoindre avec l’autre compte.");
}

main().catch((error) => {
  if (interrupted) return;
  console.error(error.message);
  process.exitCode = 1;
});
