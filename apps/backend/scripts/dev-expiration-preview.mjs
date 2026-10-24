// Synthetic local validation only. Never opens ATOUTIA_DATABASE_PATH from the shell.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { LiveRoomStore } from "../dist/liveRoomStore.js";
import { SQLiteLiveRoomRepository } from "../dist/sqliteLiveRoomRepository.js";
import { SQLiteMatchResultRepository } from "../dist/sqliteMatchResultRepository.js";

const directory = mkdtempSync(join(tmpdir(), "atoutia-expiration-demo-"));
const databasePath = join(directory, "synthetic.sqlite");
const cli = fileURLToPath(new URL("../dist/previewLiveRoomExpiration.js", import.meta.url));
const hash = () => createHash("sha256").update(readFileSync(databasePath)).digest("hex");
try {
  const repository = new SQLiteLiveRoomRepository({ databasePath });
  const results = new SQLiteMatchResultRepository({ databasePath });
  let empty, occupied, legacy;
  try {
    const store = new LiveRoomStore({ repository, activityNow: () => 1_000 });
    empty = store.create({ mode: "PRIVATE" }).managedRoom.room.session.sessionId;
    occupied = store.create({ mode: "PRIVATE" }).managedRoom.room.session.sessionId;
    store.claimSeat({ sessionId: occupied, player: "PLAYER_0", participantId: "synthetic-demo",
      expectedRevision: 0 });
    legacy = store.create({ mode: "PRIVATE" }).managedRoom.room.session.sessionId;
  } finally { repository.close(); results.close(); }
  const writer = new DatabaseSync(databasePath);
  try {
    const row = writer.prepare("SELECT document_json FROM live_rooms WHERE session_id = ?").get(legacy);
    const doc = JSON.parse(row.document_json);
    delete doc.createdAtMs; delete doc.lastActivityAtMs;
    writer.prepare("UPDATE live_rooms SET document_json = ? WHERE session_id = ?").run(JSON.stringify(doc), legacy);
  } finally { writer.close(); }
  const before = hash();
  const files = readdirSync(directory);
  const environment = { ...process.env, ATOUTIA_DATABASE_PATH: databasePath,
    ATOUTIA_PREVIEW_EMPTY_IDLE_MS: "1000", ATOUTIA_PREVIEW_WAITING_IDLE_MS: "1000",
    ATOUTIA_PREVIEW_IN_PROGRESS_IDLE_MS: "1000", ATOUTIA_PREVIEW_ABSENCE_MS: "1000" };
  const run = spawnSync(process.execPath, [cli], { env: environment, encoding: "utf8", cwd: directory });
  assert.equal(run.status, 0, "Synthetic CLI diagnostic must succeed after a backend build.");
  const report = JSON.parse(run.stdout);
  assert.equal(report.readOnly, true);
  assert.equal(report.scanned, 3);
  const find = id => report.rooms.find(row => row.sessionId === id);
  assert.equal(find(empty).reason, "EMPTY_WAITING_IDLE_THRESHOLD_REACHED");
  assert.equal(find(occupied).reason, "UNKNOWN_PRESENCE");
  assert.equal(find(legacy).reason, "MISSING_ACTIVITY_TIMESTAMPS");
  assert.equal(hash(), before, "SQLite bytes must remain unchanged.");
  assert.deepEqual(readdirSync(directory), files, "No diagnostic side files should be created.");
  const noPath = spawnSync(process.execPath, [cli], {
    env: { ...environment, ATOUTIA_DATABASE_PATH: "" }, encoding: "utf8", cwd: directory,
  });
  assert.equal(noPath.status, 1, "CLI must refuse an implicit database path.");
  const badDuration = spawnSync(process.execPath, [cli], {
    env: { ...environment, ATOUTIA_PREVIEW_EMPTY_IDLE_MS: "0" }, encoding: "utf8", cwd: directory,
  });
  assert.equal(badDuration.status, 1, "CLI must refuse invalid durations.");
  assert.equal(hash(), before);
  assert.deepEqual(readdirSync(directory), files);
  console.log(JSON.stringify({ syntheticOnly: true, databaseUnchanged: true,
    scenarios: { empty: find(empty), occupied: find(occupied), legacy: find(legacy) } }, null, 2));
  console.log("Synthetic expiration preview passed. Temporary fixtures will be removed.");
} finally { rmSync(directory, { recursive: true, force: true }); }
