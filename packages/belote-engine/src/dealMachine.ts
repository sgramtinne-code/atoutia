import {
  createBeloteState,
  type BeloteEvent,
  type BeloteState,
} from "./belote.js";
import {
  applyBiddingAction,
  createBiddingState,
  type BiddingAction,
  type BiddingState,
} from "./bidding.js";
import type { Card, Suit } from "./cards.js";
import { createDeck } from "./cards.js";
import {
  resolveCompleteDeal,
  type CompleteDealResolution,
} from "./completeDealResult.js";
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
  createLitigeState,
  type LitigeState,
} from "./litige.js";
import {
  nextPlayer,
  type PlayerPosition,
} from "./players.js";
import { Mulberry32Random } from "./random.js";
import {
  playCard,
  type TrickPlayResult,
} from "./trickPlay.js";
import {
  advanceToNextTrick,
  createTrickSequence,
  type CompletedTrick,
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

  readonly litigeState: LitigeState;
  readonly resolution: CompleteDealResolution | null;
}

export interface CreateDealMachineOptions {
  readonly seed: number;
  readonly dealer: PlayerPosition;
  readonly initialDealPattern?: InitialDealPattern;
  readonly litigeState?: LitigeState;
}

export interface DealMachineCardPlayResult {
  readonly state: DealMachineState;
  readonly beloteEvent: BeloteEvent | null;
}

function assertSeed(seed: number): void {
  if (!Number.isInteger(seed)) {
    throw new Error(
      "Deal machine seed must be an integer.",
    );
  }
}

function assertLitigeState(
  state: LitigeState,
): void {
  if (
    !Number.isInteger(state.pendingPoints) ||
    state.pendingPoints < 0
  ) {
    throw new Error(
      "Pending litige points must be a non-negative integer.",
    );
  }
}

export function createDealMachine(
  options: CreateDealMachineOptions,
): DealMachineState {
  assertSeed(options.seed);

  const litigeState =
    options.litigeState ??
    createLitigeState();

  assertLitigeState(litigeState);

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

    litigeState,
    resolution: null,
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

      resolution: null,
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

      resolution: null,
    });
  }

  return Object.freeze({
    ...state,
    bidding,
  });
}

function createSequenceAfterPlay(
  previousSequence: TrickSequenceState,
  playResult: TrickPlayResult,
): TrickSequenceState {
  const sequenceAfterPlay: TrickSequenceState =
    Object.freeze({
      hands: playResult.hands,
      currentTrick: playResult.trick,
      completedTricks:
        previousSequence.completedTricks,
    });

  if (!playResult.trick.completed) {
    return sequenceAfterPlay;
  }

  if (
    previousSequence.completedTricks.length < 7
  ) {
    return advanceToNextTrick(
      sequenceAfterPlay,
    );
  }

  if (playResult.trick.winner === null) {
    throw new Error(
      "A completed final trick must have a winner.",
    );
  }

  const finalCompletedTrick: CompletedTrick =
    Object.freeze({
      leader: playResult.trick.leader,
      winner: playResult.trick.winner,
      trick: playResult.trick,
    });

  return Object.freeze({
    hands: playResult.hands,
    currentTrick: playResult.trick,
    completedTricks: Object.freeze([
      ...previousSequence.completedTricks,
      finalCompletedTrick,
    ]),
  });
}

export function applyDealMachineCardPlay(
  state: DealMachineState,
  player: PlayerPosition,
  card: Card,
): DealMachineCardPlayResult {
  if (state.phase !== "PLAYING") {
    throw new Error(
      "Cards can only be played during the playing phase.",
    );
  }

  if (
    state.trumpSuit === null ||
    state.taker === null ||
    state.belote === null ||
    state.trickSequence === null
  ) {
    throw new Error(
      "Playing phase requires taker, trump, Belote and trick sequence state.",
    );
  }

  const playResult = playCard(
    state.trickSequence.hands,
    state.trickSequence.currentTrick,
    player,
    card,
    state.trumpSuit,
    state.belote,
  );

  const trickSequence =
    createSequenceAfterPlay(
      state.trickSequence,
      playResult,
    );

  const finished =
    trickSequence.completedTricks.length === 8;

  if (finished) {
    const resolution = resolveCompleteDeal(
      trickSequence.completedTricks,
      state.trumpSuit,
      state.taker,
      playResult.beloteState,
      state.litigeState,
    );

    const nextState: DealMachineState =
      Object.freeze({
        ...state,
        phase: "FINISHED",
        belote: playResult.beloteState,
        trickSequence,
        litigeState:
          resolution.litigeResolution
            .nextLitigeState,
        resolution,
      });

    return Object.freeze({
      state: nextState,
      beloteEvent: playResult.beloteEvent,
    });
  }

  const nextState: DealMachineState =
    Object.freeze({
      ...state,
      phase: "PLAYING",
      belote: playResult.beloteState,
      trickSequence,
      resolution: null,
    });

  return Object.freeze({
    state: nextState,
    beloteEvent: playResult.beloteEvent,
  });
}