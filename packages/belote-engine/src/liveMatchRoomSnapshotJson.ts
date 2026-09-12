import {
  parsePlayerClientSnapshotDocument,
} from "./playerClientSnapshotJson.js";
import {
  PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,
} from "./playerClientSnapshotFormat.js";
import {
  LIVE_MATCH_ROOM_PHASES,
  type LiveMatchRoomPhase,
} from "./liveMatchRoomLifecycle.js";
import {
  LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION,
  type LiveMatchRoomSeatSnapshot,
  type LiveMatchRoomSnapshotDocument,
} from "./liveMatchRoomSnapshotFormat.js";
import {
  isMatchSessionId,
} from "./matchSessionId.js";
import {
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "./players.js";
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

function isPlayerPosition(
  value: unknown,
): value is PlayerPosition {
  return (
    typeof value === "string" &&
    PLAYER_POSITIONS.includes(
      value as PlayerPosition,
    )
  );
}

function isRoomPhase(
  value: unknown,
): value is LiveMatchRoomPhase {
  return (
    typeof value === "string" &&
    LIVE_MATCH_ROOM_PHASES.includes(
      value as LiveMatchRoomPhase,
    )
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

function validateRevision(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "Live room snapshot revision is invalid.",
    );
  }

  return value;
}

function validateSeat(
  value: unknown,
): LiveMatchRoomSeatSnapshot {
  if (!isRecord(value)) {
    throw new Error(
      "Live room snapshot seat must be an object.",
    );
  }

  assertExactKeys(
    value,
    [
      "player",
      "occupied",
    ],
    "Live room snapshot seat structure is invalid.",
  );

  if (
    !isPlayerPosition(
      value.player,
    )
  ) {
    throw new Error(
      "Live room snapshot seat player is invalid.",
    );
  }

  if (
    typeof value.occupied !==
    "boolean"
  ) {
    throw new Error(
      "Live room snapshot seat occupancy is invalid.",
    );
  }

  return Object.freeze({
    player:
      value.player,

    occupied:
      value.occupied,
  });
}

function validateSeats(
  value: unknown,
): readonly LiveMatchRoomSeatSnapshot[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Live room snapshot seats must be an array.",
    );
  }

  if (
    value.length !==
    PLAYER_POSITIONS.length
  ) {
    throw new Error(
      "Live room snapshot must contain exactly four seats.",
    );
  }

  const seats =
    value.map(validateSeat);

  for (
    let index = 0;
    index < PLAYER_POSITIONS.length;
    index += 1
  ) {
    if (
      seats[index]?.player !==
      PLAYER_POSITIONS[index]
    ) {
      throw new Error(
        "Live room snapshot seats are not in canonical player order.",
      );
    }
  }

  return Object.freeze(
    seats,
  );
}

function validateGame(
  value: unknown,
) {
  const document =
    parsePlayerClientSnapshotDocument(
      JSON.stringify({
        formatVersion:
          PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,

        engineVersion:
          BELOTE_ENGINE_VERSION,

        snapshot:
          value,
      }),
    );

  return document.snapshot;
}

export function serializeLiveMatchRoomSnapshotDocument(
  document: LiveMatchRoomSnapshotDocument,
): string {
  return JSON.stringify(
    document,
  );
}

export function parseLiveMatchRoomSnapshotDocument(
  json: string,
): LiveMatchRoomSnapshotDocument {
  let parsed: unknown;

  try {
    parsed =
      JSON.parse(json);
  } catch {
    throw new Error(
      "Live room snapshot JSON is invalid.",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "Live room snapshot document must be an object.",
    );
  }

  assertExactKeys(
    parsed,
    [
      "formatVersion",
      "engineVersion",
      "sessionId",
      "revision",
      "phase",
      "player",
      "seats",
      "game",
    ],
    "Live room snapshot document structure is invalid.",
  );

  if (
    parsed.formatVersion !==
    LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported live room snapshot format version.",
    );
  }

  if (
    parsed.engineVersion !==
    BELOTE_ENGINE_VERSION
  ) {
    throw new Error(
      "Unsupported live room snapshot engine version.",
    );
  }

  if (
    !isMatchSessionId(
      parsed.sessionId,
    )
  ) {
    throw new Error(
      "Live room snapshot session ID is invalid.",
    );
  }

  const revision =
    validateRevision(
      parsed.revision,
    );

  if (
    !isRoomPhase(
      parsed.phase,
    )
  ) {
    throw new Error(
      "Live room snapshot phase is invalid.",
    );
  }

  if (
    !isPlayerPosition(
      parsed.player,
    )
  ) {
    throw new Error(
      "Live room snapshot player is invalid.",
    );
  }

  const seats =
    validateSeats(
      parsed.seats,
    );

  const playerSeat =
    seats.find(
      (seat) =>
        seat.player ===
        parsed.player,
    );

  if (
    playerSeat === undefined ||
    !playerSeat.occupied
  ) {
    throw new Error(
      "Live room snapshot player must occupy a seat.",
    );
  }

  const game =
    validateGame(
      parsed.game,
    );

  if (
    game.match.player !==
    parsed.player
  ) {
    throw new Error(
      "Live room snapshot player does not match game snapshot player.",
    );
  }

  return Object.freeze({
    formatVersion:
      LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    sessionId:
      parsed.sessionId,

    revision,

    phase:
      parsed.phase,

    player:
      parsed.player,

    seats,

    game,
  });
}