#!/usr/bin/env node

import {
  spawn,
  spawnSync,
} from "node:child_process";

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";

import {
  dirname,
  resolve,
} from "node:path";

import {
  createInterface,
} from "node:readline/promises";

import {
  fileURLToPath,
} from "node:url";

import {
  DatabaseSync,
} from "node:sqlite";

const DEFAULT_BASE_URL =
  "http://127.0.0.1:3000";

const DEFAULT_GOOGLE_CLIENT_ID =
  "762107394725-hm57vr8pmccle3j8amhsrgp46hpd8i7k.apps.googleusercontent.com";

const DEFAULT_ADB_PATH =
  "/mnt/c/Users/drupy/AppData/Local/Android/Sdk/platform-tools/adb.exe";

const POLL_INTERVAL_MS =
  300;

const ROOM_WAIT_TIMEOUT_MS =
  10 * 60 * 1000;

const SESSION_ID_PATTERN =
  /^ms1_[0-9a-f]{32}$/;

const ANDROID_PACKAGE =
  "tech.devoo.atoutia";

const scriptDirectory =
  dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const repositoryRoot =
  resolve(
    scriptDirectory,
    "../../..",
  );

const androidDirectory =
  resolve(
    repositoryRoot,
    "apps/android",
  );

const databasePath =
  process.env
    .ATOUTIA_DATABASE_PATH
    ?.trim() ||
  resolve(
    repositoryRoot,
    "apps/backend/data/atoutia.sqlite",
  );

const baseUrl =
  process.env
    .ATOUTIA_API_BASE_URL
    ?.trim() ||
  DEFAULT_BASE_URL;

const googleClientId =
  process.env
    .ATOUTIA_GOOGLE_CLIENT_ID
    ?.trim() ||
  DEFAULT_GOOGLE_CLIENT_ID;

const adbPath =
  process.env
    .ATOUTIA_ADB
    ?.trim() ||
  DEFAULT_ADB_PATH;

const autoplayScriptPath =
  resolve(
    scriptDirectory,
    "dev-autoplay-room.mjs",
  );

const buildConfigPath =
  resolve(
    androidDirectory,
    "app/build/generated/source/buildConfig/debug/tech/devoo/atoutia/BuildConfig.java",
  );

const apkPath =
  resolve(
    androidDirectory,
    "app/build/outputs/apk/debug/app-debug.apk",
  );

const logDirectory =
  resolve(
    repositoryRoot,
    "logs",
  );

const logPath =
  resolve(
    logDirectory,
    "dev-android-room-latest.log",
  );

mkdirSync(
  logDirectory,
  {
    recursive:
      true,
  },
);

const logStream =
  createWriteStream(
    logPath,
    {
      flags:
        "w",
    },
  );

function log(
  message =
    "",
) {
  console.log(
    message,
  );

  logStream.write(
    `${message}\n`,
  );
}

function logError(
  message =
    "",
) {
  console.error(
    message,
  );

  logStream.write(
    `${message}\n`,
  );
}

function writeCommandOutput(
  output,
  destination,
) {
  if (
    typeof output !==
      "string" ||
    output.length ===
      0
  ) {
    return;
  }

  destination.write(
    output,
  );

  logStream.write(
    output,
  );
}

function runCommand(
  command,
  argumentsList,
  options = {},
) {
  const result =
    spawnSync(
      command,
      argumentsList,
      {
        cwd:
          options.cwd ??
          repositoryRoot,

        encoding:
          "utf8",

        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
      },
    );

  writeCommandOutput(
    result.stdout,
    process.stdout,
  );

  writeCommandOutput(
    result.stderr,
    process.stderr,
  );

  if (
    result.error !==
      undefined
  ) {
    throw result.error;
  }

  if (
    result.status !==
      0
  ) {
    throw new Error(
      [
        `Command failed with exit code ${String(result.status)}.`,
        `${command} ${argumentsList.join(" ")}`,
      ].join(
        "\n",
      ),
    );
  }

  return result;
}

function sleep(
  milliseconds,
) {
  return new Promise(
    (
      resolvePromise,
    ) => {
      setTimeout(
        resolvePromise,
        milliseconds,
      );
    },
  );
}

async function readJsonResponse(
  response,
) {
  const text =
    await response.text();

  if (
    text.length ===
      0
  ) {
    return null;
  }

  try {
    return JSON.parse(
      text,
    );
  } catch {
    return text;
  }
}

async function requestJson(
  url,
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          accept:
            "application/json",
        },
      },
    );

  const body =
    await readJsonResponse(
      response,
    );

  if (
    response.status !==
      200
  ) {
    throw new Error(
      [
        `GET ${url} failed.`,
        `HTTP ${response.status}`,
        `Response: ${JSON.stringify(body)}`,
      ].join(
        "\n",
      ),
    );
  }

  if (
    body ===
      null ||
    typeof body !==
      "object" ||
    Array.isArray(
      body,
    )
  ) {
    throw new Error(
      `Invalid JSON response from ${url}.`,
    );
  }

  return body;
}

async function checkBackend() {
  const health =
    await requestJson(
      `${baseUrl}/health`,
    );

  if (
    health.status !==
      "ok"
  ) {
    throw new Error(
      `Backend is not healthy: ${JSON.stringify(health)}`,
    );
  }
}

function assertDatabaseExists() {
  if (
    !existsSync(
      databasePath,
    )
  ) {
    throw new Error(
      [
        "Atoutia SQLite database not found.",
        `Expected: ${databasePath}`,
        "",
        "Start the local backend first.",
      ].join(
        "\n",
      ),
    );
  }
}

function listSessionIds() {
  assertDatabaseExists();

  const database =
    new DatabaseSync(
      databasePath,
    );

  try {
    const rows =
      database
        .prepare(`
          SELECT session_id
          FROM live_rooms
          ORDER BY rowid DESC
        `)
        .all();

    return rows
      .map(
        (
          row,
        ) =>
          row.session_id,
      )
      .filter(
        (
          sessionId,
        ) =>
          typeof sessionId ===
            "string" &&
          SESSION_ID_PATTERN.test(
            sessionId,
          ),
      );
  } finally {
    database.close();
  }
}

async function getRoom(
  sessionId,
) {
  return requestJson(
    `${baseUrl}/api/v1/rooms/${sessionId}`,
  );
}

function isFreshAndroidRoom(
  room,
) {
  return (
    room.phase ===
      "WAITING_FOR_PLAYERS" &&
    room.occupiedSeats ===
      1 &&
    room.seats !==
      null &&
    typeof room.seats ===
      "object" &&
    room.seats.PLAYER_0 ===
      true &&
    room.seats.PLAYER_1 ===
      false &&
    room.seats.PLAYER_2 ===
      false &&
    room.seats.PLAYER_3 ===
      false
  );
}

async function waitForNewAndroidRoom(
  existingSessionIds,
) {
  const deadline =
    Date.now() +
    ROOM_WAIT_TIMEOUT_MS;

  while (
    Date.now() <
      deadline
  ) {
    const sessionIds =
      listSessionIds();

    for (
      const sessionId
      of sessionIds
    ) {
      if (
        existingSessionIds.has(
          sessionId,
        )
      ) {
        continue;
      }

      try {
        const room =
          await getRoom(
            sessionId,
          );

        if (
          isFreshAndroidRoom(
            room,
          )
        ) {
          return Object.freeze({
            sessionId,
            room,
          });
        }
      } catch {
        // Retry while the room is being persisted.
      }
    }

    await sleep(
      POLL_INTERVAL_MS,
    );
  }

  throw new Error(
    "Timed out while waiting for a new Android room.",
  );
}

function displayRoom(
  title,
  room,
) {
  log(
    "",
  );

  log(
    `===== ${title} =====`,
  );

  log(
    `Salon      : ${room.sessionId}`,
  );

  log(
    `Phase      : ${room.phase}`,
  );

  log(
    `Joueurs    : ${room.occupiedSeats}/4`,
  );

  log(
    `Révision   : ${room.revision}`,
  );

  log(
    `PLAYER_0   : ${room.seats.PLAYER_0 ? "occupé" : "libre"}`,
  );

  log(
    `PLAYER_1   : ${room.seats.PLAYER_1 ? "occupé" : "libre"}`,
  );

  log(
    `PLAYER_2   : ${room.seats.PLAYER_2 ? "occupé" : "libre"}`,
  );

  log(
    `PLAYER_3   : ${room.seats.PLAYER_3 ? "occupé" : "libre"}`,
  );
}

async function askYesNo(
  readline,
  question,
  defaultValue,
) {
  const suffix =
    defaultValue
      ? " [O/n] : "
      : " [o/N] : ";

  const answer =
    (
      await readline.question(
        `${question}${suffix}`,
      )
    )
      .trim()
      .toLowerCase();

  if (
    answer ===
      ""
  ) {
    return defaultValue;
  }

  if (
    answer ===
      "o" ||
    answer ===
      "oui" ||
    answer ===
      "y" ||
    answer ===
      "yes"
  ) {
    return true;
  }

  if (
    answer ===
      "n" ||
    answer ===
      "non" ||
    answer ===
      "no"
  ) {
    return false;
  }

  throw new Error(
    "Réponse invalide. Utilise O ou N.",
  );
}

async function askConfiguration() {
  const readline =
    createInterface({
      input:
        process.stdin,

      output:
        process.stdout,
    });

  try {
    const player0Automatic =
      await askYesNo(
        readline,
        "PLAYER_0 doit-il jouer automatiquement ?",
        false,
      );

    const addBots =
      await askYesNo(
        readline,
        "Ajouter automatiquement les 3 PNJ (PLAYER_1 à PLAYER_3) ?",
        true,
      );

    return Object.freeze({
      player0Automatic,
      addBots,
    });
  } finally {
    readline.close();
  }
}

function assertAdbAvailable() {
  if (
    !existsSync(
      adbPath,
    )
  ) {
    throw new Error(
      `ADB not found: ${adbPath}`,
    );
  }

  const result =
    runCommand(
      adbPath,
      [
        "devices",
      ],
    );

  const devices =
    result.stdout
      .split(
        /\r?\n/,
      )
      .map(
        (
          line,
        ) =>
          line.trim(),
      )
      .filter(
        (
          line,
        ) =>
          /\tdevice$/.test(
            line,
          ),
      );

  if (
    devices.length !==
      1
  ) {
    throw new Error(
      `Expected exactly one Android device, found ${devices.length}.`,
    );
  }
}

function buildAndroid(
  player0Automatic,
) {
  log(
    "",
  );

  log(
    "===== BUILD ANDROID =====",
  );

  log(
    `PLAYER_0 automatique : ${player0Automatic ? "OUI" : "NON"}`,
  );

  runCommand(
    "./gradlew",
    [
      "--no-daemon",
      "--max-workers=2",
      ":app:assembleDebug",
      `-PATOUTIA_GOOGLE_CLIENT_ID=${googleClientId}`,
      `-PATOUTIA_TEST_AUTOPLAY_PLAYER_0=${player0Automatic ? "true" : "false"}`,
    ],
    {
      cwd:
        androidDirectory,
    },
  );

  if (
    !existsSync(
      buildConfigPath,
    )
  ) {
    throw new Error(
      `BuildConfig not found: ${buildConfigPath}`,
    );
  }

  const buildConfig =
    readFileSync(
      buildConfigPath,
      "utf8",
    );

  const expectedValue =
    player0Automatic
      ? "ATOUTIA_TEST_AUTOPLAY_PLAYER_0 = true;"
      : "ATOUTIA_TEST_AUTOPLAY_PLAYER_0 = false;";

  if (
    !buildConfig.includes(
      expectedValue,
    )
  ) {
    throw new Error(
      `Unexpected Android autoplay configuration. Expected: ${expectedValue}`,
    );
  }

  if (
    !existsSync(
      apkPath,
    )
  ) {
    throw new Error(
      `APK not found: ${apkPath}`,
    );
  }

  log(
    `Android autoplay PLAYER_0 : ${player0Automatic ? "ON" : "OFF"}`,
  );
}

function installAndroid() {
  log(
    "",
  );

  log(
    "===== INSTALLATION ANDROID =====",
  );

  assertAdbAvailable();

  runCommand(
    adbPath,
    [
      "reverse",
      "tcp:3000",
      "tcp:3000",
    ],
  );

  runCommand(
    adbPath,
    [
      "shell",
      "am",
      "force-stop",
      ANDROID_PACKAGE,
    ],
  );

  runCommand(
    adbPath,
    [
      "install",
      "-r",
      apkPath,
    ],
  );

  runCommand(
    adbPath,
    [
      "shell",
      "monkey",
      "-p",
      ANDROID_PACKAGE,
      "1",
    ],
  );

  log(
    "Application Android installée et lancée.",
  );
}

function runBots(
  sessionId,
) {
  return new Promise(
    (
      resolvePromise,
      rejectPromise,
    ) => {
      const child =
        spawn(
          process.execPath,
          [
            autoplayScriptPath,
            sessionId,
            "--android-player-0",
          ],
          {
            cwd:
              repositoryRoot,

            stdio: [
              "inherit",
              "pipe",
              "pipe",
            ],
          },
        );

      child.stdout.on(
        "data",
        (
          chunk,
        ) => {
          process.stdout.write(
            chunk,
          );

          logStream.write(
            chunk,
          );
        },
      );

      child.stderr.on(
        "data",
        (
          chunk,
        ) => {
          process.stderr.write(
            chunk,
          );

          logStream.write(
            chunk,
          );
        },
      );

      child.once(
        "error",
        rejectPromise,
      );

      child.once(
        "exit",
        (
          code,
          signal,
        ) => {
          if (
            code ===
              0
          ) {
            resolvePromise();

            return;
          }

          rejectPromise(
            new Error(
              [
                "Bot script failed.",
                `Exit code: ${String(code)}`,
                `Signal: ${String(signal)}`,
              ].join(
                "\n",
              ),
            ),
          );
        },
      );
    },
  );
}

async function main() {
  log(
    "========================================",
  );

  log(
    " ATOUTIA - TEST SALON ANDROID LOCAL",
  );

  log(
    "========================================",
  );

  log(
    "",
  );

  log(
    `Backend : ${baseUrl}`,
  );

  log(
    `Log     : ${logPath}`,
  );

  log(
    "",
  );

  log(
    "===== VERIFICATION BACKEND =====",
  );

  await checkBackend();

  log(
    "Backend : OK",
  );

  const configuration =
    await askConfiguration();

  log(
    "",
  );

  log(
    "===== CONFIGURATION =====",
  );

  log(
    `PLAYER_0 automatique : ${configuration.player0Automatic ? "OUI" : "NON"}`,
  );

  log(
    `PLAYER_1-3 PNJ       : ${configuration.addBots ? "OUI" : "NON"}`,
  );

  buildAndroid(
    configuration.player0Automatic,
  );

  installAndroid();

  const existingSessionIds =
    new Set(
      listSessionIds(),
    );

  log(
    "",
  );

  log(
    "===== ATTENTE DU NOUVEAU SALON =====",
  );

  log(
    "Sur Android : Jouer -> Créer une partie",
  );

  log(
    "Le script détectera automatiquement le nouvel ID.",
  );

  log(
    "Ne clique pas encore sur \"Démarrer la partie\".",
  );

  const detected =
    await waitForNewAndroidRoom(
      existingSessionIds,
    );

  displayRoom(
    "SALON DETECTE",
    detected.room,
  );

  if (
    !configuration.addBots
  ) {
    log(
      "",
    );

    log(
      "Aucun PNJ demandé.",
    );

    log(
      "Le script s'arrête après détection et vérification du salon.",
    );

    log(
      "",
    );

    log(
      `Log disponible : ${logPath}`,
    );

    return;
  }

  log(
    "",
  );

  log(
    "===== LANCEMENT DES 3 PNJ =====",
  );

  log(
    `Salon : ${detected.sessionId}`,
  );

  log(
    "",
  );

  log(
    "Quand le salon affiche 4/4 sur Android,",
  );

  log(
    "clique toi-même sur \"Démarrer la partie\".",
  );

  log(
    "",
  );

  await runBots(
    detected.sessionId,
  );

  const finalRoom =
    await getRoom(
      detected.sessionId,
    );

  displayRoom(
    "VERIFICATION FINALE DU SALON",
    finalRoom,
  );

  log(
    "",
  );

  log(
    "Test terminé.",
  );

  log(
    `Log disponible : ${logPath}`,
  );
}

main()
  .catch(
    (
      error,
    ) => {
      logError(
        "",
      );

      logError(
        "ATOUTIA dev Android room failed.",
      );

      logError(
        error instanceof Error
          ? error.message
          : String(
              error,
            ),
      );

      logError(
        "",
      );

      logError(
        "Le backend local doit être lancé avec ATOUTIA_AUTH_BOOTSTRAP_ENABLED=\"true\" pour utiliser les PNJ.",
      );

      process.exitCode =
        1;
    },
  )
  .finally(
    () => {
      logStream.end();
    },
  );