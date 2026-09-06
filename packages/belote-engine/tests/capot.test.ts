import { describe, expect, it } from "vitest";

import {
  CAPOT_POINTS,
  applyCapotPoints,
  createCard,
  detectCapot,
  type CompletedTrick,
  type PlayedCard,
  type PlayerPosition,
} from "../src/index.js";

function createCompletedTrick(
  winnerPlayer: PlayerPosition,
  trickIndex: number,
): CompletedTrick {
  const suits = [
    "CLUBS",
    "DIAMONDS",
    "SPADES",
    "HEARTS",
  ] as const;

  const ranks = [
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "JACK",
    "QUEEN",
    "KING",
    "ACE",
  ] as const;

  const suit = suits[trickIndex % suits.length];

  if (suit === undefined) {
    throw new Error("Missing test suit.");
  }

  const rank = ranks[trickIndex];

  if (rank === undefined) {
    throw new Error("Missing test rank.");
  }

  const playerOrder: readonly PlayerPosition[] = [
    winnerPlayer,
    winnerPlayer === "PLAYER_0"
      ? "PLAYER_1"
      : "PLAYER_0",
    winnerPlayer === "PLAYER_2"
      ? "PLAYER_3"
      : "PLAYER_2",
    winnerPlayer === "PLAYER_3"
      ? "PLAYER_1"
      : "PLAYER_3",
  ];

  const plays: PlayedCard[] = playerOrder.map(
    (player, index) => ({
      player,
      card: createCard(
        suit,
        index === 0 ? "ACE" : rank,
      ),
    }),
  );

  const forcedWinner = Object.freeze({
    player: winnerPlayer,
    card: plays[0]!.card,
    playIndex: 0,
  });

  return Object.freeze({
    leader: winnerPlayer,
    winner: forcedWinner,
    trick: Object.freeze({
      leader: winnerPlayer,
      currentPlayer: winnerPlayer,
      plays: Object.freeze(plays),
      winner: forcedWinner,
      completed: true,
    }),
  });
}

function createCapotTricks(
  team: "TEAM_0" | "TEAM_1",
): readonly CompletedTrick[] {
  const winner =
    team === "TEAM_0"
      ? "PLAYER_0"
      : "PLAYER_1";

  return Object.freeze(
    Array.from(
      { length: 8 },
      (_, index) =>
        createCompletedTrick(
          winner,
          index,
        ),
    ),
  );
}

describe("capot", () => {
  it("defines capot as 252 points", () => {
    expect(CAPOT_POINTS).toBe(252);
  });

  it("detects TEAM_0 winning all eight tricks", () => {
    const result = detectCapot(
      createCapotTricks("TEAM_0"),
    );

    expect(result.isCapot).toBe(true);
    expect(result.team).toBe("TEAM_0");
    expect(result.trickWins).toEqual({
      TEAM_0: 8,
      TEAM_1: 0,
    });
  });

  it("detects TEAM_1 winning all eight tricks", () => {
    const result = detectCapot(
      createCapotTricks("TEAM_1"),
    );

    expect(result.isCapot).toBe(true);
    expect(result.team).toBe("TEAM_1");
    expect(result.trickWins).toEqual({
      TEAM_0: 0,
      TEAM_1: 8,
    });
  });

  it("does not report capot when both teams win tricks", () => {
    const tricks = [
      ...createCapotTricks("TEAM_0").slice(0, 7),
      createCompletedTrick(
        "PLAYER_1",
        7,
      ),
    ];

    const result = detectCapot(
      Object.freeze(tricks),
    );

    expect(result.isCapot).toBe(false);
    expect(result.team).toBeNull();
    expect(result.trickWins).toEqual({
      TEAM_0: 7,
      TEAM_1: 1,
    });
  });

  it("awards exactly 252 points for a capot without Belote", () => {
    const capot = detectCapot(
      createCapotTricks("TEAM_0"),
    );

    expect(
      applyCapotPoints(capot),
    ).toEqual({
      TEAM_0: 252,
      TEAM_1: 0,
    });
  });

  it("adds Belote separately to the capot team", () => {
    const capot = detectCapot(
      createCapotTricks("TEAM_0"),
    );

    expect(
      applyCapotPoints(
        capot,
        "TEAM_0",
      ),
    ).toEqual({
      TEAM_0: 272,
      TEAM_1: 0,
    });
  });

  it("preserves opponent Belote during a capot", () => {
    const capot = detectCapot(
      createCapotTricks("TEAM_0"),
    );

    expect(
      applyCapotPoints(
        capot,
        "TEAM_1",
      ),
    ).toEqual({
      TEAM_0: 252,
      TEAM_1: 20,
    });
  });

  it("rejects capot detection with fewer than eight tricks", () => {
    expect(() =>
      detectCapot(
        createCapotTricks("TEAM_0").slice(0, 7),
      ),
    ).toThrow(
      "Capot detection requires exactly eight completed tricks.",
    );
  });

  it("rejects applying capot points when no capot exists", () => {
    const tricks = [
      ...createCapotTricks("TEAM_0").slice(0, 7),
      createCompletedTrick(
        "PLAYER_1",
        7,
      ),
    ];

    const result = detectCapot(
      Object.freeze(tricks),
    );

    expect(() =>
      applyCapotPoints(result),
    ).toThrow(
      "Capot points can only be applied to a detected capot.",
    );
  });

  it("returns immutable capot results", () => {
    const result = detectCapot(
      createCapotTricks("TEAM_0"),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(
      Object.isFrozen(result.trickWins),
    ).toBe(true);

    const points = applyCapotPoints(
      result,
    );

    expect(Object.isFrozen(points)).toBe(true);
  });
});