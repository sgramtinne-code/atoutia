import { describe, expect, it } from "vitest";

import {
  BELOTE_ENGINE_VERSION,
  MATCH_REPLAY_FORMAT_VERSION,
  applyMatchBiddingAction,
  createMatchMachine,
  createMatchReplayDocument,
  replayMatchDocument,
} from "../src/index.js";

describe("match replay format", () => {
  it("defines replay format version one", () => {
    expect(
      MATCH_REPLAY_FORMAT_VERSION,
    ).toBe(1);
  });

  it("includes the engine version", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    const document =
      createMatchReplayDocument(state);

    expect(document.engineVersion).toBe(
      BELOTE_ENGINE_VERSION,
    );
  });

  it("stores the resolved default match configuration", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    const document =
      createMatchReplayDocument(state);

    expect(document.baseSeed).toBe(1000);

    expect(document.firstDealer).toBe(
      "PLAYER_0",
    );

    expect(document.targetScore).toBe(
      1000,
    );
  });

  it("stores custom match configuration", () => {
    const state = createMatchMachine({
      baseSeed: 5000,
      firstDealer: "PLAYER_2",
      targetScore: 750,
    });

    const document =
      createMatchReplayDocument(state);

    expect(document.firstDealer).toBe(
      "PLAYER_2",
    );

    expect(document.targetScore).toBe(
      750,
    );
  });

  it("stores match history", () => {
    let state = createMatchMachine({
      baseSeed: 1000,
    });

    state = applyMatchBiddingAction(
      state,
      {
        type: "PASS",
        player:
          state.currentDeal.bidding
            .currentPlayer,
      },
    );

    const document =
      createMatchReplayDocument(state);

    expect(document.history).toEqual(
      state.history,
    );

    expect(document.history).toHaveLength(
      1,
    );
  });

  it("replays a versioned document identically", () => {
    let original = createMatchMachine({
      baseSeed: 2000,
      firstDealer: "PLAYER_3",
      targetScore: 500,
    });

    original = applyMatchBiddingAction(
      original,
      {
        type: "PASS",
        player:
          original.currentDeal.bidding
            .currentPlayer,
      },
    );

    original = applyMatchBiddingAction(
      original,
      {
        type: "PASS",
        player:
          original.currentDeal.bidding
            .currentPlayer,
      },
    );

    const document =
      createMatchReplayDocument(original);

    const replayed =
      replayMatchDocument(document);

    expect(replayed).toEqual(original);
  });

  it("rejects an unsupported replay format version", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    const document =
      createMatchReplayDocument(state);

    const incompatible =
      Object.freeze({
        ...document,
        formatVersion: 999,
      });

    expect(() =>
      replayMatchDocument(
        incompatible,
      ),
    ).toThrow(
      "Unsupported match replay format version.",
    );
  });

  it("returns an immutable replay document", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    const document =
      createMatchReplayDocument(state);

    expect(
      Object.isFrozen(document),
    ).toBe(true);

    expect(
      Object.isFrozen(document.history),
    ).toBe(true);
  });
});