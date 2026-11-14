import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "vitest";
import { AuthService } from "../src/authService.ts";
import { SQLiteAuthRepository } from "../src/sqliteAuthRepository.ts";
import { SQLiteLiveRoomRepository } from "../src/sqliteLiveRoomRepository.ts";
import { LiveRoomStore } from "../src/liveRoomStore.ts";
import { createBackendServer } from "../src/server.ts";
import { createRealtimeServer } from "../src/realtime.ts";
import { readDevelopmentDuoAccountProof } from "./dev-room-database.mjs";

async function until(check, describe, output) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(25);
  }
  throw new Error(`Timed out: ${describe}\n${output()}`);
}

// Real loopback HTTP/WebSocket backend, separate synthetic identities and a spawned CLI.
// The test driver performs bounded human turns; the CLI must never control those seats.
test("two Android seats stay manual while the real CLI fills and plays only seats 2/3", async () => {
  const directory = mkdtempSync(join(tmpdir(), "atoutia-duo-integration-"));
  const databasePath = join(directory, "synthetic.sqlite");
  const rooms = new SQLiteLiveRoomRepository({ databasePath });
  const repository = new SQLiteAuthRepository({ databasePath: ":memory:" });
  const authService = new AuthService({ repository, bootstrapAuthenticationEnabled: true });
  const roomStore = new LiveRoomStore({ repository: rooms });
  const server = createBackendServer({ roomStore, authService });
  const realtime = createRealtimeServer({ server, roomStore, authService });
  let child;
  let output = "";
  let stopped;
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const request = async (path, { token, body, method = "POST" } = {}) => {
      const response = await fetch(baseUrl + path, { method, signal: AbortSignal.timeout(5_000),
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      expect(response.ok).toBe(true);
      return response.json();
    };
    const room = await request("/api/v1/rooms", { body: { mode: "PRIVATE" } });
    const sessionId = room.sessionId;
    const humans = [];
    for (let index = 0; index < 2; index++) {
      const { accountId } = await request("/api/v1/auth/accounts");
      const { accessToken } = await request("/api/v1/auth/sessions", { body: { accountId } });
      const current = await request(`/api/v1/rooms/${sessionId}`, { method: "GET" });
      await request(`/api/v1/rooms/${sessionId}/seats`, { token: accessToken, body: { player: `PLAYER_${index}`, expectedRevision: current.revision } });
      humans.push(accessToken);
    }
    const before = createHash("sha256").update(readFileSync(databasePath)).digest("hex");
    expect(await readDevelopmentDuoAccountProof(databasePath, sessionId)).toBe(true);
    expect(createHash("sha256").update(readFileSync(databasePath)).digest("hex")).toBe(before);
    child = spawn(process.execPath, [new URL("./dev-autoplay-room.mjs", import.meta.url).pathname, sessionId, "--android-players-0-1"], {
      env: { ...process.env, ATOUTIA_API_BASE_URL: baseUrl }, stdio: ["ignore", "pipe", "pipe"],
    });
    stopped = once(child, "exit");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    await until(() => output.includes("Room is READY."), "two bots ready", () => output);
    const ready = await request(`/api/v1/rooms/${sessionId}`, { method: "GET" });
    expect(ready.occupiedSeats).toBe(4);
    expect(ready.phase).toBe("READY");
    expect(output.match(/PLAYER_[0-3]: joined/g)).toEqual(["PLAYER_2: joined", "PLAYER_3: joined"]);
    await request(`/api/v1/rooms/${sessionId}/start`, { token: humans[0], body: { expectedRevision: ready.revision } });
    await until(() => output.includes("Waiting for PLAYER_0 / PLAYER_1 Android"), "wait for humans", () => output);
    const manual = await request(`/api/v1/rooms/${sessionId}`, { method: "GET" });
    await delay(350);
    expect((await request(`/api/v1/rooms/${sessionId}`, { method: "GET" })).revision).toBe(manual.revision);
    let humanMoves = 0;
    await until(async () => {
      for (const token of humans) {
        const snapshot = await request(`/api/v1/rooms/${sessionId}/snapshot`, { token });
        const actions = snapshot.game.actions;
        const command = actions.mode === "BID" ? actions.biddingActions.find((action) => action.type === "TAKE") || actions.biddingActions[0]
          : actions.mode === "PLAY_CARD" ? { type: "PLAY_CARD", card: actions.legalCards[0] } : null;
        if (!command) continue;
        await request(`/api/v1/rooms/${sessionId}/commands`, { token, body: { document: {
          formatVersion: 1, engineVersion: snapshot.engineVersion, sessionId, expectedRevision: snapshot.revision, command,
        } } });
        humanMoves++;
      }
      return humanMoves >= 2 && output.includes("PLAYER_2: PLAY_CARD") && output.includes("PLAYER_3: PLAY_CARD");
    }, "bounded human and bot turns", () => output);
    expect(output).toContain("Controlled players: PLAYER_2, PLAYER_3");
    expect(output).not.toMatch(/PLAYER_[01]: (TAKE|PASS|PLAY_CARD|joined)/);
    expect(output).not.toMatch(/atk1_|rtk1_/);
    expect(child.exitCode).toBe(null);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    if (stopped) await stopped;
    await realtime.close();
    if (server.listening) await new Promise((resolveClose) => server.close(resolveClose));
    repository.close();
    rooms.close();
    rmSync(directory, { recursive: true, force: true });
  }
}, 30_000);
