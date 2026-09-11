import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchBiddingAction,
  createMatchMachine,
  createPlayerClientSnapshot,
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

describe("player client snapshot", () => {
  it("combines the private match view and available actions", () => {
    const state =
      createMatchMachine({
        baseSeed: 1000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const snapshot =
      createPlayerClientSnapshot(
        state,
        player,
      );

    expect(
      snapshot.match.player,
    ).toBe(player);

    expect(
      snapshot.actions.player,
    ).toBe(player);

    expect(
      snapshot.actions.mode,
    ).toBe("BID");
  });

  it("uses the same public match state for the target player", () => {
    const state =
      createMatchMachine({
        baseSeed: 2000,
      });

    const snapshot =
      createPlayerClientSnapshot(
        state,
        "PLAYER_2",
      );

    expect(
      snapshot.match.public.dealNumber,
    ).toBe(state.dealNumber);

    expect(
      snapshot.match.public.dealer,
    ).toBe(state.dealer);
  });

  it("does not expose a hand during bidding", () => {
    const state =
      createMatchMachine({
        baseSeed: 3000,
      });

    const snapshot =
      createPlayerClientSnapshot(
        state,
        "PLAYER_1",
      );

    expect(
      snapshot.match.hand,
    ).toEqual([]);
  });

  it("exposes the selected player's hand during play", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 4000,
        }),
      );

    const snapshot =
      createPlayerClientSnapshot(
        state,
        "PLAYER_2",
      );

    expect(
      snapshot.match.hand,
    ).toEqual(
      state.currentDeal.completedDeal
        ?.hands.PLAYER_2,
    );
  });

  it("returns PLAY_CARD and legal cards for the current player", () => {
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

    const snapshot =
      createPlayerClientSnapshot(
        state,
        player,
      );

    expect(
      snapshot.actions.mode,
    ).toBe("PLAY_CARD");

    expect(
      snapshot.actions.legalCards.length,
    ).toBeGreaterThan(0);

    expect(
      snapshot.actions.legalCards,
    ).toEqual(
      snapshot.match.legalCards,
    );
  });

  it("returns WAIT and no legal cards for another player", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 6000,
        }),
      );

    const currentPlayer =
      state.currentDeal.trickSequence
        ?.currentTrick.currentPlayer;

    if (
      currentPlayer === undefined
    ) {
      throw new Error(
        "Missing current player.",
      );
    }

    const otherPlayer =
      (
        [
          "PLAYER_0",
          "PLAYER_1",
          "PLAYER_2",
          "PLAYER_3",
        ] as const
      ).find(
        (player) =>
          player !== currentPlayer,
      );

    if (
      otherPlayer === undefined
    ) {
      throw new Error(
        "Missing alternate player.",
      );
    }

    const snapshot =
      createPlayerClientSnapshot(
        state,
        otherPlayer,
      );

    expect(
      snapshot.actions.mode,
    ).toBe("WAIT");

    expect(
      snapshot.actions.legalCards,
    ).toEqual([]);

    expect(
      snapshot.match.legalCards,
    ).toEqual([]);
  });

  it("does not expose internal engine state", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 7000,
        }),
      );

    const snapshot =
      createPlayerClientSnapshot(
        state,
        "PLAYER_0",
      );

    const json =
      JSON.stringify(snapshot);

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

  it("returns immutable client structures", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 8000,
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

    const snapshot =
      createPlayerClientSnapshot(
        state,
        player,
      );

    expect(
      Object.isFrozen(snapshot),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.match,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.actions,
      ),
    ).toBe(true);
  });
});