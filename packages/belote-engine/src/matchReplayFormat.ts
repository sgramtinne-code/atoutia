import type { MatchHistory } from "./matchHistory.js";
import type { MatchMachineState } from "./matchMachine.js";
import type { PlayerPosition } from "./players.js";
import { BELOTE_ENGINE_VERSION } from "./version.js";
import { LEGACY_MATCH_RULES_VERSION, resolveMatchRulesVersion, type MatchRulesVersion } from "./matchRulesVersion.js";

export const MATCH_REPLAY_FORMAT_VERSION = 2;
export const LEGACY_MATCH_REPLAY_FORMAT_VERSION = 1;

export function resolveReplayRulesVersion(formatVersion: number, rulesVersion: unknown): MatchRulesVersion {
  if (formatVersion === LEGACY_MATCH_REPLAY_FORMAT_VERSION) {
    if (rulesVersion !== undefined) throw new Error("Legacy replay must not declare a rules version.");
    return LEGACY_MATCH_RULES_VERSION;
  }
  if (formatVersion !== MATCH_REPLAY_FORMAT_VERSION) throw new Error("Unsupported match replay format version.");
  if (rulesVersion === undefined) throw new Error("Replay rules version is required.");
  return resolveMatchRulesVersion(rulesVersion);
}

export interface MatchReplayDocument {
  readonly rulesVersion?: MatchRulesVersion;
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
    ...(state.rulesVersion === undefined ? {} : { rulesVersion: resolveMatchRulesVersion(state.rulesVersion) }),
    formatVersion:
      state.rulesVersion === undefined ? LEGACY_MATCH_REPLAY_FORMAT_VERSION : MATCH_REPLAY_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    baseSeed: state.baseSeed,

    firstDealer: state.firstDealer,

    targetScore:
      state.score.targetScore,

    history: state.history,
  });
}
