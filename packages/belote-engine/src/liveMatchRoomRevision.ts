import {
  applyManagedLiveMatchRoomCommand,
  claimManagedLiveMatchRoomSeat,
  createManagedLiveMatchRoom,
  createManagedLiveMatchRoomParticipantSnapshot,
  releaseManagedLiveMatchRoomSeat,
  startManagedLiveMatchRoom,
  type ApplyManagedLiveMatchRoomCommandResult,
  type ManagedLiveMatchRoom,
} from "./liveMatchRoomLifecycle.js";
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

export interface RevisionedLiveMatchRoom {
  readonly revision: number;
  readonly managedRoom: ManagedLiveMatchRoom;
}

export interface ClaimRevisionedLiveMatchRoomSeatOptions {
  readonly room: RevisionedLiveMatchRoom;
  readonly expectedRevision: number;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface ReleaseRevisionedLiveMatchRoomSeatOptions {
  readonly room: RevisionedLiveMatchRoom;
  readonly expectedRevision: number;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface StartRevisionedLiveMatchRoomOptions {
  readonly room: RevisionedLiveMatchRoom;
  readonly expectedRevision: number;
}

export interface ApplyRevisionedLiveMatchRoomCommandOptions {
  readonly room: RevisionedLiveMatchRoom;
  readonly expectedRevision: number;
  readonly participantId: string;
  readonly command: PlayerCommand;
}

export interface ApplyRevisionedLiveMatchRoomCommandResult {
  readonly room: RevisionedLiveMatchRoom;
  readonly player: PlayerPosition;
  readonly snapshot: PlayerClientSnapshot;
}

function assertValidRevision(
  revision: number,
): void {
  if (
    !Number.isSafeInteger(revision) ||
    revision < 0
  ) {
    throw new Error(
      "Match room revision must be a non-negative safe integer",
    );
  }
}

function assertExpectedRevision(
  room: RevisionedLiveMatchRoom,
  expectedRevision: number,
): void {
  assertValidRevision(
    expectedRevision,
  );

  if (
    room.revision !==
    expectedRevision
  ) {
    throw new Error(
      `Match room revision mismatch: expected ${expectedRevision}, current ${room.revision}`,
    );
  }
}

function createRevisionedRoom(
  managedRoom: ManagedLiveMatchRoom,
  revision: number,
): RevisionedLiveMatchRoom {
  assertValidRevision(
    revision,
  );

  return Object.freeze({
    revision,
    managedRoom,
  });
}

function createNextRevisionedRoom(
  current:
    RevisionedLiveMatchRoom,
  managedRoom:
    ManagedLiveMatchRoom,
): RevisionedLiveMatchRoom {
  if (
    managedRoom ===
    current.managedRoom
  ) {
    return current;
  }

  if (
    current.revision ===
    Number.MAX_SAFE_INTEGER
  ) {
    throw new Error(
      "Match room revision overflow",
    );
  }

  return createRevisionedRoom(
    managedRoom,
    current.revision + 1,
  );
}

export function createRevisionedLiveMatchRoom(
  options: CreateLiveMatchSessionOptions,
): RevisionedLiveMatchRoom {
  return createRevisionedRoom(
    createManagedLiveMatchRoom(
      options,
    ),
    0,
  );
}

export function claimRevisionedLiveMatchRoomSeat(
  options:
    ClaimRevisionedLiveMatchRoomSeatOptions,
): RevisionedLiveMatchRoom {
  const {
    room,
    expectedRevision,
    player,
    participantId,
  } = options;

  assertExpectedRevision(
    room,
    expectedRevision,
  );

  const managedRoom =
    claimManagedLiveMatchRoomSeat({
      managedRoom:
        room.managedRoom,
      player,
      participantId,
    });

  return createNextRevisionedRoom(
    room,
    managedRoom,
  );
}

export function releaseRevisionedLiveMatchRoomSeat(
  options:
    ReleaseRevisionedLiveMatchRoomSeatOptions,
): RevisionedLiveMatchRoom {
  const {
    room,
    expectedRevision,
    player,
    participantId,
  } = options;

  assertExpectedRevision(
    room,
    expectedRevision,
  );

  const managedRoom =
    releaseManagedLiveMatchRoomSeat({
      managedRoom:
        room.managedRoom,
      player,
      participantId,
    });

  return createNextRevisionedRoom(
    room,
    managedRoom,
  );
}

export function startRevisionedLiveMatchRoom(
  options:
    StartRevisionedLiveMatchRoomOptions,
): RevisionedLiveMatchRoom {
  const {
    room,
    expectedRevision,
  } = options;

  assertExpectedRevision(
    room,
    expectedRevision,
  );

  const managedRoom =
    startManagedLiveMatchRoom(
      room.managedRoom,
    );

  return createNextRevisionedRoom(
    room,
    managedRoom,
  );
}

export function createRevisionedLiveMatchRoomParticipantSnapshot(
  room: RevisionedLiveMatchRoom,
  participantId: string,
): PlayerClientSnapshot {
  return createManagedLiveMatchRoomParticipantSnapshot(
    room.managedRoom,
    participantId,
  );
}

export function applyRevisionedLiveMatchRoomCommand(
  options:
    ApplyRevisionedLiveMatchRoomCommandOptions,
): ApplyRevisionedLiveMatchRoomCommandResult {
  const {
    room,
    expectedRevision,
    participantId,
    command,
  } = options;

  assertExpectedRevision(
    room,
    expectedRevision,
  );

  const result:
    ApplyManagedLiveMatchRoomCommandResult =
      applyManagedLiveMatchRoomCommand({
        managedRoom:
          room.managedRoom,
        participantId,
        command,
      });

  const nextRoom =
    createNextRevisionedRoom(
      room,
      result.managedRoom,
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