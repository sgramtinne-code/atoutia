import { describe, expect, it } from "vitest";

import {
  createCard,
  getCardPoints,
  getCardStrength,
  compareSameSuitCards,
  isTrump,
  type Rank,
} from "../src/index.js";

const NON_TRUMP_ORDER: readonly Rank[] = [
  "SEVEN",
  "EIGHT",
  "NINE",
  "JACK",
  "QUEEN",
  "KING",
  "TEN",
  "ACE",
];

const TRUMP_ORDER: readonly Rank[] = [
  "SEVEN",
  "EIGHT",
  "QUEEN",
  "KING",
  "TEN",
  "ACE",
  "NINE",
  "JACK",
];

describe("card rules", () => {
  it("detects whether a card is trump", () => {
    expect(isTrump(createCard("HEARTS", "ACE"), "HEARTS")).toBe(true);
    expect(isTrump(createCard("SPADES", "ACE"), "HEARTS")).toBe(false);
  });

  it("uses correct non-trump points", () => {
    expect(getCardPoints(createCard("CLUBS", "ACE"), "HEARTS")).toBe(11);
    expect(getCardPoints(createCard("CLUBS", "TEN"), "HEARTS")).toBe(10);
    expect(getCardPoints(createCard("CLUBS", "KING"), "HEARTS")).toBe(4);
    expect(getCardPoints(createCard("CLUBS", "QUEEN"), "HEARTS")).toBe(3);
    expect(getCardPoints(createCard("CLUBS", "JACK"), "HEARTS")).toBe(2);
    expect(getCardPoints(createCard("CLUBS", "NINE"), "HEARTS")).toBe(0);
    expect(getCardPoints(createCard("CLUBS", "EIGHT"), "HEARTS")).toBe(0);
    expect(getCardPoints(createCard("CLUBS", "SEVEN"), "HEARTS")).toBe(0);
  });

  it("uses correct trump points", () => {
    expect(getCardPoints(createCard("HEARTS", "JACK"), "HEARTS")).toBe(20);
    expect(getCardPoints(createCard("HEARTS", "NINE"), "HEARTS")).toBe(14);
    expect(getCardPoints(createCard("HEARTS", "ACE"), "HEARTS")).toBe(11);
    expect(getCardPoints(createCard("HEARTS", "TEN"), "HEARTS")).toBe(10);
    expect(getCardPoints(createCard("HEARTS", "KING"), "HEARTS")).toBe(4);
    expect(getCardPoints(createCard("HEARTS", "QUEEN"), "HEARTS")).toBe(3);
    expect(getCardPoints(createCard("HEARTS", "EIGHT"), "HEARTS")).toBe(0);
    expect(getCardPoints(createCard("HEARTS", "SEVEN"), "HEARTS")).toBe(0);
  });

  it("uses the official non-trump order", () => {
    for (let index = 1; index < NON_TRUMP_ORDER.length; index += 1) {
      const weakerRank = NON_TRUMP_ORDER[index - 1];
      const strongerRank = NON_TRUMP_ORDER[index];

      if (weakerRank === undefined || strongerRank === undefined) {
        throw new Error("Invalid non-trump test data.");
      }

      const weaker = createCard("SPADES", weakerRank);
      const stronger = createCard("SPADES", strongerRank);

      expect(getCardStrength(stronger, "HEARTS")).toBeGreaterThan(
        getCardStrength(weaker, "HEARTS"),
      );
    }
  });

  it("uses the official trump order", () => {
    for (let index = 1; index < TRUMP_ORDER.length; index += 1) {
      const weakerRank = TRUMP_ORDER[index - 1];
      const strongerRank = TRUMP_ORDER[index];

      if (weakerRank === undefined || strongerRank === undefined) {
        throw new Error("Invalid trump test data.");
      }

      const weaker = createCard("HEARTS", weakerRank);
      const stronger = createCard("HEARTS", strongerRank);

      expect(getCardStrength(stronger, "HEARTS")).toBeGreaterThan(
        getCardStrength(weaker, "HEARTS"),
      );
    }
  });

  it("compares cards of the same non-trump suit", () => {
    const ace = createCard("SPADES", "ACE");
    const ten = createCard("SPADES", "TEN");

    expect(compareSameSuitCards(ace, ten, "HEARTS")).toBeGreaterThan(0);
    expect(compareSameSuitCards(ten, ace, "HEARTS")).toBeLessThan(0);
    expect(compareSameSuitCards(ace, ace, "HEARTS")).toBe(0);
  });

  it("compares cards of the trump suit", () => {
    const jack = createCard("HEARTS", "JACK");
    const nine = createCard("HEARTS", "NINE");

    expect(compareSameSuitCards(jack, nine, "HEARTS")).toBeGreaterThan(0);
    expect(compareSameSuitCards(nine, jack, "HEARTS")).toBeLessThan(0);
  });

  it("rejects comparison between different suits", () => {
    const aceOfSpades = createCard("SPADES", "ACE");
    const aceOfClubs = createCard("CLUBS", "ACE");

    expect(() =>
      compareSameSuitCards(aceOfSpades, aceOfClubs, "HEARTS"),
    ).toThrow("Cards must have the same suit.");
  });

  it("totals the 32 cards to 152 points", () => {
    const ranks: readonly Rank[] = [
      "SEVEN",
      "EIGHT",
      "NINE",
      "TEN",
      "JACK",
      "QUEEN",
      "KING",
      "ACE",
    ];

    const suits = ["CLUBS", "DIAMONDS", "HEARTS", "SPADES"] as const;

    const total = suits
      .flatMap((suit) => ranks.map((rank) => createCard(suit, rank)))
      .reduce(
        (sum, card) => sum + getCardPoints(card, "HEARTS"),
        0,
      );

    expect(total).toBe(152);
  });
});