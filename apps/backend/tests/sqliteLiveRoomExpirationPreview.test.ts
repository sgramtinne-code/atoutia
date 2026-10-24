import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteLiveRoomRepository } from "../src/sqliteLiveRoomRepository.js";
import { SQLiteMatchResultRepository } from "../src/sqliteMatchResultRepository.js";
import { createForfeitMatchResult } from "../src/matchResult.js";
import { previewSQLiteLiveRoomExpiration } from "../src/sqliteLiveRoomExpirationPreview.js";
import { diagnosticDocument } from "./helpers/diagnosticDocument.js";

const directories: string[] = [];
function path(): string {
  const directory = mkdtempSync(join(tmpdir(), "atoutia-expiration-preview-"));
  directories.push(directory);
  return join(directory, "isolated.sqlite");
}
function fingerprint(databasePath: string) {
  return createHash("sha256").update(readFileSync(databasePath)).digest("hex");
}
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("offline SQLite expiration preview", () => {
  it("preserves every byte, legacy timestamps, invalid documents, results, schema and file inventory", () => {
    const databasePath = path();
    const rooms = new SQLiteLiveRoomRepository({ databasePath });
    const results = new SQLiteMatchResultRepository({ databasePath });
    const legacy = diagnosticDocument();
    const occupied = diagnosticDocument(4, "PRIVATE", true);
    const completed = { ...diagnosticDocument(4, "RANKED", true), adjudication: {
      status: "COMPLETED" as const, completion: "FORFEIT" as const, reason: "PLAYER_ABSENCE" as const,
      forfeitingPlayer: "PLAYER_0" as const, winningTeam: "TEAM_1" as const, losingTeam: "TEAM_0" as const,
      completedAtMs: 9_000,
    } };
    const withoutResult = { ...diagnosticDocument(4, "RANKED", true), adjudication: completed.adjudication };
    rooms.save(legacy); rooms.save(occupied); rooms.save(completed); rooms.save(withoutResult);
    results.save(createForfeitMatchResult({ sessionId: completed.sessionId, mode: "RANKED",
      participants: { PLAYER_0: "synthetic-PLAYER_0", PLAYER_1: "synthetic-PLAYER_1",
        PLAYER_2: "synthetic-PLAYER_2", PLAYER_3: "synthetic-PLAYER_3" },
      completedAtMs: 9_000, forfeitingPlayer: "PLAYER_0", winningTeam: "TEAM_1", losingTeam: "TEAM_0" }));
    rooms.close(); results.close();
    const writer = new DatabaseSync(databasePath);
    const rawLegacy = JSON.parse(JSON.stringify(legacy));
    delete rawLegacy.createdAtMs; delete rawLegacy.lastActivityAtMs;
    writer.prepare("UPDATE live_rooms SET document_json = ? WHERE session_id = ?").run(JSON.stringify(rawLegacy), legacy.sessionId);
    writer.prepare("INSERT INTO live_rooms VALUES (?, ?)").run("invalid-row", '{"private":"must-not-appear-in-report"}');
    writer.close();
    const before = fingerprint(databasePath);
    const files = readdirSync(directories[0]!);
    let clockCalls = 0;
    const preview = () => previewSQLiteLiveRoomExpiration({ databasePath, now: () => { clockCalls++; return 1_000_000_000; } });
    const report = preview();
    expect(report).toHaveLength(5);
    expect(report.find(row => row.sessionId === legacy.sessionId)?.reason).toBe("MISSING_ACTIVITY_TIMESTAMPS");
    expect(report.find(row => row.sessionId === occupied.sessionId)?.reason).toBe("UNKNOWN_PRESENCE");
    expect(report.find(row => row.sessionId === completed.sessionId)?.reason).toBe("COMPLETED_WITH_RESULT");
    expect(report.find(row => row.sessionId === withoutResult.sessionId)?.reason).toBe("COMPLETED_WITHOUT_RESULT");
    expect(report.find(row => row.sessionId === "invalid-row")?.reason).toBe("INVALID_DOCUMENT");
    expect(JSON.stringify(report)).not.toMatch(/private|must-not-appear|baseSeed|synthetic-PLAYER|hands/);
    expect(clockCalls).toBe(1);
    expect(preview()).toEqual(report);
    expect(fingerprint(databasePath)).toBe(before);
    expect(readdirSync(directories[0]!)).toEqual(files);
    const reader = new DatabaseSync(databasePath, { readOnly: true });
    expect(reader.prepare("SELECT COUNT(*) AS n FROM match_results").get()?.n).toBe(1);
    expect(reader.prepare("SELECT document_json FROM live_rooms WHERE session_id = ?").get(legacy.sessionId)?.document_json).toBe(JSON.stringify(rawLegacy));
    reader.close();
  });

  it("sees committed WAL data without updating the database, WAL or writer data_version", () => {
    const databasePath = path();
    const rooms = new SQLiteLiveRoomRepository({ databasePath });
    const results = new SQLiteMatchResultRepository({ databasePath });
    rooms.close(); results.close();
    const writer = new DatabaseSync(databasePath);
    writer.exec("PRAGMA journal_mode = WAL;");
    const doc = diagnosticDocument();
    writer.prepare("INSERT INTO live_rooms VALUES (?, ?)").run(doc.sessionId, JSON.stringify(doc));
    const before = fingerprint(databasePath);
    const walBefore = fingerprint(`${databasePath}-wal`);
    const version = writer.prepare("PRAGMA data_version").get();
    try {
      expect(previewSQLiteLiveRoomExpiration({ databasePath, now: () => 1_000_000_000 })[0]?.classification).toBe("ABANDONMENT_CANDIDATE");
      expect(fingerprint(databasePath)).toBe(before);
      expect(fingerprint(`${databasePath}-wal`)).toBe(walBefore);
      expect(writer.prepare("PRAGMA data_version").get()).toEqual(version);
    } finally { writer.close(); }
  });

  it("does not create a missing database, tables, or directories", () => {
    const databasePath = path();
    expect(() => previewSQLiteLiveRoomExpiration({ databasePath })).toThrow();
    expect(existsSync(databasePath)).toBe(false);
    const database = new DatabaseSync(databasePath); database.close();
    const before = fingerprint(databasePath);
    expect(() => previewSQLiteLiveRoomExpiration({ databasePath })).toThrow("no live_rooms table");
    expect(fingerprint(databasePath)).toBe(before);
    expect(() => previewSQLiteLiveRoomExpiration({ databasePath: "relative.sqlite" })).toThrow("absolute");
  });

  it("protects all rows if the durable results table is missing", () => {
    const databasePath = path();
    const rooms = new SQLiteLiveRoomRepository({ databasePath });
    rooms.save(diagnosticDocument()); rooms.close();
    const before = fingerprint(databasePath);
    expect(previewSQLiteLiveRoomExpiration({ databasePath })[0]?.reason).toBe("RESULT_STATE_UNKNOWN");
    expect(fingerprint(databasePath)).toBe(before);
  });

  it("protects a corrupt durable result", () => {
    const databasePath = path();
    const rooms = new SQLiteLiveRoomRepository({ databasePath });
    const results = new SQLiteMatchResultRepository({ databasePath });
    const doc = diagnosticDocument(); rooms.save(doc); rooms.close(); results.close();
    const writer = new DatabaseSync(databasePath);
    writer.prepare("INSERT INTO match_results VALUES (?, ?, ?)").run(doc.sessionId, 1_000, "{broken");
    writer.close();
    const before = fingerprint(databasePath);
    expect(previewSQLiteLiveRoomExpiration({ databasePath })[0]?.classification).toBe("PROTECTED");
    expect(fingerprint(databasePath)).toBe(before);
  });

  it("rejects a valid durable result that disagrees with the room adjudication", () => {
    const databasePath = path();
    const rooms = new SQLiteLiveRoomRepository({ databasePath });
    const results = new SQLiteMatchResultRepository({ databasePath });
    const doc = { ...diagnosticDocument(4, "RANKED", true), adjudication: {
      status: "COMPLETED" as const, completion: "FORFEIT" as const, reason: "PLAYER_ABSENCE" as const,
      forfeitingPlayer: "PLAYER_0" as const, winningTeam: "TEAM_1" as const, losingTeam: "TEAM_0" as const,
      completedAtMs: 9_000,
    } };
    rooms.save(doc);
    results.save(createForfeitMatchResult({ sessionId: doc.sessionId, mode: "RANKED",
      participants: { PLAYER_0: "synthetic-PLAYER_0", PLAYER_1: "synthetic-PLAYER_1",
        PLAYER_2: "synthetic-PLAYER_2", PLAYER_3: "synthetic-PLAYER_3" },
      completedAtMs: 9_000, forfeitingPlayer: "PLAYER_1", winningTeam: "TEAM_0", losingTeam: "TEAM_1" }));
    rooms.close(); results.close();
    expect(previewSQLiteLiveRoomExpiration({ databasePath, now: () => 10_000 })[0]?.reason).toBe("RESULT_STATE_UNKNOWN");
  });

  it("protects malformed/future timestamps without migrating them", () => {
    const databasePath = path();
    const rooms = new SQLiteLiveRoomRepository({ databasePath });
    const results = new SQLiteMatchResultRepository({ databasePath });
    rooms.close(); results.close();
    const writer = new DatabaseSync(databasePath);
    const cases = [[null, null], [1_000, 999], [0, -1], [0, 10_001], [0, 1.5]];
    for (const [createdAtMs, lastActivityAtMs] of cases) {
      const doc = { ...diagnosticDocument(), createdAtMs, lastActivityAtMs };
      writer.prepare("INSERT INTO live_rooms VALUES (?, ?)").run(doc.sessionId, JSON.stringify(doc));
    }
    writer.close();
    const before = fingerprint(databasePath);
    const report = previewSQLiteLiveRoomExpiration({ databasePath, now: () => 10_000 });
    expect(report).toHaveLength(cases.length);
    expect(report.every(row => row.classification === "PROTECTED")).toBe(true);
    expect(fingerprint(databasePath)).toBe(before);
  });
});
