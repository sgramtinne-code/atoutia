import type {
  Card,
} from "./cards.js";
import {
  getLegalCards,
} from "./legalPlays.js";
import type {
  MatchMachineState,
} from "./matchMachine.js";
import type {
  PlayerPosition,
} from "./players.js";
import {
  createPublicMatchSnapshot,
  type PublicMatchSnapshot,
} from "./publicMatchSnapshot.js";

export interface PlayerMatchSnapshot {
  readonly public: PublicMatchSnapshot;

  readonly player:
    PlayerPosition;

  readonly hand:
    readonly Card[];

  readonly legalCards:
    readonly Card[];
}

function cloneCard(
  card: Card,
): Card {
  return Object.freeze({
    suit: card.suit,
    rank: card.rank,
  });
}

function createPlayerHand(
  state: MatchMachineState,
  player: PlayerPosition,
): readonly Card[] {
  const completedDeal =
    state.currentDeal.completedDeal;

  if (completedDeal === null) {
    return Object.freeze([]);
  }

  return Object.freeze(
    completedDeal.hands[player].map(
      cloneCard,
    ),
  );
}

function createLegalCards(
  state: MatchMachineState,
  player: PlayerPosition,
): readonly Card[] {
  if (
    state.currentDeal.phase !==
      "PLAYING" ||
    state.currentDeal.trickSequence ===
      null ||
    state.currentDeal.trumpSuit ===
      null
  ) {
    return Object.freeze([]);
  }

  const sequence =
    state.currentDeal.trickSequence;

  if (
    sequence.currentTrick.currentPlayer !==
    player
  ) {
    return Object.freeze([]);
  }

  return Object.freeze(
    getLegalCards(
      sequence.hands[player],
      player,
      sequence.currentTrick.plays,
      state.currentDeal.trumpSuit,
    ).map(
      cloneCard,
    ),
  );
}

export function createPlayerMatchSnapshot(
  state: MatchMachineState,
  player: PlayerPosition,
): PlayerMatchSnapshot {
  return Object.freeze({
    public:
      createPublicMatchSnapshot(
        state,
      ),

    player,

    hand:
      createPlayerHand(
        state,
        player,
      ),

    legalCards:
      createLegalCards(
        state,
        player,
      ),
  });
}