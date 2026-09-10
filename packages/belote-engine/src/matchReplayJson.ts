import type { BiddingAction } from "./bidding.js";
import {
  RANKS,
  SUITS,
  type Card,
  type Rank,
  type Suit,
} from "./cards.js";
import type {
  MatchHistory,
  MatchHistoryEvent,
} from "./matchHistory.js";
import {
  MATCH_REPLAY_FORMAT_VERSION,
  type MatchReplayDocument,
} from "./matchReplayFormat.js";
import {
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "./players.js";
import { BELOTE_ENGINE_VERSION } from "./version.js";

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

function assertPositiveInteger(
  value: unknown,
  message: string,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(message);
  }
}

function assertInteger(
  value: unknown,
  message: string,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new Error(message);
  }
}

function validateCard(
  value: unknown,
): Card {
  if (!isRecord(value)) {
    throw new Error(
      "Replay card play must contain a card.",
    );
  }

  if (!isSuit(value.suit)) {
    throw new Error(
      "Replay card suit is invalid.",
    );
  }

  if (!isRank(value.rank)) {
    throw new Error(
      "Replay card rank is invalid.",
    );
  }

  return Object.freeze({
    suit: value.suit,
    rank: value.rank,
  });
}

function validateBiddingAction(
  value: unknown,
): BiddingAction {
  if (!isRecord(value)) {
    throw new Error(
      "Replay bidding event must contain an action.",
    );
  }

  if (
    !isPlayerPosition(value.player)
  ) {
    throw new Error(
      "Replay bidding action player is invalid.",
    );
  }

  if (value.type === "PASS") {
    if ("suit" in value) {
      throw new Error(
        "Replay PASS action must not contain a suit.",
      );
    }

    return Object.freeze({
      type: "PASS",
      player: value.player,
    });
  }

  if (value.type === "TAKE") {
    if (!isSuit(value.suit)) {
      throw new Error(
        "Replay TAKE action suit is invalid.",
      );
    }

    return Object.freeze({
      type: "TAKE",
      player: value.player,
      suit: value.suit,
    });
  }

  throw new Error(
    "Replay bidding action type is invalid.",
  );
}

function validateHistoryEvent(
  event: unknown,
  expectedIndex: number,
): MatchHistoryEvent {
  if (!isRecord(event)) {
    throw new Error(
      "Replay history event must be an object.",
    );
  }

  if (event.index !== expectedIndex) {
    throw new Error(
      "Replay history indexes must be continuous and start at zero.",
    );
  }

  assertPositiveInteger(
    event.dealNumber,
    "Replay history deal number must be a positive integer.",
  );

  if (event.type === "BIDDING_ACTION") {
    return Object.freeze({
      index: expectedIndex,
      type: "BIDDING_ACTION",
      dealNumber: event.dealNumber,
      action: validateBiddingAction(
        event.action,
      ),
    });
  }

  if (event.type === "CARD_PLAY") {
    if (
      !isPlayerPosition(event.player)
    ) {
      throw new Error(
        "Replay card play player is invalid.",
      );
    }

    return Object.freeze({
      index: expectedIndex,
      type: "CARD_PLAY",
      dealNumber: event.dealNumber,
      player: event.player,
      card: validateCard(event.card),
    });
  }

  throw new Error(
    "Replay history event type is invalid.",
  );
}

function validateHistory(
  value: unknown,
): MatchHistory {
  if (!Array.isArray(value)) {
    throw new Error(
      "Replay history must be an array.",
    );
  }

  const events = value.map(
    (event, index) =>
      validateHistoryEvent(
        event,
        index,
      ),
  );

  return Object.freeze(events);
}

export function serializeMatchReplayDocument(
  document: MatchReplayDocument,
): string {
  return JSON.stringify(document);
}

export function parseMatchReplayDocument(
  json: string,
): MatchReplayDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      "Replay JSON is invalid.",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "Replay document must be an object.",
    );
  }

  if (
    parsed.formatVersion !==
    MATCH_REPLAY_FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported match replay format version.",
    );
  }

  if (
    parsed.engineVersion !==
    BELOTE_ENGINE_VERSION
  ) {
    throw new Error(
      "Unsupported Belote engine version.",
    );
  }

  assertInteger(
    parsed.baseSeed,
    "Replay base seed must be an integer.",
  );

  if (
    !isPlayerPosition(
      parsed.firstDealer,
    )
  ) {
    throw new Error(
      "Replay first dealer is invalid.",
    );
  }

  assertPositiveInteger(
    parsed.targetScore,
    "Replay target score must be a positive integer.",
  );

  const history =
    validateHistory(parsed.history);

  return Object.freeze({
    formatVersion:
      MATCH_REPLAY_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    baseSeed: parsed.baseSeed,

    firstDealer:
      parsed.firstDealer,

    targetScore:
      parsed.targetScore,

    history,
  });
}