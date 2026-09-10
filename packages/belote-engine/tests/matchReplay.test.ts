import { describe, expect, it } from "vitest";

import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  getLegalCards,
  replayMatch,
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

describe("match replay", () => {
  it("replays an empty match", () => {
    const original = createMatchMachine({
      baseSeed: 1000,
    });

    const replayed = replayMatch({
      baseSeed: 1000,
      history: original.history,
    });

    expect(replayed).toEqual(original);
  });

  it("replays bidding actions deterministically", () => {
    let original = createMatchMachine({
      baseSeed: 1000,
    });

    original = pass(original);
    original = pass(original);
    original = pass(original);

    const replayed = replayMatch({
      baseSeed: 1000,
      history: original.history,
    });

    expect(replayed).toEqual(original);
  });

  it("replays a take and card plays deterministically", () => {
    let original = takeFirstRound(
      createMatchMachine({
        baseSeed: 2000,
      }),
    );

    for (let index = 0; index < 12; index += 1) {
      original =
        playFirstLegalCard(original);
    }

    const replayed = replayMatch({
      baseSeed: 2000,
      history: original.history,
    });

    expect(replayed).toEqual(original);
  });

  it("replays automatic deal progression", () => {
    let original = createMatchMachine({
      baseSeed: 3000,
    });

    for (let index = 0; index < 8; index += 1) {
      original = pass(original);
    }

    expect(original.dealNumber).toBe(2);

    original = pass(original);
    original = pass(original);

    const replayed = replayMatch({
      baseSeed: 3000,
      history: original.history,
    });

    expect(replayed).toEqual(original);
    expect(replayed.dealNumber).toBe(2);
  });

  it("respects a custom first dealer", () => {
    let original = createMatchMachine({
      baseSeed: 4000,
      firstDealer: "PLAYER_2",
    });

    original = pass(original);
    original = pass(original);

    const replayed = replayMatch({
      baseSeed: 4000,
      firstDealer: "PLAYER_2",
      history: original.history,
    });

    expect(replayed).toEqual(original);
    expect(replayed.dealer).toBe("PLAYER_2");
  });

  it("respects a custom target score", () => {
    let original = takeFirstRound(
      createMatchMachine({
        baseSeed: 5000,
        targetScore: 1,
      }),
    );

    while (!original.score.completed) {
      original =
        playFirstLegalCard(original);
    }

    const replayed = replayMatch({
      baseSeed: 5000,
      targetScore: 1,
      history: original.history,
    });

    expect(replayed).toEqual(original);
    expect(replayed.score.completed).toBe(
      true,
    );

    expect(
      replayed.score.winner,
    ).not.toBeNull();
  });

  it("rejects a broken history index", () => {
    const original = pass(
      createMatchMachine({
        baseSeed: 6000,
      }),
    );

    const event = original.history[0];

    if (event === undefined) {
      throw new Error(
        "Missing test history event.",
      );
    }

    const brokenHistory = Object.freeze([
      Object.freeze({
        ...event,
        index: 5,
      }),
    ]);

    expect(() =>
      replayMatch({
        baseSeed: 6000,
        history: brokenHistory,
      }),
    ).toThrow(
      "Match history indexes must be continuous and start at zero.",
    );
  });

  it("rejects an event attached to the wrong deal number", () => {
    const original = pass(
      createMatchMachine({
        baseSeed: 7000,
      }),
    );

    const event = original.history[0];

    if (event === undefined) {
      throw new Error(
        "Missing test history event.",
      );
    }

    const brokenHistory = Object.freeze([
      Object.freeze({
        ...event,
        dealNumber: 2,
      }),
    ]);

    expect(() =>
      replayMatch({
        baseSeed: 7000,
        history: brokenHistory,
      }),
    ).toThrow(
      "Match history deal number does not match the current replay deal.",
    );
  });

  it("reconstructs its own history identically", () => {
    let original = takeFirstRound(
      createMatchMachine({
        baseSeed: 8000,
      }),
    );

    for (let index = 0; index < 8; index += 1) {
      original =
        playFirstLegalCard(original);
    }

    const replayed = replayMatch({
      baseSeed: 8000,
      history: original.history,
    });

    expect(replayed.history).toEqual(
      original.history,
    );

    expect(
      replayed.history.map(
        (event) => event.index,
      ),
    ).toEqual(
      original.history.map(
        (event) => event.index,
      ),
    );
  });

  it("returns an immutable replayed state", () => {
    let original = createMatchMachine({
      baseSeed: 9000,
    });

    original = pass(original);

    const replayed = replayMatch({
      baseSeed: 9000,
      history: original.history,
    });

    expect(Object.isFrozen(replayed)).toBe(
      true,
    );

    expect(
      Object.isFrozen(replayed.history),
    ).toBe(true);

    expect(
      Object.isFrozen(replayed.currentDeal),
    ).toBe(true);

    expect(
      Object.isFrozen(replayed.score),
    ).toBe(true);
  });
});