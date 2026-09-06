import { cardKey, type Card } from "./cards.js";
import type { InitialDeal, PlayerHands } from "./deal.js";
import {
  getPlayOrderAfter,
  type PlayerPosition,
} from "./players.js";

export interface CompletedDeal {
  readonly dealer: PlayerPosition;
  readonly taker: PlayerPosition;
  readonly hands: PlayerHands;
}

function cloneInitialHands(
  hands: PlayerHands,
): Record<PlayerPosition, Card[]> {
  return {
    PLAYER_0: [...hands.PLAYER_0],
    PLAYER_1: [...hands.PLAYER_1],
    PLAYER_2: [...hands.PLAYER_2],
    PLAYER_3: [...hands.PLAYER_3],
  };
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

function assertValidInitialDeal(initialDeal: InitialDeal): void {
  for (const hand of Object.values(initialDeal.hands)) {
    if (hand.length !== 5) {
      throw new Error(
        "Deal completion requires exactly five cards per player.",
      );
    }
  }

  if (initialDeal.remainingDeck.length !== 11) {
    throw new Error(
      "Deal completion requires exactly eleven remaining cards.",
    );
  }

  const allCards = [
    ...initialDeal.hands.PLAYER_0,
    ...initialDeal.hands.PLAYER_1,
    ...initialDeal.hands.PLAYER_2,
    ...initialDeal.hands.PLAYER_3,
    initialDeal.turnUpCard,
    ...initialDeal.remainingDeck,
  ];

  if (allCards.length !== 32) {
    throw new Error("Deal completion requires exactly 32 cards.");
  }

  if (new Set(allCards.map(cardKey)).size !== 32) {
    throw new Error("Deal completion requires 32 unique cards.");
  }
}

export function completeDealAfterTake(
  initialDeal: InitialDeal,
  taker: PlayerPosition,
): CompletedDeal {
  assertValidInitialDeal(initialDeal);

  const hands = cloneInitialHands(initialDeal.hands);
  const distributionOrder = getPlayOrderAfter(initialDeal.dealer);

  hands[taker].push(initialDeal.turnUpCard);

  let remainingIndex = 0;

  for (const player of distributionOrder) {
    const numberOfCards = player === taker ? 2 : 3;

    const packet = initialDeal.remainingDeck.slice(
      remainingIndex,
      remainingIndex + numberOfCards,
    );

    if (packet.length !== numberOfCards) {
      throw new Error(
        "Unexpected end of deck during deal completion.",
      );
    }

    hands[player].push(...packet);
    remainingIndex += numberOfCards;
  }

  if (remainingIndex !== initialDeal.remainingDeck.length) {
    throw new Error(
      "Not all remaining cards were distributed.",
    );
  }

  for (const hand of Object.values(hands)) {
    if (hand.length !== 8) {
      throw new Error(
        "Every player must have exactly eight cards after completion.",
      );
    }
  }

  return Object.freeze({
    dealer: initialDeal.dealer,
    taker,
    hands: freezeHands(hands),
  });
}