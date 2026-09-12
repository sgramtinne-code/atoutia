import {
  createLiveMatchRoomSnapshotDocument,
  type LiveMatchRoomSnapshotDocument,
} from "./liveMatchRoomSnapshotFormat.js";
import {
  applyRevisionedLiveMatchRoomCommand,
  type RevisionedLiveMatchRoom,
} from "./liveMatchRoomRevision.js";
import type {
  LiveMatchRoomCommandDocument,
} from "./liveMatchRoomCommandFormat.js";

export interface ApplyLiveMatchRoomNetworkCommandOptions {
  readonly room: RevisionedLiveMatchRoom;
  readonly participantId: string;
  readonly document: LiveMatchRoomCommandDocument;
}

export interface ApplyLiveMatchRoomNetworkCommandResult {
  readonly room: RevisionedLiveMatchRoom;
  readonly snapshot: LiveMatchRoomSnapshotDocument;
}

export function applyLiveMatchRoomNetworkCommand(
  options: ApplyLiveMatchRoomNetworkCommandOptions,
): ApplyLiveMatchRoomNetworkCommandResult {
  const {
    room,
    participantId,
    document,
  } = options;

  const currentSessionId =
    room.managedRoom.room.session
      .sessionId;

  if (
    document.sessionId !==
    currentSessionId
  ) {
    throw new Error(
      `Live room command session mismatch: expected ${currentSessionId}, received ${document.sessionId}`,
    );
  }

  const result =
    applyRevisionedLiveMatchRoomCommand({
      room,

      expectedRevision:
        document.expectedRevision,

      participantId,

      command:
        document.command,
    });

  const snapshot =
    createLiveMatchRoomSnapshotDocument(
      result.room,
      participantId,
    );

  return Object.freeze({
    room:
      result.room,

    snapshot,
  });
}