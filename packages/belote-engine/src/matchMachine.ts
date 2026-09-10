import type { BiddingAction } from "./bidding.js";
import type { Card } from "./cards.js";
import {
  applyDealMachineBiddingAction,
  applyDealMachineCardPlay,
  createDealMachine,
  type DealMachineCardPlayResult,
  type DealMachineState,
} from "./dealMachine.js";
import {
  createLitigeState,
  type LitigeState,
} from "./litige.js";
import {
  addDealPointsToMatch,
  createMatchScoreState,
  type MatchScoreState,
} from "./matchScore.js";
import {
  nextPlayer,
  type PlayerPosition,
} from "./players.js";

export interface MatchMachineState {
  readonly baseSeed: number;
  readonly dealNumber: number;
  readonly dealer: PlayerPosition;
  readonly score: MatchScoreState;
  readonly litigeState: LitigeState;
  readonly currentDeal: DealMachineState;
}

export interface CreateMatchMachineOptions {
  readonly baseSeed: number;
  readonly firstDealer?: PlayerPosition;
  readonly targetScore?: number;
}

export interface MatchMachineCardPlayResult {
  readonly state: MatchMachineState;
  readonly dealPlay: DealMachineCardPlayResult;
}

function assertBaseSeed(baseSeed: number): void {
  if (!Number.isInteger(baseSeed)) {
    throw new Error(
      "Match machine base seed must be an integer.",
    );
  }
}

function getDealSeed(
  baseSeed: number,
  dealNumber: number,
): number {
  return baseSeed + dealNumber - 1;
}

function finalizeFinishedDeal(
  state: MatchMachineState,
  finishedDeal: DealMachineState,
): MatchMachineState {
  if (finishedDeal.phase !== "FINISHED") {
    throw new Error(
      "Only a finished deal can be finalized.",
    );
  }

  let score = state.score;

  if (finishedDeal.resolution !== null) {
    score = addDealPointsToMatch(
      score,
      finishedDeal.resolution.finalAwardedPoints,
    );
  }

  const litigeState = finishedDeal.litigeState;

  if (score.completed) {
    return Object.freeze({
      ...state,
      score,
      litigeState,
      currentDeal: finishedDeal,
    });
  }

  const dealNumber = state.dealNumber + 1;
  const dealer = nextPlayer(state.dealer);

  const currentDeal = createDealMachine({
    seed: getDealSeed(
      state.baseSeed,
      dealNumber,
    ),
    dealer,
    litigeState,
  });

  return Object.freeze({
    ...state,
    dealNumber,
    dealer,
    score,
    litigeState,
    currentDeal,
  });
}

export function createMatchMachine(
  options: CreateMatchMachineOptions,
): MatchMachineState {
  assertBaseSeed(options.baseSeed);

  const dealer =
    options.firstDealer ?? "PLAYER_0";

  const score = createMatchScoreState(
    options.targetScore ?? 1000,
  );

  const litigeState = createLitigeState();
  const dealNumber = 1;

  const currentDeal = createDealMachine({
    seed: getDealSeed(
      options.baseSeed,
      dealNumber,
    ),
    dealer,
    litigeState,
  });

  return Object.freeze({
    baseSeed: options.baseSeed,
    dealNumber,
    dealer,
    score,
    litigeState,
    currentDeal,
  });
}

export function applyMatchBiddingAction(
  state: MatchMachineState,
  action: BiddingAction,
): MatchMachineState {
  if (state.score.completed) {
    throw new Error(
      "Match is already completed.",
    );
  }

  const currentDeal =
    applyDealMachineBiddingAction(
      state.currentDeal,
      action,
    );

  if (currentDeal.phase === "FINISHED") {
    return finalizeFinishedDeal(
      state,
      currentDeal,
    );
  }

  return Object.freeze({
    ...state,
    currentDeal,
  });
}

export function applyMatchCardPlay(
  state: MatchMachineState,
  player: PlayerPosition,
  card: Card,
): MatchMachineCardPlayResult {
  if (state.score.completed) {
    throw new Error(
      "Match is already completed.",
    );
  }

  const dealPlay =
    applyDealMachineCardPlay(
      state.currentDeal,
      player,
      card,
    );

  const nextState =
    dealPlay.state.phase === "FINISHED"
      ? finalizeFinishedDeal(
          state,
          dealPlay.state,
        )
      : Object.freeze({
          ...state,
          currentDeal: dealPlay.state,
        });

  return Object.freeze({
    state: nextState,
    dealPlay,
  });
}

export function advanceMatchToNextDeal(
  state: MatchMachineState,
): MatchMachineState {
  if (state.currentDeal.phase !== "FINISHED") {
    throw new Error(
      "Current deal must be finished before starting the next deal.",
    );
  }

  if (state.score.completed) {
    throw new Error(
      "Match is already completed.",
    );
  }

  return finalizeFinishedDeal(
    state,
    state.currentDeal,
  );
}