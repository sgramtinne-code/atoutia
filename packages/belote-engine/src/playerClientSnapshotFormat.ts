import type {
  MatchMachineState,
} from "./matchMachine.js";
import {
  createPlayerClientSnapshot,
  type PlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import type {
  PlayerPosition,
} from "./players.js";
import {
  BELOTE_ENGINE_VERSION,
} from "./version.js";

export const PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION = 1;

export interface PlayerClientSnapshotDocument {
  readonly formatVersion: number;
  readonly engineVersion: string;
  readonly snapshot: PlayerClientSnapshot;
}

export function createPlayerClientSnapshotDocument(
  state: MatchMachineState,
  player: PlayerPosition,
): PlayerClientSnapshotDocument {
  return Object.freeze({
    formatVersion:
      PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    snapshot:
      createPlayerClientSnapshot(
        state,
        player,
      ),
  });
}