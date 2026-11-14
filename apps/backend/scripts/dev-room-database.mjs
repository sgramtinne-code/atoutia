import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";

const SESSION_ID_PATTERN = /^ms1_[0-9a-f]{32}$/;
const BUSY_TIMEOUT_MS = 250;

export class DevelopmentRoomDatabaseBusyError extends Error {
  constructor(cause) {
    super("La base locale reste occupée après plusieurs tentatives. Garder le backend actif et relancer le lanceur.", { cause });
    this.name = "DevelopmentRoomDatabaseBusyError";
  }
}

function isBusy(error) {
  if (error === null || typeof error !== "object" || !Number.isInteger(error.errcode)) return false;
  // Include SQLite extended result codes, without retrying unrelated SQL or filesystem errors.
  const primaryCode = error.errcode & 0xff;
  return primaryCode === 5 || primaryCode === 6;
}

function readOnce(path, query) {
  const database = new DatabaseSync(path, { readOnly: true, timeout: BUSY_TIMEOUT_MS });
  try {
    database.exec("PRAGMA query_only = ON");
    return query(database);
  } finally {
    database.close();
  }
}

async function readWithRetry(path, query, {
  attempts = 20,
  retryDelayMs = 100,
  wait = delay,
} = {}) {
  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError("Invalid SQLite read attempt count.");
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) throw new RangeError("Invalid SQLite retry delay.");
  for (let attempt = 1; ; attempt++) {
    try {
      return readOnce(path, query);
    } catch (error) {
      if (!isBusy(error)) throw error;
      if (attempt === attempts) throw new DevelopmentRoomDatabaseBusyError(error);
      // The failed connection is closed before yielding, allowing the backend to finish its write.
      await wait(retryDelayMs);
    }
  }
}

export function readDevelopmentRoomSessionIds(path, options) {
  return readWithRetry(path, (database) => database.prepare("SELECT session_id FROM live_rooms ORDER BY rowid DESC").all()
    .map((row) => row.session_id)
    .filter((id) => typeof id === "string" && SESSION_ID_PATTERN.test(id)), options);
}

// Select only identity bindings, never tokens or private game state. Occupancy is not presence.
export function readDevelopmentDuoAccountProof(path, sessionId, options) {
  if (!SESSION_ID_PATTERN.test(sessionId)) throw new Error("Invalid duo session identifier.");
  return readWithRetry(path, (database) => {
    const row = database.prepare(`SELECT
      json_extract(document_json, '$.formatVersion') AS version,
      json_extract(document_json, '$.sessionId') AS session,
      json_extract(document_json, '$.mode') AS mode,
      json_extract(document_json, '$.room.managedRoom.room.seats.assignments.PLAYER_0') AS host,
      json_extract(document_json, '$.room.managedRoom.room.seats.assignments.PLAYER_1') AS guest,
      json_extract(document_json, '$.room.managedRoom.room.seats.assignments.PLAYER_2') AS third,
      json_extract(document_json, '$.room.managedRoom.room.seats.assignments.PLAYER_3') AS fourth
      FROM live_rooms WHERE session_id = ?`).get(sessionId);
    if (!row) return false;
    if (row.version !== 1 || row.session !== sessionId || row.mode !== "PRIVATE") throw new Error("Invalid private room identity document.");
    if (row.host === null || row.guest === null) return false;
    if (![row.host, row.guest].every((id) => typeof id === "string" && /^pid1_[0-9a-f]{64}$/.test(id)) ||
        row.host === row.guest || row.third !== null || row.fourth !== null) {
      throw new Error("Two distinct authenticated participants and two free seats are required.");
    }
    // A participant identity is deterministically bound to the authenticated account by the backend.
    return true;
  }, options);
}
