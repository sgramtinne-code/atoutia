import { describe, expect, it } from "vitest";

import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  getLegalCards,
  type MatchMachineState,
} from "../src/index.js";

function takeFirstRound(
  state: MatchMachineState,
): MatchMachineState {
  return applyMatchBiddingAction(
    state,
    {
      type: "TAKE",
      player:
        state.currentDeal.bidding.currentPlayer,
      suit:
        state.currentDeal.initialDeal
          .turnUpCard.suit,
    },
  );
}

describe("match machine history", () => {
  it("starts with an empty history", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    expect(state.history).toHaveLength(0);
    expect(
      Object.isFrozen(state.history),
    ).toBe(true);
  });

  it("records bidding actions", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const result =
      applyMatchBiddingAction(
        initial,
        {
          type: "PASS",
          player:
            initial.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(result.history).toHaveLength(1);

    expect(
      result.history[0]?.type,
    ).toBe("BIDDING_ACTION");
  });

  it("records card plays", () => {
    const playing =
      takeFirstRound(
        createMatchMachine({
          baseSeed: 1000,
        }),
      );

    const sequence =
      playing.currentDeal.trickSequence;

    const trumpSuit =
      playing.currentDeal.trumpSuit;

    if (
      sequence === null ||
      trumpSuit === null
    ) {
      throw new Error(
        "Playing state is required.",
      );
    }

    const player =
      sequence.currentTrick.currentPlayer;

    const card = getLegalCards(
      sequence.hands[player],
      player,
      sequence.currentTrick.plays,
      trumpSuit,
    )[0];

    if (card === undefined) {
      throw new Error(
        "No legal card available.",
      );
    }

    const result =
      applyMatchCardPlay(
        playing,
        player,
        card,
      );

    expect(
      result.state.history,
    ).toHaveLength(2);

    expect(
      result.state.history[1]?.type,
    ).toBe("CARD_PLAY");
  });

  it("preserves action order", () => {
    let state = createMatchMachine({
      baseSeed: 1000,
    });

    state =
      applyMatchBiddingAction(
        state,
        {
          type: "PASS",
          player:
            state.currentDeal.bidding
              .currentPlayer,
        },
      );

    state =
      applyMatchBiddingAction(
        state,
        {
          type: "PASS",
          player:
            state.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(
      state.history.map(
        (event) => event.index,
      ),
    ).toEqual([0, 1]);

    expect(
      state.history.map(
        (event) => event.type,
      ),
    ).toEqual([
      "BIDDING_ACTION",
      "BIDDING_ACTION",
    ]);
  });

  it("keeps the original state history unchanged", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const result =
      applyMatchBiddingAction(
        initial,
        {
          type: "PASS",
          player:
            initial.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(initial.history).toHaveLength(0);
    expect(result.history).toHaveLength(1);
  });

  it("keeps history across automatic deal progression", () => {
    let state = createMatchMachine({
      baseSeed: 1000,
    });

    for (let index = 0; index < 8; index += 1) {
      state =
        applyMatchBiddingAction(
          state,
          {
            type: "PASS",
            player:
              state.currentDeal.bidding
                .currentPlayer,
          },
        );
    }

    expect(state.dealNumber).toBe(2);
    expect(state.history).toHaveLength(8);

    expect(
      state.history.every(
        (event) =>
          event.dealNumber === 1,
      ),
    ).toBe(true);
  });

  it("records the next deal with its new deal number", () => {
    let state = createMatchMachine({
      baseSeed: 1000,
    });

    for (let index = 0; index < 8; index += 1) {
      state =
        applyMatchBiddingAction(
          state,
          {
            type: "PASS",
            player:
              state.currentDeal.bidding
                .currentPlayer,
          },
        );
    }

    state =
      applyMatchBiddingAction(
        state,
        {
          type: "PASS",
          player:
            state.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(state.history).toHaveLength(9);

    expect(
      state.history[8]?.dealNumber,
    ).toBe(2);
  });

  it("keeps history immutable", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const state =
      applyMatchBiddingAction(
        initial,
        {
          type: "PASS",
          player:
            initial.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(
      Object.isFrozen(state.history),
    ).toBe(true);

    expect(
      Object.isFrozen(state.history[0]),
    ).toBe(true);
  });
});