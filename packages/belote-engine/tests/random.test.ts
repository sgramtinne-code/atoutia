import { describe, expect, it } from "vitest";

import {
  Mulberry32Random,
  cardKey,
  createDeck,
  shuffleDeck,
} from "../src/index.js";

describe("deterministic random and shuffle", () => {
  it("rejects non-integer seeds", () => {
    expect(() => new Mulberry32Random(1.5)).toThrow(
      "Seed must be an integer.",
    );
  });

  it("produces values between zero inclusive and one exclusive", () => {
    const random = new Mulberry32Random(12345);

    for (let index = 0; index < 1000; index += 1) {
      const value = random.next();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("produces the same sequence for the same seed", () => {
    const first = new Mulberry32Random(123456);
    const second = new Mulberry32Random(123456);

    const firstSequence = Array.from({ length: 20 }, () => first.next());
    const secondSequence = Array.from({ length: 20 }, () => second.next());

    expect(firstSequence).toEqual(secondSequence);
  });

  it("produces different sequences for different seeds", () => {
    const first = new Mulberry32Random(1);
    const second = new Mulberry32Random(2);

    const firstSequence = Array.from({ length: 20 }, () => first.next());
    const secondSequence = Array.from({ length: 20 }, () => second.next());

    expect(firstSequence).not.toEqual(secondSequence);
  });

  it("shuffles deterministically with the same seed", () => {
    const deck = createDeck();

    const firstShuffle = shuffleDeck(deck, new Mulberry32Random(20260906));
    const secondShuffle = shuffleDeck(deck, new Mulberry32Random(20260906));

    expect(firstShuffle).toEqual(secondShuffle);
  });

  it("usually produces a different order with another seed", () => {
    const deck = createDeck();

    const firstShuffle = shuffleDeck(deck, new Mulberry32Random(1));
    const secondShuffle = shuffleDeck(deck, new Mulberry32Random(2));

    expect(firstShuffle).not.toEqual(secondShuffle);
  });

  it("does not mutate the source deck", () => {
    const deck = createDeck();
    const before = deck.map(cardKey);

    shuffleDeck(deck, new Mulberry32Random(42));

    expect(deck.map(cardKey)).toEqual(before);
  });

  it("preserves all 32 cards exactly once", () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck, new Mulberry32Random(42));

    expect(shuffled).toHaveLength(32);

    const originalKeys = [...deck.map(cardKey)].sort();
    const shuffledKeys = [...shuffled.map(cardKey)].sort();

    expect(shuffledKeys).toEqual(originalKeys);
    expect(new Set(shuffled.map(cardKey)).size).toBe(32);
  });

  it("returns a frozen shuffled deck", () => {
    const shuffled = shuffleDeck(
      createDeck(),
      new Mulberry32Random(42),
    );

    expect(Object.isFrozen(shuffled)).toBe(true);
  });
});