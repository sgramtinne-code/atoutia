import type { Suit } from "./cards.js";
import type {
  DealPhase,
} from "./dealMachine.js";
import type {
  MatchMachineState,
} from "./matchMachine.js";
import type {
  Team,
  TeamPoints,
} from "./scoring.js";
import type {
  PlayedCard,
} from "./trick.js";
import type {
  PlayerPosition,
} from "./players.js";

export interface PublicMatchScoreSnapshot {
  readonly targetScore: number;
  readonly scores: TeamPoints;
  readonly completed: boolean;
  readonly winner: Team | null;
}

export interface PublicCurrentTrickSnapshot {
  readonly currentPlayer: PlayerPosition;
  readonly plays: readonly PlayedCard[];
}

export interface PublicMatchSnapshot {
  readonly dealNumber: number;
  readonly dealer: PlayerPosition;
  readonly phase: DealPhase;

  readonly score: PublicMatchScoreSnapshot;

  readonly biddingPlayer:
    | PlayerPosition
    | null;

  readonly taker:
    | PlayerPosition
    | null;

  readonly trumpSuit:
    | Suit
    | null;

  readonly turnUpCard: Readonly<{
    suit: Suit;
    rank:
      MatchMachineState["currentDeal"]["initialDeal"]["turnUpCard"]["rank"];
  }>;

  readonly currentTrick:
    | PublicCurrentTrickSnapshot
    | null;
}

function createPublicScoreSnapshot(
  state: MatchMachineState,
): PublicMatchScoreSnapshot {
  return Object.freeze({
    targetScore:
      state.score.targetScore,

    scores: Object.freeze({
      TEAM_0:
        state.score.scores.TEAM_0,

      TEAM_1:
        state.score.scores.TEAM_1,
    }),

    completed:
      state.score.completed,

    winner:
      state.score.winner,
  });
}

function createPublicCurrentTrickSnapshot(
  state: MatchMachineState,
): PublicCurrentTrickSnapshot | null {
  const sequence =
    state.currentDeal.trickSequence;

  if (sequence === null) {
    return null;
  }

  const plays =
    sequence.currentTrick.plays.map(
      (play) =>
        Object.freeze({
          player: play.player,
          card: Object.freeze({
            suit: play.card.suit,
            rank: play.card.rank,
          }),
        }),
    );

  return Object.freeze({
    currentPlayer:
      sequence.currentTrick.currentPlayer,

    plays: Object.freeze(plays),
  });
}

export function createPublicMatchSnapshot(
  state: MatchMachineState,
): PublicMatchSnapshot {
  const biddingPlayer =
    state.currentDeal.phase ===
    "BIDDING"
      ? state.currentDeal.bidding
          .currentPlayer
      : null;

  const turnUpCard =
    state.currentDeal.initialDeal
      .turnUpCard;

  return Object.freeze({
    dealNumber:
      state.dealNumber,

    dealer:
      state.dealer,

    phase:
      state.currentDeal.phase,

    score:
      createPublicScoreSnapshot(
        state,
      ),

    biddingPlayer,

    taker:
      state.currentDeal.taker,

    trumpSuit:
      state.currentDeal.trumpSuit,

    turnUpCard:
      Object.freeze({
        suit: turnUpCard.suit,
        rank: turnUpCard.rank,
      }),

    currentTrick:
      createPublicCurrentTrickSnapshot(
        state,
      ),
  });
}