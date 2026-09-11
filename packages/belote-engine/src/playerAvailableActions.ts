import type {
  BiddingAction,
} from "./bidding.js";
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

export const PLAYER_ACTION_MODES = [
  "WAIT",
  "BID",
  "PLAY_CARD",
  "MATCH_FINISHED",
] as const;

export type PlayerActionMode =
  (typeof PLAYER_ACTION_MODES)[number];

export interface PlayerAvailableActions {
  readonly player: PlayerPosition;
  readonly mode: PlayerActionMode;
  readonly biddingActions:
    readonly BiddingAction[];
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

function freezeBiddingAction(
  action: BiddingAction,
): BiddingAction {
  if (action.type === "PASS") {
    return Object.freeze({
      type: "PASS",
      player: action.player,
    });
  }

  return Object.freeze({
    type: "TAKE",
    player: action.player,
    suit: action.suit,
  });
}

function createBiddingActions(
  state: MatchMachineState,
  player: PlayerPosition,
): readonly BiddingAction[] {
  const bidding =
    state.currentDeal.bidding;

  if (
    state.currentDeal.phase !==
      "BIDDING" ||
    bidding.currentPlayer !==
      player
  ) {
    return Object.freeze([]);
  }

  const actions: BiddingAction[] = [
    {
      type: "PASS",
      player,
    },
  ];

  if (bidding.round === "FIRST") {
    actions.push({
      type: "TAKE",
      player,
      suit:
        state.currentDeal.initialDeal
          .turnUpCard.suit,
    });
  } else {
    for (const suit of [
      "CLUBS",
      "DIAMONDS",
      "HEARTS",
      "SPADES",
    ] as const) {
      if (
        suit !==
        state.currentDeal.initialDeal
          .turnUpCard.suit
      ) {
        actions.push({
          type: "TAKE",
          player,
          suit,
        });
      }
    }
  }

  return Object.freeze(
    actions.map(
      freezeBiddingAction,
    ),
  );
}

function createLegalPlayerCards(
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

export function createPlayerAvailableActions(
  state: MatchMachineState,
  player: PlayerPosition,
): PlayerAvailableActions {
  if (state.score.completed) {
    return Object.freeze({
      player,
      mode: "MATCH_FINISHED",
      biddingActions:
        Object.freeze([]),
      legalCards:
        Object.freeze([]),
    });
  }

  if (
    state.currentDeal.phase ===
      "BIDDING" &&
    state.currentDeal.bidding
      .currentPlayer === player
  ) {
    return Object.freeze({
      player,
      mode: "BID",
      biddingActions:
        createBiddingActions(
          state,
          player,
        ),
      legalCards:
        Object.freeze([]),
    });
  }

  if (
    state.currentDeal.phase ===
      "PLAYING" &&
    state.currentDeal.trickSequence
      ?.currentTrick.currentPlayer ===
      player
  ) {
    return Object.freeze({
      player,
      mode: "PLAY_CARD",
      biddingActions:
        Object.freeze([]),
      legalCards:
        createLegalPlayerCards(
          state,
          player,
        ),
    });
  }

  return Object.freeze({
    player,
    mode: "WAIT",
    biddingActions:
      Object.freeze([]),
    legalCards:
      Object.freeze([]),
  });
}