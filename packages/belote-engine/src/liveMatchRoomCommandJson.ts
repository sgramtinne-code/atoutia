import {
  LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION,
  type LiveMatchRoomCommandDocument,
} from "./liveMatchRoomCommandFormat.js";
import {
  isMatchSessionId,
} from "./matchSessionId.js";
import {
  parsePlayerCommandDocument,
} from "./playerCommandJson.js";
import {
  PLAYER_COMMAND_FORMAT_VERSION,
  type PlayerCommand,
} from "./playerCommandFormat.js";
import {
  BELOTE_ENGINE_VERSION,
} from "./version.js";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  message: string,
): void {
  const actualKeys =
    Object.keys(value);

  if (
    actualKeys.length !==
      expectedKeys.length ||
    !actualKeys.every(
      (key) =>
        expectedKeys.includes(key),
    )
  ) {
    throw new Error(message);
  }
}

function validateExpectedRevision(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "Live room command expected revision is invalid.",
    );
  }

  return value;
}

function validateCommand(
  value: unknown,
): PlayerCommand {
  const document =
    parsePlayerCommandDocument(
      JSON.stringify({
        formatVersion:
          PLAYER_COMMAND_FORMAT_VERSION,

        engineVersion:
          BELOTE_ENGINE_VERSION,

        player:
          "PLAYER_0",

        command:
          value,
      }),
    );

  return document.command;
}

export function serializeLiveMatchRoomCommandDocument(
  document: LiveMatchRoomCommandDocument,
): string {
  return JSON.stringify(
    document,
  );
}

export function parseLiveMatchRoomCommandDocument(
  json: string,
): LiveMatchRoomCommandDocument {
  let parsed: unknown;

  try {
    parsed =
      JSON.parse(json);
  } catch {
    throw new Error(
      "Live room command JSON is invalid.",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "Live room command document must be an object.",
    );
  }

  assertExactKeys(
    parsed,
    [
      "formatVersion",
      "engineVersion",
      "sessionId",
      "expectedRevision",
      "command",
    ],
    "Live room command document structure is invalid.",
  );

  if (
    parsed.formatVersion !==
    LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported live room command format version.",
    );
  }

  if (
    parsed.engineVersion !==
    BELOTE_ENGINE_VERSION
  ) {
    throw new Error(
      "Unsupported live room command engine version.",
    );
  }

  if (
    !isMatchSessionId(
      parsed.sessionId,
    )
  ) {
    throw new Error(
      "Live room command session ID is invalid.",
    );
  }

  const expectedRevision =
    validateExpectedRevision(
      parsed.expectedRevision,
    );

  const command =
    validateCommand(
      parsed.command,
    );

  return Object.freeze({
    formatVersion:
      LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    sessionId:
      parsed.sessionId,

    expectedRevision,

    command,
  });
}