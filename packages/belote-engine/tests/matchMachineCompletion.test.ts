import { describe, expect, it } from "vitest";

import {
  advanceMatchToNextDeal,
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createDeck,
  createMatchMachine,
  getLegalCards,
  type MatchMachineState,
} from "../src/index.js";

function startPlaying(): MatchMachineState {
  const initial = createMatchMachine({
    baseSeed: 1000,
    targetScore: 1,
  });

  return applyMatchBiddingAction(
    initial,
    {
      type: "TAKE",
      player:
        initial.currentDeal.bidding.currentPlayer,
      suit:
        initial.currentDeal.initialDeal
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

function finishWinningDeal(): MatchMachineState {
  let state = startPlaying();

  while (!state.score.completed) {
    state = playFirstLegalCard(state);
  }

  return state;
}

describe("match machine completion", () => {
  it("completes the match when the target score is reached", () => {
    const state = finishWinningDeal();

    expect(state.score.completed).toBe(true);

    expect(
      state.score.winner,
    ).not.toBeNull();
  });

  it("keeps the winning deal as the current deal", () => {
    const state = finishWinningDeal();

    expect(state.dealNumber).toBe(1);

    expect(
      state.currentDeal.phase,
    ).toBe("FINISHED");

    expect(
      state.currentDeal.resolution,
    ).not.toBeNull();
  });

  it("does not create deal two after the winning deal", () => {
    const state = finishWinningDeal();

    expect(state.dealNumber).toBe(1);
    expect(state.currentDeal.seed).toBe(1000);
    expect(state.dealer).toBe("PLAYER_0");
  });

  it("records the winning score before ending the match", () => {
    const state = finishWinningDeal();

    const totalScore =
      state.score.scores.TEAM_0 +
      state.score.scores.TEAM_1;

    expect(totalScore).toBeGreaterThan(0);

    const winner = state.score.winner;

    if (winner === null) {
      throw new Error(
        "Completed match must have a winner.",
      );
    }

    expect(
      state.score.scores[winner],
    ).toBeGreaterThanOrEqual(
      state.score.targetScore,
    );
  });

  it("rejects bidding after the match has ended", () => {
    const state = finishWinningDeal();

    expect(() =>
      applyMatchBiddingAction(
        state,
        {
          type: "PASS",
          player: "PLAYER_0",
        },
      ),
    ).toThrow(
      "Match is already completed.",
    );
  });

  it("rejects card play after the match has ended", () => {
    const state = finishWinningDeal();

    expect(() =>
      applyMatchCardPlay(
        state,
        "PLAYER_0",
        createDeck()[0]!,
      ),
    ).toThrow(
      "Match is already completed.",
    );
  });

  it("rejects manually advancing after the match has ended", () => {
    const state = finishWinningDeal();

    expect(() =>
      advanceMatchToNextDeal(state),
    ).toThrow(
      "Match is already completed.",
    );
  });

  it("keeps the completed match state immutable", () => {
    const state = finishWinningDeal();

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.score)).toBe(
      true,
    );

    expect(
      Object.isFrozen(state.currentDeal),
    ).toBe(true);

    expect(
      Object.isFrozen(
        state.currentDeal.resolution,
      ),
    ).toBe(true);
  });
});