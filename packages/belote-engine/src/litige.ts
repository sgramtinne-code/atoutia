import type { DealResult } from "./dealResult.js";
import type { Team, TeamPoints } from "./scoring.js";

export interface LitigeState {
  readonly pendingPoints: number;
}

export interface LitigeResolution {
  readonly awardedPoints: TeamPoints;
  readonly nextLitigeState: LitigeState;
}

export function createLitigeState(): LitigeState {
  return Object.freeze({
    pendingPoints: 0,
  });
}

function addPendingPoints(
  awardedPoints: TeamPoints,
  team: Team,
  pendingPoints: number,
): TeamPoints {
  if (pendingPoints === 0) {
    return awardedPoints;
  }

  return Object.freeze({
    TEAM_0:
      awardedPoints.TEAM_0 +
      (team === "TEAM_0" ? pendingPoints : 0),

    TEAM_1:
      awardedPoints.TEAM_1 +
      (team === "TEAM_1" ? pendingPoints : 0),
  });
}

export function resolveLitigeForDeal(
  state: LitigeState,
  dealResult: DealResult,
): LitigeResolution {
  if (state.pendingPoints < 0) {
    throw new Error(
      "Pending litige points cannot be negative.",
    );
  }

  if (dealResult.status !== "LITIGE") {
    const awardedPoints = addPendingPoints(
      dealResult.awardedPoints,
      dealResult.takerTeam,
      state.pendingPoints,
    );

    return Object.freeze({
      awardedPoints,
      nextLitigeState: createLitigeState(),
    });
  }

  const defendingTeam = dealResult.defendingTeam;
  const takerTeam = dealResult.takerTeam;

  const defenderPoints =
    dealResult.comparisonPoints[defendingTeam];

  const takerPoints =
    dealResult.comparisonPoints[takerTeam];

  const awardedPoints: TeamPoints = Object.freeze({
    TEAM_0:
      defendingTeam === "TEAM_0"
        ? defenderPoints + state.pendingPoints
        : 0,

    TEAM_1:
      defendingTeam === "TEAM_1"
        ? defenderPoints + state.pendingPoints
        : 0,
  });

  return Object.freeze({
    awardedPoints,
    nextLitigeState: Object.freeze({
      pendingPoints: takerPoints,
    }),
  });
}