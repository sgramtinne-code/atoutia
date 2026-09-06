import { describe, expect, it } from "vitest";

import {
  RANKS,
  SUITS,
  cardKey,
  createCard,
  createDeck,
} from "../src/index.js";

describe("cards", () => {
  it("defines exactly four suits", () => {
    expect(SUITS).toEqual(["CLUBS", "DIAMONDS", "HEARTS", "SPADES"]);
  });

  it("defines exactly eight ranks", () => {
    expect(RANKS).toEqual([
      "SEVEN",
      "EIGHT",
      "NINE",
      "TEN",
      "JACK",
      "QUEEN",
      "KING",
      "ACE",
    ]);
  });

  it("creates a card with the requested suit and rank", () => {
    const card = createCard("HEARTS", "ACE");

    expect(card).toEqual({
      suit: "HEARTS",
      rank: "ACE",
    });
  });

  it("creates exactly 32 cards", () => {
    const deck = createDeck();

    expect(deck).toHaveLength(32);
  });

  it("creates every suit/rank combination exactly once", () => {
    const deck = createDeck();
    const keys = deck.map(cardKey);
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(32);
  });

  it("contains eight cards for each suit", () => {
    const deck = createDeck();

    for (const suit of SUITS) {
      expect(deck.filter((card) => card.suit === suit)).toHaveLength(8);
    }
  });

  it("contains four cards for each rank", () => {
    const deck = createDeck();

    for (const rank of RANKS) {
      expect(deck.filter((card) => card.rank === rank)).toHaveLength(4);
    }
  });

  it("creates the deck in a deterministic order", () => {
    const first = createDeck();
    const second = createDeck();

    expect(first).toEqual(second);
  });

  it("returns frozen card and deck objects", () => {
    const deck = createDeck();

    expect(Object.isFrozen(deck)).toBe(true);
    expect(deck.every((card) => Object.isFrozen(card))).toBe(true);
  });
});