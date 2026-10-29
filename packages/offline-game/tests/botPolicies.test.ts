import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { createCard, createMatchMachine, createPlayerClientSnapshot, type Card, type PlayedCard, type PlayerClientSnapshot, type PlayerPosition } from "@atoutia/belote-engine";
import { OfflineGame, OFFLINE_BOT_POLICIES, type OfflineBotPolicy } from "../src/index.js";
import { chooseStyledOfflineBot } from "../src/botPolicies.js";

const styles = ["varied-v1", "careful-v1", "bold-v1"] as const;
const c = createCard;
function playSnapshot(player: PlayerPosition, hand: readonly Card[], plays: readonly PlayedCard[] = []): PlayerClientSnapshot {
  const original = createPlayerClientSnapshot(createMatchMachine({ baseSeed: 37, firstDealer: "PLAYER_3", targetScore: 1000 }), player);
  return {
    match: { ...original.match, hand, legalCards: hand, public: { ...original.match.public, phase: "PLAYING", biddingPlayer: null,
      trumpSuit: "HEARTS", currentTrick: { currentPlayer: player, plays } } },
    actions: { player, mode: "PLAY_CARD", legalCards: hand, biddingActions: [] },
  };
}
function bidSnapshot(player: PlayerPosition): PlayerClientSnapshot {
  const original = playSnapshot(player, [c("CLUBS", "JACK"), c("HEARTS", "SEVEN"), c("SPADES", "EIGHT"), c("DIAMONDS", "NINE"), c("HEARTS", "TEN")]);
  return { match: { ...original.match, public: { ...original.match.public, phase: "BIDDING", trumpSuit: null,
    biddingPlayer: player, currentTrick: null, turnUpCard: c("CLUBS", "SEVEN") } },
    actions: { player, mode: "BID", legalCards: [], biddingActions: [{ type: "PASS", player }, { type: "TAKE", player, suit: "CLUBS" }] } };
}
function advance(game: OfflineGame) {
  const frame = game.frame();
  const actions = frame.document.snapshot.actions;
  if (actions.mode === "WAIT") game.stepBot(frame.revision);
  else if (actions.mode === "BID") {
    const take = actions.biddingActions.find((action) => action.type === "TAKE")!;
    if (take.type !== "TAKE") throw new Error("No take.");
    game.human({ type: "TAKE", suit: take.suit }, frame.revision);
  } else game.human({ type: "PLAY_CARD", card: actions.legalCards[0] }, frame.revision);
}
function finish(game: OfflineGame) {
  for (let i = 0; i < 2000; i++) {
    if (game.frame().document.snapshot.actions.mode === "MATCH_FINISHED") return game.frame();
    advance(game);
  }
  throw new Error("Incomplete offline match.");
}

describe("versioned local bot styles", () => {
  it("takes more risks when bidding and assigns three styles in the varied table", () => {
    expect(chooseStyledOfflineBot(bidSnapshot("PLAYER_1"), "careful-v1")).toEqual({ type: "PASS" });
    expect(chooseStyledOfflineBot(bidSnapshot("PLAYER_1"), "bold-v1")).toEqual({ type: "TAKE", suit: "CLUBS" });
    expect(chooseStyledOfflineBot(bidSnapshot("PLAYER_1"), "varied-v1")).toEqual({ type: "PASS" });
    expect(chooseStyledOfflineBot(bidSnapshot("PLAYER_2"), "varied-v1")).toEqual({ type: "PASS" });
    expect(chooseStyledOfflineBot(bidSnapshot("PLAYER_3"), "varied-v1")).toEqual({ type: "TAKE", suit: "CLUBS" });
  });

  it("conserves cards, supports a winning partner or attacks on the same authorized hand", () => {
    const hand = [c("CLUBS", "SEVEN"), c("CLUBS", "QUEEN"), c("CLUBS", "ACE")];
    const snapshot = playSnapshot("PLAYER_2", hand, [{ player: "PLAYER_0", card: c("CLUBS", "KING") }, { player: "PLAYER_1", card: c("CLUBS", "EIGHT") }]);
    expect(chooseStyledOfflineBot(snapshot, "careful-v1")).toEqual({ type: "PLAY_CARD", card: hand[0] });
    expect(chooseStyledOfflineBot(snapshot, "varied-v1")).toEqual({ type: "PLAY_CARD", card: hand[1] });
    expect(chooseStyledOfflineBot(snapshot, "bold-v1")).toEqual({ type: "PLAY_CARD", card: hand[2] });
  });

  it("lets a careful last player win with the cheapest winning legal card", () => {
    const hand = [c("CLUBS", "SEVEN"), c("CLUBS", "TEN"), c("CLUBS", "ACE")];
    const snapshot = playSnapshot("PLAYER_3", hand, [{ player: "PLAYER_0", card: c("CLUBS", "KING") },
      { player: "PLAYER_1", card: c("CLUBS", "EIGHT") }, { player: "PLAYER_2", card: c("CLUBS", "QUEEN") }]);
    expect(chooseStyledOfflineBot(snapshot, "careful-v1")).toEqual({ type: "PLAY_CARD", card: hand[1] });
  });

  it("reads only authorized views and does not mutate frozen legal cards or the public trick", () => {
    const hand = Object.freeze([c("CLUBS", "SEVEN"), c("CLUBS", "ACE"), c("HEARTS", "JACK")]);
    const snapshot = playSnapshot("PLAYER_1", hand, Object.freeze([]));
    const before = JSON.stringify(snapshot);
    const protectedMatch = new Proxy(snapshot.match, { get(target, key) {
      if (key !== "hand" && key !== "public") throw new Error("Forbidden bot read: " + String(key));
      return Reflect.get(target, key);
    } });
    const protectedSnapshot = new Proxy(snapshot, { get(target, key) {
      if (key === "match") return protectedMatch;
      if (key !== "actions") throw new Error("Forbidden private input: " + String(key));
      return Reflect.get(target, key);
    } });
    for (const policy of styles) {
      const command = chooseStyledOfflineBot(protectedSnapshot, policy);
      expect(command?.type).toBe("PLAY_CARD");
      if (command?.type === "PLAY_CARD") expect(hand).toContainEqual(command.card);
    }
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it("never controls the human or changes a match at the human turn", () => {
    for (const policy of styles) {
      expect(chooseStyledOfflineBot(bidSnapshot("PLAYER_0"), policy)).toBeNull();
      const game = OfflineGame.start(37, policy);
      const before = game.frame();
      game.stepBot(0);
      expect(game.frame()).toEqual(before);
    }
  });

  it.each(OFFLINE_BOT_POLICIES)("finishes and restores deterministic legal 1000-point games for %s", (policy) => {
    for (const seed of [1, 10, 37]) {
      const original = OfflineGame.start(seed, policy);
      for (let i = 0; i < 12; i++) advance(original);
      const restored = OfflineGame.restore(original.frame().save);
      expect(restored.frame()).toEqual(original.frame());
      const result = finish(original);
      expect(finish(restored)).toEqual(result);
      expect(result.document.snapshot.match.public.score.completed).toBe(true);
      expect(JSON.parse(result.save).botPolicy).toBe(policy);
    }
  });

  const legacy = JSON.parse(readFileSync(new URL("./fixtures/starter-v1-compat.json", import.meta.url), "utf8")) as {
    producerBundleSha256: string; cases: { seed: number; activeSave: string; finalRevision: number; finalSaveSha256: string }[];
  };
  it.each(legacy.cases)("preserves the original starter-v1 continuation for seed $seed", (entry) => {
    expect(legacy.producerBundleSha256).toBe("61e960aedf5208d94cdbff4911ac684c6251763d5bcaa48c89028dd986715431");
    const result = finish(OfflineGame.restore(entry.activeSave));
    expect(result.revision).toBe(entry.finalRevision);
    expect(createHash("sha256").update(result.save).digest("hex")).toBe(entry.finalSaveSha256);
  });
});

describe("packaged policy selection and restore", () => {
  function rpc() {
    const source = readFileSync(new URL("../../../apps/android/app/src/main/assets/atoutia-offline-engine.js", import.meta.url), "utf8");
    const request = runInNewContext(source + "\nAtoutiaOffline.request;", {}, { timeout: 1000 }) as (text: string) => string;
    return (value: unknown) => JSON.parse(request(JSON.stringify(value))) as ReturnType<OfflineGame["frame"]>;
  }

  it("rejects unknown or malformed policies without replacing an existing runtime game", () => {
    const call = rpc();
    const before = call({ method: "start", seed: 37, botPolicy: "varied-v1" });
    for (const value of [null, 1, "future-v1", {}, []]) {
      expect(() => call({ method: "start", seed: 1, botPolicy: value })).toThrow(/policy/);
      expect(call({ method: "snapshot" })).toEqual(before);
    }
    expect(() => call({ method: "restore", save: JSON.stringify({ ...JSON.parse(before.save), botPolicy: "future-v1" }) })).toThrow(/Unsupported/);
    expect(call({ method: "snapshot" })).toEqual(before);
    expect(() => OfflineGame.start(1, "future-v1" as OfflineBotPolicy)).toThrow(/policy/);
  });

  it.each(styles)("runs %s identically in the module and the isolated Android bundle", (policy) => {
    const call = rpc();
    const game = OfflineGame.start(37, policy);
    let actual = call({ method: "start", seed: 37, botPolicy: policy });
    for (let step = 0; step < 2000; step++) {
      expect(actual).toEqual(JSON.parse(JSON.stringify(game.frame())));
      if (step === 12) actual = call({ method: "restore", save: actual.save });
      const actions = actual.document.snapshot.actions;
      if (actions.mode === "MATCH_FINISHED") break;
      if (actions.mode === "WAIT") { game.stepBot(actual.revision); actual = call({ method: "bot", revision: actual.revision }); }
      else {
        const command = actions.mode === "BID" ? actions.biddingActions.find((action) => action.type === "TAKE")
          : { type: "PLAY_CARD", card: actions.legalCards[0] };
        game.human(command, actual.revision);
        actual = call({ method: "human", revision: actual.revision, command });
      }
    }
    expect(actual.document.snapshot.match.public.score.completed).toBe(true);
    expect(JSON.parse(actual.save).botPolicy).toBe(policy);
  });
});
