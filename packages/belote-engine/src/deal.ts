import { cardKey, type Card } from "./cards.js";
import {
  getPlayOrderAfter,
  type PlayerPosition,
} from "./players.js";

export const INITIAL_DEAL_PATTERNS = [
  "THREE_THEN_TWO",
  "TWO_THEN_THREE",
] as const;

export type InitialDealPattern = (typeof INITIAL_DEAL_PATTERNS)[number];

export type PlayerHands = Readonly<
  Record<PlayerPosition, readonly Card[]>
>;

export interface InitialDeal {
  readonly dealer: PlayerPosition;
  readonly pattern: InitialDealPattern;
  readonly hands: PlayerHands;
  readonly turnUpCard: Card;
  readonly remainingDeck: readonly Card[];
}

function assertValidDeck(deck: readonly Card[]): void {
  if (deck.length !== 32) {
    throw new Error("Initial deal requires exactly 32 cards.");
  }

  const uniqueCards = new Set(deck.map(cardKey));

  if (uniqueCards.size !== 32) {
    throw new Error("Initial deal requires 32 unique cards.");
  }
}

function createEmptyHands(): Record<PlayerPosition, Card[]> {
  return {
    PLAYER_0: [],
    PLAYER_1: [],
    PLAYER_2: [],
    PLAYER_3: [],
  };
}

function getPacketSizes(
  pattern: InitialDealPattern,
): readonly [number, number] {
  switch (pattern) {
    case "THREE_THEN_TWO":
      return [3, 2];

    case "TWO_THEN_THREE":
      return [2, 3];
  }
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

export function createInitialDeal(
  deck: readonly Card[],
  dealer: PlayerPosition,
  pattern: InitialDealPattern = "THREE_THEN_TWO",
): InitialDeal {
  assertValidDeck(deck);

  const hands = createEmptyHands();
  const playOrder = getPlayOrderAfter(dealer);
  const packetSizes = getPacketSizes(pattern);

  let deckIndex = 0;

  for (const packetSize of packetSizes) {
    for (const player of playOrder) {
      const packet = deck.slice(deckIndex, deckIndex + packetSize);

      if (packet.length !== packetSize) {
        throw new Error("Unexpected end of deck during initial deal.");
      }

      hands[player].push(...packet);
      deckIndex += packetSize;
    }
  }

  const turnUpCard = deck[deckIndex];

  if (turnUpCard === undefined) {
    throw new Error("Turn-up card is missing.");
  }

  deckIndex += 1;

  const remainingDeck = Object.freeze(deck.slice(deckIndex));

  return Object.freeze({
    dealer,
    pattern,
    hands: freezeHands(hands),
    turnUpCard,
    remainingDeck,
  });
}