import type { PlayerPosition } from "./players.js";
import {
  getPlayerTeam,
  type Team,
  type TeamPoints,
} from "./scoring.js";

export const DEAL_RESULTS = [
  "CONTRACT_MADE",
  "CONTRACT_FAILED",
  "LITIGE",
] as const;

export type DealResultStatus =
  (typeof DEAL_RESULTS)[number];

export interface BeloteBonus {
  readonly team: Team;
  readonly points: 20;
}

export interface DealResult {
  readonly status: DealResultStatus;
  readonly taker: PlayerPosition;
  readonly takerTeam: Team;
  readonly defendingTeam: Team;
  readonly rawTrickPoints: TeamPoints;
  readonly beloteBonus: BeloteBonus | null;
  readonly comparisonPoints: TeamPoints;
  readonly awardedPoints: TeamPoints;
}

function getOtherTeam(team: Team): Team {
  return team === "TEAM_0"
    ? "TEAM_1"
    : "TEAM_0";
}

function addBeloteBonus(
  rawTrickPoints: TeamPoints,
  beloteBonus: BeloteBonus | null,
): TeamPoints {
  return Object.freeze({
    TEAM_0:
      rawTrickPoints.TEAM_0 +
      (beloteBonus?.team === "TEAM_0"
        ? beloteBonus.points
        : 0),

    TEAM_1:
      rawTrickPoints.TEAM_1 +
      (beloteBonus?.team === "TEAM_1"
        ? beloteBonus.points
        : 0),
  });
}

function assertRawTrickPoints(
  rawTrickPoints: TeamPoints,
): void {
  if (
    rawTrickPoints.TEAM_0 < 0 ||
    rawTrickPoints.TEAM_1 < 0
  ) {
    throw new Error(
      "Raw trick points cannot be negative.",
    );
  }

  if (
    rawTrickPoints.TEAM_0 +
      rawTrickPoints.TEAM_1 !==
    162
  ) {
    throw new Error(
      "Raw trick points must total exactly 162.",
    );
  }
}

export function resolveDealResult(
  taker: PlayerPosition,
  rawTrickPoints: TeamPoints,
  beloteBonus: BeloteBonus | null,
): DealResult {
  assertRawTrickPoints(rawTrickPoints);

  const takerTeam = getPlayerTeam(taker);
  const defendingTeam = getOtherTeam(takerTeam);

  const comparisonPoints = addBeloteBonus(
    rawTrickPoints,
    beloteBonus,
  );

  const takerComparisonPoints =
    comparisonPoints[takerTeam];

  const defenderComparisonPoints =
    comparisonPoints[defendingTeam];

  if (
    takerComparisonPoints ===
    defenderComparisonPoints
  ) {
    return Object.freeze({
      status: "LITIGE",
      taker,
      takerTeam,
      defendingTeam,
      rawTrickPoints,
      beloteBonus,
      comparisonPoints,
      awardedPoints: comparisonPoints,
    });
  }

  if (
    takerComparisonPoints >
    defenderComparisonPoints
  ) {
    return Object.freeze({
      status: "CONTRACT_MADE",
      taker,
      takerTeam,
      defendingTeam,
      rawTrickPoints,
      beloteBonus,
      comparisonPoints,
      awardedPoints: comparisonPoints,
    });
  }

  const awardedPoints: TeamPoints =
    Object.freeze({
      TEAM_0:
        defendingTeam === "TEAM_0"
          ? 162 +
            (beloteBonus?.team === "TEAM_0"
              ? 20
              : 0)
          : beloteBonus?.team === "TEAM_0"
            ? 20
            : 0,

      TEAM_1:
        defendingTeam === "TEAM_1"
          ? 162 +
            (beloteBonus?.team === "TEAM_1"
              ? 20
              : 0)
          : beloteBonus?.team === "TEAM_1"
            ? 20
            : 0,
    });

  return Object.freeze({
    status: "CONTRACT_FAILED",
    taker,
    takerTeam,
    defendingTeam,
    rawTrickPoints,
    beloteBonus,
    comparisonPoints,
    awardedPoints,
  });
}