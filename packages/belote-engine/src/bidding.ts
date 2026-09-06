import type { Suit } from "./cards.js";
import {
  getPlayOrderAfter,
  nextPlayer,
  type PlayerPosition,
} from "./players.js";

export const BIDDING_ROUNDS = ["FIRST", "SECOND"] as const;

export type BiddingRound = (typeof BIDDING_ROUNDS)[number];

export type BiddingStatus =
  | "IN_PROGRESS"
  | "TAKEN"
  | "ALL_PASSED";

export interface BiddingState {
  readonly dealer: PlayerPosition;
  readonly turnUpSuit: Suit;
  readonly round: BiddingRound;
  readonly currentPlayer: PlayerPosition;
  readonly passesInRound: number;
  readonly status: BiddingStatus;
  readonly taker: PlayerPosition | null;
  readonly trumpSuit: Suit | null;
}

export type BiddingAction =
  | {
      readonly type: "PASS";
      readonly player: PlayerPosition;
    }
  | {
      readonly type: "TAKE";
      readonly player: PlayerPosition;
      readonly suit: Suit;
    };

export function createBiddingState(
  dealer: PlayerPosition,
  turnUpSuit: Suit,
): BiddingState {
  return Object.freeze({
    dealer,
    turnUpSuit,
    round: "FIRST",
    currentPlayer: nextPlayer(dealer),
    passesInRound: 0,
    status: "IN_PROGRESS",
    taker: null,
    trumpSuit: null,
  });
}

export function getAllowedTrumpSuits(
  state: BiddingState,
): readonly Suit[] {
  if (state.status !== "IN_PROGRESS") {
    return Object.freeze([]);
  }

  if (state.round === "FIRST") {
    return Object.freeze([state.turnUpSuit]);
  }

  const allSuits: readonly Suit[] = [
    "CLUBS",
    "DIAMONDS",
    "HEARTS",
    "SPADES",
  ];

  return Object.freeze(
    allSuits.filter((suit) => suit !== state.turnUpSuit),
  );
}

function assertActionAllowed(
  state: BiddingState,
  action: BiddingAction,
): void {
  if (state.status !== "IN_PROGRESS") {
    throw new Error("Bidding is already finished.");
  }

  if (action.player !== state.currentPlayer) {
    throw new Error("It is not this player's turn.");
  }

  if (action.type === "TAKE") {
    const allowedSuits = getAllowedTrumpSuits(state);

    if (!allowedSuits.includes(action.suit)) {
      throw new Error("Trump suit is not allowed in this bidding round.");
    }
  }
}

function advanceAfterPass(
  state: BiddingState,
): BiddingState {
  const newPasses = state.passesInRound + 1;

  if (newPasses < 4) {
    return Object.freeze({
      ...state,
      currentPlayer: nextPlayer(state.currentPlayer),
      passesInRound: newPasses,
    });
  }

  if (state.round === "FIRST") {
    const playOrder = getPlayOrderAfter(state.dealer);
    const firstPlayer = playOrder[0];

    if (firstPlayer === undefined) {
      throw new Error("Unable to determine first bidding player.");
    }

    return Object.freeze({
      ...state,
      round: "SECOND",
      currentPlayer: firstPlayer,
      passesInRound: 0,
    });
  }

  return Object.freeze({
    ...state,
    passesInRound: 4,
    status: "ALL_PASSED",
  });
}

function takeTrump(
  state: BiddingState,
  action: Extract<BiddingAction, { type: "TAKE" }>,
): BiddingState {
  return Object.freeze({
    ...state,
    status: "TAKEN",
    taker: action.player,
    trumpSuit: action.suit,
  });
}

export function applyBiddingAction(
  state: BiddingState,
  action: BiddingAction,
): BiddingState {
  assertActionAllowed(state, action);

  if (action.type === "PASS") {
    return advanceAfterPass(state);
  }

  return takeTrump(state, action);
}