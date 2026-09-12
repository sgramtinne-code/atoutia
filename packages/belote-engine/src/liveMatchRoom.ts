import {
  applyParticipantCommand,
  createParticipantSnapshot,
  type ApplyParticipantCommandResult,
  type LiveMatchParticipantContext,
} from "./liveMatchParticipantSession.js";
import {
  claimLiveMatchSeat,
  createEmptyLiveMatchSeats,
  releaseLiveMatchSeat,
  type LiveMatchSeats,
} from "./liveMatchSeats.js";
import {
  createLiveMatchSession,
  type CreateLiveMatchSessionOptions,
  type LiveMatchSession,
} from "./liveMatchSession.js";
import type {
  PlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import type {
  PlayerCommand,
} from "./playerCommandFormat.js";
import type {
  PlayerPosition,
} from "./players.js";

export interface LiveMatchRoom {
  readonly session: LiveMatchSession;
  readonly seats: LiveMatchSeats;
}

export interface ClaimLiveMatchRoomSeatOptions {
  readonly room: LiveMatchRoom;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface ReleaseLiveMatchRoomSeatOptions {
  readonly room: LiveMatchRoom;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface ApplyLiveMatchRoomParticipantCommandOptions {
  readonly room: LiveMatchRoom;
  readonly participantId: string;
  readonly command: PlayerCommand;
}

export interface ApplyLiveMatchRoomParticipantCommandResult {
  readonly room: LiveMatchRoom;
  readonly player: PlayerPosition;
  readonly snapshot: PlayerClientSnapshot;
}

function createRoom(
  session: LiveMatchSession,
  seats: LiveMatchSeats,
): LiveMatchRoom {
  return Object.freeze({
    session,
    seats,
  });
}

function createParticipantContext(
  room: LiveMatchRoom,
): LiveMatchParticipantContext {
  return Object.freeze({
    session: room.session,
    seats: room.seats,
  });
}

export function createLiveMatchRoom(
  options: CreateLiveMatchSessionOptions,
): LiveMatchRoom {
  return createRoom(
    createLiveMatchSession(
      options,
    ),
    createEmptyLiveMatchSeats(),
  );
}

export function claimLiveMatchRoomSeat(
  options: ClaimLiveMatchRoomSeatOptions,
): LiveMatchRoom {
  const {
    room,
    player,
    participantId,
  } = options;

  const seats =
    claimLiveMatchSeat({
      seats: room.seats,
      player,
      participantId,
    });

  if (seats === room.seats) {
    return room;
  }

  return createRoom(
    room.session,
    seats,
  );
}

export function releaseLiveMatchRoomSeat(
  options: ReleaseLiveMatchRoomSeatOptions,
): LiveMatchRoom {
  const {
    room,
    player,
    participantId,
  } = options;

  const seats =
    releaseLiveMatchSeat({
      seats: room.seats,
      player,
      participantId,
    });

  return createRoom(
    room.session,
    seats,
  );
}

export function createLiveMatchRoomParticipantSnapshot(
  room: LiveMatchRoom,
  participantId: string,
): PlayerClientSnapshot {
  return createParticipantSnapshot(
    createParticipantContext(
      room,
    ),
    participantId,
  );
}

export function applyLiveMatchRoomParticipantCommand(
  options: ApplyLiveMatchRoomParticipantCommandOptions,
): ApplyLiveMatchRoomParticipantCommandResult {
  const {
    room,
    participantId,
    command,
  } = options;

  const result:
    ApplyParticipantCommandResult =
      applyParticipantCommand({
        context:
          createParticipantContext(
            room,
          ),

        participantId,

        command,
      });

  const nextRoom =
    createRoom(
      result.context.session,
      result.context.seats,
    );

  return Object.freeze({
    room:
      nextRoom,

    player:
      result.player,

    snapshot:
      result.snapshot,
  });
}