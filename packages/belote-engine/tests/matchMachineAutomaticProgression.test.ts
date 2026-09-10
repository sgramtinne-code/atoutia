import { describe, expect, it } from "vitest";

import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  getLegalCards,
  type MatchMachineState,
} from "../src/index.js";

function pass(
  state: MatchMachineState,
): MatchMachineState {
  return applyMatchBiddingAction(
    state,
    {
      type: "PASS",
      player:
        state.currentDeal.bidding.currentPlayer,
    },
  );
}

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

function playFirstLegalCard(
  state: MatchMachineState,
): MatchMachineState {
  const sequence =
    state.currentDeal.trickSequence;

  const trumpSuit =
    state.currentDeal.trumpSuit;

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

  return applyMatchCardPlay(
    state,
    player,
    card,
  ).state;
}

describe("match machine automatic progression", () => {
  it("automatically starts deal two after eight passes", () => {
    let state = createMatchMachine({
      baseSeed: 1000,
    });

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(state.dealNumber).toBe(2);
    expect(state.currentDeal.phase).toBe(
      "BIDDING",
    );
    expect(state.currentDeal.seed).toBe(1001);
  });

  it("rotates dealer automatically after an all-pass deal", () => {
    let state = createMatchMachine({
      baseSeed: 1000,
      firstDealer: "PLAYER_2",
    });

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(state.dealer).toBe("PLAYER_3");
    expect(state.currentDeal.dealer).toBe(
      "PLAYER_3",
    );
  });

  it("does not award points after an all-pass deal", () => {
    let state = createMatchMachine({
      baseSeed: 1000,
    });

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(state.score.scores).toEqual({
      TEAM_0: 0,
      TEAM_1: 0,
    });
  });

  it("automatically advances after a fully played deal", () => {
    let state = takeFirstRound(
      createMatchMachine({
        baseSeed: 1000,
      }),
    );

    for (let index = 0; index < 32; index += 1) {
      state = playFirstLegalCard(state);
    }

    expect(state.dealNumber).toBe(2);
    expect(state.currentDeal.phase).toBe(
      "BIDDING",
    );
  });

  it("adds completed deal points to the match score", () => {
    let state = takeFirstRound(
      createMatchMachine({
        baseSeed: 1000,
      }),
    );

    for (let index = 0; index < 32; index += 1) {
      state = playFirstLegalCard(state);
    }

    expect(
      state.score.scores.TEAM_0 +
        state.score.scores.TEAM_1,
    ).toBeGreaterThan(0);
  });

  it("uses the next deterministic seed after a played deal", () => {
    let state = takeFirstRound(
      createMatchMachine({
        baseSeed: 7000,
      }),
    );

    for (let index = 0; index < 32; index += 1) {
      state = playFirstLegalCard(state);
    }

    expect(state.dealNumber).toBe(2);
    expect(state.currentDeal.seed).toBe(7001);
  });

  it("carries the resulting litige state into the next deal", () => {
    let state = takeFirstRound(
      createMatchMachine({
        baseSeed: 1000,
      }),
    );

    for (let index = 0; index < 32; index += 1) {
      state = playFirstLegalCard(state);
    }

    expect(
      state.currentDeal.litigeState,
    ).toEqual(state.litigeState);
  });

  it("keeps the match immutable during automatic progression", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    let state = initial;

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(initial.dealNumber).toBe(1);
    expect(initial.dealer).toBe("PLAYER_0");

    expect(state.dealNumber).toBe(2);
    expect(state.dealer).toBe("PLAYER_1");

    expect(Object.isFrozen(state)).toBe(true);
    expect(
      Object.isFrozen(state.currentDeal),
    ).toBe(true);
    expect(
      Object.isFrozen(state.score),
    ).toBe(true);
  });
});