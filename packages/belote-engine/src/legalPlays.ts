import type { Card, Suit } from "./cards.js";
import { getCardStrength } from "./cardRules.js";
import type { PlayerPosition } from "./players.js";
import {
  getTrickWinner,
  type PlayedCard,
} from "./trick.js";

function arePartners(
  first: PlayerPosition,
  second: PlayerPosition,
): boolean {
  return (
    (first === "PLAYER_0" && second === "PLAYER_2") ||
    (first === "PLAYER_2" && second === "PLAYER_0") ||
    (first === "PLAYER_1" && second === "PLAYER_3") ||
    (first === "PLAYER_3" && second === "PLAYER_1")
  );
}

function freezeCards(cards: readonly Card[]): readonly Card[] {
  return Object.freeze([...cards]);
}

function getHigherTrumps(
  cards: readonly Card[],
  trumpSuit: Suit,
  currentWinningTrump: Card,
): readonly Card[] {
  return cards.filter(
    (card) =>
      card.suit === trumpSuit &&
      getCardStrength(card, trumpSuit) >
        getCardStrength(currentWinningTrump, trumpSuit),
  );
}

function assertPlayerHasNotAlreadyPlayed(
  player: PlayerPosition,
  plays: readonly PlayedCard[],
): void {
  if (plays.some((play) => play.player === player)) {
    throw new Error(
      "Player has already played a card in this trick.",
    );
  }
}

export function getLegalCards(
  hand: readonly Card[],
  player: PlayerPosition,
  plays: readonly PlayedCard[],
  trumpSuit: Suit,
): readonly Card[] {
  if (hand.length === 0) {
    return Object.freeze([]);
  }

  assertPlayerHasNotAlreadyPlayed(player, plays);

  if (plays.length === 0) {
    return freezeCards(hand);
  }

  const firstPlay = plays[0];

  if (firstPlay === undefined) {
    throw new Error("Unable to determine the led suit.");
  }

  const ledSuit = firstPlay.card.suit;
  const cardsOfLedSuit = hand.filter(
    (card) => card.suit === ledSuit,
  );

  /*
   * The player can follow the requested suit.
   */
  if (cardsOfLedSuit.length > 0) {
    /*
     * If trump itself was led, the player must overtrump
     * whenever a higher trump is available.
     */
    if (ledSuit === trumpSuit) {
      const winner = getTrickWinner(plays, trumpSuit);

      const higherTrumps = getHigherTrumps(
        cardsOfLedSuit,
        trumpSuit,
        winner.card,
      );

      if (higherTrumps.length > 0) {
        return freezeCards(higherTrumps);
      }
    }

    return freezeCards(cardsOfLedSuit);
  }

  /*
   * The player cannot follow the requested suit.
   */
  const winner = getTrickWinner(plays, trumpSuit);

  /*
   * If the partner is currently winning the trick,
   * the player may discard or trump freely.
   */
  if (arePartners(player, winner.player)) {
    return freezeCards(hand);
  }

  const trumps = hand.filter(
    (card) => card.suit === trumpSuit,
  );

  /*
   * No requested suit and no trump:
   * any card may be discarded.
   */
  if (trumps.length === 0) {
    return freezeCards(hand);
  }

  /*
   * No trump has yet been played in this trick.
   * The player must cut.
   */
  if (winner.card.suit !== trumpSuit) {
    return freezeCards(trumps);
  }

  /*
   * A trump is already winning.
   * The player must overtrump if possible.
   */
  const higherTrumps = getHigherTrumps(
    trumps,
    trumpSuit,
    winner.card,
  );

  if (higherTrumps.length > 0) {
    return freezeCards(higherTrumps);
  }

  /*
   * No higher trump exists.
   * Undertrumping is therefore legal, but the player
   * must still play a trump.
   */
  return freezeCards(trumps);
}