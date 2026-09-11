import type {
  MatchMachineState,
} from "./matchMachine.js";
import {
  createPlayerAvailableActions,
  type PlayerAvailableActions,
} from "./playerAvailableActions.js";
import {
  createPlayerMatchSnapshot,
  type PlayerMatchSnapshot,
} from "./playerMatchSnapshot.js";
import type {
  PlayerPosition,
} from "./players.js";

export interface PlayerClientSnapshot {
  readonly match: PlayerMatchSnapshot;
  readonly actions: PlayerAvailableActions;
}

export function createPlayerClientSnapshot(
  state: MatchMachineState,
  player: PlayerPosition,
): PlayerClientSnapshot {
  return Object.freeze({
    match:
      createPlayerMatchSnapshot(
        state,
        player,
      ),

    actions:
      createPlayerAvailableActions(
        state,
        player,
      ),
  });
}