import {
  parseLiveMatchRoomCommandDocument,
  type LiveMatchRoomCommandDocument,
  type LiveMatchRoomSnapshotDocument,
} from "@atoutia/belote-engine";

export const REALTIME_PROTOCOL_VERSION =
  1;

export interface RealtimeCommandMessage {
  readonly protocolVersion: 1;
  readonly type: "COMMAND";
  readonly document:
    LiveMatchRoomCommandDocument;
}

export type RealtimeClientMessage =
  RealtimeCommandMessage;

export interface RealtimeSnapshotMessage {
  readonly protocolVersion: 1;
  readonly type: "SNAPSHOT";
  readonly snapshot:
    LiveMatchRoomSnapshotDocument;
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
      "Realtime message contains invalid fields.",
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
    value.type !==
    "COMMAND"
  ) {
    throw new Error(
      "Unsupported realtime message type.",
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