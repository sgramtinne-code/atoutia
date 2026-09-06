import { cardKey, type Suit } from "./cards.js";
import { getCardPoints } from "./cardRules.js";
import type { PlayerPosition } from "./players.js";
import type { CompletedTrick } from "./trickSequence.js";

export const TEAMS = ["TEAM_0", "TEAM_1"] as const;

export type Team = (typeof TEAMS)[number];

export interface TeamPoints {
  readonly TEAM_0: number;
  readonly TEAM_1: number;
}

export function getPlayerTeam(
  player: PlayerPosition,
): Team {
  switch (player) {
    case "PLAYER_0":
    case "PLAYER_2":
      return "TEAM_0";

    case "PLAYER_1":
    case "PLAYER_3":
      return "TEAM_1";
  }
}

export function getCompletedTrickPoints(
  completedTrick: CompletedTrick,
  trumpSuit: Suit,
  isLastTrick = false,
): number {
  if (!completedTrick.trick.completed) {
    throw new Error("Trick must be completed before scoring.");
  }

  if (completedTrick.trick.plays.length !== 4) {
    throw new Error("A scored trick must contain exactly four cards.");
  }

  const cardPoints = completedTrick.trick.plays.reduce(
    (total, play) =>
      total + getCardPoints(play.card, trumpSuit),
    0,
  );

  return cardPoints + (isLastTrick ? 10 : 0);
}

export function scoreCompletedDealTricks(
  completedTricks: readonly CompletedTrick[],
  trumpSuit: Suit,
): TeamPoints {
  if (completedTricks.length !== 8) {
    throw new Error(
      "A complete deal must contain exactly eight completed tricks.",
    );
  }

  const allCardKeys = completedTricks.flatMap(
    (completedTrick) =>
      completedTrick.trick.plays.map((play) =>
        cardKey(play.card),
      ),
  );

  if (allCardKeys.length !== 32) {
    throw new Error(
      "A complete deal must contain exactly 32 played cards.",
    );
  }

  if (new Set(allCardKeys).size !== 32) {
    throw new Error(
      "A complete deal must contain 32 unique played cards.",
    );
  }

  let team0Points = 0;
  let team1Points = 0;

  for (
    let index = 0;
    index < completedTricks.length;
    index += 1
  ) {
    const completedTrick = completedTricks[index];

    if (completedTrick === undefined) {
      throw new Error("Invalid completed trick.");
    }

    const points = getCompletedTrickPoints(
      completedTrick,
      trumpSuit,
      index === completedTricks.length - 1,
    );

    const team = getPlayerTeam(
      completedTrick.winner.player,
    );

    if (team === "TEAM_0") {
      team0Points += points;
    } else {
      team1Points += points;
    }
  }

  return Object.freeze({
    TEAM_0: team0Points,
    TEAM_1: team1Points,
  });
}