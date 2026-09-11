import {
  describe,
  expect,
  it,
} from "vitest";

import {
  BELOTE_ENGINE_VERSION,
  PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,
  applyMatchBiddingAction,
  createMatchMachine,
  createPlayerClientSnapshotDocument,
  type MatchMachineState,
} from "../src/index.js";

function startPlaying(
  state: MatchMachineState,
): MatchMachineState {
  return applyMatchBiddingAction(
    state,
    {
      type: "TAKE",

      player:
        state.currentDeal.bidding
          .currentPlayer,

      suit:
        state.currentDeal.initialDeal
          .turnUpCard.suit,
    },
  );
}

describe("player client snapshot format", () => {
  it("defines format version one", () => {
    expect(
      PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,
    ).toBe(1);
  });

  it("includes the engine version", () => {
    const state =
      createMatchMachine({
        baseSeed: 1000,
      });

    const document =
      createPlayerClientSnapshotDocument(
        state,
        "PLAYER_1",
      );

    expect(
      document.engineVersion,
    ).toBe(
      BELOTE_ENGINE_VERSION,
    );
  });

  it("includes the format version", () => {
    const state =
      createMatchMachine({
        baseSeed: 2000,
      });

    const document =
      createPlayerClientSnapshotDocument(
        state,
        "PLAYER_2",
      );

    expect(
      document.formatVersion,
    ).toBe(
      PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,
    );
  });

  it("contains the target player snapshot", () => {
    const state =
      createMatchMachine({
        baseSeed: 3000,
      });

    const document =
      createPlayerClientSnapshotDocument(
        state,
        "PLAYER_3",
      );

    expect(
      document.snapshot.match.player,
    ).toBe("PLAYER_3");

    expect(
      document.snapshot.actions.player,
    ).toBe("PLAYER_3");
  });

  it("contains bidding actions for the current bidder", () => {
    const state =
      createMatchMachine({
        baseSeed: 4000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const document =
      createPlayerClientSnapshotDocument(
        state,
        player,
      );

    expect(
      document.snapshot.actions.mode,
    ).toBe("BID");

    expect(
      document.snapshot.actions
        .biddingActions.length,
    ).toBeGreaterThan(0);
  });

  it("contains card actions during play", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 5000,
        }),
      );

    const player =
      state.currentDeal.trickSequence
        ?.currentTrick.currentPlayer;

    if (
      player === undefined
    ) {
      throw new Error(
        "Missing current player.",
      );
    }

    const document =
      createPlayerClientSnapshotDocument(
        state,
        player,
      );

    expect(
      document.snapshot.actions.mode,
    ).toBe("PLAY_CARD");

    expect(
      document.snapshot.actions
        .legalCards.length,
    ).toBeGreaterThan(0);
  });

  it("does not expose internal engine state", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 6000,
        }),
      );

    const document =
      createPlayerClientSnapshotDocument(
        state,
        "PLAYER_0",
      );

    const json =
      JSON.stringify(document);

    expect(json).not.toContain(
      '"baseSeed"',
    );

    expect(json).not.toContain(
      '"seed"',
    );

    expect(json).not.toContain(
      '"shuffledDeck"',
    );

    expect(json).not.toContain(
      '"hands"',
    );
  });

  it("returns an immutable network document", () => {
    const state =
      createMatchMachine({
        baseSeed: 7000,
      });

    const document =
      createPlayerClientSnapshotDocument(
        state,
        "PLAYER_1",
      );

    expect(
      Object.isFrozen(document),
    ).toBe(true);

    expect(
      Object.isFrozen(
        document.snapshot,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        document.snapshot.match,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        document.snapshot.actions,
      ),
    ).toBe(true);
  });
});