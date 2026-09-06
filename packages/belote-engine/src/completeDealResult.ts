import type { BeloteState } from "./belote.js";
import {
  applyCapotPoints,
  detectCapot,
  type CapotResult,
} from "./capot.js";
import type { Suit } from "./cards.js";
import {
  resolveDealResult,
  type BeloteBonus,
  type DealResult,
} from "./dealResult.js";
import {
  resolveLitigeForDeal,
  type LitigeResolution,
  type LitigeState,
} from "./litige.js";
import type { PlayerPosition } from "./players.js";
import {
  getPlayerTeam,
  scoreCompletedDealTricks,
  type Team,
  type TeamPoints,
} from "./scoring.js";
import type { CompletedTrick } from "./trickSequence.js";

export interface CompleteDealResolution {
  readonly rawTrickPoints: TeamPoints;
  readonly capot: CapotResult;
  readonly dealResult: DealResult;
  readonly litigeResolution: LitigeResolution;
  readonly finalAwardedPoints: TeamPoints;
}

function getBeloteBonus(
  beloteState: BeloteState,
): BeloteBonus | null {
  if (
    !beloteState.completed ||
    beloteState.points !== 20 ||
    beloteState.eligibleTeam === null
  ) {
    return null;
  }

  return Object.freeze({
    team: beloteState.eligibleTeam,
    points: 20,
  });
}

function getOtherTeam(team: Team): Team {
  return team === "TEAM_0"
    ? "TEAM_1"
    : "TEAM_0";
}

function createCapotDealResult(
  taker: PlayerPosition,
  rawTrickPoints: TeamPoints,
  capot: CapotResult,
  beloteBonus: BeloteBonus | null,
): DealResult {
  if (!capot.isCapot || capot.team === null) {
    throw new Error(
      "A capot deal result requires a detected capot.",
    );
  }

  const takerTeam = getPlayerTeam(taker);
  const defendingTeam = getOtherTeam(takerTeam);

  const capotPoints = applyCapotPoints(
    capot,
    beloteBonus?.team ?? null,
  );

  return Object.freeze({
    status:
      capot.team === takerTeam
        ? "CONTRACT_MADE"
        : "CONTRACT_FAILED",
    taker,
    takerTeam,
    defendingTeam,
    rawTrickPoints,
    beloteBonus,
    comparisonPoints: capotPoints,
    awardedPoints: capotPoints,
  });
}

export function resolveCompleteDeal(
  completedTricks: readonly CompletedTrick[],
  trumpSuit: Suit,
  taker: PlayerPosition,
  beloteState: BeloteState,
  litigeState: LitigeState,
): CompleteDealResolution {
  if (beloteState.trumpSuit !== trumpSuit) {
    throw new Error(
      "Belote state trump suit must match deal trump suit.",
    );
  }

  const rawTrickPoints = scoreCompletedDealTricks(
    completedTricks,
    trumpSuit,
  );

  const capot = detectCapot(completedTricks);

  const beloteBonus = getBeloteBonus(
    beloteState,
  );

  const dealResult =
    capot.isCapot
      ? createCapotDealResult(
          taker,
          rawTrickPoints,
          capot,
          beloteBonus,
        )
      : resolveDealResult(
          taker,
          rawTrickPoints,
          beloteBonus,
        );

  const litigeResolution = resolveLitigeForDeal(
    litigeState,
    dealResult,
  );

  return Object.freeze({
    rawTrickPoints,
    capot,
    dealResult,
    litigeResolution,
    finalAwardedPoints:
      litigeResolution.awardedPoints,
  });
}