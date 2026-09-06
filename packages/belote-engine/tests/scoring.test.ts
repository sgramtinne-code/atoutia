import { describe, expect, it } from "vitest";

import {
  createCard,
  createDeck,
  getCompletedTrickPoints,
  getPlayerTeam,
  getTrickWinner,
  scoreCompletedDealTricks,
  type CompletedTrick,
  type PlayedCard,
  type PlayerPosition,
} from "../src/index.js";

function createCompletedTrick(
  plays: readonly PlayedCard[],
  trumpSuit: "HEARTS" = "HEARTS",
): CompletedTrick {
  const winner = getTrickWinner(plays, trumpSuit);

  return Object.freeze({
    leader: plays[0]!.player,
    winner,
    trick: Object.freeze({
      leader: plays[0]!.player,
      currentPlayer: winner.player,
      plays: Object.freeze([...plays]),
      winner,
      completed: true,
    }),
  });
}

function createFullDealTricks(): readonly CompletedTrick[] {
  const deck = createDeck();
  const players: readonly PlayerPosition[] = [
    "PLAYER_0",
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
  ];

  const tricks: CompletedTrick[] = [];

  for (let trickIndex = 0; trickIndex < 8; trickIndex += 1) {
    const plays: PlayedCard[] = [];

    for (
      let playerIndex = 0;
      playerIndex < 4;
      playerIndex += 1
    ) {
      const card = deck[
        trickIndex * 4 + playerIndex
      ];

      if (card === undefined) {
        throw new Error("Missing test card.");
      }

      const player = players[playerIndex];

      if (player === undefined) {
        throw new Error("Missing test player.");
      }

      plays.push({
        player,
        card,
      });
    }

    tricks.push(
      createCompletedTrick(
        Object.freeze(plays),
        "HEARTS",
      ),
    );
  }

  return Object.freeze(tricks);
}

describe("scoring", () => {
  it("maps opposite players to the same team", () => {
    expect(getPlayerTeam("PLAYER_0")).toBe("TEAM_0");
    expect(getPlayerTeam("PLAYER_2")).toBe("TEAM_0");

    expect(getPlayerTeam("PLAYER_1")).toBe("TEAM_1");
    expect(getPlayerTeam("PLAYER_3")).toBe("TEAM_1");
  });

  it("scores the cards contained in a completed trick", () => {
    const trick = createCompletedTrick([
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("CLUBS", "TEN"),
      },
      {
        player: "PLAYER_2",
        card: createCard("CLUBS", "KING"),
      },
      {
        player: "PLAYER_3",
        card: createCard("CLUBS", "QUEEN"),
      },
    ]);

    expect(
      getCompletedTrickPoints(trick, "HEARTS"),
    ).toBe(28);
  });

  it("uses trump card values when scoring a trick", () => {
    const trick = createCompletedTrick([
      {
        player: "PLAYER_0",
        card: createCard("HEARTS", "JACK"),
      },
      {
        player: "PLAYER_1",
        card: createCard("HEARTS", "NINE"),
      },
      {
        player: "PLAYER_2",
        card: createCard("HEARTS", "ACE"),
      },
      {
        player: "PLAYER_3",
        card: createCard("HEARTS", "TEN"),
      },
    ]);

    expect(
      getCompletedTrickPoints(trick, "HEARTS"),
    ).toBe(55);
  });

  it("adds ten points to the last trick", () => {
    const trick = createCompletedTrick([
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "SEVEN"),
      },
      {
        player: "PLAYER_1",
        card: createCard("CLUBS", "EIGHT"),
      },
      {
        player: "PLAYER_2",
        card: createCard("CLUBS", "NINE"),
      },
      {
        player: "PLAYER_3",
        card: createCard("CLUBS", "JACK"),
      },
    ]);

    expect(
      getCompletedTrickPoints(
        trick,
        "HEARTS",
        false,
      ),
    ).toBe(2);

    expect(
      getCompletedTrickPoints(
        trick,
        "HEARTS",
        true,
      ),
    ).toBe(12);
  });

  it("rejects scoring a deal with fewer than eight tricks", () => {
    const tricks = createFullDealTricks();

    expect(() =>
      scoreCompletedDealTricks(
        tricks.slice(0, 7),
        "HEARTS",
      ),
    ).toThrow(
      "A complete deal must contain exactly eight completed tricks.",
    );
  });

  it("rejects duplicate cards across a complete deal", () => {
    const tricks = [...createFullDealTricks()];

    const firstTrick = tricks[0];
    const secondTrick = tricks[1];

    if (
      firstTrick === undefined ||
      secondTrick === undefined
    ) {
      throw new Error("Missing test trick.");
    }

    const duplicateCard =
      firstTrick.trick.plays[0]?.card;

    if (duplicateCard === undefined) {
      throw new Error("Missing test card.");
    }

    const modifiedPlays = [
      ...secondTrick.trick.plays,
    ];

    const originalPlay = modifiedPlays[0];

    if (originalPlay === undefined) {
      throw new Error("Missing test play.");
    }

    modifiedPlays[0] = {
      ...originalPlay,
      card: duplicateCard,
    };

    tricks[1] = createCompletedTrick(
      Object.freeze(modifiedPlays),
      "HEARTS",
    );

    expect(() =>
      scoreCompletedDealTricks(
        Object.freeze(tricks),
        "HEARTS",
      ),
    ).toThrow(
      "A complete deal must contain 32 unique played cards.",
    );
  });

  it("scores all eight completed tricks by winning team", () => {
    const score = scoreCompletedDealTricks(
      createFullDealTricks(),
      "HEARTS",
    );

    expect(score.TEAM_0).toBeGreaterThanOrEqual(0);
    expect(score.TEAM_1).toBeGreaterThanOrEqual(0);
  });

  it("always totals 162 raw points for a complete valid deal", () => {
    const score = scoreCompletedDealTricks(
      createFullDealTricks(),
      "HEARTS",
    );

    expect(
      score.TEAM_0 + score.TEAM_1,
    ).toBe(162);
  });

  it("returns immutable team points", () => {
    const score = scoreCompletedDealTricks(
      createFullDealTricks(),
      "HEARTS",
    );

    expect(Object.isFrozen(score)).toBe(true);
  });
});