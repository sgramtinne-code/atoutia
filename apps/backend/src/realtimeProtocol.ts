import {
  parseLiveMatchRoomCommandDocument,
  type LiveMatchRoomCommandDocument,
  type LiveMatchRoomSnapshotDocument,
  type PlayerPosition,
} from "@atoutia/belote-engine";

import type {
  AbsenceResolutionStatus,
  MatchAbsenceMode,
} from "./absencePolicy.js";

export const REALTIME_PROTOCOL_VERSION =
  1;

export interface RealtimeCommandMessage {
  readonly protocolVersion: 1;
  readonly type: "COMMAND";
  readonly document:
    LiveMatchRoomCommandDocument;
}

export interface RealtimeResyncMessage {
  readonly protocolVersion: 1;
  readonly type: "RESYNC";
  readonly knownRevision: number;
}

export interface RealtimeHeartbeatMessage {
  readonly protocolVersion: 1;
  readonly type: "HEARTBEAT";
}

export type RealtimeClientMessage =
  | RealtimeCommandMessage
  | RealtimeResyncMessage
  | RealtimeHeartbeatMessage;

export interface RealtimeSnapshotMessage {
  readonly protocolVersion: 1;
  readonly type: "SNAPSHOT";
  readonly snapshot:
    LiveMatchRoomSnapshotDocument;
}

export interface RealtimePresencePlayer {
  readonly player:
    PlayerPosition;

  readonly connected:
    boolean;

  readonly lastSeenAtMs:
    number | null;
}

export type RealtimeConnectionStateName =
  | "CONNECTED"
  | "RECONNECTING"
  | "ABSENT";

export interface RealtimeConnectionState {
  readonly player:
    PlayerPosition;

  readonly state:
    RealtimeConnectionStateName;

  readonly disconnectedAtMs:
    number | null;

  readonly graceDeadlineAtMs:
    number | null;
}

export interface RealtimeAbsencePlayer {
  readonly player:
    PlayerPosition;

  readonly status:
    AbsenceResolutionStatus;

  readonly mode:
    MatchAbsenceMode;

  readonly absentSinceMs:
    number | null;

  readonly eligibleAtMs:
    number | null;

  readonly remainingMs:
    number | null;
}

export interface RealtimePresenceMessage {
  readonly protocolVersion: 1;
  readonly type: "PRESENCE";

  readonly sessionId:
    string;

  readonly players:
    readonly RealtimePresencePlayer[];

  readonly connectionStates:
    readonly RealtimeConnectionState[];

  readonly absences:
    readonly RealtimeAbsencePlayer[];
}

export type RealtimeErrorCode =
  | "INVALID_MESSAGE"
  | "SESSION_MISMATCH"
  | "REVISION_MISMATCH"
  | "PARTICIPANT_FORBIDDEN"
  | "COMMAND_REJECTED"
  | "ROOM_NOT_FOUND"
  | "INTERNAL_SERVER_ERROR";

export interface RealtimeErrorMessage {
  readonly protocolVersion: 1;
  readonly type: "ERROR";
  readonly code:
    RealtimeErrorCode;
}

export type RealtimeServerMessage =
  | RealtimeSnapshotMessage
  | RealtimePresenceMessage
  | RealtimeErrorMessage;

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<
    string,
    unknown
  >,
  keys: readonly string[],
): boolean {
  const actualKeys =
    Object.keys(
      value,
    ).sort();

  const expectedKeys =
    [...keys].sort();

  return (
    actualKeys.length ===
      expectedKeys.length &&
    actualKeys.every(
      (
        key,
        index,
      ) =>
        key ===
        expectedKeys[index],
    )
  );
}

function isValidRevision(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(
      value,
    ) &&
    value >= 0
  );
}

function parseCommandMessage(
  value: Record<
    string,
    unknown
  >,
): RealtimeCommandMessage {
  if (
    !hasExactKeys(
      value,
      [
        "protocolVersion",
        "type",
        "document",
      ],
    )
  ) {
    throw new Error(
      "Realtime command message contains invalid fields.",
    );
  }

  let document:
    LiveMatchRoomCommandDocument;

  try {
    document =
      parseLiveMatchRoomCommandDocument(
        JSON.stringify(
          value.document,
        ),
      );
  } catch {
    throw new Error(
      "Invalid realtime command document.",
    );
  }

  return Object.freeze({
    protocolVersion:
      REALTIME_PROTOCOL_VERSION,

    type:
      "COMMAND",

    document,
  });
}

function parseResyncMessage(
  value: Record<
    string,
    unknown
  >,
): RealtimeResyncMessage {
  if (
    !hasExactKeys(
      value,
      [
        "protocolVersion",
        "type",
        "knownRevision",
      ],
    )
  ) {
    throw new Error(
      "Realtime resync message contains invalid fields.",
    );
  }

  if (
    !isValidRevision(
      value.knownRevision,
    )
  ) {
    throw new Error(
      "Realtime resync revision is invalid.",
    );
  }

  return Object.freeze({
    protocolVersion:
      REALTIME_PROTOCOL_VERSION,

    type:
      "RESYNC",

    knownRevision:
      value.knownRevision,
  });
}

function parseHeartbeatMessage(
  value: Record<
    string,
    unknown
  >,
): RealtimeHeartbeatMessage {
  if (
    !hasExactKeys(
      value,
      [
        "protocolVersion",
        "type",
      ],
    )
  ) {
    throw new Error(
      "Realtime heartbeat message contains invalid fields.",
    );
  }

  return Object.freeze({
    protocolVersion:
      REALTIME_PROTOCOL_VERSION,

    type:
      "HEARTBEAT",
  });
}

export function parseRealtimeClientMessage(
  text: string,
): RealtimeClientMessage {
  let value: unknown;

  try {
    value =
      JSON.parse(
        text,
      ) as unknown;
  } catch {
    throw new Error(
      "Invalid realtime JSON message.",
    );
  }

  if (!isObject(value)) {
    throw new Error(
      "Realtime message must be an object.",
    );
  }

  if (
    value.protocolVersion !==
    REALTIME_PROTOCOL_VERSION
  ) {
    throw new Error(
      "Unsupported realtime protocol version.",
    );
  }

  if (
    value.type ===
    "COMMAND"
  ) {
    return parseCommandMessage(
      value,
    );
  }

  if (
    value.type ===
    "RESYNC"
  ) {
    return parseResyncMessage(
      value,
    );
  }

  if (
    value.type ===
    "HEARTBEAT"
  ) {
    return parseHeartbeatMessage(
      value,
    );
  }

  throw new Error(
    "Unsupported realtime message type.",
  );
}

export function createRealtimeSnapshotMessage(
  snapshot:
    LiveMatchRoomSnapshotDocument,
): RealtimeSnapshotMessage {
  return Object.freeze({
    protocolVersion:
      REALTIME_PROTOCOL_VERSION,

    type:
      "SNAPSHOT",

    snapshot,
  });
}

export function createRealtimePresenceMessage(
  sessionId: string,

  players:
    readonly RealtimePresencePlayer[],

  connectionStates:
    readonly RealtimeConnectionState[] =
      [],

  absences:
    readonly RealtimeAbsencePlayer[] =
      [],
): RealtimePresenceMessage {
  return Object.freeze({
    protocolVersion:
      REALTIME_PROTOCOL_VERSION,

    type:
      "PRESENCE",

    sessionId,

    players:
      Object.freeze(
        [...players],
      ),

    connectionStates:
      Object.freeze(
        [...connectionStates],
      ),

    absences:
      Object.freeze(
        [...absences],
      ),
  });
}

export function createRealtimeErrorMessage(
  code:
    RealtimeErrorCode,
): RealtimeErrorMessage {
  return Object.freeze({
    protocolVersion:
      REALTIME_PROTOCOL_VERSION,

    type:
      "ERROR",

    code,
  });
}

export function serializeRealtimeServerMessage(
  message:
    RealtimeServerMessage,
): string {
  return JSON.stringify(
    message,
  );
}