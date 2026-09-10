import { describe, expect, it } from "vitest";

import {
  applyDealMachineBiddingAction,
  createDealMachine,
  type DealMachineState,
} from "../src/index.js";

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

describe("deal machine bidding", () => {
  it("keeps the machine in bidding after one pass", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = pass(initial);

    expect(result.phase).toBe("BIDDING");
    expect(result.bidding.passesInRound).toBe(1);
    expect(result.completedDeal).toBeNull();
    expect(result.taker).toBeNull();
    expect(result.trumpSuit).toBeNull();
  });

  it("moves automatically to the second bidding round", () => {
    let state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    state = pass(state);
    state = pass(state);
    state = pass(state);
    state = pass(state);

    expect(state.phase).toBe("BIDDING");
    expect(state.bidding.round).toBe("SECOND");
    expect(state.bidding.status).toBe("IN_PROGRESS");
    expect(state.bidding.passesInRound).toBe(0);
    expect(state.bidding.currentPlayer).toBe("PLAYER_1");
  });

  it("moves to playing when a player takes in the first round", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result =
      applyDealMachineBiddingAction(
        initial,
        {
          type: "TAKE",
          player: "PLAYER_1",
          suit: initial.initialDeal.turnUpCard.suit,
        },
      );

    expect(result.phase).toBe("PLAYING");
    expect(result.bidding.status).toBe("TAKEN");
    expect(result.taker).toBe("PLAYER_1");
    expect(result.trumpSuit).toBe(
      initial.initialDeal.turnUpCard.suit,
    );
  });

  it("completes every hand to eight cards after a take", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result =
      applyDealMachineBiddingAction(
        initial,
        {
          type: "TAKE",
          player: "PLAYER_1",
          suit: initial.initialDeal.turnUpCard.suit,
        },
      );

    expect(result.completedDeal).not.toBeNull();

    expect(
      result.completedDeal?.hands.PLAYER_0,
    ).toHaveLength(8);

    expect(
      result.completedDeal?.hands.PLAYER_1,
    ).toHaveLength(8);

    expect(
      result.completedDeal?.hands.PLAYER_2,
    ).toHaveLength(8);

    expect(
      result.completedDeal?.hands.PLAYER_3,
    ).toHaveLength(8);
  });

  it("gives the turn-up card to the taker", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const turnUpCard =
      initial.initialDeal.turnUpCard;

    const result =
      applyDealMachineBiddingAction(
        initial,
        {
          type: "TAKE",
          player: "PLAYER_1",
          suit: turnUpCard.suit,
        },
      );

    expect(
      result.completedDeal?.hands.PLAYER_1,
    ).toContainEqual(turnUpCard);
  });

  it("allows taking another suit in the second round", () => {
    let state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    state = pass(state);
    state = pass(state);
    state = pass(state);
    state = pass(state);

    const turnUpSuit =
      state.initialDeal.turnUpCard.suit;

    const secondRoundSuit = (
      [
        "CLUBS",
        "DIAMONDS",
        "HEARTS",
        "SPADES",
      ] as const
    ).find(
      (suit) => suit !== turnUpSuit,
    );

    if (secondRoundSuit === undefined) {
      throw new Error(
        "Unable to select second-round test suit.",
      );
    }

    state =
      applyDealMachineBiddingAction(
        state,
        {
          type: "TAKE",
          player: state.bidding.currentPlayer,
          suit: secondRoundSuit,
        },
      );

    expect(state.phase).toBe("PLAYING");
    expect(state.taker).toBe("PLAYER_1");
    expect(state.trumpSuit).toBe(
      secondRoundSuit,
    );
    expect(state.completedDeal).not.toBeNull();
  });

  it("finishes the deal after eight passes", () => {
    let state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(state.phase).toBe("FINISHED");
    expect(state.bidding.status).toBe("ALL_PASSED");
    expect(state.taker).toBeNull();
    expect(state.trumpSuit).toBeNull();
    expect(state.completedDeal).toBeNull();
  });

  it("rejects bidding actions after a take", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const taken =
      applyDealMachineBiddingAction(
        initial,
        {
          type: "TAKE",
          player: "PLAYER_1",
          suit: initial.initialDeal.turnUpCard.suit,
        },
      );

    expect(() =>
      applyDealMachineBiddingAction(
        taken,
        {
          type: "PASS",
          player: "PLAYER_1",
        },
      ),
    ).toThrow(
      "Bidding actions are only allowed during the bidding phase.",
    );
  });

  it("rejects bidding actions after everyone passed", () => {
    let state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(() =>
      applyDealMachineBiddingAction(
        state,
        {
          type: "PASS",
          player: "PLAYER_0",
        },
      ),
    ).toThrow(
      "Bidding actions are only allowed during the bidding phase.",
    );
  });

  it("preserves the original machine state", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = pass(initial);

    expect(initial.bidding.passesInRound).toBe(0);
    expect(initial.phase).toBe("BIDDING");

    expect(result.bidding.passesInRound).toBe(1);
  });

  it("returns immutable machine states", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = pass(initial);

    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.bidding)).toBe(true);
  });
});