import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { auditSQLiteLiveRooms } from "../src/sqliteLiveRoomAudit.js";
import { SQLiteLiveRoomRepository } from "../src/sqliteLiveRoomRepository.js";
import { SQLiteMatchResultRepository } from "../src/sqliteMatchResultRepository.js";
import { diagnosticDocument } from "./helpers/diagnosticDocument.js";

const directories: string[] = [];
function databasePath(withResults = true) {
  const dir = mkdtempSync(join(tmpdir(), "atoutia-room-audit-"));
  directories.push(dir);
  const path = join(dir, "synthetic.sqlite");
  new SQLiteLiveRoomRepository({ databasePath: path }).close();
  if (withResults) new SQLiteMatchResultRepository({ databasePath: path }).close();
  return path;
}
function write(path: string, doc: ReturnType<typeof diagnosticDocument>) {
  const db = new DatabaseSync(path);
  try { db.prepare("INSERT INTO live_rooms VALUES (?, ?)").run(doc.sessionId, JSON.stringify(doc)); }
  finally { db.close(); }
}
function hash(path: string) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("read-only room audit", () => {
  it("groups modes, phases, seats and adjudications, counts resolution entries rather than rooms, and emits no identities", () => {
    const path = databasePath();
    const first = diagnosticDocument(4, "PRIVATE", true);
    write(path, { ...first, absenceResolutions: [
      { player: "PLAYER_0", action: "MANUAL_ONLY", status: "PENDING" },
      { player: "PLAYER_1", action: "MANUAL_ONLY", status: "PENDING" },
      { player: "PLAYER_2", action: "MANUAL_ONLY", status: "RESOLVED_MANUALLY" },
    ] });
    write(path, diagnosticDocument(4, "PRIVATE", true));
    write(path, diagnosticDocument(0, "PRIVATE"));
    write(path, diagnosticDocument(1, "PRIVATE"));
    write(path, diagnosticDocument(2, "PRIVATE"));
    write(path, diagnosticDocument(4, "CASUAL")); // READY is a lobby phase.
    write(path, { ...diagnosticDocument(4, "CASUAL", true), absenceResolutions: [
      { player: "PLAYER_0", action: "BOT_TAKEOVER", status: "PENDING" },
    ] });
    write(path, { ...diagnosticDocument(4, "RANKED", true), absenceResolutions: [
      { player: "PLAYER_0", action: "TEAM_FORFEIT", status: "PENDING" },
    ], adjudication: {
      status: "COMPLETED", completion: "FORFEIT", reason: "PLAYER_ABSENCE",
      forfeitingPlayer: "PLAYER_0", losingTeam: "TEAM_0", winningTeam: "TEAM_1", completedAtMs: 5_000,
    } });
    const db = new DatabaseSync(path);
    // The audit deliberately counts rows, without asserting the result is valid.
    db.prepare("INSERT INTO match_results VALUES (?, ?, ?)").run("private-result-id", 5_000, "invalid-secret-result");
    db.close();
    const before = hash(path);
    let calls = 0;
    const report = auditSQLiteLiveRooms({ databasePath: path, now: () => { calls++; return 10_000; } });
    expect(calls).toBe(1);
    expect(report).toMatchObject({ readOnly: true, presenceSource: "UNKNOWN_OFFLINE",
      evaluatedAtMs: 10_000, scanned: 8, invalidRoomDocuments: 0, durableResultRows: 1, resultValidation: "COUNT_ONLY" });
    expect(report.roomsByState).toContainEqual({ mode: "PRIVATE", phase: "IN_PROGRESS", occupiedSeats: 4, adjudication: "ACTIVE", rooms: 2 });
    expect(report.roomsByState).toContainEqual({ mode: "CASUAL", phase: "READY", occupiedSeats: 4, adjudication: "ACTIVE", rooms: 1 });
    expect(report.roomsByState).toContainEqual({ mode: "RANKED", phase: "IN_PROGRESS", occupiedSeats: 4, adjudication: "COMPLETED", rooms: 1 });
    expect(report.pendingResolutions).toContainEqual({ mode: "PRIVATE", phase: "IN_PROGRESS", occupiedSeats: 4,
      adjudication: "ACTIVE", action: "MANUAL_ONLY", pendingResolutionEntries: 2 });
    expect(report.pendingResolutions).toHaveLength(3);
    expect(report.roomsByState.reduce((sum, row) => sum + row.rooms, 0)).toBe(8);
    const text = JSON.stringify(report);
    expect(text).not.toMatch(/sessionId|participant|baseSeed|hands|PLAYER_0|synthetic-|private-result|invalid-secret/);
    expect(hash(path)).toBe(before);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.roomsByState)).toBe(true);
    expect(report.roomsByState.every(Object.isFrozen)).toBe(true);
    expect(report.pendingResolutions.every(Object.isFrozen)).toBe(true);
    expect(auditSQLiteLiveRooms({ databasePath: path, now: () => 10_000 })).toEqual(report);
  });

  it("reports FINISHED and completed adjudication without interpreting scores or invoking result recording", () => {
    const path = databasePath();
    const source = diagnosticDocument(4, "PRIVATE", true);
    write(path, { ...source, room: { ...source.room,
      managedRoom: { ...source.room.managedRoom, phase: "FINISHED" } },
      adjudication: { status: "COMPLETED", completion: "NORMAL", completedAtMs: 5_000 } });
    const before = hash(path);
    expect(auditSQLiteLiveRooms({ databasePath: path }).roomsByState).toEqual([
      { mode: "PRIVATE", phase: "FINISHED", occupiedSeats: 4, adjudication: "COMPLETED", rooms: 1 },
    ]);
    expect(hash(path)).toBe(before);
  });

  it("does not migrate old documents without activity timestamps or create extra files", () => {
    const path = databasePath();
    const doc = JSON.parse(JSON.stringify(diagnosticDocument(1)));
    delete doc.createdAtMs; delete doc.lastActivityAtMs;
    const db = new DatabaseSync(path);
    db.prepare("INSERT INTO live_rooms VALUES (?, ?)").run(doc.sessionId, JSON.stringify(doc));
    db.close();
    const files = readdirSync(directories[0]!);
    const before = hash(path);
    const report = auditSQLiteLiveRooms({ databasePath: path });
    expect(report.invalidRoomDocuments).toBe(0);
    expect(report.roomsByState[0]?.occupiedSeats).toBe(1);
    expect(hash(path)).toBe(before);
    expect(readdirSync(directories[0]!)).toEqual(files);
  });

  it.each(["json", "phase", "seat", "adjudication", "resolution", "duplicate", "key", "timestamp"])("counts and hides invalid document data: %s", kind => {
    const path = databasePath();
    const doc = JSON.parse(JSON.stringify(diagnosticDocument()));
    if (kind === "phase") doc.room.managedRoom.phase = "sensitive-phase-text";
    if (kind === "seat") delete doc.room.managedRoom.room.seats.assignments.PLAYER_0;
    if (kind === "adjudication") doc.adjudication.status = "sensitive-status-text";
    if (kind === "resolution") doc.absenceResolutions = [{ player: "PLAYER_0", action: "sensitive-action-text", status: "PENDING" }];
    if (kind === "duplicate") doc.absenceResolutions = [0, 1].map(() => ({ player: "PLAYER_0", action: "MANUAL_ONLY", status: "PENDING" }));
    if (kind === "timestamp") doc.lastActivityAtMs = -1;
    const db = new DatabaseSync(path);
    db.prepare("INSERT INTO live_rooms VALUES (?, ?)").run(kind === "key" ? "sensitive-other-id" : doc.sessionId,
      kind === "json" ? "{sensitive-invalid-json" : JSON.stringify(doc));
    db.close();
    const before = hash(path);
    const report = auditSQLiteLiveRooms({ databasePath: path });
    expect(report).toMatchObject({ scanned: 1, invalidRoomDocuments: 1, roomsByState: [], pendingResolutions: [] });
    expect(JSON.stringify(report)).not.toContain("sensitive");
    expect(hash(path)).toBe(before);
  });

  it("distinguishes zero result rows from a missing results table", () => {
    const path = databasePath(false);
    write(path, diagnosticDocument());
    const before = hash(path);
    expect(auditSQLiteLiveRooms({ databasePath: path }).durableResultRows).toBeNull();
    expect(hash(path)).toBe(before);
    const empty = databasePath();
    expect(auditSQLiteLiveRooms({ databasePath: empty })).toMatchObject({ scanned: 0, durableResultRows: 0 });
  });

  it("does not create a missing database or schema and rejects a relative path", () => {
    const path = databasePath();
    const missing = join(directories[0]!, "absent.sqlite");
    expect(() => auditSQLiteLiveRooms({ databasePath: missing })).toThrow();
    expect(existsSync(missing)).toBe(false);
    expect(() => auditSQLiteLiveRooms({ databasePath: "relative.sqlite" })).toThrow("absolute");
    const db = new DatabaseSync(path); db.exec("DROP TABLE live_rooms"); db.close();
    const before = hash(path);
    expect(() => auditSQLiteLiveRooms({ databasePath: path })).toThrow("no live_rooms table");
    expect(hash(path)).toBe(before);
  });

  it("reads committed WAL data without changing the SQLite file, WAL or writer data_version", () => {
    const path = databasePath();
    const db = new DatabaseSync(path);
    db.exec("PRAGMA journal_mode = WAL");
    const doc = diagnosticDocument(4, "RANKED", true);
    db.prepare("INSERT INTO live_rooms VALUES (?, ?)").run(doc.sessionId, JSON.stringify(doc));
    const before = hash(path), wal = hash(`${path}-wal`);
    const version = db.prepare("PRAGMA data_version").get();
    try {
      const report = auditSQLiteLiveRooms({ databasePath: path });
      expect(report.roomsByState[0]).toMatchObject({ mode: "RANKED", phase: "IN_PROGRESS", occupiedSeats: 4 });
      expect(hash(path)).toBe(before);
      expect(hash(`${path}-wal`)).toBe(wal);
      expect(db.prepare("PRAGMA data_version").get()).toEqual(version);
    } finally { db.close(); }
  });

  it.each([-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])("rejects an invalid clock before opening a database: %s", value => {
    expect(() => auditSQLiteLiveRooms({ databasePath: "/nonexistent/audit.sqlite", now: () => value })).toThrow("clock");
  });
});
