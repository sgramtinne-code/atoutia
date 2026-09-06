import { describe, expect, it } from "vitest";

import {
  cardKey,
  createCard,
  createTrickState,
  playCard,
  type PlayerHands,
} from "../src/index.js";

function createHands(): PlayerHands {
  return Object.freeze({
    PLAYER_0: Object.freeze([
      createCard("CLUBS", "ACE"),
      createCard("HEARTS", "SEVEN"),
    ]),
    PLAYER_1: Object.freeze([
      createCard("CLUBS", "KING"),
      createCard("HEARTS", "JACK"),
    ]),
    PLAYER_2: Object.freeze([
      createCard("CLUBS", "TEN"),
      createCard("SPADES", "ACE"),
    ]),
    PLAYER_3: Object.freeze([
      createCard("CLUBS", "QUEEN"),
      createCard("DIAMONDS", "ACE"),
    ]),
  });
}

describe("trick play", () => {
  it("creates a trick with the leader on turn", () => {
    const trick = createTrickState("PLAYER_2");

    expect(trick.leader).toBe("PLAYER_2");
    expect(trick.currentPlayer).toBe("PLAYER_2");
    expect(trick.plays).toHaveLength(0);
    expect(trick.completed).toBe(false);
    expect(trick.winner).toBeNull();
  });

  it("plays a legal card and removes it from the hand", () => {
    const hands = createHands();
    const trick = createTrickState("PLAYER_0");

    const result = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
    );

    expect(
      result.hands.PLAYER_0.map(cardKey),
    ).toEqual(["HEARTS:SEVEN"]);

    expect(result.trick.plays).toHaveLength(1);
    expect(result.trick.plays[0]?.player).toBe("PLAYER_0");
    expect(result.trick.currentPlayer).toBe("PLAYER_1");
  });

  it("does not mutate the original hands", () => {
    const hands = createHands();
    const before = hands.PLAYER_0.map(cardKey);

    playCard(
      hands,
      createTrickState("PLAYER_0"),
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
    );

    expect(hands.PLAYER_0.map(cardKey)).toEqual(before);
  });

  it("rejects a player who is not on turn", () => {
    const hands = createHands();

    expect(() =>
      playCard(
        hands,
        createTrickState("PLAYER_0"),
        "PLAYER_1",
        createCard("CLUBS", "KING"),
        "HEARTS",
      ),
    ).toThrow("It is not this player's turn.");
  });

  it("rejects a card that is not in the player's hand", () => {
    const hands = createHands();

    expect(() =>
      playCard(
        hands,
        createTrickState("PLAYER_0"),
        "PLAYER_0",
        createCard("SPADES", "JACK"),
        "HEARTS",
      ),
    ).toThrow("Card is not present in player's hand.");
  });

  it("rejects an illegal card when the player must follow suit", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");

    const first = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
    );

    hands = first.hands;
    trick = first.trick;

    expect(() =>
      playCard(
        hands,
        trick,
        "PLAYER_1",
        createCard("HEARTS", "JACK"),
        "HEARTS",
      ),
    ).toThrow("Card is not legal in the current trick.");
  });

  it("advances through all four players", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");

    let result = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
    );

    hands = result.hands;
    trick = result.trick;

    expect(trick.currentPlayer).toBe("PLAYER_1");

    result = playCard(
      hands,
      trick,
      "PLAYER_1",
      createCard("CLUBS", "KING"),
      "HEARTS",
    );

    hands = result.hands;
    trick = result.trick;

    expect(trick.currentPlayer).toBe("PLAYER_2");

    result = playCard(
      hands,
      trick,
      "PLAYER_2",
      createCard("CLUBS", "TEN"),
      "HEARTS",
    );

    hands = result.hands;
    trick = result.trick;

    expect(trick.currentPlayer).toBe("PLAYER_3");
  });

  it("automatically completes the trick after four cards", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");

    const sequence = [
      ["PLAYER_0", createCard("CLUBS", "ACE")],
      ["PLAYER_1", createCard("CLUBS", "KING")],
      ["PLAYER_2", createCard("CLUBS", "TEN")],
      ["PLAYER_3", createCard("CLUBS", "QUEEN")],
    ] as const;

    for (const [player, card] of sequence) {
      const result = playCard(
        hands,
        trick,
        player,
        card,
        "HEARTS",
      );

      hands = result.hands;
      trick = result.trick;
    }

    expect(trick.completed).toBe(true);
    expect(trick.plays).toHaveLength(4);
    expect(trick.winner?.player).toBe("PLAYER_0");
    expect(trick.winner?.card.rank).toBe("ACE");
  });

  it("sets the completed trick current player to the winner", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");

    const sequence = [
      ["PLAYER_0", createCard("CLUBS", "ACE")],
      ["PLAYER_1", createCard("CLUBS", "KING")],
      ["PLAYER_2", createCard("CLUBS", "TEN")],
      ["PLAYER_3", createCard("CLUBS", "QUEEN")],
    ] as const;

    for (const [player, card] of sequence) {
      const result = playCard(
        hands,
        trick,
        player,
        card,
        "HEARTS",
      );

      hands = result.hands;
      trick = result.trick;
    }

    expect(trick.currentPlayer).toBe("PLAYER_0");
  });

  it("rejects additional cards after the trick is completed", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");

    const sequence = [
      ["PLAYER_0", createCard("CLUBS", "ACE")],
      ["PLAYER_1", createCard("CLUBS", "KING")],
      ["PLAYER_2", createCard("CLUBS", "TEN")],
      ["PLAYER_3", createCard("CLUBS", "QUEEN")],
    ] as const;

    for (const [player, card] of sequence) {
      const result = playCard(
        hands,
        trick,
        player,
        card,
        "HEARTS",
      );

      hands = result.hands;
      trick = result.trick;
    }

    expect(() =>
      playCard(
        hands,
        trick,
        "PLAYER_0",
        createCard("HEARTS", "SEVEN"),
        "HEARTS",
      ),
    ).toThrow("Trick is already completed.");
  });

  it("supports a trump winning the completed trick", () => {
    const hands: PlayerHands = Object.freeze({
      PLAYER_0: Object.freeze([
        createCard("CLUBS", "ACE"),
      ]),
      PLAYER_1: Object.freeze([
        createCard("HEARTS", "SEVEN"),
      ]),
      PLAYER_2: Object.freeze([
        createCard("CLUBS", "TEN"),
      ]),
      PLAYER_3: Object.freeze([
        createCard("HEARTS", "JACK"),
      ]),
    });

    let trick = createTrickState("PLAYER_0");
    let currentHands = hands;

    const sequence = [
      ["PLAYER_0", createCard("CLUBS", "ACE")],
      ["PLAYER_1", createCard("HEARTS", "SEVEN")],
      ["PLAYER_2", createCard("CLUBS", "TEN")],
      ["PLAYER_3", createCard("HEARTS", "JACK")],
    ] as const;

    for (const [player, card] of sequence) {
      const result = playCard(
        currentHands,
        trick,
        player,
        card,
        "HEARTS",
      );

      currentHands = result.hands;
      trick = result.trick;
    }

    expect(trick.completed).toBe(true);
    expect(trick.winner?.player).toBe("PLAYER_3");
    expect(trick.winner?.card.rank).toBe("JACK");
  });

  it("returns immutable state after playing", () => {
    const result = playCard(
      createHands(),
      createTrickState("PLAYER_0"),
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.hands)).toBe(true);
    expect(Object.isFrozen(result.trick)).toBe(true);
    expect(Object.isFrozen(result.trick.plays)).toBe(true);
  });
});