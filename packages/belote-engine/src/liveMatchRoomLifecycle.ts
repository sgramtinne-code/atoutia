import {
  applyLiveMatchRoomParticipantCommand,
  claimLiveMatchRoomSeat,
  createLiveMatchRoom,
  createLiveMatchRoomParticipantSnapshot,
  releaseLiveMatchRoomSeat,
  type ApplyLiveMatchRoomParticipantCommandResult,
  type LiveMatchRoom,
} from "./liveMatchRoom.js";
import {
  areAllLiveMatchSeatsOccupied,
} from "./liveMatchSeats.js";
import type {
  CreateLiveMatchSessionOptions,
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

export const LIVE_MATCH_ROOM_PHASES = [
  "WAITING_FOR_PLAYERS",
  "READY",
  "IN_PROGRESS",
  "FINISHED",
] as const;

export type LiveMatchRoomPhase =
  (typeof LIVE_MATCH_ROOM_PHASES)[number];

export interface ManagedLiveMatchRoom {
  readonly phase: LiveMatchRoomPhase;
  readonly room: LiveMatchRoom;
}

export interface ClaimManagedLiveMatchRoomSeatOptions {
  readonly managedRoom: ManagedLiveMatchRoom;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface ReleaseManagedLiveMatchRoomSeatOptions {
  readonly managedRoom: ManagedLiveMatchRoom;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface ApplyManagedLiveMatchRoomCommandOptions {
  readonly managedRoom: ManagedLiveMatchRoom;
  readonly participantId: string;
  readonly command: PlayerCommand;
}

export interface ApplyManagedLiveMatchRoomCommandResult {
  readonly managedRoom: ManagedLiveMatchRoom;
  readonly player: PlayerPosition;
  readonly snapshot: PlayerClientSnapshot;
}

function createManagedRoom(
  room: LiveMatchRoom,
  phase: LiveMatchRoomPhase,
): ManagedLiveMatchRoom {
  return Object.freeze({
    phase,
    room,
  });
}

function getLobbyPhase(
  room: LiveMatchRoom,
): LiveMatchRoomPhase {
  return areAllLiveMatchSeatsOccupied(
    room.seats,
  )
    ? "READY"
    : "WAITING_FOR_PLAYERS";
}

function assertLobbyCanChangeSeats(
  managedRoom: ManagedLiveMatchRoom,
): void {
  if (
    managedRoom.phase ===
      "IN_PROGRESS" ||
    managedRoom.phase ===
      "FINISHED"
  ) {
    throw new Error(
      `Cannot change match seats while room phase is ${managedRoom.phase}`,
    );
  }
}

export function createManagedLiveMatchRoom(
  options: CreateLiveMatchSessionOptions,
): ManagedLiveMatchRoom {
  return createManagedRoom(
    createLiveMatchRoom(
      options,
    ),
    "WAITING_FOR_PLAYERS",
  );
}

export function claimManagedLiveMatchRoomSeat(
  options: ClaimManagedLiveMatchRoomSeatOptions,
): ManagedLiveMatchRoom {
  const {
    managedRoom,
    player,
    participantId,
  } = options;

  assertLobbyCanChangeSeats(
    managedRoom,
  );

  const room =
    claimLiveMatchRoomSeat({
      room:
        managedRoom.room,
      player,
      participantId,
    });

  if (
    room === managedRoom.room
  ) {
    return managedRoom;
  }

  return createManagedRoom(
    room,
    getLobbyPhase(room),
  );
}

export function releaseManagedLiveMatchRoomSeat(
  options: ReleaseManagedLiveMatchRoomSeatOptions,
): ManagedLiveMatchRoom {
  const {
    managedRoom,
    player,
    participantId,
  } = options;

  assertLobbyCanChangeSeats(
    managedRoom,
  );

  const room =
    releaseLiveMatchRoomSeat({
      room:
        managedRoom.room,
      player,
      participantId,
    });

  return createManagedRoom(
    room,
    getLobbyPhase(room),
  );
}

export function startManagedLiveMatchRoom(
  managedRoom: ManagedLiveMatchRoom,
): ManagedLiveMatchRoom {
  if (
    managedRoom.phase !==
    "READY"
  ) {
    throw new Error(
      `Cannot start match while room phase is ${managedRoom.phase}`,
    );
  }

  return createManagedRoom(
    managedRoom.room,
    "IN_PROGRESS",
  );
}

export function createManagedLiveMatchRoomParticipantSnapshot(
  managedRoom: ManagedLiveMatchRoom,
  participantId: string,
): PlayerClientSnapshot {
  return createLiveMatchRoomParticipantSnapshot(
    managedRoom.room,
    participantId,
  );
}

export function applyManagedLiveMatchRoomCommand(
  options: ApplyManagedLiveMatchRoomCommandOptions,
): ApplyManagedLiveMatchRoomCommandResult {
  const {
    managedRoom,
    participantId,
    command,
  } = options;

  if (
    managedRoom.phase !==
    "IN_PROGRESS"
  ) {
    throw new Error(
      `Cannot apply match command while room phase is ${managedRoom.phase}`,
    );
  }

  const result:
    ApplyLiveMatchRoomParticipantCommandResult =
      applyLiveMatchRoomParticipantCommand({
        room:
          managedRoom.room,
        participantId,
        command,
      });

  const phase:
    LiveMatchRoomPhase =
      result.room.session.state
        .score.completed
        ? "FINISHED"
        : "IN_PROGRESS";

  return Object.freeze({
    managedRoom:
      createManagedRoom(
        result.room,
        phase,
      ),

    player:
      result.player,

    snapshot:
      result.snapshot,
  });
}