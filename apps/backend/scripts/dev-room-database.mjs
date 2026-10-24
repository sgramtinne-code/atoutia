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

function readSessionIdsOnce(path) {
  const database = new DatabaseSync(path, { readOnly: true, timeout: BUSY_TIMEOUT_MS });
  try {
    database.exec("PRAGMA query_only = ON");
    return database.prepare("SELECT session_id FROM live_rooms ORDER BY rowid DESC").all()
      .map((row) => row.session_id)
      .filter((id) => typeof id === "string" && SESSION_ID_PATTERN.test(id));
  } finally {
    database.close();
  }
}

export async function readDevelopmentRoomSessionIds(path, {
  attempts = 20,
  retryDelayMs = 100,
  wait = delay,
} = {}) {
  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError("Invalid SQLite read attempt count.");
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) throw new RangeError("Invalid SQLite retry delay.");
  for (let attempt = 1; ; attempt++) {
    try {
      return readSessionIdsOnce(path);
    } catch (error) {
      if (!isBusy(error)) throw error;
      if (attempt === attempts) throw new DevelopmentRoomDatabaseBusyError(error);
      // The failed connection is closed before yielding, allowing the backend to finish its write.
      await wait(retryDelayMs);
    }
  }
}
