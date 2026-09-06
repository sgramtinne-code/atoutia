import type { PlayerHands } from "./deal.js";
import type { PlayerPosition } from "./players.js";
import type { TrickWinner } from "./trick.js";
import {
  createTrickState,
  type TrickState,
} from "./trickPlay.js";

export interface CompletedTrick {
  readonly leader: PlayerPosition;
  readonly winner: TrickWinner;
  readonly trick: TrickState;
}

export interface TrickSequenceState {
  readonly hands: PlayerHands;
  readonly currentTrick: TrickState;
  readonly completedTricks: readonly CompletedTrick[];
}

export function createTrickSequence(
  hands: PlayerHands,
  firstLeader: PlayerPosition,
): TrickSequenceState {
  return Object.freeze({
    hands,
    currentTrick: createTrickState(firstLeader),
    completedTricks: Object.freeze([]),
  });
}

export function advanceToNextTrick(
  state: TrickSequenceState,
): TrickSequenceState {
  if (!state.currentTrick.completed) {
    throw new Error(
      "Current trick must be completed before starting the next trick.",
    );
  }

  const winner = state.currentTrick.winner;

  if (winner === null) {
    throw new Error(
      "Completed trick must have a winner.",
    );
  }

  const completedTrick = Object.freeze({
    leader: state.currentTrick.leader,
    winner,
    trick: state.currentTrick,
  });

  return Object.freeze({
    hands: state.hands,
    currentTrick: createTrickState(winner.player),
    completedTricks: Object.freeze([
      ...state.completedTricks,
      completedTrick,
    ]),
  });
}