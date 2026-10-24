import { isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  classifyLiveRoomExpiration,
  validateLiveRoomExpirationPolicy,
  DEFAULT_LIVE_ROOM_EXPIRATION_POLICY,
  type LiveRoomExpirationDecision,
  type LiveRoomExpirationPolicy,
} from "./liveRoomExpiration.js";
import { parseLiveRoomPersistenceDocument } from "./liveRoomPersistenceDocument.js";
import { parseMatchResultDocument } from "./matchResultDocument.js";

export interface LiveRoomExpirationPreviewRow extends LiveRoomExpirationDecision {
  readonly sessionId: string;
}

/** Offline observation only: occupied seats have UNKNOWN presence.
 * Opens an existing database read-only, with no schema creation or store hydration.
 * A single read transaction keeps rooms and results in the same SQLite snapshot.
 */
export function previewSQLiteLiveRoomExpiration(options: {
  readonly databasePath: string;
  readonly policy?: LiveRoomExpirationPolicy;
  readonly now?: () => number;
}): readonly LiveRoomExpirationPreviewRow[] {
  if (!isAbsolute(options.databasePath)) {
    throw new Error("An explicit absolute diagnostic database path is required.");
  }
  const policy = options.policy ?? DEFAULT_LIVE_ROOM_EXPIRATION_POLICY;
  validateLiveRoomExpirationPolicy(policy);
  const evaluatedAtMs = (options.now ?? Date.now)();
  if (!Number.isSafeInteger(evaluatedAtMs) || evaluatedAtMs < 0) {
    throw new Error("Expiration diagnostic clock must return a non-negative safe integer.");
  }
  const database = new DatabaseSync(options.databasePath, { readOnly: true });
  try {
    database.exec("PRAGMA query_only = ON; BEGIN;");
    const tables = database.prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('live_rooms', 'match_results')",
    ).all();
    if (!tables.some(table => table.name === "live_rooms")) {
      throw new Error("Diagnostic database has no live_rooms table; no schema was created.");
    }
    const hasResults = tables.some(table => table.name === "match_results");
    const rows = database.prepare(
      "SELECT session_id, document_json FROM live_rooms ORDER BY session_id",
    ).all();
    const getResult = hasResults ? database.prepare(
      "SELECT document_json FROM match_results WHERE session_id = ?",
    ) : undefined;
    return Object.freeze(rows.map(row => {
      const sessionId = String(row.session_id);
      try {
        const document = parseLiveRoomPersistenceDocument(String(row.document_json));
        if (document.sessionId !== sessionId) {
          throw new Error("Room key mismatch.");
        }
        let resultState: "PRESENT" | "MISSING" | "UNKNOWN" = "UNKNOWN";
        if (getResult) {
          const resultRow = getResult.get(sessionId);
          resultState = "MISSING";
          if (resultRow) {
            // A malformed or mismatched result never counts as durable proof.
            try {
              const result = parseMatchResultDocument(String(resultRow.document_json));
              const adjudication = document.adjudication;
              const assignments = document.room.managedRoom.room.seats.assignments;
              const score = document.room.managedRoom.room.session.state.score;
              const sameCompletion = adjudication.status === "COMPLETED" &&
                result.completedAtMs === adjudication.completedAtMs &&
                (result.completion === "NORMAL" && adjudication.completion === "NORMAL" &&
                  score.completed && score.winner === result.winningTeam &&
                  result.score.targetScore === score.targetScore &&
                  result.score.TEAM_0 === score.scores.TEAM_0 &&
                  result.score.TEAM_1 === score.scores.TEAM_1 ||
                result.completion === "FORFEIT" && adjudication.completion === "FORFEIT" &&
                  result.forfeitingPlayer === adjudication.forfeitingPlayer &&
                  result.reason === adjudication.reason &&
                  result.winningTeam === adjudication.winningTeam &&
                  result.losingTeam === adjudication.losingTeam);
              resultState = result.sessionId === sessionId && result.mode === document.mode &&
                sameCompletion && Object.entries(result.participants).every(([player, participant]) =>
                  assignments[player as keyof typeof assignments] === participant)
                ? "PRESENT" : "UNKNOWN";
            } catch {
              resultState = "UNKNOWN";
            }
          }
        }
        return Object.freeze({ sessionId, ...classifyLiveRoomExpiration({
          document, resultState, policy, now: () => evaluatedAtMs,
        }) });
      } catch {
        // Do not include parser exceptions: they may contain private document data.
        return Object.freeze({ sessionId, classification: "PROTECTED" as const,
          reason: "INVALID_DOCUMENT" as const, evaluatedAtMs });
      }
    }));
  } finally {
    // Closing rolls back the read transaction. No INSERT/UPDATE/DELETE/DDL is used.
    database.close();
  }
}
