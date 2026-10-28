import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { createMatchMachine, createPlayerClientSnapshotDocument, CURRENT_MATCH_RULES_VERSION } from "@atoutia/belote-engine";
import { OfflineGame, chooseOfflineBot } from "../src/index.js";

function humanCommand(frame: ReturnType<OfflineGame["frame"]>) {
  const actions = frame.document.snapshot.actions;
  if (actions.mode === "BID") {
    const take = actions.biddingActions.find((action) => action.type === "TAKE")!;
    if (take.type !== "TAKE") throw new Error("Expected a take.");
    return { type: "TAKE", suit: take.suit };
  }
  return { type: "PLAY_CARD", card: actions.legalCards[0] };
}

function finish(game: OfflineGame): ReturnType<OfflineGame["frame"]> {
  for (let step = 0; step < 2000; step += 1) {
    const frame = game.frame();
    if (frame.document.snapshot.actions.mode === "MATCH_FINISHED") return frame;
    if (frame.document.snapshot.actions.mode === "WAIT") game.stepBot(frame.revision);
    else game.human(humanCommand(frame), frame.revision);
  }
  throw new Error("Offline game did not complete.");
}

describe("shared-engine offline game", () => {
  it("starts a private human snapshot identical to the original engine", () => {
    const frame = OfflineGame.start(37).frame();
    expect(frame.document).toEqual(createPlayerClientSnapshotDocument(createMatchMachine({ baseSeed: 37, firstDealer: "PLAYER_3", targetScore: 1000 }), "PLAYER_0"));
    expect(frame.document.snapshot.actions.mode).toBe("BID");
    expect(frame.revision).toBe(0);
    expect(frame.document.snapshot.match.hand).toHaveLength(5);
    expect(JSON.stringify(frame.document)).not.toMatch(/baseSeed|history|"hands"/);
    expect(JSON.parse(frame.save).replay.rulesVersion).toBe(CURRENT_MATCH_RULES_VERSION);
  });

  it("never plays for the human when asked to advance a bot", () => {
    const game = OfflineGame.start(1);
    const before = game.frame();
    game.stepBot(before.revision);
    expect(game.frame()).toEqual(before);
  });

  it("rejects stale and illegal actions without changing state", () => {
    const game = OfflineGame.start(2);
    const before = game.frame();
    expect(() => game.human({ type: "PLAY_CARD", card: { suit: "SPADES", rank: "ACE" } }, 0)).toThrow();
    expect(game.frame()).toEqual(before);
    game.human(humanCommand(before), 0);
    const after = game.frame();
    expect(() => game.human({ type: "PASS" }, 0)).toThrow(/revision/);
    expect(game.frame()).toEqual(after);
  });

  it("restores an active game and continues deterministically with the same bots", () => {
    const original = OfflineGame.start(10);
    original.human(humanCommand(original.frame()), 0);
    original.human(humanCommand(original.frame()), 1);
    const restored = OfflineGame.restore(original.frame().save);
    expect(restored.frame()).toEqual(original.frame());
    expect(finish(restored)).toEqual(finish(original));
  });

  it.each([1, 10, 37, 20261028])("finishes a real 1000-point match for seed %s", (seed) => {
    const frame = finish(OfflineGame.start(seed));
    const score = frame.document.snapshot.match.public.score;
    expect(score.completed).toBe(true);
    expect(score.winner).not.toBeNull();
    expect(Math.max(score.scores.TEAM_0, score.scores.TEAM_1)).toBeGreaterThanOrEqual(1000);
    expect(OfflineGame.restore(frame.save).frame()).toEqual(frame);
  });

  it("refuses unknown policies, malformed replay data and oversized saves", () => {
    const save = JSON.parse(OfflineGame.start(1).frame().save);
    expect(() => OfflineGame.restore(JSON.stringify({ ...save, botPolicy: "unknown" }))).toThrow(/Unsupported/);
    expect(() => OfflineGame.restore(JSON.stringify({ ...save, replay: { ...save.replay, rulesVersion: "unknown" } }))).toThrow();
    expect(() => OfflineGame.restore(" ".repeat(2 * 1024 * 1024 + 1))).toThrow(/large/);
    expect(() => OfflineGame.start(Number.NaN)).toThrow();
  });

  it("selects legal bot bids and cards using only the authorized snapshot", () => {
    const game = OfflineGame.start(1);
    expect(chooseOfflineBot(game.frame().document.snapshot)?.type).toBeDefined();
    game.human(humanCommand(game.frame()), 0);
    const action = chooseOfflineBot(game.frame().document.snapshot)!;
    expect(action.type).toBe("PLAY_CARD");
    if (action.type === "PLAY_CARD") expect(game.frame().document.snapshot.actions.legalCards).toContainEqual(action.card);
  });
});

describe("Android bundle without host/network APIs", () => {
  it("plays the same complete game as the module in a plain isolated JS context", () => {
    const source = readFileSync(new URL("../../../apps/android/app/src/main/assets/atoutia-offline-engine.js", import.meta.url), "utf8");
    const context = {};
    const request = runInNewContext(source + "\nAtoutiaOffline.request;", context, { timeout: 1000 }) as (value: string) => string;
    const call = (value: unknown) => JSON.parse(request(JSON.stringify(value))) as ReturnType<OfflineGame["frame"]>;
    const game = OfflineGame.start(37);
    let actual = call({ method: "start", seed: 37 });
    for (let step = 0; step < 2000; step += 1) {
      expect(actual).toEqual(JSON.parse(JSON.stringify(game.frame())));
      const mode = actual.document.snapshot.actions.mode;
      if (mode === "MATCH_FINISHED") break;
      if (mode === "WAIT") {
        game.stepBot(actual.revision);
        actual = call({ method: "bot", revision: actual.revision });
      } else {
        const command = humanCommand(actual);
        game.human(command, actual.revision);
        actual = call({ method: "human", revision: actual.revision, command });
      }
    }
    expect(actual.document.snapshot.match.public.score.completed).toBe(true);
    expect(runInNewContext("typeof fetch + ':' + typeof require + ':' + typeof WebSocket", context)).toBe("undefined:undefined:undefined");
    expect(() => call({ method: "eval", code: "fetch('https://example.test')" })).toThrow(/Unknown/);
  });
});
