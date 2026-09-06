import { describe, expect, it } from "vitest";

import {
  cardKey,
  createBeloteState,
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
    const belote = createBeloteState(hands, "HEARTS");

    const result = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
      belote,
    );

    expect(result.hands.PLAYER_0.map(cardKey)).toEqual([
      "HEARTS:SEVEN",
    ]);

    expect(result.trick.plays).toHaveLength(1);
    expect(result.trick.plays[0]?.player).toBe("PLAYER_0");
    expect(result.trick.currentPlayer).toBe("PLAYER_1");
  });

  it("does not mutate the original hands", () => {
    const hands = createHands();
    const before = hands.PLAYER_0.map(cardKey);
    const belote = createBeloteState(hands, "HEARTS");

    playCard(
      hands,
      createTrickState("PLAYER_0"),
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
      belote,
    );

    expect(hands.PLAYER_0.map(cardKey)).toEqual(before);
  });

  it("rejects a player who is not on turn", () => {
    const hands = createHands();
    const belote = createBeloteState(hands, "HEARTS");

    expect(() =>
      playCard(
        hands,
        createTrickState("PLAYER_0"),
        "PLAYER_1",
        createCard("CLUBS", "KING"),
        "HEARTS",
        belote,
      ),
    ).toThrow("It is not this player's turn.");
  });

  it("rejects a card that is not in the player's hand", () => {
    const hands = createHands();
    const belote = createBeloteState(hands, "HEARTS");

    expect(() =>
      playCard(
        hands,
        createTrickState("PLAYER_0"),
        "PLAYER_0",
        createCard("SPADES", "JACK"),
        "HEARTS",
        belote,
      ),
    ).toThrow("Card is not present in player's hand.");
  });

  it("rejects an illegal card when the player must follow suit", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");
    let belote = createBeloteState(hands, "HEARTS");

    const first = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
      belote,
    );

    hands = first.hands;
    trick = first.trick;
    belote = first.beloteState;

    expect(() =>
      playCard(
        hands,
        trick,
        "PLAYER_1",
        createCard("HEARTS", "JACK"),
        "HEARTS",
        belote,
      ),
    ).toThrow("Card is not legal in the current trick.");
  });

  it("advances through all four players", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");
    let belote = createBeloteState(hands, "HEARTS");

    let result = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
      belote,
    );

    hands = result.hands;
    trick = result.trick;
    belote = result.beloteState;

    expect(trick.currentPlayer).toBe("PLAYER_1");

    result = playCard(
      hands,
      trick,
      "PLAYER_1",
      createCard("CLUBS", "KING"),
      "HEARTS",
      belote,
    );

    hands = result.hands;
    trick = result.trick;
    belote = result.beloteState;

    expect(trick.currentPlayer).toBe("PLAYER_2");

    result = playCard(
      hands,
      trick,
      "PLAYER_2",
      createCard("CLUBS", "TEN"),
      "HEARTS",
      belote,
    );

    expect(result.trick.currentPlayer).toBe("PLAYER_3");
  });

  it("automatically completes the trick after four cards", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");
    let belote = createBeloteState(hands, "HEARTS");

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
        belote,
      );

      hands = result.hands;
      trick = result.trick;
      belote = result.beloteState;
    }

    expect(trick.completed).toBe(true);
    expect(trick.plays).toHaveLength(4);
    expect(trick.winner?.player).toBe("PLAYER_0");
    expect(trick.winner?.card.rank).toBe("ACE");
  });

  it("sets the completed trick current player to the winner", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");
    let belote = createBeloteState(hands, "HEARTS");

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
        belote,
      );

      hands = result.hands;
      trick = result.trick;
      belote = result.beloteState;
    }

    expect(trick.currentPlayer).toBe("PLAYER_0");
  });

  it("rejects additional cards after the trick is completed", () => {
    let hands = createHands();
    let trick = createTrickState("PLAYER_0");
    let belote = createBeloteState(hands, "HEARTS");

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
        belote,
      );

      hands = result.hands;
      trick = result.trick;
      belote = result.beloteState;
    }

    expect(() =>
      playCard(
        hands,
        trick,
        "PLAYER_0",
        createCard("HEARTS", "SEVEN"),
        "HEARTS",
        belote,
      ),
    ).toThrow("Trick is already completed.");
  });

  it("automatically emits BELOTE and REBELOTE", () => {
    let hands: PlayerHands = Object.freeze({
      PLAYER_0: Object.freeze([
        createCard("HEARTS", "KING"),
        createCard("HEARTS", "QUEEN"),
      ]),
      PLAYER_1: Object.freeze([
        createCard("CLUBS", "SEVEN"),
        createCard("SPADES", "SEVEN"),
      ]),
      PLAYER_2: Object.freeze([
        createCard("CLUBS", "EIGHT"),
        createCard("SPADES", "EIGHT"),
      ]),
      PLAYER_3: Object.freeze([
        createCard("CLUBS", "NINE"),
        createCard("SPADES", "NINE"),
      ]),
    });

    let belote = createBeloteState(
      hands,
      "HEARTS",
    );

    let trick = createTrickState("PLAYER_0");

    let result = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("HEARTS", "KING"),
      "HEARTS",
      belote,
    );

    expect(result.beloteEvent?.type).toBe("BELOTE");
    expect(result.beloteState.points).toBe(0);

    hands = result.hands;
    belote = result.beloteState;

    trick = createTrickState("PLAYER_0");

    result = playCard(
      hands,
      trick,
      "PLAYER_0",
      createCard("HEARTS", "QUEEN"),
      "HEARTS",
      belote,
    );

    expect(result.beloteEvent?.type).toBe("REBELOTE");
    expect(result.beloteState.completed).toBe(true);
    expect(result.beloteState.points).toBe(20);
  });

  it("returns no Belote event for unrelated cards", () => {
    const hands = createHands();
    const belote = createBeloteState(
      hands,
      "HEARTS",
    );

    const result = playCard(
      hands,
      createTrickState("PLAYER_0"),
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
      belote,
    );

    expect(result.beloteEvent).toBeNull();
  });

  it("rejects mismatched trump suits between play and Belote state", () => {
    const hands = createHands();
    const belote = createBeloteState(
      hands,
      "SPADES",
    );

    expect(() =>
      playCard(
        hands,
        createTrickState("PLAYER_0"),
        "PLAYER_0",
        createCard("CLUBS", "ACE"),
        "HEARTS",
        belote,
      ),
    ).toThrow(
      "Belote state trump suit must match trick trump suit.",
    );
  });

  it("returns immutable state after playing", () => {
    const hands = createHands();
    const belote = createBeloteState(
      hands,
      "HEARTS",
    );

    const result = playCard(
      hands,
      createTrickState("PLAYER_0"),
      "PLAYER_0",
      createCard("CLUBS", "ACE"),
      "HEARTS",
      belote,
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.hands)).toBe(true);
    expect(Object.isFrozen(result.trick)).toBe(true);
    expect(Object.isFrozen(result.trick.plays)).toBe(true);
    expect(Object.isFrozen(result.beloteState)).toBe(true);
  });
});