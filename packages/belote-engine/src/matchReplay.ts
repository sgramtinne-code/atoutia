import type {
  MatchHistory,
  MatchHistoryEvent,
} from "./matchHistory.js";
import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  type CreateMatchMachineOptions,
  type MatchMachineState,
} from "./matchMachine.js";

export interface ReplayMatchOptions
  extends CreateMatchMachineOptions {
  readonly history: MatchHistory;
}

function assertHistoryEventPosition(
  event: MatchHistoryEvent,
  expectedIndex: number,
  currentDealNumber: number,
): void {
  if (event.index !== expectedIndex) {
    throw new Error(
      "Match history indexes must be continuous and start at zero.",
    );
  }

  if (event.dealNumber !== currentDealNumber) {
    throw new Error(
      "Match history deal number does not match the current replay deal.",
    );
  }
}

export function replayMatch(
  options: ReplayMatchOptions,
): MatchMachineState {
  let state = createMatchMachine({
    baseSeed: options.baseSeed,
    ...(options.firstDealer === undefined
      ? {}
      : {
          firstDealer: options.firstDealer,
        }),
    ...(options.targetScore === undefined
      ? {}
      : {
          targetScore: options.targetScore,
        }),
  });

  for (
    let expectedIndex = 0;
    expectedIndex < options.history.length;
    expectedIndex += 1
  ) {
    const event =
      options.history[expectedIndex];

    if (event === undefined) {
      throw new Error(
        "Missing match history event.",
      );
    }

    assertHistoryEventPosition(
      event,
      expectedIndex,
      state.dealNumber,
    );

    if (event.type === "BIDDING_ACTION") {
      state = applyMatchBiddingAction(
        state,
        event.action,
      );

      continue;
    }

    state = applyMatchCardPlay(
      state,
      event.player,
      event.card,
    ).state;
  }

  return state;
}