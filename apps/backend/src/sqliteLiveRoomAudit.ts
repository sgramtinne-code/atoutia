import { isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  LIVE_MATCH_ROOM_PHASES,
  PLAYER_POSITIONS,
  type LiveMatchRoomPhase,
} from "@atoutia/belote-engine";
import { parseLiveRoomPersistenceDocument } from "./liveRoomPersistenceDocument.js";
import type { LiveRoomPersistenceDocument } from "./liveRoomPersistenceDocument.js";
import type { PendingAbsenceResolutionAction } from "./liveRoomAbsenceResolution.js";
import type { MatchMode } from "./matchMode.js";

export interface AuditedRoomState {
  readonly mode: MatchMode;
  readonly phase: LiveMatchRoomPhase;
  readonly occupiedSeats: number;
  readonly adjudication: "ACTIVE" | "COMPLETED";
}

export interface LiveRoomAuditReport {
  readonly readOnly: true;
  readonly presenceSource: "UNKNOWN_OFFLINE";
  readonly evaluatedAtMs: number;
  readonly scanned: number;
  readonly invalidRoomDocuments: number;
  readonly roomsByState: readonly (AuditedRoomState & { readonly rooms: number })[];
  readonly pendingResolutions: readonly (AuditedRoomState & {
    readonly action: PendingAbsenceResolutionAction;
    readonly pendingResolutionEntries: number;
  })[];
  readonly durableResultRows: number | null;
  readonly resultValidation: "COUNT_ONLY";
}

/** Validate every value that could reach the aggregate output. The persistence
 * parser intentionally does not validate all nested engine/absence data.
 * This is a structural inventory, not a replay or a match-result validation.
 */
function stateOf(document: LiveRoomPersistenceDocument): AuditedRoomState {
  const managed = document.room.managedRoom;
  const assignments = managed?.room?.seats?.assignments;
  if (!managed || !LIVE_MATCH_ROOM_PHASES.includes(managed.phase) ||
    !assignments || Array.isArray(assignments) || Object.keys(assignments).length !== 4 ||
    PLAYER_POSITIONS.some(player => !(assignments[player] === null ||
      (typeof assignments[player] === "string" && assignments[player].trim().length > 0 &&
        assignments[player] === assignments[player].trim() && assignments[player].length <= 128)))) {
    throw new Error("Invalid room audit structure.");
  }
  const occupants = PLAYER_POSITIONS.map(player => assignments[player]).filter(id => id !== null);
  if (new Set(occupants).size !== occupants.length) {
    throw new Error("Invalid room audit seats.");
  }
  const adjudication = document.adjudication;
  if (!(adjudication.status === "ACTIVE" && adjudication.completion === null &&
      adjudication.completedAtMs === null ||
    adjudication.status === "COMPLETED" &&
      ["NORMAL", "FORFEIT"].includes(adjudication.completion) &&
      Number.isSafeInteger(adjudication.completedAtMs) && adjudication.completedAtMs >= 0)) {
    throw new Error("Invalid room audit adjudication.");
  }
  const players = new Set<string>();
  const resolvedStatuses = {
    MANUAL_ONLY: "RESOLVED_MANUALLY", BOT_TAKEOVER: "RESOLVED_BY_BOT", TEAM_FORFEIT: "RESOLVED_BY_FORFEIT",
  } as const;
  for (const entry of document.absenceResolutions) {
    if (!entry || !PLAYER_POSITIONS.includes(entry.player) || players.has(entry.player) ||
      !Object.hasOwn(resolvedStatuses, entry.action) ||
      !(entry.status === "PENDING" || entry.status === resolvedStatuses[entry.action])) {
      throw new Error("Invalid room audit resolution.");
    }
    players.add(entry.player);
  }
  return Object.freeze({ mode: document.mode, phase: managed.phase,
    occupiedSeats: occupants.length, adjudication: adjudication.status });
}

/** Opens an explicitly selected existing SQLite database without schema creation,
 * store hydration, auth, presence handlers or result reconciliation. Rooms and
 * result counts are read in one SQLite transaction. No identifiers are returned.
 */
export function auditSQLiteLiveRooms(options: {
  readonly databasePath: string;
  readonly now?: () => number;
}): LiveRoomAuditReport {
  if (!isAbsolute(options.databasePath)) {
    throw new Error("An explicit absolute audit database path is required.");
  }
  const evaluatedAtMs = (options.now ?? Date.now)();
  if (!Number.isSafeInteger(evaluatedAtMs) || evaluatedAtMs < 0) {
    throw new Error("Room audit clock must return a non-negative safe integer.");
  }
  const database = new DatabaseSync(options.databasePath, { readOnly: true });
  try {
    database.exec("PRAGMA query_only = ON; BEGIN;");
    const tables = database.prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('live_rooms', 'match_results')",
    ).all();
    if (!tables.some(table => table.name === "live_rooms")) {
      throw new Error("Audit database has no live_rooms table; no schema was created.");
    }
    const rooms = new Map<string, AuditedRoomState & { readonly rooms: number }>();
    const pending = new Map<string, AuditedRoomState & {
      readonly action: PendingAbsenceResolutionAction; readonly pendingResolutionEntries: number;
    }>();
    let invalidRoomDocuments = 0;
    const rows = database.prepare("SELECT session_id, document_json FROM live_rooms").all();
    for (const row of rows) {
      let document: LiveRoomPersistenceDocument;
      let state: AuditedRoomState;
      try {
        document = parseLiveRoomPersistenceDocument(String(row.document_json));
        if (document.sessionId !== row.session_id) throw new Error("Room key mismatch.");
        state = stateOf(document);
      } catch {
        // Never output parser errors or unvalidated nested strings.
        invalidRoomDocuments++;
        continue;
      }
      const key = JSON.stringify([state.mode, state.phase, state.occupiedSeats, state.adjudication]);
      rooms.set(key, Object.freeze({ ...state, rooms: (rooms.get(key)?.rooms ?? 0) + 1 }));
      for (const entry of document.absenceResolutions) {
        if (entry.status !== "PENDING") continue;
        const pendingKey = JSON.stringify([key, entry.action]);
        pending.set(pendingKey, Object.freeze({ ...state, action: entry.action,
          pendingResolutionEntries: (pending.get(pendingKey)?.pendingResolutionEntries ?? 0) + 1 }));
      }
    }
    const count = tables.some(table => table.name === "match_results")
      ? database.prepare("SELECT COUNT(*) AS count FROM match_results").get()?.count
      : null;
    if (count !== null && (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)) {
      throw new Error("Invalid durable result count.");
    }
    const compare = ([left]: readonly [string, unknown], [right]: readonly [string, unknown]) =>
      left < right ? -1 : left > right ? 1 : 0;
    return Object.freeze({ readOnly: true, presenceSource: "UNKNOWN_OFFLINE", evaluatedAtMs,
      scanned: rows.length, invalidRoomDocuments,
      roomsByState: Object.freeze([...rooms].sort(compare).map(([, group]) => group)),
      pendingResolutions: Object.freeze([...pending].sort(compare).map(([, group]) => group)),
      durableResultRows: count, resultValidation: "COUNT_ONLY" });
  } finally {
    database.close();
  }
}
