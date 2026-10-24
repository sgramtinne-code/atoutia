import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterEach, test } from "vitest";
import { DevelopmentRoomDatabaseBusyError, readDevelopmentRoomSessionIds } from "./dev-room-database.mjs";

const cleanup = [];
afterEach(() => {
  for (const close of cleanup.reverse()) close();
  cleanup.length = 0;
});
const first = "ms1_0123456789abcdef0123456789abcdef";
const second = "ms1_fedcba9876543210fedcba9876543210";
function fixture({ schema = true } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "atoutia-room-reader-"));
  cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "synthetic.sqlite");
  const writer = new DatabaseSync(path);
  cleanup.push(() => writer.close());
  writer.exec("PRAGMA journal_mode = DELETE");
  if (schema) {
    writer.exec("CREATE TABLE live_rooms (session_id TEXT)");
    writer.prepare("INSERT INTO live_rooms VALUES (?)").run(first);
  }
  return { path, writer, directory };
}
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

test("lists only valid identifiers in newest-first order without modifying the fixture", async () => {
  const { path, writer } = fixture();
  for (const id of ["invalid", second, null, "ms1_" + "g".repeat(32)]) {
    writer.prepare("INSERT INTO live_rooms VALUES (?)").run(id);
  }
  const before = hash(path);
  assert.deepEqual(await readDevelopmentRoomSessionIds(path), [second, first]);
  assert.equal(hash(path), before);
});

test("reproduces the immediate busy error then succeeds after a transient writer lock", async () => {
  const { path, writer } = fixture();
  writer.exec("BEGIN EXCLUSIVE");
  const original = new DatabaseSync(path);
  try {
    assert.throws(() => original.prepare("SELECT session_id FROM live_rooms").all(), (error) => error.errcode === 5);
  } finally { original.close(); }
  let retries = 0;
  const ids = await readDevelopmentRoomSessionIds(path, {
    wait: async () => { retries++; writer.exec("COMMIT"); },
  });
  assert.equal(retries, 1);
  assert.deepEqual(ids, [first]);
});

test("a persistent lock ends after the configured attempts and preserves its SQLite cause", async () => {
  const { path, writer } = fixture();
  writer.exec("BEGIN EXCLUSIVE");
  let retries = 0;
  try {
    await assert.rejects(readDevelopmentRoomSessionIds(path, {
      attempts: 2, wait: async () => { retries++; },
    }), (error) => error instanceof DevelopmentRoomDatabaseBusyError && error.cause.errcode === 5);
    assert.equal(retries, 1);
  } finally { writer.exec("ROLLBACK"); }
  assert.deepEqual(await readDevelopmentRoomSessionIds(path), [first]);
});

test("a missing table is reported immediately instead of being treated as a lock", async () => {
  const { path } = fixture({ schema: false });
  const before = hash(path);
  await assert.rejects(readDevelopmentRoomSessionIds(path, {
    wait: async () => assert.fail("No retry for a schema error"),
  }), /no such table/);
  assert.equal(hash(path), before);
});

test("a missing database is not created by the read-only opener", async () => {
  const { directory } = fixture();
  const path = join(directory, "does-not-exist.sqlite");
  await assert.rejects(readDevelopmentRoomSessionIds(path, {
    wait: async () => assert.fail("No retry for a missing file"),
  }));
  assert.equal(existsSync(path), false);
});

test("invalid retry settings are rejected before opening a database", async () => {
  for (const options of [{ attempts: 0 }, { attempts: 1.5 }, { retryDelayMs: -1 }]) {
    await assert.rejects(readDevelopmentRoomSessionIds("unused.sqlite", options), RangeError);
  }
});
