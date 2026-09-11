import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchBiddingAction,
  createMatchMachine,
  createPlayerMatchSnapshot,
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

describe("player match snapshot", () => {
  it("identifies the target player", () => {
    const state =
      createMatchMachine({
        baseSeed: 1000,
      });

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        "PLAYER_2",
      );

    expect(
      snapshot.player,
    ).toBe("PLAYER_2");
  });

  it("contains the public match snapshot", () => {
    const state =
      createMatchMachine({
        baseSeed: 2000,
      });

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        "PLAYER_1",
      );

    expect(
      snapshot.public.dealNumber,
    ).toBe(state.dealNumber);

    expect(
      snapshot.public.phase,
    ).toBe(
      state.currentDeal.phase,
    );
  });

  it("does not expose a completed hand during bidding", () => {
    const state =
      createMatchMachine({
        baseSeed: 3000,
      });

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        "PLAYER_1",
      );

    expect(
      snapshot.hand,
    ).toEqual([]);
  });

  it("exposes only the selected player's hand during play", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 4000,
        }),
      );

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        "PLAYER_2",
      );

    expect(
      snapshot.hand,
    ).toEqual(
      state.currentDeal.completedDeal
        ?.hands.PLAYER_2,
    );

    expect(
      snapshot.hand,
    ).toHaveLength(8);
  });

  it("does not expose opponent hands", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 5000,
        }),
      );

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        "PLAYER_1",
      );

    expect(
      Object.keys(snapshot),
    ).toEqual([
      "public",
      "player",
      "hand",
      "legalCards",
    ]);

    expect(
      "hands" in snapshot,
    ).toBe(false);

    expect(
      "hands" in snapshot.public,
    ).toBe(false);

    const json =
      JSON.stringify(snapshot);

    expect(
      json,
    ).not.toContain(
      '"hands"',
    );

    expect(
      snapshot.hand,
    ).toEqual(
      state.currentDeal.completedDeal
        ?.hands.PLAYER_1,
    );
  });

  it("exposes legal cards when it is the player's turn", () => {
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

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        currentPlayer,
      );

    expect(
      snapshot.legalCards.length,
    ).toBeGreaterThan(0);

    expect(
      snapshot.legalCards.length,
    ).toBeLessThanOrEqual(
      snapshot.hand.length,
    );
  });

  it("does not expose legal cards when it is another player's turn", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 7000,
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
      createPlayerMatchSnapshot(
        state,
        otherPlayer,
      );

    expect(
      snapshot.legalCards,
    ).toEqual([]);
  });

  it("does not expose engine seeds or shuffled deck", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 8000,
        }),
      );

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        "PLAYER_0",
      );

    const json =
      JSON.stringify(snapshot);

    expect(
      json,
    ).not.toContain(
      '"baseSeed"',
    );

    expect(
      json,
    ).not.toContain(
      '"seed"',
    );

    expect(
      json,
    ).not.toContain(
      '"shuffledDeck"',
    );
  });

  it("returns immutable private structures", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 9000,
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

    const snapshot =
      createPlayerMatchSnapshot(
        state,
        currentPlayer,
      );

    expect(
      Object.isFrozen(snapshot),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.public,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.hand,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.legalCards,
      ),
    ).toBe(true);

    for (
      const card of
      snapshot.hand
    ) {
      expect(
        Object.isFrozen(card),
      ).toBe(true);
    }
  });
});