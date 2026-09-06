import type { CompletedTrick } from "./trickSequence.js";
import {
  getPlayerTeam,
  type Team,
  type TeamPoints,
} from "./scoring.js";

export const CAPOT_POINTS = 252;

export interface CapotResult {
  readonly isCapot: boolean;
  readonly team: Team | null;
  readonly trickWins: Readonly<Record<Team, number>>;
}

export function detectCapot(
  completedTricks: readonly CompletedTrick[],
): CapotResult {
  if (completedTricks.length !== 8) {
    throw new Error(
      "Capot detection requires exactly eight completed tricks.",
    );
  }

  let team0Wins = 0;
  let team1Wins = 0;

  for (const completedTrick of completedTricks) {
    if (!completedTrick.trick.completed) {
      throw new Error(
        "Capot detection requires completed tricks.",
      );
    }

    if (completedTrick.trick.plays.length !== 4) {
      throw new Error(
        "Each completed trick must contain exactly four played cards.",
      );
    }

    const winningTeam = getPlayerTeam(
      completedTrick.winner.player,
    );

    if (winningTeam === "TEAM_0") {
      team0Wins += 1;
    } else {
      team1Wins += 1;
    }
  }

  const trickWins = Object.freeze({
    TEAM_0: team0Wins,
    TEAM_1: team1Wins,
  });

  if (team0Wins === 8) {
    return Object.freeze({
      isCapot: true,
      team: "TEAM_0",
      trickWins,
    });
  }

  if (team1Wins === 8) {
    return Object.freeze({
      isCapot: true,
      team: "TEAM_1",
      trickWins,
    });
  }

  return Object.freeze({
    isCapot: false,
    team: null,
    trickWins,
  });
}

export function applyCapotPoints(
  capotResult: CapotResult,
  beloteTeam: Team | null = null,
): TeamPoints {
  if (!capotResult.isCapot || capotResult.team === null) {
    throw new Error(
      "Capot points can only be applied to a detected capot.",
    );
  }

  return Object.freeze({
    TEAM_0:
      (capotResult.team === "TEAM_0"
        ? CAPOT_POINTS
        : 0) +
      (beloteTeam === "TEAM_0" ? 20 : 0),

    TEAM_1:
      (capotResult.team === "TEAM_1"
        ? CAPOT_POINTS
        : 0) +
      (beloteTeam === "TEAM_1" ? 20 : 0),
  });
}