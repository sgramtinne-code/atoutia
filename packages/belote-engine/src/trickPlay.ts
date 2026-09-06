import { cardKey, type Card, type Suit } from "./cards.js";
import type { PlayerHands } from "./deal.js";
import { getLegalCards } from "./legalPlays.js";
import {
  nextPlayer,
  type PlayerPosition,
} from "./players.js";
import {
  getTrickWinner,
  type PlayedCard,
  type TrickWinner,
} from "./trick.js";

export interface TrickState {
  readonly leader: PlayerPosition;
  readonly currentPlayer: PlayerPosition;
  readonly plays: readonly PlayedCard[];
  readonly winner: TrickWinner | null;
  readonly completed: boolean;
}

export interface TrickPlayResult {
  readonly hands: PlayerHands;
  readonly trick: TrickState;
}

function freezeHands(
  hands: Record<PlayerPosition, Card[]>,
): PlayerHands {
  return Object.freeze({
    PLAYER_0: Object.freeze([...hands.PLAYER_0]),
    PLAYER_1: Object.freeze([...hands.PLAYER_1]),
    PLAYER_2: Object.freeze([...hands.PLAYER_2]),
    PLAYER_3: Object.freeze([...hands.PLAYER_3]),
  });
}

function cloneHands(
  hands: PlayerHands,
): Record<PlayerPosition, Card[]> {
  return {
    PLAYER_0: [...hands.PLAYER_0],
    PLAYER_1: [...hands.PLAYER_1],
    PLAYER_2: [...hands.PLAYER_2],
    PLAYER_3: [...hands.PLAYER_3],
  };
}

export function createTrickState(
  leader: PlayerPosition,
): TrickState {
  return Object.freeze({
    leader,
    currentPlayer: leader,
    plays: Object.freeze([]),
    winner: null,
    completed: false,
  });
}

function assertCardIsInHand(
  hand: readonly Card[],
  card: Card,
): void {
  const wantedKey = cardKey(card);

  if (!hand.some((candidate) => cardKey(candidate) === wantedKey)) {
    throw new Error("Card is not present in player's hand.");
  }
}

function assertCardIsLegal(
  hand: readonly Card[],
  player: PlayerPosition,
  plays: readonly PlayedCard[],
  trumpSuit: Suit,
  card: Card,
): void {
  const legalCards = getLegalCards(
    hand,
    player,
    plays,
    trumpSuit,
  );

  const wantedKey = cardKey(card);

  if (
    !legalCards.some(
      (candidate) => cardKey(candidate) === wantedKey,
    )
  ) {
    throw new Error("Card is not legal in the current trick.");
  }
}

function removeCardFromHand(
  hand: readonly Card[],
  card: Card,
): Card[] {
  const wantedKey = cardKey(card);
  const index = hand.findIndex(
    (candidate) => cardKey(candidate) === wantedKey,
  );

  if (index === -1) {
    throw new Error("Unable to remove card from hand.");
  }

  const nextHand = [...hand];
  nextHand.splice(index, 1);

  return nextHand;
}

export function playCard(
  hands: PlayerHands,
  trick: TrickState,
  player: PlayerPosition,
  card: Card,
  trumpSuit: Suit,
): TrickPlayResult {
  if (trick.completed) {
    throw new Error("Trick is already completed.");
  }

  if (player !== trick.currentPlayer) {
    throw new Error("It is not this player's turn.");
  }

  const playerHand = hands[player];

  assertCardIsInHand(playerHand, card);

  assertCardIsLegal(
    playerHand,
    player,
    trick.plays,
    trumpSuit,
    card,
  );

  const nextHands = cloneHands(hands);

  nextHands[player] = removeCardFromHand(
    playerHand,
    card,
  );

  const nextPlays = Object.freeze([
    ...trick.plays,
    Object.freeze({
      player,
      card,
    }),
  ]);

  if (nextPlays.length === 4) {
    const winner = getTrickWinner(
      nextPlays,
      trumpSuit,
    );

    return Object.freeze({
      hands: freezeHands(nextHands),
      trick: Object.freeze({
        leader: trick.leader,
        currentPlayer: winner.player,
        plays: nextPlays,
        winner,
        completed: true,
      }),
    });
  }

  return Object.freeze({
    hands: freezeHands(nextHands),
    trick: Object.freeze({
      leader: trick.leader,
      currentPlayer: nextPlayer(player),
      plays: nextPlays,
      winner: null,
      completed: false,
    }),
  });
}