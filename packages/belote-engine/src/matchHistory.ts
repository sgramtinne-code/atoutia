import type { BiddingAction } from "./bidding.js";
import type { Card } from "./cards.js";
import type { PlayerPosition } from "./players.js";

export const MATCH_HISTORY_EVENT_TYPES = [
  "BIDDING_ACTION",
  "CARD_PLAY",
] as const;

export type MatchHistoryEventType =
  (typeof MATCH_HISTORY_EVENT_TYPES)[number];

export interface MatchHistoryBiddingEvent {
  readonly index: number;
  readonly type: "BIDDING_ACTION";
  readonly dealNumber: number;
  readonly action: BiddingAction;
}

export interface MatchHistoryCardPlayEvent {
  readonly index: number;
  readonly type: "CARD_PLAY";
  readonly dealNumber: number;
  readonly player: PlayerPosition;
  readonly card: Card;
}

export type MatchHistoryEvent =
  | MatchHistoryBiddingEvent
  | MatchHistoryCardPlayEvent;

export type MatchHistory =
  readonly MatchHistoryEvent[];

export function createMatchHistory(): MatchHistory {
  return Object.freeze([]);
}

export function appendBiddingHistoryEvent(
  history: MatchHistory,
  dealNumber: number,
  action: BiddingAction,
): MatchHistory {
  const event: MatchHistoryBiddingEvent =
    Object.freeze({
      index: history.length,
      type: "BIDDING_ACTION",
      dealNumber,
      action: Object.freeze({
        ...action,
      }),
    });

  return Object.freeze([
    ...history,
    event,
  ]);
}

export function appendCardPlayHistoryEvent(
  history: MatchHistory,
  dealNumber: number,
  player: PlayerPosition,
  card: Card,
): MatchHistory {
  const event: MatchHistoryCardPlayEvent =
    Object.freeze({
      index: history.length,
      type: "CARD_PLAY",
      dealNumber,
      player,
      card,
    });

  return Object.freeze([
    ...history,
    event,
  ]);
}