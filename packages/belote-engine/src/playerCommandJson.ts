import {
  RANKS,
  SUITS,
  type Card,
  type Rank,
  type Suit,
} from "./cards.js";
import {
  PLAYER_COMMAND_FORMAT_VERSION,
  type PlayerCommand,
  type PlayerCommandDocument,
} from "./playerCommandFormat.js";
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

function isSuit(
  value: unknown,
): value is Suit {
  return (
    typeof value === "string" &&
    SUITS.includes(
      value as Suit,
    )
  );
}

function isRank(
  value: unknown,
): value is Rank {
  return (
    typeof value === "string" &&
    RANKS.includes(
      value as Rank,
    )
  );
}

function validateCard(
  value: unknown,
): Card {
  if (!isRecord(value)) {
    throw new Error(
      "Player command card must be an object.",
    );
  }

  if (!isSuit(value.suit)) {
    throw new Error(
      "Player command card suit is invalid.",
    );
  }

  if (!isRank(value.rank)) {
    throw new Error(
      "Player command card rank is invalid.",
    );
  }

  return Object.freeze({
    suit: value.suit,
    rank: value.rank,
  });
}

function validateCommand(
  value: unknown,
): PlayerCommand {
  if (!isRecord(value)) {
    throw new Error(
      "Player command must be an object.",
    );
  }

  if (value.type === "PASS") {
    return Object.freeze({
      type: "PASS",
    });
  }

  if (value.type === "TAKE") {
    if (!isSuit(value.suit)) {
      throw new Error(
        "Player command TAKE suit is invalid.",
      );
    }

    return Object.freeze({
      type: "TAKE",
      suit: value.suit,
    });
  }

  if (value.type === "PLAY_CARD") {
    return Object.freeze({
      type: "PLAY_CARD",
      card:
        validateCard(value.card),
    });
  }

  throw new Error(
    "Player command type is invalid.",
  );
}

export function serializePlayerCommandDocument(
  document: PlayerCommandDocument,
): string {
  return JSON.stringify(document);
}

export function parsePlayerCommandDocument(
  json: string,
): PlayerCommandDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      "Player command JSON is invalid.",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "Player command document must be an object.",
    );
  }

  if (
    parsed.formatVersion !==
    PLAYER_COMMAND_FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported player command format version.",
    );
  }

  if (
    parsed.engineVersion !==
    BELOTE_ENGINE_VERSION
  ) {
    throw new Error(
      "Unsupported player command engine version.",
    );
  }

  if (!isPlayerPosition(parsed.player)) {
    throw new Error(
      "Player command player is invalid.",
    );
  }

  return Object.freeze({
    formatVersion:
      PLAYER_COMMAND_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    player:
      parsed.player,

    command:
      validateCommand(
        parsed.command,
      ),
  });
}