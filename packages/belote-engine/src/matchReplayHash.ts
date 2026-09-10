import type {
  MatchHistoryEvent,
} from "./matchHistory.js";
import type {
  MatchReplayDocument,
} from "./matchReplayFormat.js";

function canonicalizeHistoryEvent(
  event: MatchHistoryEvent,
): unknown {
  if (event.type === "BIDDING_ACTION") {
    if (event.action.type === "PASS") {
      return {
        index: event.index,
        type: "BIDDING_ACTION",
        dealNumber: event.dealNumber,
        action: {
          type: "PASS",
          player: event.action.player,
        },
      };
    }

    return {
      index: event.index,
      type: "BIDDING_ACTION",
      dealNumber: event.dealNumber,
      action: {
        type: "TAKE",
        player: event.action.player,
        suit: event.action.suit,
      },
    };
  }

  return {
    index: event.index,
    type: "CARD_PLAY",
    dealNumber: event.dealNumber,
    player: event.player,
    card: {
      suit: event.card.suit,
      rank: event.card.rank,
    },
  };
}

export function createCanonicalMatchReplayJson(
  document: MatchReplayDocument,
): string {
  const canonical = {
    formatVersion:
      document.formatVersion,

    engineVersion:
      document.engineVersion,

    baseSeed:
      document.baseSeed,

    firstDealer:
      document.firstDealer,

    targetScore:
      document.targetScore,

    history:
      document.history.map(
        canonicalizeHistoryEvent,
      ),
  };

  return JSON.stringify(canonical);
}

function bytesToHex(
  bytes: Uint8Array,
): string {
  return Array.from(bytes)
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

export async function hashMatchReplayDocument(
  document: MatchReplayDocument,
): Promise<string> {
  const canonicalJson =
    createCanonicalMatchReplayJson(
      document,
    );

  const data =
    new TextEncoder().encode(
      canonicalJson,
    );

  const digest =
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      data,
    );

  return bytesToHex(
    new Uint8Array(digest),
  );
}