import { DEFAULT_LIVE_ROOM_EXPIRATION_POLICY } from "./liveRoomExpiration.js";
import { previewSQLiteLiveRoomExpiration } from "./sqliteLiveRoomExpirationPreview.js";

function duration(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new Error(`${name} must be a positive safe integer in milliseconds.`);
  }
  return Number(raw);
}

try {
  // Intentionally no default: never silently select the developer's real database.
  const databasePath = process.env.ATOUTIA_DATABASE_PATH;
  if (!databasePath) {
    throw new Error("Set ATOUTIA_DATABASE_PATH explicitly to an isolated diagnostic database.");
  }
  const defaults = DEFAULT_LIVE_ROOM_EXPIRATION_POLICY;
  const policy = {
    emptyWaitingIdleMs: duration("ATOUTIA_PREVIEW_EMPTY_IDLE_MS", defaults.emptyWaitingIdleMs),
    occupiedWaitingIdleMs: duration("ATOUTIA_PREVIEW_WAITING_IDLE_MS", defaults.occupiedWaitingIdleMs),
    inProgressIdleMs: duration("ATOUTIA_PREVIEW_IN_PROGRESS_IDLE_MS", defaults.inProgressIdleMs),
    confirmedAbsenceMs: duration("ATOUTIA_PREVIEW_ABSENCE_MS", defaults.confirmedAbsenceMs),
  };
  const rooms = previewSQLiteLiveRoomExpiration({ databasePath, policy });
  console.log(JSON.stringify({ readOnly: true, presenceSource: "UNKNOWN_OFFLINE",
    policy, scanned: rooms.length, rooms }, null, 2));
} catch {
  // SQLite errors may include paths; parser errors may include document data.
  console.error("Expiration preview failed. Check the explicit absolute database path, schema and positive duration settings. No backend was started.");
  process.exitCode = 1;
}
