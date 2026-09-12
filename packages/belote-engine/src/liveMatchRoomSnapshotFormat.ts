import {
  BELOTE_ENGINE_VERSION,
} from "./version.js";
import {
  createRevisionedLiveMatchRoomParticipantSnapshot,
  type RevisionedLiveMatchRoom,
} from "./liveMatchRoomRevision.js";
import {
  getLiveMatchSeatForParticipant,
} from "./liveMatchSeats.js";
import type {
  LiveMatchRoomPhase,
} from "./liveMatchRoomLifecycle.js";
import type {
  PlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import {
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "./players.js";

export const LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION =
  1;

export interface LiveMatchRoomSeatSnapshot {
  readonly player: PlayerPosition;
  readonly occupied: boolean;
}

export interface LiveMatchRoomSnapshotDocument {
  readonly formatVersion: number;
  readonly engineVersion: string;
  readonly sessionId: string;
  readonly revision: number;
  readonly phase: LiveMatchRoomPhase;
  readonly player: PlayerPosition;
  readonly seats: readonly LiveMatchRoomSeatSnapshot[];
  readonly game: PlayerClientSnapshot;
}

function createSeatSnapshots(
  room: RevisionedLiveMatchRoom,
): readonly LiveMatchRoomSeatSnapshot[] {
  const assignments =
    room.managedRoom.room.seats
      .assignments;

  return Object.freeze(
    PLAYER_POSITIONS.map(
      (player) =>
        Object.freeze({
          player,
          occupied:
            assignments[player] !==
            null,
        }),
    ),
  );
}

export function createLiveMatchRoomSnapshotDocument(
  room: RevisionedLiveMatchRoom,
  participantId: string,
): LiveMatchRoomSnapshotDocument {
  const player =
    getLiveMatchSeatForParticipant(
      room.managedRoom.room.seats,
      participantId,
    );

  if (player === null) {
    throw new Error(
      `Participant ${participantId} does not occupy a match seat`,
    );
  }

  const game =
    createRevisionedLiveMatchRoomParticipantSnapshot(
      room,
      participantId,
    );

  return Object.freeze({
    formatVersion:
      LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    sessionId:
      room.managedRoom.room.session
        .sessionId,

    revision:
      room.revision,

    phase:
      room.managedRoom.phase,

    player,

    seats:
      createSeatSnapshots(room),

    game,
  });
}