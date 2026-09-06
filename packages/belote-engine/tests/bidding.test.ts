import { describe, expect, it } from "vitest";

import {
  applyBiddingAction,
  createBiddingState,
  getAllowedTrumpSuits,
} from "../src/index.js";

describe("bidding", () => {
  it("starts with the player after the dealer", () => {
    const state = createBiddingState("PLAYER_2", "HEARTS");

    expect(state.round).toBe("FIRST");
    expect(state.currentPlayer).toBe("PLAYER_3");
    expect(state.status).toBe("IN_PROGRESS");
    expect(state.taker).toBeNull();
    expect(state.trumpSuit).toBeNull();
  });

  it("allows only the turn-up suit in the first round", () => {
    const state = createBiddingState("PLAYER_0", "HEARTS");

    expect(getAllowedTrumpSuits(state)).toEqual(["HEARTS"]);
  });

  it("accepts taking the turn-up suit in the first round", () => {
    const state = createBiddingState("PLAYER_0", "HEARTS");

    const result = applyBiddingAction(state, {
      type: "TAKE",
      player: "PLAYER_1",
      suit: "HEARTS",
    });

    expect(result.status).toBe("TAKEN");
    expect(result.taker).toBe("PLAYER_1");
    expect(result.trumpSuit).toBe("HEARTS");
    expect(result.round).toBe("FIRST");
  });

  it("rejects another suit in the first round", () => {
    const state = createBiddingState("PLAYER_0", "HEARTS");

    expect(() =>
      applyBiddingAction(state, {
        type: "TAKE",
        player: "PLAYER_1",
        suit: "SPADES",
      }),
    ).toThrow("Trump suit is not allowed in this bidding round.");
  });

  it("advances to the next player after a pass", () => {
    const state = createBiddingState("PLAYER_0", "HEARTS");

    const result = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_1",
    });

    expect(result.currentPlayer).toBe("PLAYER_2");
    expect(result.passesInRound).toBe(1);
  });

  it("moves to the second round after four first-round passes", () => {
    let state = createBiddingState("PLAYER_0", "HEARTS");

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_1",
    });

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_2",
    });

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_3",
    });

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_0",
    });

    expect(state.round).toBe("SECOND");
    expect(state.currentPlayer).toBe("PLAYER_1");
    expect(state.passesInRound).toBe(0);
    expect(state.status).toBe("IN_PROGRESS");
  });

  it("allows exactly the three other suits in the second round", () => {
    let state = createBiddingState("PLAYER_0", "HEARTS");

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_1",
    });

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_2",
    });

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_3",
    });

    state = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_0",
    });

    expect(getAllowedTrumpSuits(state)).toEqual([
      "CLUBS",
      "DIAMONDS",
      "SPADES",
    ]);
  });

  it("rejects the turn-up suit in the second round", () => {
    let state = createBiddingState("PLAYER_0", "HEARTS");

    for (const player of [
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_0",
    ] as const) {
      state = applyBiddingAction(state, {
        type: "PASS",
        player,
      });
    }

    expect(() =>
      applyBiddingAction(state, {
        type: "TAKE",
        player: "PLAYER_1",
        suit: "HEARTS",
      }),
    ).toThrow("Trump suit is not allowed in this bidding round.");
  });

  it("accepts another suit in the second round", () => {
    let state = createBiddingState("PLAYER_0", "HEARTS");

    for (const player of [
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_0",
    ] as const) {
      state = applyBiddingAction(state, {
        type: "PASS",
        player,
      });
    }

    state = applyBiddingAction(state, {
      type: "TAKE",
      player: "PLAYER_1",
      suit: "SPADES",
    });

    expect(state.status).toBe("TAKEN");
    expect(state.taker).toBe("PLAYER_1");
    expect(state.trumpSuit).toBe("SPADES");
    expect(state.round).toBe("SECOND");
  });

  it("ends with all passed after eight passes", () => {
    let state = createBiddingState("PLAYER_0", "HEARTS");

    for (const player of [
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_0",
    ] as const) {
      state = applyBiddingAction(state, {
        type: "PASS",
        player,
      });
    }

    expect(state.status).toBe("ALL_PASSED");
    expect(state.taker).toBeNull();
    expect(state.trumpSuit).toBeNull();
    expect(state.passesInRound).toBe(4);
  });

  it("rejects an action from a player who is not on turn", () => {
    const state = createBiddingState("PLAYER_0", "HEARTS");

    expect(() =>
      applyBiddingAction(state, {
        type: "PASS",
        player: "PLAYER_2",
      }),
    ).toThrow("It is not this player's turn.");
  });

  it("rejects actions after bidding has been taken", () => {
    const initialState = createBiddingState("PLAYER_0", "HEARTS");

    const takenState = applyBiddingAction(initialState, {
      type: "TAKE",
      player: "PLAYER_1",
      suit: "HEARTS",
    });

    expect(() =>
      applyBiddingAction(takenState, {
        type: "PASS",
        player: "PLAYER_1",
      }),
    ).toThrow("Bidding is already finished.");
  });

  it("rejects actions after everyone has passed", () => {
    let state = createBiddingState("PLAYER_0", "HEARTS");

    for (const player of [
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
      "PLAYER_0",
    ] as const) {
      state = applyBiddingAction(state, {
        type: "PASS",
        player,
      });
    }

    expect(() =>
      applyBiddingAction(state, {
        type: "PASS",
        player: "PLAYER_0",
      }),
    ).toThrow("Bidding is already finished.");
  });

  it("keeps bidding state immutable", () => {
    const state = createBiddingState("PLAYER_0", "HEARTS");

    const result = applyBiddingAction(state, {
      type: "PASS",
      player: "PLAYER_1",
    });

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);

    expect(state.currentPlayer).toBe("PLAYER_1");
    expect(state.passesInRound).toBe(0);

    expect(result.currentPlayer).toBe("PLAYER_2");
    expect(result.passesInRound).toBe(1);
  });
});