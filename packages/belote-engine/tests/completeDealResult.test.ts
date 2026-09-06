import { describe, expect, it } from "vitest";

import {
  applyBeloteCardPlayed,
  createBeloteState,
  createCard,
  createDeck,
  createLitigeState,
  getTrickWinner,
  resolveCompleteDeal,
  type CompletedTrick,
  type PlayedCard,
  type PlayerHands,
  type PlayerPosition,
} from "../src/index.js";

function createBeloteHands(
  player: PlayerPosition,
): PlayerHands {
  const empty = Object.freeze([]);

  return Object.freeze({
    PLAYER_0:
      player === "PLAYER_0"
        ? Object.freeze([
            createCard("HEARTS", "KING"),
            createCard("HEARTS", "QUEEN"),
          ])
        : empty,
    PLAYER_1:
      player === "PLAYER_1"
        ? Object.freeze([
            createCard("HEARTS", "KING"),
            createCard("HEARTS", "QUEEN"),
          ])
        : empty,
    PLAYER_2:
      player === "PLAYER_2"
        ? Object.freeze([
            createCard("HEARTS", "KING"),
            createCard("HEARTS", "QUEEN"),
          ])
        : empty,
    PLAYER_3:
      player === "PLAYER_3"
        ? Object.freeze([
            createCard("HEARTS", "KING"),
            createCard("HEARTS", "QUEEN"),
          ])
        : empty,
  });
}

function completeBelote(
  player: PlayerPosition,
) {
  let state = createBeloteState(
    createBeloteHands(player),
    "HEARTS",
  );

  state = applyBeloteCardPlayed(
    state,
    player,
    createCard("HEARTS", "KING"),
  ).state;

  state = applyBeloteCardPlayed(
    state,
    player,
    createCard("HEARTS", "QUEEN"),
  ).state;

  return state;
}

function createCompletedTricks(
  winners: readonly PlayerPosition[],
): readonly CompletedTrick[] {
  if (winners.length !== 8) {
    throw new Error(
      "Exactly eight winners are required.",
    );
  }

  const deck = createDeck();
  const tricks: CompletedTrick[] = [];

  for (let trickIndex = 0; trickIndex < 8; trickIndex += 1) {
    const winnerPlayer = winners[trickIndex];

    if (winnerPlayer === undefined) {
      throw new Error("Missing winner.");
    }

    const cards = deck.slice(
      trickIndex * 4,
      trickIndex * 4 + 4,
    );

    if (cards.length !== 4) {
      throw new Error("Missing trick cards.");
    }

    const players: readonly PlayerPosition[] = [
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

    const plays: readonly PlayedCard[] =
      Object.freeze(
        cards.map((card, index) => ({
          player: players[index]!,
          card,
        })),
      );

    const computedWinner = getTrickWinner(
      plays,
      "HEARTS",
    );

    const winner = Object.freeze({
      player: winnerPlayer,
      card: plays[0]!.card,
      playIndex: 0,
    });

    void computedWinner;

    tricks.push(
      Object.freeze({
        leader: winnerPlayer,
        winner,
        trick: Object.freeze({
          leader: winnerPlayer,
          currentPlayer: winnerPlayer,
          plays,
          winner,
          completed: true,
        }),
      }),
    );
  }

  return Object.freeze(tricks);
}

describe("complete deal resolution", () => {
  it("resolves a normal successful contract", () => {
    const tricks = createCompletedTricks([
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_1",
      "PLAYER_1",
    ]);

    const result = resolveCompleteDeal(
      tricks,
      "HEARTS",
      "PLAYER_0",
      createBeloteState(
        Object.freeze({
          PLAYER_0: Object.freeze([]),
          PLAYER_1: Object.freeze([]),
          PLAYER_2: Object.freeze([]),
          PLAYER_3: Object.freeze([]),
        }),
        "HEARTS",
      ),
      createLitigeState(),
    );

    expect(result.dealResult.status).not.toBe("LITIGE");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("includes completed Belote in the final resolution", () => {
    const tricks = createCompletedTricks([
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_1",
      "PLAYER_1",
    ]);

    const result = resolveCompleteDeal(
      tricks,
      "HEARTS",
      "PLAYER_0",
      completeBelote("PLAYER_0"),
      createLitigeState(),
    );

    expect(result.dealResult.beloteBonus).toEqual({
      team: "TEAM_0",
      points: 20,
    });
  });

  it("does not award incomplete Belote", () => {
    let belote = createBeloteState(
      createBeloteHands("PLAYER_0"),
      "HEARTS",
    );

    belote = applyBeloteCardPlayed(
      belote,
      "PLAYER_0",
      createCard("HEARTS", "KING"),
    ).state;

    const tricks = createCompletedTricks([
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_1",
      "PLAYER_1",
    ]);

    const result = resolveCompleteDeal(
      tricks,
      "HEARTS",
      "PLAYER_0",
      belote,
      createLitigeState(),
    );

    expect(result.dealResult.beloteBonus).toBeNull();
  });

  it("detects and scores a capot", () => {
    const result = resolveCompleteDeal(
      createCompletedTricks([
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
      ]),
      "HEARTS",
      "PLAYER_0",
      createBeloteState(
        Object.freeze({
          PLAYER_0: Object.freeze([]),
          PLAYER_1: Object.freeze([]),
          PLAYER_2: Object.freeze([]),
          PLAYER_3: Object.freeze([]),
        }),
        "HEARTS",
      ),
      createLitigeState(),
    );

    expect(result.capot.isCapot).toBe(true);
    expect(result.capot.team).toBe("TEAM_0");
    expect(result.finalAwardedPoints.TEAM_0).toBe(252);
  });

  it("adds Belote to a capot", () => {
    const result = resolveCompleteDeal(
      createCompletedTricks([
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
      ]),
      "HEARTS",
      "PLAYER_0",
      completeBelote("PLAYER_0"),
      createLitigeState(),
    );

    expect(result.finalAwardedPoints.TEAM_0).toBe(272);
  });

  it("rejects a Belote state with another trump suit", () => {
    const tricks = createCompletedTricks([
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_1",
      "PLAYER_1",
    ]);

    const belote = createBeloteState(
      Object.freeze({
        PLAYER_0: Object.freeze([]),
        PLAYER_1: Object.freeze([]),
        PLAYER_2: Object.freeze([]),
        PLAYER_3: Object.freeze([]),
      }),
      "SPADES",
    );

    expect(() =>
      resolveCompleteDeal(
        tricks,
        "HEARTS",
        "PLAYER_0",
        belote,
        createLitigeState(),
      ),
    ).toThrow(
      "Belote state trump suit must match deal trump suit.",
    );
  });

  it("applies pending litige points to a normal resolved deal", () => {
    const tricks = createCompletedTricks([
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_1",
      "PLAYER_1",
    ]);

    const result = resolveCompleteDeal(
      tricks,
      "HEARTS",
      "PLAYER_0",
      createBeloteState(
        Object.freeze({
          PLAYER_0: Object.freeze([]),
          PLAYER_1: Object.freeze([]),
          PLAYER_2: Object.freeze([]),
          PLAYER_3: Object.freeze([]),
        }),
        "HEARTS",
      ),
      Object.freeze({
        pendingPoints: 81,
      }),
    );

    expect(
      result.finalAwardedPoints.TEAM_0 +
        result.finalAwardedPoints.TEAM_1,
    ).toBeGreaterThan(162);
  });

  it("returns immutable nested resolution objects", () => {
    const result = resolveCompleteDeal(
      createCompletedTricks([
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_0",
        "PLAYER_1",
        "PLAYER_1",
        "PLAYER_1",
      ]),
      "HEARTS",
      "PLAYER_0",
      createBeloteState(
        Object.freeze({
          PLAYER_0: Object.freeze([]),
          PLAYER_1: Object.freeze([]),
          PLAYER_2: Object.freeze([]),
          PLAYER_3: Object.freeze([]),
        }),
        "HEARTS",
      ),
      createLitigeState(),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.rawTrickPoints)).toBe(true);
    expect(Object.isFrozen(result.capot)).toBe(true);
    expect(Object.isFrozen(result.dealResult)).toBe(true);
    expect(Object.isFrozen(result.litigeResolution)).toBe(true);
    expect(Object.isFrozen(result.finalAwardedPoints)).toBe(true);
  });
});