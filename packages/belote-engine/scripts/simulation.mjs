import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { isDeepStrictEqual } from "node:util";

import {
  BELOTE_ENGINE_VERSION,
  Mulberry32Random,
  PLAYER_POSITIONS,
  applyMatchBiddingAction,
  applyMatchCardPlay,
  cardKey,
  createDeck,
  createMatchMachine,
  getAllowedTrumpSuits,
  getCardPoints,
  getLegalCards,
  getTrickWinner,
  nextPlayer,
  replayMatch,
} from "../dist/index.js";

export const SEED_STRIDE = 16777619;
export const DEFAULT_OPTIONS = Object.freeze({
  matches: 1000,
  startSeed: 20261028,
  maxActionsPerMatch: 20000,
  maxDurationMs: 120000,
});

const TARGET_SCORE = 1000;
const DECK_KEYS = new Set(createDeck().map(cardKey));
const sum = (points) => points.TEAM_0 + points.TEAM_1;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

class BudgetExceeded extends Error {}

function integer(value, name, min, max) {
  assert(Number.isSafeInteger(value) && value >= min && value <= max,
    name + " must be an integer between " + min + " and " + max + ".");
}

export function validateOptions(options = {}) {
  for (const key of Object.keys(options)) {
    assert(Object.hasOwn(DEFAULT_OPTIONS, key), "Unknown option: " + key);
  }
  const config = { ...DEFAULT_OPTIONS, ...options };
  integer(config.matches, "matches", 1, 1000000);
  integer(config.startSeed, "startSeed", 0, 0xffffffff);
  integer(config.maxActionsPerMatch, "maxActionsPerMatch", 1, 100000);
  integer(config.maxDurationMs, "maxDurationMs", 1, 86400000);
  return config;
}

export function seedAt(startSeed, index) {
  return (startSeed + Math.imul(index, SEED_STRIDE)) >>> 0;
}

function assertDeckPartition(cards) {
  const keys = cards.map(cardKey);
  assert.equal(keys.length, 32, "Card partition must contain exactly 32 cards.");
  assert.equal(new Set(keys).size, 32, "Card partition must contain 32 distinct cards.");
  assert(keys.every((key) => DECK_KEYS.has(key)), "Card partition contains an unknown card.");
}

function assertTrick(trick, trumpSuit) {
  let expectedPlayer = trick.leader;
  for (const play of trick.plays) {
    assert.equal(play.player, expectedPlayer, "Trick players must follow the turn order.");
    expectedPlayer = nextPlayer(expectedPlayer);
  }
  assert(trick.plays.length <= 4, "A trick cannot contain more than four cards.");
  assert.equal(trick.completed, trick.plays.length === 4, "Trick completion disagrees with its cards.");
  if (trick.completed) {
    assert.deepEqual(trick.winner, getTrickWinner(trick.plays, trumpSuit), "Trick winner is inconsistent.");
    assert.equal(trick.currentPlayer, trick.winner.player, "Completed trick must retain its winner.");
  } else {
    assert.equal(trick.winner, null, "An incomplete trick cannot have a final winner.");
    assert.equal(trick.currentPlayer, expectedPlayer, "Wrong current player in trick.");
  }
}

// Test harness only: inspect authoritative states without implementing a second game engine.
export function assertMatchState(state) {
  const deal = state.currentDeal;
  integer(state.dealNumber, "dealNumber", 1, 100001);
  assert.equal(deal.seed, state.baseSeed + state.dealNumber - 1, "Deal seed progression is inconsistent.");
  assert.equal(deal.dealer, state.dealer, "Match/deal dealer mismatch.");
  assert.equal(state.score.targetScore, TARGET_SCORE, "Campaign must use full 1000-point matches.");
  for (const points of Object.values(state.score.scores)) integer(points, "score", 0, Number.MAX_SAFE_INTEGER);
  integer(state.litigeState.pendingPoints, "pendingPoints", 0, Number.MAX_SAFE_INTEGER);
  const { TEAM_0: a, TEAM_1: b } = state.score.scores;
  const winner = Math.max(a, b) >= TARGET_SCORE && a !== b ? (a > b ? "TEAM_0" : "TEAM_1") : null;
  assert.equal(state.score.winner, winner, "Match winner disagrees with scores.");
  assert.equal(state.score.completed, winner !== null, "Match completion disagrees with winner.");
  assertDeckPartition(deal.shuffledDeck);

  if (deal.phase === "BIDDING") {
    for (const hand of Object.values(deal.initialDeal.hands)) assert.equal(hand.length, 5, "Initial hands require five cards.");
    assertDeckPartition([
      ...Object.values(deal.initialDeal.hands).flat(),
      deal.initialDeal.turnUpCard,
      ...deal.initialDeal.remainingDeck,
    ]);
    assert.equal(deal.trickSequence, null);
    assert.equal(deal.resolution, null);
    return;
  }

  assert(deal.phase === "PLAYING" || deal.phase === "FINISHED", "Unknown deal phase.");
  const sequence = deal.trickSequence;
  assert(sequence !== null && deal.trumpSuit !== null, "Playing/finished deal needs a card sequence and trump.");
  const finished = deal.phase === "FINISHED";
  assert(sequence.completedTricks.length <= 8, "A deal cannot exceed eight tricks.");
  assert.equal(sequence.completedTricks.length === 8, finished, "Finished deal must have eight tricks.");
  let leader = nextPlayer(deal.dealer);
  for (const entry of sequence.completedTricks) {
    assert.equal(entry.leader, leader, "Each winner must lead the next trick.");
    assert.equal(entry.trick.leader, leader);
    assertTrick(entry.trick, deal.trumpSuit);
    assert(entry.trick.completed, "Recorded trick is not complete.");
    assert.deepEqual(entry.winner, entry.trick.winner);
    leader = entry.winner.player;
  }
  if (finished) {
    assert.deepEqual(sequence.currentTrick, sequence.completedTricks[7].trick, "Final trick must appear exactly once in the completed sequence.");
  } else {
    assert.equal(sequence.currentTrick.leader, leader);
    assertTrick(sequence.currentTrick, deal.trumpSuit);
    assert(!sequence.currentTrick.completed, "Playing phase cannot retain a completed trick.");
  }
  const currentPlays = finished ? [] : sequence.currentTrick.plays;
  for (const player of PLAYER_POSITIONS) {
    const expected = 8 - sequence.completedTricks.length - Number(currentPlays.some((play) => play.player === player));
    assert.equal(sequence.hands[player].length, expected, "Remaining hand size disagrees with played cards.");
  }
  assertDeckPartition([
    ...Object.values(sequence.hands).flat(),
    ...sequence.completedTricks.flatMap((entry) => entry.trick.plays.map((play) => play.card)),
    ...currentPlays.map((play) => play.card),
  ]);
}

function assertRejectedWithoutMutation(state, action, totals) {
  const before = JSON.stringify(state);
  assert.throws(action, "An illegal action was accepted.");
  assert.equal(JSON.stringify(state), before, "Rejected action mutated the original state.");
  totals.illegalActionsRejected += 1;
}

function emptyTotals() {
  return {
    actions: 0, cardPlays: 0, playedDeals: 0, allPassDeals: 0,
    firstRoundTakes: 0, secondRoundTakes: 0,
    contractsMade: 0, contractsFailed: 0, litiges: 0, capots: 0, belotes: 0,
    illegalActionsRejected: 0, replaysVerified: 0,
    dealer_PLAYER_0: 0, dealer_PLAYER_1: 0, dealer_PLAYER_2: 0, dealer_PLAYER_3: 0,
    trump_CLUBS: 0, trump_DIAMONDS: 0, trump_HEARTS: 0, trump_SPADES: 0,
    winner_TEAM_0: 0, winner_TEAM_1: 0,
  };
}

function verifyFinishedDeal(previous, result, next, totals) {
  const deal = result.state;
  const resolution = deal.resolution;
  assert(resolution !== null);
  assert.equal(sum(resolution.rawTrickPoints), 162, "Raw trick points must total 162 before capot adjustment.");
  const playedCards = deal.trickSequence.completedTricks.flatMap((entry) => entry.trick.plays.map((play) => play.card));
  assert.equal(playedCards.reduce((total, card) => total + getCardPoints(card, deal.trumpSuit), 0), 152);
  const belotePoints = deal.belote.eligiblePlayer === null ? 0 : 20;
  assert.equal(deal.belote.points, belotePoints, "Full deal must complete an eligible Belote.");
  assert.deepEqual(deal.belote.events.map((event) => event.type), belotePoints ? ["BELOTE", "REBELOTE"] : []);
  const availablePoints = (resolution.capot.isCapot ? 252 : 162) + belotePoints + previous.litigeState.pendingPoints;
  assert.equal(sum(resolution.finalAwardedPoints) + deal.litigeState.pendingPoints, availablePoints, "Awarded and pending points are not conserved.");
  for (const team of ["TEAM_0", "TEAM_1"]) {
    assert.equal(next.score.scores[team], previous.score.scores[team] + resolution.finalAwardedPoints[team], "Match score did not receive the deal award.");
  }
  assert.deepEqual(next.litigeState, deal.litigeState, "Match must retain resulting litige state.");
  totals.playedDeals += 1;
  totals.litiges += Number(resolution.dealResult.status === "LITIGE");
  totals.contractsMade += Number(resolution.dealResult.status === "CONTRACT_MADE");
  totals.contractsFailed += Number(resolution.dealResult.status === "CONTRACT_FAILED");
  totals.capots += Number(resolution.capot.isCapot);
  totals.belotes += Number(belotePoints === 20);
}

function simulateMatch(config, baseSeed, context, checkBudget) {
  const firstDealer = PLAYER_POSITIONS[baseSeed % 4];
  const random = new Mulberry32Random(baseSeed ^ 0x5bd1e995);
  const totals = emptyTotals();
  totals["dealer_" + firstDealer] += 1;
  let state = createMatchMachine({ baseSeed, firstDealer, targetScore: TARGET_SCORE });
  let takeAt = Math.floor(random.next() * 9); // 0..7: take at this bid; 8: all pass.
  let bidIndex = 0;
  let checkedCardRejection = false;
  assertMatchState(state);
  assertRejectedWithoutMutation(state, () => applyMatchBiddingAction(state, {
    type: "PASS", player: nextPlayer(state.currentDeal.bidding.currentPlayer),
  }), totals);

  while (!state.score.completed) {
    context.state = state;
    context.actions = totals.actions;
    checkBudget();
    assert(totals.actions < config.maxActionsPerMatch, "Match action limit exceeded.");
    const previous = state;
    let playedResult = null;

    if (state.currentDeal.phase === "BIDDING") {
      const bidding = state.currentDeal.bidding;
      const action = bidIndex === takeAt ? {
        type: "TAKE", player: bidding.currentPlayer,
        suit: getAllowedTrumpSuits(bidding)[Math.floor(random.next() * getAllowedTrumpSuits(bidding).length)],
      } : { type: "PASS", player: bidding.currentPlayer };
      context.lastAction = action;
      state = applyMatchBiddingAction(state, action);
      bidIndex += 1;
      if (action.type === "TAKE") {
        totals[bidding.round === "FIRST" ? "firstRoundTakes" : "secondRoundTakes"] += 1;
        totals["trump_" + action.suit] += 1;
        assert.equal(state.currentDeal.trickSequence.currentTrick.leader, nextPlayer(state.dealer));
      }
    } else {
      const deal = state.currentDeal;
      assert.equal(deal.phase, "PLAYING", "Non-completed match cannot stall in FINISHED.");
      const sequence = deal.trickSequence;
      const player = sequence.currentTrick.currentPlayer;
      const legal = getLegalCards(sequence.hands[player], player, sequence.currentTrick.plays, deal.trumpSuit);
      assert(legal.length > 0, "Current player has no legal card.");
      if (!checkedCardRejection) {
        const absentCard = createDeck().find((card) => !sequence.hands[player].some((held) => cardKey(card) === cardKey(held)));
        assertRejectedWithoutMutation(state, () => applyMatchCardPlay(state, player, absentCard), totals);
        checkedCardRejection = true;
      }
      const card = legal[Math.floor(random.next() * legal.length)];
      context.lastAction = { type: "PLAY_CARD", player, card };
      playedResult = applyMatchCardPlay(state, player, card);
      state = playedResult.state;
      totals.cardPlays += 1;
      // The match may already contain the NEXT deal: validate the finished deal too.
      assertMatchState({ ...state, dealer: previous.dealer, dealNumber: previous.dealNumber, currentDeal: playedResult.dealPlay.state });
      if (playedResult.dealPlay.state.phase === "FINISHED") verifyFinishedDeal(previous, playedResult.dealPlay, state, totals);
    }

    totals.actions += 1;
    context.state = state;
    context.actions = totals.actions;
    assert.equal(state.history.length, previous.history.length + 1, "Each action must append exactly one history event.");
    const event = state.history.at(-1);
    assert.equal(event.index, totals.actions - 1);
    assert.equal(event.dealNumber, previous.dealNumber);
    if (state.dealNumber !== previous.dealNumber) {
      assert.equal(state.dealNumber, previous.dealNumber + 1);
      assert.equal(state.dealer, nextPlayer(previous.dealer), "Dealer must rotate after a deal.");
      if (playedResult === null) {
        assert.equal(bidIndex, 8, "An all-pass deal requires eight passes.");
        assert.deepEqual(state.score, previous.score, "All-pass deal changed the match score.");
        assert.deepEqual(state.litigeState, previous.litigeState, "All-pass deal changed pending points.");
        totals.allPassDeals += 1;
      }
      bidIndex = 0;
      takeAt = Math.floor(random.next() * 9);
    }
    assertMatchState(state);
  }

  checkBudget();
  const replayed = replayMatch({ baseSeed, firstDealer, targetScore: TARGET_SCORE, history: state.history });
  assert(isDeepStrictEqual(replayed, state), "Replay did not reconstruct the complete match identically.");
  checkBudget();
  totals.replaysVerified += 1;
  totals["winner_" + state.score.winner] += 1;
  assert.equal(totals.cardPlays, totals.playedDeals * 32);
  assert.equal(totals.playedDeals + totals.allPassDeals, state.dealNumber);
  return { totals, digest: hash({ baseSeed, firstDealer, history: state.history, score: state.score, litigeState: state.litigeState }) };
}

export function runCampaign(options = {}, { now = () => performance.now(), onProgress = () => {} } = {}) {
  const config = validateOptions(options);
  const started = now();
  const checkBudget = () => {
    if (now() - started >= config.maxDurationMs) throw new BudgetExceeded("Campaign time budget exhausted.");
  };
  const report = {
    formatVersion: 1, harnessVersion: "seeded-legal-v1", engineVersion: BELOTE_ENGINE_VERSION,
    nodeVersion: process.version,
    targetScore: TARGET_SCORE, seedStride: SEED_STRIDE, config,
    status: "PASSED", matchesCompleted: 0, totals: emptyTotals(), transcriptSha256: null,
    failure: null, incomplete: null, elapsedMs: 0,
  };
  const transcript = createHash("sha256");
  for (let index = 0; index < config.matches; index += 1) {
    const baseSeed = seedAt(config.startSeed, index);
    const context = { baseSeed, matchIndex: index, actions: 0, lastAction: null, state: null };
    try {
      checkBudget();
      const result = simulateMatch(config, baseSeed, context, checkBudget);
      for (const key of Object.keys(report.totals)) report.totals[key] += result.totals[key];
      transcript.update(String(baseSeed) + ":" + result.digest + "\n");
      report.matchesCompleted += 1;
      if (report.matchesCompleted % 100 === 0) onProgress(report.matchesCompleted);
    } catch (error) {
      if (error instanceof BudgetExceeded) {
        report.status = "INCOMPLETE";
        report.incomplete = { baseSeed, matchIndex: index, actions: context.actions, reason: error.message };
      } else {
        report.status = "FAILED";
        report.failure = {
          baseSeed, matchIndex: index, actions: context.actions,
          dealNumber: context.state?.dealNumber ?? 1,
          reason: error instanceof Error ? error.message : String(error),
          lastAction: context.lastAction, history: context.state?.history ?? [],
        };
      }
      break;
    }
  }
  report.transcriptSha256 = transcript.digest("hex");
  report.elapsedMs = Math.round(now() - started);
  return report;
}
