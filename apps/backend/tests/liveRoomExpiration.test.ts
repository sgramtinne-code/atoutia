import { describe, expect, it } from "vitest";
import { PLAYER_POSITIONS } from "@atoutia/belote-engine";
import { type LiveRoomPersistenceDocument } from "../src/liveRoomPersistenceDocument.js";
import {
  classifyLiveRoomExpiration, DEFAULT_LIVE_ROOM_EXPIRATION_POLICY,
  type LiveRoomExpirationPolicy, type LiveRoomExpirationPresence,
} from "../src/liveRoomExpiration.js";
import { diagnosticDocument } from "./helpers/diagnosticDocument.js";

const nowMs = 10_000;
const policy: LiveRoomExpirationPolicy = {
  emptyWaitingIdleMs: 100, occupiedWaitingIdleMs: 200,
  inProgressIdleMs: 300, confirmedAbsenceMs: 400,
};


function presence(document: LiveRoomPersistenceDocument, overrides: Partial<LiveRoomExpirationPresence> = {}): LiveRoomExpirationPresence {
  return { sessionId: document.sessionId, revision: document.room.revision, observedAtMs: nowMs,
    players: PLAYER_POSITIONS.map(player => ({ player, state: "ABSENT",
      disconnectedAtMs: 2_000, graceDeadlineAtMs: 3_000 })), ...overrides };
}

function evaluate(document: LiveRoomPersistenceDocument, observation?: LiveRoomExpirationPresence) {
  return classifyLiveRoomExpiration({ document, policy, now: () => nowMs, resultState: "MISSING",
    ...(observation ? { presence: observation } : {}) });
}

function deepFreeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
}

describe("read-only room expiration classifier", () => {
  it.each([-1, 0, 1])("classifies empty waiting rooms around their threshold (%i)", offset => {
    const doc = { ...diagnosticDocument(), lastActivityAtMs: nowMs - policy.emptyWaitingIdleMs - offset };
    expect(evaluate(doc)).toMatchObject({ classification: offset < 0 ? "WAITING_EMPTY" : "ABANDONMENT_CANDIDATE" });
  });

  it.each(["PRIVATE", "CASUAL", "RANKED"] as const)("protects offline occupied %s rooms, including after restart", mode => {
    const doc = diagnosticDocument(1, mode);
    expect(evaluate(doc).reason).toBe("UNKNOWN_PRESENCE");
    const observation = presence(doc);
    expect(evaluate(doc, { ...observation, players: observation.players.map(state => ({
      ...state, disconnectedAtMs: null, graceDeadlineAtMs: null,
    })) }).reason).toBe("UNKNOWN_PRESENCE");
  });

  it.each([1, 4])("protects connected but inactive occupants (%i seats)", count => {
    const doc = diagnosticDocument(count);
    const observation = presence(doc);
    const first = observation.players[0]!;
    expect(evaluate(doc, { ...observation, players: [{ ...first, state: "CONNECTED",
      disconnectedAtMs: null, graceDeadlineAtMs: null }, ...observation.players.slice(1)] }).reason).toBe("CONNECTED_PLAYER");
  });

  it("classifies READY as an occupied lobby and protects it without presence", () => {
    const doc = diagnosticDocument(4);
    expect(doc.room.managedRoom.phase).toBe("READY");
    expect(evaluate(doc).reason).toBe("UNKNOWN_PRESENCE");
    expect(evaluate(doc, presence(doc))).toMatchObject({ classification: "ABANDONMENT_CANDIDATE", reason: "ALL_OCCUPANTS_CONFIRMED_ABSENT" });
  });

  it("protects reconnection and then a restored Android connection without touching activity", () => {
    const doc = diagnosticDocument(4, "PRIVATE", true);
    const observation = presence(doc);
    const reconnecting = { ...observation, players: observation.players.map(state => ({ ...state, state: "RECONNECTING" as const })) };
    expect(evaluate(doc, reconnecting)).toMatchObject({ classification: "INTERRUPTED", reason: "RECONNECTING_PLAYER" });
    expect(evaluate(doc, { ...reconnecting, players: reconnecting.players.map(state => ({ ...state, state: "CONNECTED" as const })) }).reason).toBe("CONNECTED_PLAYER");
    expect(doc.lastActivityAtMs).toBe(1_000);
  });

  it.each([-1, 0, 1])("requires both occupied waiting idle time and observed absence (%i)", offset => {
    const doc = { ...diagnosticDocument(2), lastActivityAtMs: nowMs - policy.occupiedWaitingIdleMs - offset };
    expect(evaluate(doc, presence(doc)).classification).toBe(offset < 0 ? "WAITING_OCCUPIED" : "ABANDONMENT_CANDIDATE");
    const observation = presence(doc);
    const recent = { ...observation, players: observation.players.map(state => ({ ...state,
      graceDeadlineAtMs: nowMs - policy.confirmedAbsenceMs - offset })) };
    const oldDoc = { ...doc, lastActivityAtMs: 1_000 };
    expect(evaluate(oldDoc, recent).classification).toBe(offset < 0 ? "WAITING_OCCUPIED" : "ABANDONMENT_CANDIDATE");
  });

  it.each([-1, 0, 1])("classifies PRIVATE interrupted games around the idle threshold (%i)", offset => {
    const doc = { ...diagnosticDocument(4, "PRIVATE", true), lastActivityAtMs: nowMs - policy.inProgressIdleMs - offset };
    expect(evaluate(doc, presence(doc)).classification).toBe(offset < 0 ? "INTERRUPTED" : "ABANDONMENT_CANDIDATE");
  });

  it.each(["CASUAL", "RANKED"] as const)("preserves existing %s resolution rules", mode => {
    const doc = diagnosticDocument(4, mode, true);
    expect(evaluate(doc, presence(doc)).reason).toBe(mode === "RANKED"
      ? "RANKED_REQUIRES_ADJUDICATION" : "CASUAL_REQUIRES_ABSENCE_RESOLUTION");
  });

  it("protects pending resolutions and bots, even when their original human is absent", () => {
    const doc = diagnosticDocument(4, "CASUAL", true);
    expect(evaluate({ ...doc, absenceResolutions: [{ player: "PLAYER_1", action: "BOT_TAKEOVER", status: "PENDING" }] }, presence(doc)).reason)
      .toBe("PENDING_ABSENCE_RESOLUTION");
    expect(evaluate({ ...doc, seatControls: doc.seatControls.map(control => ({ ...control, controller: "BOT" })) }, presence(doc)).reason)
      .toBe("BOT_CONTROLLED_SEAT");
  });

  it.each(["MISSING", "PRESENT", "UNKNOWN"] as const)("checks durable result state %s for completed forfeits", resultState => {
    const doc = { ...diagnosticDocument(4, "RANKED", true), adjudication: {
      status: "COMPLETED" as const, completion: "FORFEIT" as const, reason: "PLAYER_ABSENCE" as const,
      forfeitingPlayer: "PLAYER_0" as const, losingTeam: "TEAM_0" as const, winningTeam: "TEAM_1" as const, completedAtMs: 9_000,
    } };
    expect(classifyLiveRoomExpiration({ document: doc, resultState, now: () => nowMs, policy }).reason).toBe(
      resultState === "PRESENT" ? "COMPLETED_WITH_RESULT" : resultState === "MISSING" ? "COMPLETED_WITHOUT_RESULT" : "RESULT_STATE_UNKNOWN");
  });

  it("recognizes normal completed games only with completed engine score and durable result", () => {
    const original = diagnosticDocument(4, "PRIVATE", true);
    const managed = original.room.managedRoom;
    const session = managed.room.session;
    const doc: LiveRoomPersistenceDocument = { ...original,
      room: { ...original.room, managedRoom: { ...managed, phase: "FINISHED",
        room: { ...managed.room, session: { ...session, state: { ...session.state,
          score: { ...session.state.score, completed: true, winner: "TEAM_0" },
        } } } } },
      adjudication: { status: "COMPLETED", completion: "NORMAL", completedAtMs: 9_000 },
    };
    expect(classifyLiveRoomExpiration({ document: doc, resultState: "PRESENT", now: () => nowMs }).classification).toBe("COMPLETED");
    expect(evaluate(doc).reason).toBe("COMPLETED_WITHOUT_RESULT");
    expect(evaluate({ ...original, adjudication: doc.adjudication }).reason).toBe("INVALID_DOCUMENT");
  });

  it("protects active rooms with a durable result and incomplete adjudication", () => {
    const doc = diagnosticDocument();
    expect(classifyLiveRoomExpiration({ document: doc, resultState: "PRESENT", now: () => nowMs }).reason).toBe("RESULT_WITH_ACTIVE_ROOM");
    expect(evaluate({ ...doc, room: { ...doc.room, managedRoom: { ...doc.room.managedRoom, phase: "FINISHED" } } }).reason).toBe("INVALID_DOCUMENT");
  });

  it.each([
    [null, null, "MISSING_ACTIVITY_TIMESTAMPS"],
    [undefined, undefined, "MISSING_ACTIVITY_TIMESTAMPS"],
    [null, 1_000, "INVALID_ACTIVITY_TIMESTAMPS"],
    [2_000, 1_000, "INVALID_ACTIVITY_TIMESTAMPS"],
    [-1, 1_000, "INVALID_ACTIVITY_TIMESTAMPS"],
    [NaN, 1_000, "INVALID_ACTIVITY_TIMESTAMPS"],
    [0, 1.5, "INVALID_ACTIVITY_TIMESTAMPS"],
    [0, Infinity, "INVALID_ACTIVITY_TIMESTAMPS"],
    [0, nowMs + 1, "FUTURE_ACTIVITY_TIMESTAMPS"],
  ])("protects invalid or missing timestamps %s / %s", (createdAtMs, lastActivityAtMs, reason) => {
    const doc = { ...diagnosticDocument(), createdAtMs, lastActivityAtMs } as LiveRoomPersistenceDocument;
    expect(evaluate(doc).reason).toBe(reason);
  });

  it.each(["session", "revision", "stale", "future", "duplicate", "missing", "futureDeadline", "badOrder"])("rejects unsafe presence: %s", kind => {
    const doc = diagnosticDocument(4, "PRIVATE", true);
    let observation = presence(doc);
    if (kind === "session") observation = { ...observation, sessionId: "another-room" };
    if (kind === "revision") observation = { ...observation, revision: doc.room.revision - 1 };
    if (kind === "stale") observation = { ...observation, observedAtMs: nowMs - 1 };
    if (kind === "future") observation = { ...observation, observedAtMs: nowMs + 1 };
    if (kind === "duplicate") observation = { ...observation, players: [...observation.players, observation.players[0]!] };
    if (kind === "missing") observation = { ...observation, players: observation.players.slice(1) };
    if (kind === "futureDeadline") observation = { ...observation, players: observation.players.map(state => ({ ...state, graceDeadlineAtMs: nowMs + 1 })) };
    if (kind === "badOrder") observation = { ...observation, players: observation.players.map(state => ({ ...state, disconnectedAtMs: 4_000 })) };
    expect(evaluate(doc, observation).reason).toBe("UNKNOWN_PRESENCE");
  });

  it("does not mutate even deeply frozen documents or observations and samples the clock once", () => {
    const doc = diagnosticDocument(4, "PRIVATE", true);
    const observation = presence(doc);
    const before = JSON.stringify({ doc, observation });
    deepFreeze(doc); deepFreeze(observation);
    let calls = 0;
    const decision = classifyLiveRoomExpiration({ document: doc, presence: observation,
      policy, resultState: "MISSING", now: () => { calls++; return nowMs; } });
    expect(decision.classification).toBe("ABANDONMENT_CANDIDATE");
    expect(calls).toBe(1);
    expect(JSON.stringify({ doc, observation })).toBe(before);
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid configurable durations and clocks: %s", value => {
    const document = diagnosticDocument();
    expect(() => classifyLiveRoomExpiration({ document, resultState: "MISSING", policy: {
      ...DEFAULT_LIVE_ROOM_EXPIRATION_POLICY, confirmedAbsenceMs: value,
    } })).toThrow();
    if (value !== 0) expect(() => classifyLiveRoomExpiration({ document, resultState: "MISSING", now: () => value })).toThrow();
  });
});
