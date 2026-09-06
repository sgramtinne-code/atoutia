import { describe, expect, it } from "vitest";

import {
  cardKey,
  createDeck,
  createInitialDeal,
  getPlayOrderAfter,
  nextPlayer,
  type PlayerPosition,
} from "../src/index.js";

describe("players", () => {
  it("cycles through the four player positions", () => {
    expect(nextPlayer("PLAYER_0")).toBe("PLAYER_1");
    expect(nextPlayer("PLAYER_1")).toBe("PLAYER_2");
    expect(nextPlayer("PLAYER_2")).toBe("PLAYER_3");
    expect(nextPlayer("PLAYER_3")).toBe("PLAYER_0");
  });

  it("returns the play order starting after the dealer", () => {
    expect(getPlayOrderAfter("PLAYER_2")).toEqual([
      "PLAYER_3",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_2",
    ]);
  });
});

describe("initial deal", () => {
  it("rejects a deck that does not contain exactly 32 cards", () => {
    expect(() =>
      createInitialDeal(createDeck().slice(0, 31), "PLAYER_0"),
    ).toThrow("Initial deal requires exactly 32 cards.");
  });

  it("rejects duplicate cards", () => {
    const deck = [...createDeck()];
    const firstCard = deck[0];

    if (firstCard === undefined) {
      throw new Error("Missing test card.");
    }

    deck[31] = firstCard;

    expect(() =>
      createInitialDeal(deck, "PLAYER_0"),
    ).toThrow("Initial deal requires 32 unique cards.");
  });

  it("deals exactly five cards to every player", () => {
    const deal = createInitialDeal(createDeck(), "PLAYER_0");

    expect(deal.hands.PLAYER_0).toHaveLength(5);
    expect(deal.hands.PLAYER_1).toHaveLength(5);
    expect(deal.hands.PLAYER_2).toHaveLength(5);
    expect(deal.hands.PLAYER_3).toHaveLength(5);
  });

  it("leaves one turn-up card and eleven cards remaining", () => {
    const deal = createInitialDeal(createDeck(), "PLAYER_0");

    expect(deal.turnUpCard).toBeDefined();
    expect(deal.remainingDeck).toHaveLength(11);
  });

  it("preserves every card exactly once across the initial deal", () => {
    const sourceDeck = createDeck();
    const deal = createInitialDeal(sourceDeck, "PLAYER_0");

    const dealtCards = [
      ...deal.hands.PLAYER_0,
      ...deal.hands.PLAYER_1,
      ...deal.hands.PLAYER_2,
      ...deal.hands.PLAYER_3,
      deal.turnUpCard,
      ...deal.remainingDeck,
    ];

    expect(dealtCards).toHaveLength(32);
    expect(new Set(dealtCards.map(cardKey)).size).toBe(32);

    expect([...dealtCards.map(cardKey)].sort()).toEqual(
      [...sourceDeck.map(cardKey)].sort(),
    );
  });

  it("deals three then two starting with the player after the dealer", () => {
    const deck = createDeck();
    const deal = createInitialDeal(
      deck,
      "PLAYER_0",
      "THREE_THEN_TWO",
    );

    expect(deal.hands.PLAYER_1).toEqual([
      deck[0],
      deck[1],
      deck[2],
      deck[12],
      deck[13],
    ]);

    expect(deal.hands.PLAYER_2).toEqual([
      deck[3],
      deck[4],
      deck[5],
      deck[14],
      deck[15],
    ]);

    expect(deal.hands.PLAYER_3).toEqual([
      deck[6],
      deck[7],
      deck[8],
      deck[16],
      deck[17],
    ]);

    expect(deal.hands.PLAYER_0).toEqual([
      deck[9],
      deck[10],
      deck[11],
      deck[18],
      deck[19],
    ]);

    expect(deal.turnUpCard).toBe(deck[20]);
  });

  it("supports the two then three pattern", () => {
    const deck = createDeck();
    const deal = createInitialDeal(
      deck,
      "PLAYER_0",
      "TWO_THEN_THREE",
    );

    expect(deal.hands.PLAYER_1).toEqual([
      deck[0],
      deck[1],
      deck[8],
      deck[9],
      deck[10],
    ]);

    expect(deal.hands.PLAYER_0).toEqual([
      deck[6],
      deck[7],
      deck[17],
      deck[18],
      deck[19],
    ]);

    expect(deal.turnUpCard).toBe(deck[20]);
  });

  it("works correctly for every possible dealer", () => {
    const dealers: readonly PlayerPosition[] = [
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
    ];

    for (const dealer of dealers) {
      const deal = createInitialDeal(createDeck(), dealer);

      expect(deal.dealer).toBe(dealer);

      for (const hand of Object.values(deal.hands)) {
        expect(hand).toHaveLength(5);
      }

      expect(deal.remainingDeck).toHaveLength(11);
    }
  });

  it("returns immutable deal collections", () => {
    const deal = createInitialDeal(createDeck(), "PLAYER_0");

    expect(Object.isFrozen(deal)).toBe(true);
    expect(Object.isFrozen(deal.hands)).toBe(true);
    expect(Object.isFrozen(deal.hands.PLAYER_0)).toBe(true);
    expect(Object.isFrozen(deal.hands.PLAYER_1)).toBe(true);
    expect(Object.isFrozen(deal.hands.PLAYER_2)).toBe(true);
    expect(Object.isFrozen(deal.hands.PLAYER_3)).toBe(true);
    expect(Object.isFrozen(deal.remainingDeck)).toBe(true);
  });
});