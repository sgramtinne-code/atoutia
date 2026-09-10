import { describe, expect, it } from "vitest";

import {
  applyDealMachineBiddingAction,
  applyDealMachineCardPlay,
  createDealMachine,
  getLegalCards,
  type DealMachineState,
  type LitigeState,
} from "../src/index.js";

function startPlaying(
  seed = 12345,
  litigeState?: LitigeState,
): DealMachineState {
  const initial = createDealMachine({
    seed,
    dealer: "PLAYER_0",
    ...(litigeState === undefined
      ? {}
      : { litigeState }),
  });

  return applyDealMachineBiddingAction(
    initial,
    {
      type: "TAKE",
      player: initial.bidding.currentPlayer,
      suit: initial.initialDeal.turnUpCard.suit,
    },
  );
}

function playFirstLegalCard(
  state: DealMachineState,
): DealMachineState {
  if (
    state.trickSequence === null ||
    state.trumpSuit === null
  ) {
    throw new Error(
      "Playing state is required.",
    );
  }

  const player =
    state.trickSequence.currentTrick.currentPlayer;

  const legalCards = getLegalCards(
    state.trickSequence.hands[player],
    player,
    state.trickSequence.currentTrick.plays,
    state.trumpSuit,
  );

  const card = legalCards[0];

  if (card === undefined) {
    throw new Error(
      "No legal card available.",
    );
  }

  return applyDealMachineCardPlay(
    state,
    player,
    card,
  ).state;
}

function finishDeal(
  state: DealMachineState,
): DealMachineState {
  let current = state;

  while (current.phase === "PLAYING") {
    current = playFirstLegalCard(current);
  }

  return current;
}

function pass(
  state: DealMachineState,
): DealMachineState {
  return applyDealMachineBiddingAction(
    state,
    {
      type: "PASS",
      player: state.bidding.currentPlayer,
    },
  );
}

describe("deal machine resolution", () => {
  it("starts with an empty litige state and no resolution", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(state.litigeState).toEqual({
      pendingPoints: 0,
    });

    expect(state.resolution).toBeNull();
  });

  it("accepts pending litige points from a previous deal", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
      litigeState: Object.freeze({
        pendingPoints: 81,
      }),
    });

    expect(state.litigeState).toEqual({
      pendingPoints: 81,
    });
  });

  it("rejects invalid pending litige points", () => {
    expect(() =>
      createDealMachine({
        seed: 12345,
        dealer: "PLAYER_0",
        litigeState: Object.freeze({
          pendingPoints: -1,
        }),
      }),
    ).toThrow(
      "Pending litige points must be a non-negative integer.",
    );
  });

  it("does not resolve the deal before the eighth trick", () => {
    let state = startPlaying();

    state = playFirstLegalCard(state);

    expect(state.phase).toBe("PLAYING");
    expect(state.resolution).toBeNull();
  });

  it("automatically resolves the deal after all 32 cards", () => {
    const state = finishDeal(
      startPlaying(),
    );

    expect(state.phase).toBe("FINISHED");
    expect(state.resolution).not.toBeNull();

    expect(
      state.trickSequence?.completedTricks,
    ).toHaveLength(8);
  });

  it("records exactly 162 raw card points after a completed deal", () => {
    const state = finishDeal(
      startPlaying(),
    );

    if (state.resolution === null) {
      throw new Error(
        "Missing deal resolution.",
      );
    }

    const rawTotal =
      state.resolution.rawTrickPoints.TEAM_0 +
      state.resolution.rawTrickPoints.TEAM_1;

    expect(rawTotal).toBe(162);
  });

  it("uses the litige resolution awarded points as final awarded points", () => {
    const state = finishDeal(
      startPlaying(),
    );

    if (state.resolution === null) {
      throw new Error(
        "Missing deal resolution.",
      );
    }

    expect(
      state.resolution.finalAwardedPoints,
    ).toEqual(
      state.resolution.litigeResolution
        .awardedPoints,
    );
  });

  it("updates the machine with the next litige state", () => {
    const initialLitige =
      Object.freeze({
        pendingPoints: 81,
      });

    const state = finishDeal(
      startPlaying(
        12345,
        initialLitige,
      ),
    );

    if (state.resolution === null) {
      throw new Error(
        "Missing deal resolution.",
      );
    }

    expect(state.litigeState).toEqual(
      state.resolution.litigeResolution
        .nextLitigeState,
    );
  });

  it("keeps pending litige untouched when everybody passes", () => {
    let state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
      litigeState: Object.freeze({
        pendingPoints: 81,
      }),
    });

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(state.phase).toBe("FINISHED");
    expect(state.resolution).toBeNull();

    expect(state.litigeState).toEqual({
      pendingPoints: 81,
    });
  });

  it("returns immutable final resolution objects", () => {
    const state = finishDeal(
      startPlaying(),
    );

    if (state.resolution === null) {
      throw new Error(
        "Missing deal resolution.",
      );
    }

    expect(Object.isFrozen(state)).toBe(true);

    expect(
      Object.isFrozen(state.resolution),
    ).toBe(true);

    expect(
      Object.isFrozen(
        state.resolution.rawTrickPoints,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        state.resolution.litigeResolution,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(state.litigeState),
    ).toBe(true);
  });
});