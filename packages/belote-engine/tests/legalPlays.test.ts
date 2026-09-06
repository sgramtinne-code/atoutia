import { describe, expect, it } from "vitest";

import {
  cardKey,
  createCard,
  getLegalCards,
  type Card,
  type PlayedCard,
} from "../src/index.js";

function keys(cards: readonly Card[]): readonly string[] {
  return cards.map(cardKey);
}

describe("legal plays", () => {
  it("allows every card when leading a trick", () => {
    const hand = [
      createCard("CLUBS", "ACE"),
      createCard("HEARTS", "JACK"),
      createCard("SPADES", "SEVEN"),
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_0",
      [],
      "HEARTS",
    );

    expect(keys(legal)).toEqual(keys(hand));
  });

  it("requires following the led suit when possible", () => {
    const hand = [
      createCard("CLUBS", "ACE"),
      createCard("CLUBS", "SEVEN"),
      createCard("HEARTS", "JACK"),
      createCard("SPADES", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "TEN"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_1",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual([
      "CLUBS:ACE",
      "CLUBS:SEVEN",
    ]);
  });

  it("does not require trumping when the player can follow suit", () => {
    const hand = [
      createCard("SPADES", "SEVEN"),
      createCard("HEARTS", "JACK"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("SPADES", "ACE"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_1",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual(["SPADES:SEVEN"]);
  });

  it("requires trumping when unable to follow and partner is not winning", () => {
    const hand = [
      createCard("HEARTS", "SEVEN"),
      createCard("DIAMONDS", "ACE"),
      createCard("SPADES", "KING"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_1",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual(["HEARTS:SEVEN"]);
  });

  it("allows any card when unable to follow and holding no trump", () => {
    const hand = [
      createCard("DIAMONDS", "ACE"),
      createCard("SPADES", "KING"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_1",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual(keys(hand));
  });

  it("allows discarding freely when the partner is currently winning", () => {
    const hand = [
      createCard("HEARTS", "JACK"),
      createCard("DIAMONDS", "ACE"),
      createCard("SPADES", "KING"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("CLUBS", "SEVEN"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_2",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual(keys(hand));
  });

  it("allows trumping voluntarily when the partner is currently winning", () => {
    const hand = [
      createCard("HEARTS", "SEVEN"),
      createCard("SPADES", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("CLUBS", "SEVEN"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_2",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toContain("HEARTS:SEVEN");
    expect(keys(legal)).toContain("SPADES:ACE");
  });

  it("requires overtrumping when a higher trump is available", () => {
    const hand = [
      createCard("HEARTS", "JACK"),
      createCard("HEARTS", "SEVEN"),
      createCard("DIAMONDS", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("HEARTS", "NINE"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_2",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual(["HEARTS:JACK"]);
  });

  it("allows undertrumping when no higher trump is available", () => {
    const hand = [
      createCard("HEARTS", "ACE"),
      createCard("HEARTS", "SEVEN"),
      createCard("DIAMONDS", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("HEARTS", "JACK"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_2",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual([
      "HEARTS:ACE",
      "HEARTS:SEVEN",
    ]);
  });

  it("requires overtrumping when trump is the led suit", () => {
    const hand = [
      createCard("HEARTS", "JACK"),
      createCard("HEARTS", "ACE"),
      createCard("SPADES", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("HEARTS", "NINE"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_1",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual(["HEARTS:JACK"]);
  });

  it("allows lower trumps when trump is led but overtrumping is impossible", () => {
    const hand = [
      createCard("HEARTS", "ACE"),
      createCard("HEARTS", "SEVEN"),
      createCard("SPADES", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("HEARTS", "JACK"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_1",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual([
      "HEARTS:ACE",
      "HEARTS:SEVEN",
    ]);
  });

  it("uses the current trick winner when deciding whether the partner is master", () => {
    const hand = [
      createCard("HEARTS", "ACE"),
      createCard("DIAMONDS", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("HEARTS", "SEVEN"),
      },
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_2",
      plays,
      "HEARTS",
    );

    expect(keys(legal)).toEqual(["HEARTS:ACE"]);
  });

  it("rejects a player who has already played in the trick", () => {
    const hand = [
      createCard("CLUBS", "ACE"),
    ];

    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "SEVEN"),
      },
    ];

    expect(() =>
      getLegalCards(
        hand,
        "PLAYER_0",
        plays,
        "HEARTS",
      ),
    ).toThrow(
      "Player has already played a card in this trick.",
    );
  });

  it("returns immutable legal-card collections", () => {
    const hand = [
      createCard("CLUBS", "ACE"),
      createCard("SPADES", "ACE"),
    ];

    const legal = getLegalCards(
      hand,
      "PLAYER_0",
      [],
      "HEARTS",
    );

    expect(Object.isFrozen(legal)).toBe(true);
  });
});