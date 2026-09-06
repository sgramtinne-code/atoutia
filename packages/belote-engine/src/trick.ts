import type { Card, Suit } from "./cards.js";
import { getCardStrength } from "./cardRules.js";
import type { PlayerPosition } from "./players.js";

export interface PlayedCard {
  readonly player: PlayerPosition;
  readonly card: Card;
}

export interface TrickWinner {
  readonly player: PlayerPosition;
  readonly card: Card;
  readonly playIndex: number;
}

function doesCardBeat(
  challenger: Card,
  currentWinner: Card,
  ledSuit: Suit,
  trumpSuit: Suit,
): boolean {
  const challengerIsTrump = challenger.suit === trumpSuit;
  const winnerIsTrump = currentWinner.suit === trumpSuit;

  if (challengerIsTrump && !winnerIsTrump) {
    return true;
  }

  if (!challengerIsTrump && winnerIsTrump) {
    return false;
  }

  if (challengerIsTrump && winnerIsTrump) {
    return (
      getCardStrength(challenger, trumpSuit) >
      getCardStrength(currentWinner, trumpSuit)
    );
  }

  const challengerFollowsLedSuit = challenger.suit === ledSuit;
  const winnerFollowsLedSuit = currentWinner.suit === ledSuit;

  if (challengerFollowsLedSuit && !winnerFollowsLedSuit) {
    return true;
  }

  if (!challengerFollowsLedSuit && winnerFollowsLedSuit) {
    return false;
  }

  if (!challengerFollowsLedSuit && !winnerFollowsLedSuit) {
    return false;
  }

  return (
    getCardStrength(challenger, trumpSuit) >
    getCardStrength(currentWinner, trumpSuit)
  );
}

function assertValidPlays(plays: readonly PlayedCard[]): void {
  if (plays.length === 0) {
    throw new Error("A trick must contain at least one played card.");
  }

  if (plays.length > 4) {
    throw new Error("A trick cannot contain more than four played cards.");
  }

  const players = new Set(plays.map((play) => play.player));

  if (players.size !== plays.length) {
    throw new Error("A player cannot play more than once in the same trick.");
  }
}

export function getTrickWinner(
  plays: readonly PlayedCard[],
  trumpSuit: Suit,
): TrickWinner {
  assertValidPlays(plays);

  const firstPlay = plays[0];

  if (firstPlay === undefined) {
    throw new Error("Unable to determine the first played card.");
  }

  const ledSuit = firstPlay.card.suit;

  let winningPlay = firstPlay;
  let winningIndex = 0;

  for (let index = 1; index < plays.length; index += 1) {
    const challenger = plays[index];

    if (challenger === undefined) {
      throw new Error("Invalid trick state.");
    }

    if (
      doesCardBeat(
        challenger.card,
        winningPlay.card,
        ledSuit,
        trumpSuit,
      )
    ) {
      winningPlay = challenger;
      winningIndex = index;
    }
  }

  return Object.freeze({
    player: winningPlay.player,
    card: winningPlay.card,
    playIndex: winningIndex,
  });
}