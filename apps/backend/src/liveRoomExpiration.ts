import { PLAYER_POSITIONS, type PlayerPosition } from "@atoutia/belote-engine";
import type { AbsenceConnectionState } from "./absencePolicy.js";
import type { LiveRoomPersistenceDocument } from "./liveRoomPersistenceDocument.js";

/** Provisional diagnostic thresholds, never deletion deadlines. */
export interface LiveRoomExpirationPolicy {
  readonly emptyWaitingIdleMs: number;
  readonly occupiedWaitingIdleMs: number;
  readonly inProgressIdleMs: number;
  readonly confirmedAbsenceMs: number;
}

export const DEFAULT_LIVE_ROOM_EXPIRATION_POLICY: LiveRoomExpirationPolicy = Object.freeze({
  emptyWaitingIdleMs: 60 * 60_000,
  occupiedWaitingIdleMs: 24 * 60 * 60_000,
  inProgressIdleMs: 7 * 24 * 60 * 60_000,
  confirmedAbsenceMs: 24 * 60 * 60_000,
});

/** Trusted server observation only; never reconstruct this from persisted seats.
 * Must be sampled synchronously with the document and classification clock.
 * ABSENT with null timestamps (the realtime restart state) remains UNKNOWN.
 */
export interface LiveRoomExpirationPresence {
  readonly sessionId: string;
  readonly revision: number;
  readonly observedAtMs: number;
  readonly players: readonly (AbsenceConnectionState & { readonly player: PlayerPosition })[];
}

export type LiveRoomExpirationClassification =
  | "PROTECTED"
  | "WAITING_EMPTY"
  | "WAITING_OCCUPIED"
  | "INTERRUPTED"
  | "ABANDONMENT_CANDIDATE"
  | "COMPLETED";

export type LiveRoomExpirationReason =
  | "INVALID_DOCUMENT"
  | "MISSING_ACTIVITY_TIMESTAMPS"
  | "INVALID_ACTIVITY_TIMESTAMPS"
  | "FUTURE_ACTIVITY_TIMESTAMPS"
  | "RESULT_STATE_UNKNOWN"
  | "RESULT_WITH_ACTIVE_ROOM"
  | "COMPLETED_WITHOUT_RESULT"
  | "COMPLETED_WITH_RESULT"
  | "CONNECTED_PLAYER"
  | "RECONNECTING_PLAYER"
  | "UNKNOWN_PRESENCE"
  | "RECENT_ABSENCE"
  | "BOT_CONTROLLED_SEAT"
  | "PENDING_ABSENCE_RESOLUTION"
  | "RANKED_REQUIRES_ADJUDICATION"
  | "CASUAL_REQUIRES_ABSENCE_RESOLUTION"
  | "IDLE_THRESHOLD_NOT_REACHED"
  | "EMPTY_WAITING_IDLE_THRESHOLD_REACHED"
  | "ALL_OCCUPANTS_CONFIRMED_ABSENT";

export interface LiveRoomExpirationDecision {
  readonly classification: LiveRoomExpirationClassification;
  readonly reason: LiveRoomExpirationReason;
  readonly evaluatedAtMs: number;
}

export function validateLiveRoomExpirationPolicy(policy: LiveRoomExpirationPolicy): void {
  for (const value of [policy.emptyWaitingIdleMs, policy.occupiedWaitingIdleMs,
    policy.inProgressIdleMs, policy.confirmedAbsenceMs]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error("Expiration diagnostic durations must be positive safe integers.");
    }
  }
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Pure classification: no store, repository, mutation, timer or resolution handler. */
export function classifyLiveRoomExpiration(options: {
  readonly document: LiveRoomPersistenceDocument;
  readonly resultState: "PRESENT" | "MISSING" | "UNKNOWN";
  readonly presence?: LiveRoomExpirationPresence;
  readonly policy?: LiveRoomExpirationPolicy;
  readonly now?: () => number;
}): LiveRoomExpirationDecision {
  const nowMs = (options.now ?? Date.now)();
  if (!isTimestamp(nowMs)) {
    throw new Error("Expiration diagnostic clock must return a non-negative safe integer.");
  }
  const policy = options.policy ?? DEFAULT_LIVE_ROOM_EXPIRATION_POLICY;
  validateLiveRoomExpirationPolicy(policy);
  const decide = (classification: LiveRoomExpirationClassification,
    reason: LiveRoomExpirationReason): LiveRoomExpirationDecision =>
    Object.freeze({ classification, reason, evaluatedAtMs: nowMs });
  const protect = (reason: LiveRoomExpirationReason): LiveRoomExpirationDecision =>
    decide("PROTECTED", reason);
  const doc = options.document;
  const managed = doc.room?.managedRoom;
  const assignments = managed?.room?.seats?.assignments;
  const phase = managed?.phase;
  if (doc.formatVersion !== 1 || !assignments ||
    doc.sessionId !== managed?.room?.session?.sessionId ||
    !isTimestamp(doc.room.revision) ||
    !["PRIVATE", "CASUAL", "RANKED"].includes(doc.mode) ||
    !["WAITING_FOR_PLAYERS", "READY", "IN_PROGRESS", "FINISHED"].includes(phase) ||
    !["ACTIVE", "COMPLETED"].includes(doc.adjudication?.status) ||
    !Array.isArray(doc.seatControls) || !Array.isArray(doc.absenceResolutions) ||
    doc.seatControls.length !== 4 ||
    PLAYER_POSITIONS.some(player =>
      !(assignments[player] === null ||
        (typeof assignments[player] === "string" && assignments[player].trim().length > 0)) ||
      doc.seatControls.filter(control => control?.player === player &&
        ["HUMAN", "BOT"].includes(control.controller)).length !== 1)) {
    return protect("INVALID_DOCUMENT");
  }
  const { createdAtMs, lastActivityAtMs } = doc;
  if (createdAtMs == null && lastActivityAtMs == null) {
    return protect("MISSING_ACTIVITY_TIMESTAMPS");
  }
  if (!isTimestamp(createdAtMs) || !isTimestamp(lastActivityAtMs) || lastActivityAtMs < createdAtMs) {
    return protect("INVALID_ACTIVITY_TIMESTAMPS");
  }
  if (lastActivityAtMs > nowMs) {
    return protect("FUTURE_ACTIVITY_TIMESTAMPS");
  }
  if (options.resultState === "UNKNOWN") {
    return protect("RESULT_STATE_UNKNOWN");
  }
  const occupied = PLAYER_POSITIONS.filter(player => assignments[player] !== null);
  if (doc.adjudication.status === "COMPLETED") {
    if (occupied.length !== 4 || !isTimestamp(doc.adjudication.completedAtMs) || doc.adjudication.completedAtMs > nowMs ||
      !(doc.adjudication.completion === "NORMAL" && phase === "FINISHED" &&
        managed.room.session.state?.score?.completed === true &&
        managed.room.session.state.score.winner !== null ||
        doc.adjudication.completion === "FORFEIT" && doc.mode === "RANKED" && phase === "IN_PROGRESS")) {
      return protect("INVALID_DOCUMENT");
    }
    return options.resultState === "PRESENT"
      ? decide("COMPLETED", "COMPLETED_WITH_RESULT")
      : protect("COMPLETED_WITHOUT_RESULT");
  }
  if (phase === "FINISHED") {
    return protect("INVALID_DOCUMENT");
  }
  if (options.resultState === "PRESENT") {
    return protect("RESULT_WITH_ACTIVE_ROOM");
  }
  if (doc.adjudication.completion !== null || doc.adjudication.completedAtMs !== null) {
    return protect("INVALID_DOCUMENT");
  }
  if (((phase === "IN_PROGRESS" || phase === "READY") && occupied.length !== 4) ||
    (phase === "WAITING_FOR_PLAYERS" && occupied.length === 4) ||
    new Set(occupied.map(player => assignments[player])).size !== occupied.length ||
    doc.absenceResolutions.some(resolution => !resolution ||
      !PLAYER_POSITIONS.includes(resolution.player) ||
      !["MANUAL_ONLY", "BOT_TAKEOVER", "TEAM_FORFEIT"].includes(resolution.action) ||
      !["PENDING", "RESOLVED_BY_BOT", "RESOLVED_BY_FORFEIT", "RESOLVED_MANUALLY"].includes(resolution.status))) {
    return protect("INVALID_DOCUMENT");
  }
  if (doc.absenceResolutions.some(resolution => resolution?.status === "PENDING")) {
    return protect("PENDING_ABSENCE_RESOLUTION");
  }
  if (doc.seatControls.some(control => control.controller === "BOT")) {
    return protect("BOT_CONTROLLED_SEAT");
  }
  if (occupied.length === 0) {
    return nowMs - lastActivityAtMs >= policy.emptyWaitingIdleMs
      ? decide("ABANDONMENT_CANDIDATE", "EMPTY_WAITING_IDLE_THRESHOLD_REACHED")
      : decide("WAITING_EMPTY", "IDLE_THRESHOLD_NOT_REACHED");
  }
  const interrupted = phase === "IN_PROGRESS" ? "INTERRUPTED" : "WAITING_OCCUPIED";
  const presence = options.presence;
  if (!presence || presence.sessionId !== doc.sessionId || presence.revision !== doc.room.revision ||
    presence.observedAtMs !== nowMs || !Array.isArray(presence.players)) {
    return protect("UNKNOWN_PRESENCE");
  }
  const states = occupied.map(player => presence.players.filter(state => state.player === player));
  // A connection or reconnection protects the whole room, irrespective of idle age.
  if (states.some(entries => entries.some(state => state.state === "CONNECTED"))) {
    return protect("CONNECTED_PLAYER");
  }
  if (states.some(entries => entries.some(state => state.state === "RECONNECTING"))) {
    return decide(interrupted, "RECONNECTING_PLAYER");
  }
  const absentSince: number[] = [];
  for (const entries of states) {
    const state = entries[0];
    if (entries.length !== 1 || !state || state.state !== "ABSENT" ||
      !isTimestamp(state.disconnectedAtMs) || !isTimestamp(state.graceDeadlineAtMs) ||
      state.graceDeadlineAtMs < state.disconnectedAtMs || state.graceDeadlineAtMs > nowMs) {
      return protect("UNKNOWN_PRESENCE");
    }
    absentSince.push(state.graceDeadlineAtMs);
  }
  if (absentSince.some(since => nowMs - since < policy.confirmedAbsenceMs)) {
    return decide(interrupted, "RECENT_ABSENCE");
  }
  const idleMs = phase === "IN_PROGRESS" ? policy.inProgressIdleMs : policy.occupiedWaitingIdleMs;
  if (nowMs - lastActivityAtMs < idleMs) {
    return decide(interrupted, "IDLE_THRESHOLD_NOT_REACHED");
  }
  if (phase === "IN_PROGRESS" && doc.mode === "RANKED") {
    return protect("RANKED_REQUIRES_ADJUDICATION");
  }
  if (phase === "IN_PROGRESS" && doc.mode === "CASUAL") {
    return protect("CASUAL_REQUIRES_ABSENCE_RESOLUTION");
  }
  return decide("ABANDONMENT_CANDIDATE", "ALL_OCCUPANTS_CONFIRMED_ABSENT");
}
