import assert from "node:assert/strict";
import { createConnection, createServer } from "node:net";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "vitest";
import { createAndroidNetworkRelay } from "./dev-android-network.mjs";

const cleanup = [];
afterEach(async () => {
  for (const close of cleanup.reverse()) await close();
  cleanup.length = 0;
});
async function fixture() {
  const server = createServer((socket) => socket.pipe(socket));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanup.push(() => new Promise((resolve) => server.close(resolve)));
  const upstreamPort = server.address().port;
  const relay = await createAndroidNetworkRelay({ port: 0, upstreamPort });
  cleanup.push(() => relay.close());
  return { relay, upstreamPort, server };
}
async function connect(port) {
  const socket = createConnection({ host: "127.0.0.1", port });
  socket.on("error", () => {});
  cleanup.push(() => { socket.destroy(); });
  await once(socket, "connect");
  return socket;
}
async function echo(socket, message) {
  const received = once(socket, "data");
  socket.write(message);
  assert.equal((await received)[0].toString(), message);
}

test("relay preserves bytes in both directions", async () => {
  const { relay } = await fixture();
  const socket = await connect(relay.port);
  await echo(socket, "synthetic frame\r\n");
});

test("cut drops existing streams and rejects new streams while backend stays available", async () => {
  const { relay, upstreamPort } = await fixture();
  const socket = await connect(relay.port);
  await echo(socket, "before");
  const closed = once(socket, "close");
  assert.deepEqual(relay.getStatus(), {
    paused: false, activeConnections: 1, acceptedConnections: 1, rejectedConnections: 0, upstreamErrors: 0,
  });
  assert.equal(relay.disconnect(), 1);
  assert.equal(relay.getStatus().activeConnections, 0);
  await closed;
  const denied = await connect(relay.port);
  if (!denied.destroyed) await once(denied, "close");
  assert.equal(relay.getStatus().rejectedConnections, 1);
  const direct = await connect(upstreamPort);
  await echo(direct, "direct PNJ connection unaffected");
  relay.resume();
  const restored = await connect(relay.port);
  await echo(restored, "restored");
  assert.deepEqual(relay.getStatus(), {
    paused: false, activeConnections: 1, acceptedConnections: 2, rejectedConnections: 1, upstreamErrors: 0,
  });
});

test("closing the relay releases the listener and all connected streams", async () => {
  const { relay } = await fixture();
  const socket = await connect(relay.port);
  await echo(socket, "before close");
  const closed = once(socket, "close");
  cleanup.splice(1, 1);
  await relay.close();
  await closed;
  const refused = createConnection({ host: "127.0.0.1", port: relay.port });
  await assert.rejects(once(refused, "connect"), /ECONNREFUSED/);
});

test("occupied local port fails without replacing the existing listener", async () => {
  const { relay } = await fixture();
  await assert.rejects(createAndroidNetworkRelay({ port: relay.port }), /EADDRINUSE/);
  await echo(await connect(relay.port), "still available");
});


test("CLI routes and relaunches Android, cuts/resumes, then restores reverse using fake ADB", async () => {
  const folder = mkdtempSync(join(tmpdir(), "atoutia-network-"));
  cleanup.push(() => rmSync(folder, { recursive: true, force: true }));
  const adb = join(folder, "fake adb");
  const calls = join(folder, "calls.jsonl");
  writeFileSync(adb, `#!${process.execPath}
import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(calls)}, JSON.stringify(process.argv.slice(2)) + "\\n");
`, { mode: 0o755 });
  const child = spawn(process.execPath, [fileURLToPath(new URL("./dev-android-network.mjs", import.meta.url))], {
    env: { ...process.env, ATOUTIA_ADB: adb }, stdio: ["pipe", "pipe", "pipe"],
  });
  cleanup.push(() => { if (child.exitCode === null) child.kill(); });
  let output = "";
  let inputSent = false;
  child.stdout.on("data", (chunk) => {
    output += chunk;
    if (!inputSent && output.includes("c + Entrée")) {
      inputSent = true;
      child.stdin.end("c\nr\ns\nq\n");
    }
  });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, output);
  assert.match(output, /Connexion Android coupée/);
  assert.match(output, /Relais rouvert/);
  assert.match(output, /TCP actives=0 acceptées=0 refusées=0 erreurs_backend=0/);
  assert.deepEqual(readFileSync(calls, "utf8").trim().split("\n").map(JSON.parse), [
    ["reverse", "tcp:3000", "tcp:3001"],
    ["shell", "am", "force-stop", "tech.devoo.atoutia"],
    ["shell", "am", "start", "-n", "tech.devoo.atoutia/.MainActivity"],
    ["reverse", "tcp:3000", "tcp:3000"],
  ]);
});


test("upstream failures are counted without reporting application data", async () => {
  const { relay, server } = await fixture();
  await new Promise((resolve) => server.close(resolve));
  const socket = await connect(relay.port);
  if (!socket.destroyed) await once(socket, "close");
  assert.deepEqual(relay.getStatus(), {
    paused: false, activeConnections: 0, acceptedConnections: 1, rejectedConnections: 0, upstreamErrors: 1,
  });
});
