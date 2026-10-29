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
for (const [name, value] of [["bid", bid], ["playing", playing], ["wait", wait]]) {
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
