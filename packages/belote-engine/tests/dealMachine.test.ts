import { describe, expect, it } from "vitest";

import {
  cardKey,
  createDealMachine,
} from "../src/index.js";

describe("deal machine", () => {
  it("starts in the bidding phase", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(state.phase).toBe("BIDDING");
  });

  it("preserves the requested seed", () => {
    const state = createDealMachine({
      seed: 987654,
      dealer: "PLAYER_1",
    });

    expect(state.seed).toBe(987654);
  });

  it("preserves the requested dealer", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_3",
    });

    expect(state.dealer).toBe("PLAYER_3");
    expect(state.initialDeal.dealer).toBe("PLAYER_3");
    expect(state.bidding.dealer).toBe("PLAYER_3");
  });

  it("creates a shuffled deck of exactly 32 unique cards", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(state.shuffledDeck).toHaveLength(32);

    expect(
      new Set(
        state.shuffledDeck.map(cardKey),
      ).size,
    ).toBe(32);
  });

  it("creates exactly five initial cards per player", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(
      state.initialDeal.hands.PLAYER_0,
    ).toHaveLength(5);

    expect(
      state.initialDeal.hands.PLAYER_1,
    ).toHaveLength(5);

    expect(
      state.initialDeal.hands.PLAYER_2,
    ).toHaveLength(5);

    expect(
      state.initialDeal.hands.PLAYER_3,
    ).toHaveLength(5);
  });

  it("uses the turn-up card suit for the first bidding round", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(state.bidding.turnUpSuit).toBe(
      state.initialDeal.turnUpCard.suit,
    );

    expect(state.bidding.round).toBe("FIRST");
  });

  it("starts bidding with the player after the dealer", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_2",
    });

    expect(
      state.bidding.currentPlayer,
    ).toBe("PLAYER_3");
  });

  it("supports the two-then-three deal pattern", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
      initialDealPattern: "TWO_THEN_THREE",
    });

    expect(
      state.initialDeal.pattern,
    ).toBe("TWO_THEN_THREE");
  });

  it("defaults to the three-then-two deal pattern", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(
      state.initialDeal.pattern,
    ).toBe("THREE_THEN_TWO");
  });

  it("is deterministic for the same seed and dealer", () => {
    const first = createDealMachine({
      seed: 20260906,
      dealer: "PLAYER_1",
    });

    const second = createDealMachine({
      seed: 20260906,
      dealer: "PLAYER_1",
    });

    expect(
      first.shuffledDeck.map(cardKey),
    ).toEqual(
      second.shuffledDeck.map(cardKey),
    );

    expect(first.initialDeal).toEqual(
      second.initialDeal,
    );

    expect(first.bidding).toEqual(
      second.bidding,
    );
  });

  it("produces a different shuffled order for another seed", () => {
    const first = createDealMachine({
      seed: 1,
      dealer: "PLAYER_0",
    });

    const second = createDealMachine({
      seed: 2,
      dealer: "PLAYER_0",
    });

    expect(
      first.shuffledDeck.map(cardKey),
    ).not.toEqual(
      second.shuffledDeck.map(cardKey),
    );
  });

  it("rejects a non-integer seed", () => {
    expect(() =>
      createDealMachine({
        seed: 1.5,
        dealer: "PLAYER_0",
      }),
    ).toThrow(
      "Deal machine seed must be an integer.",
    );
  });

  it("returns an immutable root state", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(Object.isFrozen(state)).toBe(true);
    expect(
      Object.isFrozen(state.shuffledDeck),
    ).toBe(true);
    expect(
      Object.isFrozen(state.initialDeal),
    ).toBe(true);
    expect(
      Object.isFrozen(state.bidding),
    ).toBe(true);
  });
});