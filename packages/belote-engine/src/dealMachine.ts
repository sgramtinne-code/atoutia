import type { BiddingState } from "./bidding.js";
import { createBiddingState } from "./bidding.js";
import type { Card } from "./cards.js";
import { createDeck } from "./cards.js";
import {
  createInitialDeal,
  type InitialDeal,
  type InitialDealPattern,
} from "./deal.js";
import { shuffleDeck } from "./deck.js";
import type { PlayerPosition } from "./players.js";
import { Mulberry32Random } from "./random.js";

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
  });
}