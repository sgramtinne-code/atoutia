import { describe, expect, it } from "vitest";

import {
  cardKey,
  completeDealAfterTake,
  createDeck,
  createInitialDeal,
  type PlayerPosition,
} from "../src/index.js";

describe("deal completion after take", () => {
  it("gives exactly eight cards to every player", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_0",
    );

    const completed = completeDealAfterTake(
      initialDeal,
      "PLAYER_1",
    );

    expect(completed.hands.PLAYER_0).toHaveLength(8);
    expect(completed.hands.PLAYER_1).toHaveLength(8);
    expect(completed.hands.PLAYER_2).toHaveLength(8);
    expect(completed.hands.PLAYER_3).toHaveLength(8);
  });

  it("gives the turn-up card to the taker", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_0",
    );

    const completed = completeDealAfterTake(
      initialDeal,
      "PLAYER_2",
    );

    expect(
      completed.hands.PLAYER_2.some(
        (card) =>
          cardKey(card) === cardKey(initialDeal.turnUpCard),
      ),
    ).toBe(true);
  });

  it("gives two remaining cards to the taker", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_0",
    );

    const completed = completeDealAfterTake(
      initialDeal,
      "PLAYER_1",
    );

    const originalKeys = new Set(
      initialDeal.hands.PLAYER_1.map(cardKey),
    );

    const newlyAdded = completed.hands.PLAYER_1.filter(
      (card) => !originalKeys.has(cardKey(card)),
    );

    expect(newlyAdded).toHaveLength(3);

    expect(
      newlyAdded.some(
        (card) =>
          cardKey(card) === cardKey(initialDeal.turnUpCard),
      ),
    ).toBe(true);
  });

  it("gives three remaining cards to each non-taker", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_0",
    );

    const completed = completeDealAfterTake(
      initialDeal,
      "PLAYER_1",
    );

    for (const player of [
      "PLAYER_0",
      "PLAYER_2",
      "PLAYER_3",
    ] as const) {
      const initialKeys = new Set(
        initialDeal.hands[player].map(cardKey),
      );

      const newlyAdded = completed.hands[player].filter(
        (card) => !initialKeys.has(cardKey(card)),
      );

      expect(newlyAdded).toHaveLength(3);
    }
  });

  it("preserves all 32 cards exactly once", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_0",
    );

    const completed = completeDealAfterTake(
      initialDeal,
      "PLAYER_3",
    );

    const cards = [
      ...completed.hands.PLAYER_0,
      ...completed.hands.PLAYER_1,
      ...completed.hands.PLAYER_2,
      ...completed.hands.PLAYER_3,
    ];

    expect(cards).toHaveLength(32);
    expect(new Set(cards.map(cardKey)).size).toBe(32);
  });

  it("works for every possible taker", () => {
    const players: readonly PlayerPosition[] = [
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
    ];

    for (const taker of players) {
      const initialDeal = createInitialDeal(
        createDeck(),
        "PLAYER_2",
      );

      const completed = completeDealAfterTake(
        initialDeal,
        taker,
      );

      expect(completed.taker).toBe(taker);

      for (const hand of Object.values(completed.hands)) {
        expect(hand).toHaveLength(8);
      }
    }
  });

  it("preserves the dealer", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_3",
    );

    const completed = completeDealAfterTake(
      initialDeal,
      "PLAYER_0",
    );

    expect(completed.dealer).toBe("PLAYER_3");
  });

  it("does not mutate the initial deal", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_0",
    );

    const before = {
      player0: initialDeal.hands.PLAYER_0.map(cardKey),
      player1: initialDeal.hands.PLAYER_1.map(cardKey),
      player2: initialDeal.hands.PLAYER_2.map(cardKey),
      player3: initialDeal.hands.PLAYER_3.map(cardKey),
      turnUpCard: cardKey(initialDeal.turnUpCard),
      remaining: initialDeal.remainingDeck.map(cardKey),
    };

    completeDealAfterTake(initialDeal, "PLAYER_1");

    expect(initialDeal.hands.PLAYER_0.map(cardKey)).toEqual(
      before.player0,
    );
    expect(initialDeal.hands.PLAYER_1.map(cardKey)).toEqual(
      before.player1,
    );
    expect(initialDeal.hands.PLAYER_2.map(cardKey)).toEqual(
      before.player2,
    );
    expect(initialDeal.hands.PLAYER_3.map(cardKey)).toEqual(
      before.player3,
    );
    expect(cardKey(initialDeal.turnUpCard)).toBe(
      before.turnUpCard,
    );
    expect(initialDeal.remainingDeck.map(cardKey)).toEqual(
      before.remaining,
    );
  });

  it("returns immutable completed hands", () => {
    const initialDeal = createInitialDeal(
      createDeck(),
      "PLAYER_0",
    );

    const completed = completeDealAfterTake(
      initialDeal,
      "PLAYER_1",
    );

    expect(Object.isFrozen(completed)).toBe(true);
    expect(Object.isFrozen(completed.hands)).toBe(true);
    expect(Object.isFrozen(completed.hands.PLAYER_0)).toBe(true);
    expect(Object.isFrozen(completed.hands.PLAYER_1)).toBe(true);
    expect(Object.isFrozen(completed.hands.PLAYER_2)).toBe(true);
    expect(Object.isFrozen(completed.hands.PLAYER_3)).toBe(true);
  });
});