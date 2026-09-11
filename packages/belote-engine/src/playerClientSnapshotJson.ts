import {
  RANKS,
  SUITS,
  type Card,
  type Rank,
  type Suit,
} from "./cards.js";
import {
  PLAYER_ACTION_MODES,
  type PlayerActionMode,
  type PlayerAvailableActions,
} from "./playerAvailableActions.js";
import type {
  PlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import {
  PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,
  type PlayerClientSnapshotDocument,
} from "./playerClientSnapshotFormat.js";
import type {
  PlayerMatchSnapshot,
} from "./playerMatchSnapshot.js";
import {
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "./players.js";
import type {
  PublicMatchSnapshot,
} from "./publicMatchSnapshot.js";
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

function isPlayerActionMode(
  value: unknown,
): value is PlayerActionMode {
  return (
    typeof value === "string" &&
    PLAYER_ACTION_MODES.includes(
      value as PlayerActionMode,
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

function validateCard(
  value: unknown,
): Card {
  if (!isRecord(value)) {
    throw new Error(
      "Client snapshot card must be an object.",
    );
  }

  if (!isSuit(value.suit)) {
    throw new Error(
      "Client snapshot card suit is invalid.",
    );
  }

  if (!isRank(value.rank)) {
    throw new Error(
      "Client snapshot card rank is invalid.",
    );
  }

  return Object.freeze({
    suit: value.suit,
    rank: value.rank,
  });
}

function validateCards(
  value: unknown,
): readonly Card[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Client snapshot cards must be an array.",
    );
  }

  return Object.freeze(
    value.map(validateCard),
  );
}

function validatePublicSnapshot(
  value: unknown,
): PublicMatchSnapshot {
  if (!isRecord(value)) {
    throw new Error(
      "Client snapshot public state must be an object.",
    );
  }

  assertPositiveInteger(
    value.dealNumber,
    "Client snapshot deal number must be a positive integer.",
  );

  if (!isPlayerPosition(value.dealer)) {
    throw new Error(
      "Client snapshot dealer is invalid.",
    );
  }

  if (
    value.phase !== "BIDDING" &&
    value.phase !== "PLAYING" &&
    value.phase !== "FINISHED"
  ) {
    throw new Error(
      "Client snapshot phase is invalid.",
    );
  }

  if (!isRecord(value.score)) {
    throw new Error(
      "Client snapshot score is invalid.",
    );
  }

  assertPositiveInteger(
    value.score.targetScore,
    "Client snapshot target score must be a positive integer.",
  );

  if (!isRecord(value.score.scores)) {
    throw new Error(
      "Client snapshot team scores are invalid.",
    );
  }

  if (
    typeof value.score.scores.TEAM_0 !== "number" ||
    typeof value.score.scores.TEAM_1 !== "number"
  ) {
    throw new Error(
      "Client snapshot team scores are invalid.",
    );
  }

  if (
    typeof value.score.completed !== "boolean"
  ) {
    throw new Error(
      "Client snapshot completion flag is invalid.",
    );
  }

  if (
    value.score.winner !== null &&
    value.score.winner !== "TEAM_0" &&
    value.score.winner !== "TEAM_1"
  ) {
    throw new Error(
      "Client snapshot winner is invalid.",
    );
  }

  if (
    value.biddingPlayer !== null &&
    !isPlayerPosition(
      value.biddingPlayer,
    )
  ) {
    throw new Error(
      "Client snapshot bidding player is invalid.",
    );
  }

  if (
    value.taker !== null &&
    !isPlayerPosition(value.taker)
  ) {
    throw new Error(
      "Client snapshot taker is invalid.",
    );
  }

  if (
    value.trumpSuit !== null &&
    !isSuit(value.trumpSuit)
  ) {
    throw new Error(
      "Client snapshot trump suit is invalid.",
    );
  }

  const turnUpCard =
    validateCard(value.turnUpCard);

  let currentTrick:
    PublicMatchSnapshot["currentTrick"] =
    null;

  if (value.currentTrick !== null) {
    if (!isRecord(value.currentTrick)) {
      throw new Error(
        "Client snapshot current trick is invalid.",
      );
    }

    if (
      !isPlayerPosition(
        value.currentTrick.currentPlayer,
      )
    ) {
      throw new Error(
        "Client snapshot current trick player is invalid.",
      );
    }

    if (
      !Array.isArray(
        value.currentTrick.plays,
      )
    ) {
      throw new Error(
        "Client snapshot trick plays must be an array.",
      );
    }

    const plays =
      value.currentTrick.plays.map(
        (play) => {
          if (!isRecord(play)) {
            throw new Error(
              "Client snapshot trick play is invalid.",
            );
          }

          if (
            !isPlayerPosition(play.player)
          ) {
            throw new Error(
              "Client snapshot trick play player is invalid.",
            );
          }

          return Object.freeze({
            player: play.player,
            card: validateCard(play.card),
          });
        },
      );

    currentTrick = Object.freeze({
      currentPlayer:
        value.currentTrick.currentPlayer,

      plays: Object.freeze(plays),
    });
  }

  return Object.freeze({
    dealNumber: value.dealNumber,
    dealer: value.dealer,
    phase: value.phase,

    score: Object.freeze({
      targetScore:
        value.score.targetScore,

      scores: Object.freeze({
        TEAM_0:
          value.score.scores.TEAM_0,

        TEAM_1:
          value.score.scores.TEAM_1,
      }),

      completed:
        value.score.completed,

      winner:
        value.score.winner,
    }),

    biddingPlayer:
      value.biddingPlayer,

    taker:
      value.taker,

    trumpSuit:
      value.trumpSuit,

    turnUpCard,

    currentTrick,
  });
}

function validateMatchSnapshot(
  value: unknown,
): PlayerMatchSnapshot {
  if (!isRecord(value)) {
    throw new Error(
      "Client snapshot match state must be an object.",
    );
  }

  if (!isPlayerPosition(value.player)) {
    throw new Error(
      "Client snapshot player is invalid.",
    );
  }

  return Object.freeze({
    public:
      validatePublicSnapshot(
        value.public,
      ),

    player:
      value.player,

    hand:
      validateCards(value.hand),

    legalCards:
      validateCards(
        value.legalCards,
      ),
  });
}

function validateActions(
  value: unknown,
): PlayerAvailableActions {
  if (!isRecord(value)) {
    throw new Error(
      "Client snapshot actions must be an object.",
    );
  }

  if (!isPlayerPosition(value.player)) {
    throw new Error(
      "Client snapshot action player is invalid.",
    );
  }

  if (!isPlayerActionMode(value.mode)) {
    throw new Error(
      "Client snapshot action mode is invalid.",
    );
  }

  if (!Array.isArray(value.biddingActions)) {
    throw new Error(
      "Client snapshot bidding actions must be an array.",
    );
  }

  const biddingActions =
    value.biddingActions.map(
      (action) => {
        if (!isRecord(action)) {
          throw new Error(
            "Client snapshot bidding action is invalid.",
          );
        }

        if (
          !isPlayerPosition(
            action.player,
          )
        ) {
          throw new Error(
            "Client snapshot bidding action player is invalid.",
          );
        }

        if (action.type === "PASS") {
          return Object.freeze({
            type: "PASS" as const,
            player: action.player,
          });
        }

        if (action.type === "TAKE") {
          if (!isSuit(action.suit)) {
            throw new Error(
              "Client snapshot bidding action suit is invalid.",
            );
          }

          return Object.freeze({
            type: "TAKE" as const,
            player: action.player,
            suit: action.suit,
          });
        }

        throw new Error(
          "Client snapshot bidding action type is invalid.",
        );
      },
    );

  return Object.freeze({
    player:
      value.player,

    mode:
      value.mode,

    biddingActions:
      Object.freeze(
        biddingActions,
      ),

    legalCards:
      validateCards(
        value.legalCards,
      ),
  });
}

function validateSnapshot(
  value: unknown,
): PlayerClientSnapshot {
  if (!isRecord(value)) {
    throw new Error(
      "Client snapshot must be an object.",
    );
  }

  const match =
    validateMatchSnapshot(
      value.match,
    );

  const actions =
    validateActions(
      value.actions,
    );

  if (
    match.player !== actions.player
  ) {
    throw new Error(
      "Client snapshot player mismatch.",
    );
  }

  return Object.freeze({
    match,
    actions,
  });
}

export function serializePlayerClientSnapshotDocument(
  document: PlayerClientSnapshotDocument,
): string {
  return JSON.stringify(document);
}

export function parsePlayerClientSnapshotDocument(
  json: string,
): PlayerClientSnapshotDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      "Client snapshot JSON is invalid.",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "Client snapshot document must be an object.",
    );
  }

  if (
    parsed.formatVersion !==
    PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported client snapshot format version.",
    );
  }

  if (
    parsed.engineVersion !==
    BELOTE_ENGINE_VERSION
  ) {
    throw new Error(
      "Unsupported client snapshot engine version.",
    );
  }

  return Object.freeze({
    formatVersion:
      PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    snapshot:
      validateSnapshot(
        parsed.snapshot,
      ),
  });
}