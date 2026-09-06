import {
  cardKey,
  type Card,
  type Suit,
} from "./cards.js";
import type { PlayerHands } from "./deal.js";
import type { PlayerPosition } from "./players.js";
import {
  getPlayerTeam,
  type Team,
} from "./scoring.js";

export const BELOTE_EVENTS = [
  "BELOTE",
  "REBELOTE",
] as const;

export type BeloteEventType =
  (typeof BELOTE_EVENTS)[number];

export interface BeloteEvent {
  readonly type: BeloteEventType;
  readonly player: PlayerPosition;
  readonly team: Team;
  readonly card: Card;
}

export interface BeloteState {
  readonly trumpSuit: Suit;
  readonly eligiblePlayer: PlayerPosition | null;
  readonly eligibleTeam: Team | null;
  readonly playedHonorKeys: readonly string[];
  readonly events: readonly BeloteEvent[];
  readonly completed: boolean;
  readonly points: number;
}

export interface BelotePlayResult {
  readonly state: BeloteState;
  readonly event: BeloteEvent | null;
}

function hasTrumpHonorPair(
  hand: readonly Card[],
  trumpSuit: Suit,
): boolean {
  const hasKing = hand.some(
    (card) =>
      card.suit === trumpSuit &&
      card.rank === "KING",
  );

  const hasQueen = hand.some(
    (card) =>
      card.suit === trumpSuit &&
      card.rank === "QUEEN",
  );

  return hasKing && hasQueen;
}

function isTrumpHonor(
  card: Card,
  trumpSuit: Suit,
): boolean {
  return (
    card.suit === trumpSuit &&
    (card.rank === "KING" || card.rank === "QUEEN")
  );
}

export function createBeloteState(
  hands: PlayerHands,
  trumpSuit: Suit,
): BeloteState {
  const players: readonly PlayerPosition[] = [
    "PLAYER_0",
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
  ];

  const eligiblePlayers = players.filter(
    (player) =>
      hasTrumpHonorPair(
        hands[player],
        trumpSuit,
      ),
  );

  if (eligiblePlayers.length > 1) {
    throw new Error(
      "More than one player cannot hold the trump King and Queen.",
    );
  }

  const eligiblePlayer =
    eligiblePlayers[0] ?? null;

  const eligibleTeam =
    eligiblePlayer === null
      ? null
      : getPlayerTeam(eligiblePlayer);

  return Object.freeze({
    trumpSuit,
    eligiblePlayer,
    eligibleTeam,
    playedHonorKeys: Object.freeze([]),
    events: Object.freeze([]),
    completed: false,
    points: 0,
  });
}

export function applyBeloteCardPlayed(
  state: BeloteState,
  player: PlayerPosition,
  card: Card,
): BelotePlayResult {
  if (
    state.eligiblePlayer === null ||
    player !== state.eligiblePlayer ||
    !isTrumpHonor(card, state.trumpSuit)
  ) {
    return Object.freeze({
      state,
      event: null,
    });
  }

  const key = cardKey(card);

  if (state.playedHonorKeys.includes(key)) {
    throw new Error(
      "Belote trump honor has already been played.",
    );
  }

  if (state.completed) {
    throw new Error(
      "Belote/Rebelote is already completed.",
    );
  }

  const isFirstHonor =
    state.playedHonorKeys.length === 0;

  const event: BeloteEvent = Object.freeze({
    type: isFirstHonor
      ? "BELOTE"
      : "REBELOTE",
    player,
    team: getPlayerTeam(player),
    card,
  });

  const nextPlayedHonorKeys = Object.freeze([
    ...state.playedHonorKeys,
    key,
  ]);

  const completed =
    nextPlayedHonorKeys.length === 2;

  const nextState: BeloteState =
    Object.freeze({
      ...state,
      playedHonorKeys: nextPlayedHonorKeys,
      events: Object.freeze([
        ...state.events,
        event,
      ]),
      completed,
      points: completed ? 20 : 0,
    });

  return Object.freeze({
    state: nextState,
    event,
  });
}