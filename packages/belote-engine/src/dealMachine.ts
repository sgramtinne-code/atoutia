import {
  applyBiddingAction,
  createBiddingState,
  type BiddingAction,
  type BiddingState,
} from "./bidding.js";
import {
  createBeloteState,
  type BeloteState,
} from "./belote.js";
import type { Card, Suit } from "./cards.js";
import { createDeck } from "./cards.js";
import {
  createInitialDeal,
  type InitialDeal,
  type InitialDealPattern,
} from "./deal.js";
import {
  completeDealAfterTake,
  type CompletedDeal,
} from "./dealCompletion.js";
import { shuffleDeck } from "./deck.js";
import {
  nextPlayer,
  type PlayerPosition,
} from "./players.js";
import { Mulberry32Random } from "./random.js";
import {
  createTrickSequence,
  type TrickSequenceState,
} from "./trickSequence.js";

export const DEAL_PHASES = [
  "BIDDING",
  "PLAYING",
  "FINISHED",
] as const;

export type DealPhase =
  (typeof DEAL_PHASES)[number];

export interface DealMachineState {
  readonly seed: number;
  readonly dealer: PlayerPosition;
  readonly phase: DealPhase;
  readonly shuffledDeck: readonly Card[];
  readonly initialDeal: InitialDeal;
  readonly bidding: BiddingState;

  readonly completedDeal: CompletedDeal | null;
  readonly taker: PlayerPosition | null;
  readonly trumpSuit: Suit | null;

  readonly belote: BeloteState | null;
  readonly trickSequence: TrickSequenceState | null;
}

export interface CreateDealMachineOptions {
  readonly seed: number;
  readonly dealer: PlayerPosition;
  readonly initialDealPattern?: InitialDealPattern;
}

function assertSeed(seed: number): void {
  if (!Number.isInteger(seed)) {
    throw new Error(
      "Deal machine seed must be an integer.",
    );
  }
}

export function createDealMachine(
  options: CreateDealMachineOptions,
): DealMachineState {
  assertSeed(options.seed);

  const sourceDeck = createDeck();

  const shuffledDeck = shuffleDeck(
    sourceDeck,
    new Mulberry32Random(options.seed),
  );

  const initialDeal = createInitialDeal(
    shuffledDeck,
    options.dealer,
    options.initialDealPattern ??
      "THREE_THEN_TWO",
  );

  const bidding = createBiddingState(
    options.dealer,
    initialDeal.turnUpCard.suit,
  );

  return Object.freeze({
    seed: options.seed,
    dealer: options.dealer,
    phase: "BIDDING",
    shuffledDeck,
    initialDeal,
    bidding,

    completedDeal: null,
    taker: null,
    trumpSuit: null,

    belote: null,
    trickSequence: null,
  });
}

export function applyDealMachineBiddingAction(
  state: DealMachineState,
  action: BiddingAction,
): DealMachineState {
  if (state.phase !== "BIDDING") {
    throw new Error(
      "Bidding actions are only allowed during the bidding phase.",
    );
  }

  const bidding = applyBiddingAction(
    state.bidding,
    action,
  );

  if (bidding.status === "TAKEN") {
    if (
      bidding.taker === null ||
      bidding.trumpSuit === null
    ) {
      throw new Error(
        "Taken bidding must define both taker and trump suit.",
      );
    }

    const completedDeal = completeDealAfterTake(
      state.initialDeal,
      bidding.taker,
    );

    const belote = createBeloteState(
      completedDeal.hands,
      bidding.trumpSuit,
    );

    const firstLeader = nextPlayer(
      state.dealer,
    );

    const trickSequence = createTrickSequence(
      completedDeal.hands,
      firstLeader,
    );

    return Object.freeze({
      ...state,
      phase: "PLAYING",
      bidding,

      completedDeal,
      taker: bidding.taker,
      trumpSuit: bidding.trumpSuit,

      belote,
      trickSequence,
    });
  }

  if (bidding.status === "ALL_PASSED") {
    return Object.freeze({
      ...state,
      phase: "FINISHED",
      bidding,

      completedDeal: null,
      taker: null,
      trumpSuit: null,

      belote: null,
      trickSequence: null,
    });
  }

  return Object.freeze({
    ...state,
    bidding,
  });
}