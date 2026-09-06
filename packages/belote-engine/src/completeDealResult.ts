import type { BeloteState } from "./belote.js";
import {
  applyCapotPoints,
  detectCapot,
  type CapotResult,
} from "./capot.js";
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
  scoreCompletedDealTricks,
  type TeamPoints,
} from "./scoring.js";
import type { Suit } from "./cards.js";
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

  let dealResult: DealResult;

  if (capot.isCapot && capot.team !== null) {
    const capotPoints = applyCapotPoints(
      capot,
      beloteBonus?.team ?? null,
    );

    dealResult = Object.freeze({
      status: "CONTRACT_MADE",
      taker,
      takerTeam:
        taker === "PLAYER_0" || taker === "PLAYER_2"
          ? "TEAM_0"
          : "TEAM_1",
      defendingTeam:
        taker === "PLAYER_0" || taker === "PLAYER_2"
          ? "TEAM_1"
          : "TEAM_0",
      rawTrickPoints,
      beloteBonus,
      comparisonPoints: capotPoints,
      awardedPoints: capotPoints,
    });
  } else {
    dealResult = resolveDealResult(
      taker,
      rawTrickPoints,
      beloteBonus,
    );
  }

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