export {
  RANKS,
  SUITS,
  cardKey,
  createCard,
  createDeck,
  type Card,
  type Rank,
  type Suit,
} from "./cards.js";

export {
  compareSameSuitCards,
  getCardPoints,
  getCardStrength,
  isTrump,
} from "./cardRules.js";

export {
  BELOTE_EVENTS,
  applyBeloteCardPlayed,
  createBeloteState,
  type BeloteEvent,
  type BeloteEventType,
  type BelotePlayResult,
  type BeloteState,
} from "./belote.js";

export {
  BIDDING_ROUNDS,
  applyBiddingAction,
  createBiddingState,
  getAllowedTrumpSuits,
  type BiddingAction,
  type BiddingRound,
  type BiddingState,
  type BiddingStatus,
} from "./bidding.js";

export {
  CAPOT_POINTS,
  applyCapotPoints,
  detectCapot,
  type CapotResult,
} from "./capot.js";

export {
  resolveCompleteDeal,
  type CompleteDealResolution,
} from "./completeDealResult.js";

export { shuffleDeck } from "./deck.js";

export {
  INITIAL_DEAL_PATTERNS,
  createInitialDeal,
  type InitialDeal,
  type InitialDealPattern,
  type PlayerHands,
} from "./deal.js";

export {
  completeDealAfterTake,
  type CompletedDeal,
} from "./dealCompletion.js";

export {
  DEAL_PHASES,
  applyDealMachineBiddingAction,
  createDealMachine,
  type CreateDealMachineOptions,
  type DealMachineState,
  type DealPhase,
} from "./dealMachine.js";

export {
  DEAL_RESULTS,
  resolveDealResult,
  type BeloteBonus,
  type DealResult,
  type DealResultStatus,
} from "./dealResult.js";

export { getLegalCards } from "./legalPlays.js";

export {
  createLitigeState,
  resolveLitigeForDeal,
  type LitigeResolution,
  type LitigeState,
} from "./litige.js";

export {
  addDealPointsToMatch,
  createMatchScoreState,
  type MatchScoreState,
} from "./matchScore.js";

export {
  PLAYER_POSITIONS,
  getPlayOrderAfter,
  nextPlayer,
  type PlayerPosition,
} from "./players.js";

export {
  Mulberry32Random,
  type RandomSource,
} from "./random.js";

export {
  TEAMS,
  getCompletedTrickPoints,
  getPlayerTeam,
  scoreCompletedDealTricks,
  type Team,
  type TeamPoints,
} from "./scoring.js";

export {
  getTrickWinner,
  type PlayedCard,
  type TrickWinner,
} from "./trick.js";

export {
  createTrickState,
  playCard,
  type TrickPlayResult,
  type TrickState,
} from "./trickPlay.js";

export {
  advanceToNextTrick,
  createTrickSequence,
  type CompletedTrick,
  type TrickSequenceState,
} from "./trickSequence.js";

export const BELOTE_ENGINE_VERSION = "0.1.0";