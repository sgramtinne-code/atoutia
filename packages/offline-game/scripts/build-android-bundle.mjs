import { build, version } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const output = resolve(root, "apps/android/app/src/main/assets/atoutia-offline-engine.js");
const result = await build({
  absWorkingDir: root, entryPoints: ["packages/offline-game/src/bridge.ts"],
  bundle: true, format: "iife", globalName: "AtoutiaOffline", platform: "browser",
  target: "es2020", write: false, metafile: true, legalComments: "none", charset: "utf8",
});
const code = "// Generated from the shared engine and offline adapter. Run pnpm --filter @atoutia/offline-game bundle.\n" + result.outputFiles[0].text;
const inputs = Object.keys(result.metafile.inputs).sort();
if (inputs.some((path) => !path.startsWith("packages/belote-engine/") && !path.startsWith("packages/offline-game/"))) throw new Error("Unexpected offline bundle dependency.");
const manifest = JSON.stringify({
  formatVersion: 1, esbuildVersion: version,
  bundleSha256: createHash("sha256").update(code).digest("hex"),
  inputSha256: createHash("sha256").update(inputs.map((path) => path + "\n" + readFileSync(resolve(root, path), "utf8").replaceAll("\r\n", "\n")).join("\n")).digest("hex"),
}, null, 2) + "\n";
const outputs = [[output, code], [output + ".manifest.json", manifest]];
// JVM decoder fixtures are produced by the actual shipped bundle, not hand-maintained DTO copies.
const request = runInNewContext(code + "\nAtoutiaOffline.request;", {}, { timeout: 1000 });
const call = (value) => JSON.parse(request(JSON.stringify(value)));
const bid = call({ method: "start", seed: 37 });
const take = bid.document.snapshot.actions.biddingActions.find((action) => action.type === "TAKE");
const playing = call({ method: "human", revision: bid.revision, command: { type: "TAKE", suit: take.suit } });
const wait = call({ method: "human", revision: playing.revision, command: { type: "PLAY_CARD", card: playing.document.snapshot.actions.legalCards[0] } });
function finish(seed, winner) {
  let frame = call({ method: "start", seed });
  for (let step = 0; step < 2000; step += 1) {
    const actions = frame.document.snapshot.actions;
    if (actions.mode === "MATCH_FINISHED") {
      if (frame.document.snapshot.match.public.score.winner !== winner) throw new Error("Unexpected offline fixture winner.");
      return frame;
    }
    const command = actions.mode === "BID" ? actions.biddingActions.find((action) => action.type === "TAKE")
      : { type: "PLAY_CARD", card: actions.legalCards[0] };
    frame = actions.mode === "WAIT" ? call({ method: "bot", revision: frame.revision })
      : call({ method: "human", revision: frame.revision, command });
  }
  throw new Error("Offline fixture did not complete.");
}
const won = finish(1, "TEAM_0");
const lost = finish(10, "TEAM_1");
const varied = call({ method: "start", seed: 37, botPolicy: "varied-v1" });
const bold = call({ method: "start", seed: 37, botPolicy: "bold-v1" });
for (const [name, value] of [["bid", bid], ["playing", playing], ["wait", wait], ["won", won], ["lost", lost], ["varied-bid", varied], ["bold-bid", bold]]) {
  outputs.push([resolve(root, "apps/android/app/src/test/resources/offline/" + name + ".json"), JSON.stringify(value, null, 2) + "\n"]);
}
if (process.argv.includes("--check")) {
  for (const [path, expected] of outputs) {
    if (readFileSync(path, "utf8") !== expected) throw new Error("Stale Android engine asset: " + relative(root, path));
  }
  console.log("Android offline bundle matches the shared engine: " + JSON.parse(manifest).bundleSha256);
} else {
  for (const [path, content] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  console.log("Generated Android offline engine (" + Buffer.byteLength(code) + " bytes).");
}
