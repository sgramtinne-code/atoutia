import { describe, expect, it } from "vitest";

import {
  applyBeloteCardPlayed,
  createBeloteState,
  createCard,
  type PlayerHands,
} from "../src/index.js";

function createHandsWithBelote(): PlayerHands {
  return Object.freeze({
    PLAYER_0: Object.freeze([
      createCard("CLUBS", "ACE"),
    ]),
    PLAYER_1: Object.freeze([
      createCard("HEARTS", "KING"),
      createCard("HEARTS", "QUEEN"),
      createCard("SPADES", "ACE"),
    ]),
    PLAYER_2: Object.freeze([
      createCard("DIAMONDS", "ACE"),
    ]),
    PLAYER_3: Object.freeze([
      createCard("SPADES", "KING"),
    ]),
  });
}

describe("belote and rebelote", () => {
  it("detects the player holding trump King and Queen", () => {
    const state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    expect(state.eligiblePlayer).toBe("PLAYER_1");
    expect(state.eligibleTeam).toBe("TEAM_1");
  });

  it("does not detect King and Queen of a non-trump suit", () => {
    const hands: PlayerHands = Object.freeze({
      PLAYER_0: Object.freeze([
        createCard("SPADES", "KING"),
        createCard("SPADES", "QUEEN"),
      ]),
      PLAYER_1: Object.freeze([]),
      PLAYER_2: Object.freeze([]),
      PLAYER_3: Object.freeze([]),
    });

    const state = createBeloteState(
      hands,
      "HEARTS",
    );

    expect(state.eligiblePlayer).toBeNull();
    expect(state.eligibleTeam).toBeNull();
  });

  it("starts with zero Belote points", () => {
    const state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    expect(state.points).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.events).toHaveLength(0);
  });

  it("emits BELOTE when the first trump honor is played", () => {
    const state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    const result = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "KING"),
    );

    expect(result.event?.type).toBe("BELOTE");
    expect(result.event?.player).toBe("PLAYER_1");
    expect(result.event?.team).toBe("TEAM_1");

    expect(result.state.points).toBe(0);
    expect(result.state.completed).toBe(false);
  });

  it("accepts Queen as the first Belote honor", () => {
    const state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    const result = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "QUEEN"),
    );

    expect(result.event?.type).toBe("BELOTE");
    expect(result.state.completed).toBe(false);
  });

  it("emits REBELOTE when the second trump honor is played", () => {
    let state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    state = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "KING"),
    ).state;

    const result = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "QUEEN"),
    );

    expect(result.event?.type).toBe("REBELOTE");
    expect(result.state.completed).toBe(true);
    expect(result.state.points).toBe(20);
    expect(result.state.events).toHaveLength(2);
  });

  it("awards only twenty points for the complete pair", () => {
    let state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    state = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "QUEEN"),
    ).state;

    state = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "KING"),
    ).state;

    expect(state.points).toBe(20);
  });

  it("ignores unrelated cards", () => {
    const state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    const result = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("SPADES", "ACE"),
    );

    expect(result.event).toBeNull();
    expect(result.state).toBe(state);
  });

  it("ignores trump honors played by another player", () => {
    const state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    const result = applyBeloteCardPlayed(
      state,
      "PLAYER_0",
      createCard("HEARTS", "KING"),
    );

    expect(result.event).toBeNull();
    expect(result.state).toBe(state);
  });

  it("rejects declaring the same trump honor twice", () => {
    let state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    state = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "KING"),
    ).state;

    expect(() =>
      applyBeloteCardPlayed(
        state,
        "PLAYER_1",
        createCard("HEARTS", "KING"),
      ),
    ).toThrow(
      "Belote trump honor has already been played.",
    );
  });

  it("keeps Belote state immutable", () => {
    const state = createBeloteState(
      createHandsWithBelote(),
      "HEARTS",
    );

    const result = applyBeloteCardPlayed(
      state,
      "PLAYER_1",
      createCard("HEARTS", "KING"),
    );

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.events)).toBe(true);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(
      Object.isFrozen(result.state.playedHonorKeys),
    ).toBe(true);
    expect(
      Object.isFrozen(result.state.events),
    ).toBe(true);
    expect(Object.isFrozen(result.event)).toBe(true);
  });
});