import type { Card, Rank, Suit } from "./cards.js";

const NON_TRUMP_STRENGTH: Readonly<Record<Rank, number>> = Object.freeze({
  SEVEN: 0,
  EIGHT: 1,
  NINE: 2,
  JACK: 3,
  QUEEN: 4,
  KING: 5,
  TEN: 6,
  ACE: 7,
});

const TRUMP_STRENGTH: Readonly<Record<Rank, number>> = Object.freeze({
  SEVEN: 0,
  EIGHT: 1,
  QUEEN: 2,
  KING: 3,
  TEN: 4,
  ACE: 5,
  NINE: 6,
  JACK: 7,
});

const NON_TRUMP_POINTS: Readonly<Record<Rank, number>> = Object.freeze({
  SEVEN: 0,
  EIGHT: 0,
  NINE: 0,
  JACK: 2,
  QUEEN: 3,
  KING: 4,
  TEN: 10,
  ACE: 11,
});

const TRUMP_POINTS: Readonly<Record<Rank, number>> = Object.freeze({
  SEVEN: 0,
  EIGHT: 0,
  QUEEN: 3,
  KING: 4,
  TEN: 10,
  ACE: 11,
  NINE: 14,
  JACK: 20,
});

export function isTrump(card: Card, trumpSuit: Suit): boolean {
  return card.suit === trumpSuit;
}

export function getCardPoints(card: Card, trumpSuit: Suit): number {
  return isTrump(card, trumpSuit)
    ? TRUMP_POINTS[card.rank]
    : NON_TRUMP_POINTS[card.rank];
}

export function getCardStrength(card: Card, trumpSuit: Suit): number {
  return isTrump(card, trumpSuit)
    ? TRUMP_STRENGTH[card.rank]
    : NON_TRUMP_STRENGTH[card.rank];
}

export function compareSameSuitCards(
  first: Card,
  second: Card,
  trumpSuit: Suit,
): number {
  if (first.suit !== second.suit) {
    throw new Error("Cards must have the same suit.");
  }

  return getCardStrength(first, trumpSuit) - getCardStrength(second, trumpSuit);
}