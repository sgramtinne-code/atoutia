import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchBiddingAction,
  createMatchMachine,
  createPlayerAvailableActions,
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

describe("player available actions", () => {
  it("returns BID for the current bidder", () => {
    const state =
      createMatchMachine({
        baseSeed: 1000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const actions =
      createPlayerAvailableActions(
        state,
        player,
      );

    expect(actions.mode).toBe(
      "BID",
    );

    expect(
      actions.biddingActions.length,
    ).toBeGreaterThan(0);

    expect(
      actions.legalCards,
    ).toEqual([]);
  });

  it("returns WAIT for another player during bidding", () => {
    const state =
      createMatchMachine({
        baseSeed: 2000,
      });

    const currentPlayer =
      state.currentDeal.bidding
        .currentPlayer;

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

    const actions =
      createPlayerAvailableActions(
        state,
        otherPlayer,
      );

    expect(actions.mode).toBe(
      "WAIT",
    );

    expect(
      actions.biddingActions,
    ).toEqual([]);

    expect(
      actions.legalCards,
    ).toEqual([]);
  });

  it("offers PASS and the turn-up suit during round one", () => {
    const state =
      createMatchMachine({
        baseSeed: 3000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const actions =
      createPlayerAvailableActions(
        state,
        player,
      );

    expect(
      actions.biddingActions,
    ).toContainEqual({
      type: "PASS",
      player,
    });

    expect(
      actions.biddingActions,
    ).toContainEqual({
      type: "TAKE",
      player,
      suit:
        state.currentDeal.initialDeal
          .turnUpCard.suit,
    });

    expect(
      actions.biddingActions,
    ).toHaveLength(2);
  });

  it("offers the three other suits during round two", () => {
    let state =
      createMatchMachine({
        baseSeed: 4000,
      });

    for (
      let index = 0;
      index < 4;
      index += 1
    ) {
      state =
        applyMatchBiddingAction(
          state,
          {
            type: "PASS",
            player:
              state.currentDeal
                .bidding.currentPlayer,
          },
        );
    }

    expect(
      state.currentDeal.bidding.round,
    ).toBe("SECOND");

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const actions =
      createPlayerAvailableActions(
        state,
        player,
      );

    expect(
      actions.biddingActions,
    ).toHaveLength(4);

    expect(
      actions.biddingActions.filter(
        (action) =>
          action.type === "TAKE",
      ),
    ).toHaveLength(3);

    const turnUpSuit =
      state.currentDeal.initialDeal
        .turnUpCard.suit;

    expect(
      actions.biddingActions,
    ).not.toContainEqual({
      type: "TAKE",
      player,
      suit: turnUpSuit,
    });
  });

  it("returns PLAY_CARD for the current player", () => {
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

    const actions =
      createPlayerAvailableActions(
        state,
        player,
      );

    expect(actions.mode).toBe(
      "PLAY_CARD",
    );

    expect(
      actions.legalCards.length,
    ).toBeGreaterThan(0);

    expect(
      actions.biddingActions,
    ).toEqual([]);
  });

  it("returns WAIT for another player during card play", () => {
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

    const actions =
      createPlayerAvailableActions(
        state,
        otherPlayer,
      );

    expect(actions.mode).toBe(
      "WAIT",
    );

    expect(
      actions.legalCards,
    ).toEqual([]);
  });

  it("returns immutable action structures", () => {
    const state =
      createMatchMachine({
        baseSeed: 7000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const actions =
      createPlayerAvailableActions(
        state,
        player,
      );

    expect(
      Object.isFrozen(actions),
    ).toBe(true);

    expect(
      Object.isFrozen(
        actions.biddingActions,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        actions.legalCards,
      ),
    ).toBe(true);

    for (
      const action of
      actions.biddingActions
    ) {
      expect(
        Object.isFrozen(action),
      ).toBe(true);
    }
  });
});