import type { Team, TeamPoints } from "./scoring.js";

export interface MatchScoreState {
  readonly targetScore: number;
  readonly scores: TeamPoints;
  readonly completed: boolean;
  readonly winner: Team | null;
}

export function createMatchScoreState(
  targetScore = 1000,
): MatchScoreState {
  if (
    !Number.isInteger(targetScore) ||
    targetScore <= 0
  ) {
    throw new Error(
      "Target score must be a positive integer.",
    );
  }

  return Object.freeze({
    targetScore,
    scores: Object.freeze({
      TEAM_0: 0,
      TEAM_1: 0,
    }),
    completed: false,
    winner: null,
  });
}

function determineWinner(
  scores: TeamPoints,
  targetScore: number,
): Team | null {
  const team0Reached =
    scores.TEAM_0 >= targetScore;

  const team1Reached =
    scores.TEAM_1 >= targetScore;

  if (!team0Reached && !team1Reached) {
    return null;
  }

  if (
    team0Reached &&
    !team1Reached
  ) {
    return "TEAM_0";
  }

  if (
    team1Reached &&
    !team0Reached
  ) {
    return "TEAM_1";
  }

  if (scores.TEAM_0 > scores.TEAM_1) {
    return "TEAM_0";
  }

  if (scores.TEAM_1 > scores.TEAM_0) {
    return "TEAM_1";
  }

  return null;
}

export function addDealPointsToMatch(
  state: MatchScoreState,
  dealPoints: TeamPoints,
): MatchScoreState {
  if (state.completed) {
    throw new Error(
      "Match is already completed.",
    );
  }

  if (
    dealPoints.TEAM_0 < 0 ||
    dealPoints.TEAM_1 < 0
  ) {
    throw new Error(
      "Deal points cannot be negative.",
    );
  }

  const scores: TeamPoints =
    Object.freeze({
      TEAM_0:
        state.scores.TEAM_0 +
        dealPoints.TEAM_0,

      TEAM_1:
        state.scores.TEAM_1 +
        dealPoints.TEAM_1,
    });

  const winner = determineWinner(
    scores,
    state.targetScore,
  );

  return Object.freeze({
    targetScore: state.targetScore,
    scores,
    completed: winner !== null,
    winner,
  });
}