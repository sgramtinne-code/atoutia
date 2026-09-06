import { describe, expect, it } from "vitest";

import {
  advanceToNextTrick,
  createBeloteState,
  createCard,
  createTrickSequence,
  playCard,
  type PlayerHands,
} from "../src/index.js";

function createHands(): PlayerHands {
  return Object.freeze({
    PLAYER_0: Object.freeze([
      createCard("CLUBS", "ACE"),
      createCard("SPADES", "ACE"),
    ]),
    PLAYER_1: Object.freeze([
      createCard("CLUBS", "KING"),
      createCard("SPADES", "KING"),
    ]),
    PLAYER_2: Object.freeze([
      createCard("CLUBS", "TEN"),
      createCard("SPADES", "TEN"),
    ]),
    PLAYER_3: Object.freeze([
      createCard("CLUBS", "QUEEN"),
      createCard("SPADES", "QUEEN"),
    ]),
  });
}

describe("trick sequence", () => {
  it("creates the first trick with the requested leader", () => {
    const state = createTrickSequence(
      createHands(),
      "PLAYER_2",
    );

    expect(state.currentTrick.leader).toBe("PLAYER_2");
    expect(state.currentTrick.currentPlayer).toBe("PLAYER_2");
    expect(state.completedTricks).toHaveLength(0);
  });

  it("rejects advancing before the current trick is complete", () => {
    const state = createTrickSequence(
      createHands(),
      "PLAYER_0",
    );

    expect(() =>
      advanceToNextTrick(state),
    ).toThrow(
      "Current trick must be completed before starting the next trick.",
    );
  });

  it("starts the next trick with the previous winner", () => {
    let state = createTrickSequence(
      createHands(),
      "PLAYER_0",
    );

    let hands = state.hands;
    let trick = state.currentTrick;
    let belote = createBeloteState(
      hands,
      "HEARTS",
    );

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

    state = Object.freeze({
      ...state,
      hands,
      currentTrick: trick,
    });

    const next = advanceToNextTrick(state);

    expect(next.completedTricks).toHaveLength(1);
    expect(next.completedTricks[0]?.winner.player).toBe("PLAYER_0");
    expect(next.currentTrick.leader).toBe("PLAYER_0");
    expect(next.currentTrick.currentPlayer).toBe("PLAYER_0");
  });

  it("preserves the completed trick history", () => {
    let state = createTrickSequence(
      createHands(),
      "PLAYER_0",
    );

    let hands = state.hands;
    let trick = state.currentTrick;
    let belote = createBeloteState(
      hands,
      "HEARTS",
    );

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

    state = Object.freeze({
      ...state,
      hands,
      currentTrick: trick,
    });

    const next = advanceToNextTrick(state);

    expect(next.completedTricks).toHaveLength(1);
    expect(next.completedTricks[0]?.trick.completed).toBe(true);
    expect(next.completedTricks[0]?.trick.plays).toHaveLength(4);
  });

  it("preserves remaining hands when advancing", () => {
    let state = createTrickSequence(
      createHands(),
      "PLAYER_0",
    );

    let hands = state.hands;
    let trick = state.currentTrick;
    let belote = createBeloteState(
      hands,
      "HEARTS",
    );

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

    state = Object.freeze({
      ...state,
      hands,
      currentTrick: trick,
    });

    const next = advanceToNextTrick(state);

    expect(next.hands.PLAYER_0).toHaveLength(1);
    expect(next.hands.PLAYER_1).toHaveLength(1);
    expect(next.hands.PLAYER_2).toHaveLength(1);
    expect(next.hands.PLAYER_3).toHaveLength(1);
  });

  it("returns immutable sequence state", () => {
    const state = createTrickSequence(
      createHands(),
      "PLAYER_0",
    );

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.completedTricks)).toBe(true);
    expect(Object.isFrozen(state.currentTrick)).toBe(true);
  });
});