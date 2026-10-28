import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CURRENT_MATCH_RULES_VERSION, LEGACY_MATCH_RULES_VERSION,
  MATCH_REPLAY_FORMAT_VERSION,
  applyMatchBiddingAction, applyMatchCardPlay,
  createMatchMachine, createMatchReplayDocument,
  hashMatchReplayDocument, parseAndVerifyMatchReplayIntegrityJson,
  parseMatchReplayDocument, replayMatch, replayMatchDocument,
  serializeMatchReplayDocument, type MatchReplayDocument,
  type MatchRulesVersion, type TeamPoints,
} from "../src/index.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/litige-legacy-replay.json", import.meta.url), "utf8")) as {
  replay: MatchReplayDocument;
  expected: { scores: TeamPoints; dealNumber: number; pendingPoints: number; sha256: string };
};
const currentReplay: MatchReplayDocument = { ...fixture.replay, formatVersion: MATCH_REPLAY_FORMAT_VERSION, rulesVersion: CURRENT_MATCH_RULES_VERSION };

describe("match rules and persisted replay compatibility", () => {
  it("creates new matches with explicit winner rules and preserves the old state shape for legacy", () => {
    expect(createMatchMachine({ baseSeed: 1 }).rulesVersion).toBe(CURRENT_MATCH_RULES_VERSION);
    expect(createMatchMachine({ baseSeed: 1, rulesVersion: LEGACY_MATCH_RULES_VERSION })).not.toHaveProperty("rulesVersion");
  });

  it("replays a real pre-fix synthetic history with its exact historical scores and hash", async () => {
    const parsed = parseMatchReplayDocument(JSON.stringify(fixture.replay));
    expect(parsed).not.toHaveProperty("rulesVersion");
    expect(await hashMatchReplayDocument(parsed)).toBe(fixture.expected.sha256);
    const restored = replayMatchDocument(parsed);
    expect(restored.score.scores).toEqual(fixture.expected.scores);
    expect(restored.dealNumber).toBe(fixture.expected.dealNumber);
    expect(restored.litigeState.pendingPoints).toBe(fixture.expected.pendingPoints);
    expect(restored).not.toHaveProperty("rulesVersion");
    expect(createMatchReplayDocument(restored)).toEqual(parsed);
  });

  it("applies winner rules to the same actions only when explicitly selected", () => {
    const current = replayMatchDocument(currentReplay);
    expect(current.score.scores).toEqual({ TEAM_0: 666, TEAM_1: 832 });
    expect(current.rulesVersion).toBe(CURRENT_MATCH_RULES_VERSION);
    expect(createMatchReplayDocument(current).rulesVersion).toBe(CURRENT_MATCH_RULES_VERSION);
    expect(parseMatchReplayDocument(serializeMatchReplayDocument(createMatchReplayDocument(current)))).toEqual(createMatchReplayDocument(current));
  });

  it("continues a JSON-restored unversioned match under legacy rules at the decisive card", () => {
    const history = fixture.replay.history.slice(0, -1);
    const last = fixture.replay.history.at(-1)!;
    if (last.type !== "CARD_PLAY") throw new Error("Fixture must stop at a decisive card.");
    const before = JSON.parse(JSON.stringify(replayMatchDocument({ ...fixture.replay, history })));
    expect(before.litigeState.pendingPoints).toBe(81);
    expect(before.rulesVersion).toBeUndefined();
    const after = applyMatchCardPlay(before, last.player, last.card).state;
    expect(after.score.scores).toEqual(fixture.expected.scores);
    expect(after).not.toHaveProperty("rulesVersion");
    expect(before.litigeState.pendingPoints).toBe(81);
  });

  it("keeps the selected rules after a finished deal and the next bid", () => {
    const state = replayMatchDocument(currentReplay);
    expect(state.currentDeal.phase).toBe("BIDDING");
    const next = applyMatchBiddingAction(state, { type: "PASS", player: state.currentDeal.bidding.currentPlayer });
    expect(next.rulesVersion).toBe(CURRENT_MATCH_RULES_VERSION);
    expect(next.score.scores).toEqual(state.score.scores);
  });

  it("allows explicit legacy replay from raw history", () => {
    expect(replayMatch({ ...fixture.replay, rulesVersion: LEGACY_MATCH_RULES_VERSION }).score.scores).toEqual(fixture.expected.scores);
  });

  it("binds the rules version into replay integrity while retaining old hashes", async () => {
    const oldHash = await hashMatchReplayDocument(fixture.replay);
    const current = currentReplay;
    const currentHash = await hashMatchReplayDocument(current);
    expect(currentHash).not.toBe(oldHash);
    await expect(parseAndVerifyMatchReplayIntegrityJson(JSON.stringify({ replay: fixture.replay, sha256: currentHash }))).rejects.toThrow("Replay integrity verification failed.");
    const verified = await parseAndVerifyMatchReplayIntegrityJson(JSON.stringify({ replay: fixture.replay, sha256: oldHash }));
    expect(verified.replay).toEqual(fixture.replay);
  });

  it("rejects unknown rules rather than guessing or relabeling them", () => {
    const unknown = "UNKNOWN" as MatchRulesVersion;
    expect(() => createMatchMachine({ baseSeed: 1, rulesVersion: unknown })).toThrow("Unsupported match rules version.");
    expect(() => parseMatchReplayDocument(JSON.stringify({ ...currentReplay, rulesVersion: unknown }))).toThrow("Unsupported match rules version.");
    expect(() => parseMatchReplayDocument(JSON.stringify({ ...currentReplay, rulesVersion: null }))).toThrow("Unsupported match rules version.");
    expect(() => replayMatchDocument({ ...currentReplay, rulesVersion: unknown })).toThrow("Unsupported match rules version.");
  });

  it("requires explicit rules for format 2 and refuses relabeled format 1 replays", () => {
    expect(() => parseMatchReplayDocument(JSON.stringify({ ...fixture.replay, formatVersion: MATCH_REPLAY_FORMAT_VERSION }))).toThrow("Replay rules version is required.");
    expect(() => replayMatchDocument({ ...fixture.replay, formatVersion: MATCH_REPLAY_FORMAT_VERSION })).toThrow("Replay rules version is required.");
    expect(() => replayMatchDocument({ ...currentReplay, formatVersion: 1 })).toThrow("Legacy replay must not declare a rules version.");
  });
});
