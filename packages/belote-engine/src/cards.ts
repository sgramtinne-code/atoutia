export const SUITS = ["CLUBS", "DIAMONDS", "HEARTS", "SPADES"] as const;

export type Suit = (typeof SUITS)[number];

export const RANKS = [
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "JACK",
  "QUEEN",
  "KING",
  "ACE",
] as const;

export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

export function createCard(suit: Suit, rank: Rank): Card {
  return Object.freeze({
    suit,
    rank,
  });
}

export function createDeck(): readonly Card[] {
  const deck = SUITS.flatMap((suit) =>
    RANKS.map((rank) => createCard(suit, rank)),
  );

  return Object.freeze(deck);
}

export function cardKey(card: Card): string {
  return `${card.suit}:${card.rank}`;
}