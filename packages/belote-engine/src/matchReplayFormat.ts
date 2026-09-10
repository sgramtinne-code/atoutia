import type { MatchHistory } from "./matchHistory.js";
import type { MatchMachineState } from "./matchMachine.js";
import type { PlayerPosition } from "./players.js";
import { BELOTE_ENGINE_VERSION } from "./version.js";

export const MATCH_REPLAY_FORMAT_VERSION = 1;

export interface MatchReplayDocument {
  readonly formatVersion: number;
  readonly engineVersion: string;

  readonly baseSeed: number;
  readonly firstDealer: PlayerPosition;
  readonly targetScore: number;

  readonly history: MatchHistory;
}

export function createMatchReplayDocument(
  state: MatchMachineState,
): MatchReplayDocument {
  return Object.freeze({
    formatVersion:
      MATCH_REPLAY_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    baseSeed: state.baseSeed,

    firstDealer: state.firstDealer,

    targetScore:
      state.score.targetScore,

    history: state.history,
  });
}