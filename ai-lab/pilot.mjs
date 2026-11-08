import assert from "node:assert/strict";
import {
  applyPlayerCommandDocument, cardKey, createDeck, createMatchMachine,
  createPlayerClientSnapshot, createPlayerCommandDocument, CURRENT_MATCH_RULES_VERSION,
  PLAYER_POSITIONS, SUITS,
} from "../packages/belote-engine/dist/index.js";
import { chooseStyledOfflineBot } from "../packages/offline-game/dist/botPolicies.js";
import { chooseOfflineBot } from "../packages/offline-game/dist/index.js";

export const format = "atoutia-card-imitation-v1";
export const styles = ["CAREFUL", "TEAM", "BOLD"];
export const cards = createDeck().map(cardKey);
export const inputSize = 167;
const cardIds = new Map(cards.map((key, index) => [key, index]));

export function cardId(card) {
  const id = cardIds.get(cardKey(card));
  assert(id !== undefined, "Unknown card");
  return id;
}

export function encodeFeatures(snapshot, seat) {
  const { hand, public: table } = snapshot.match;
  const trump = SUITS.indexOf(table.trumpSuit);
  assert(seat >= 1 && seat <= 3 && trump >= 0 && table.currentTrick, "Invalid card-play observation");
  const features = hand.map(cardId);
  features.push(32 + trump, 164 + seat - 1);
  for (const play of table.currentTrick.plays) {
    const relativeSeat = (PLAYER_POSITIONS.indexOf(play.player) - seat + 4) % 4;
    features.push(36 + relativeSeat * 32 + cardId(play.card));
  }
  return features;
}

export function teacher(snapshot, seat) {
  return seat === 0 ? chooseOfflineBot(snapshot) : chooseStyledOfflineBot(snapshot, "varied-v1");
}

export function playMatch(index, chooseCommand, onDealEnd) {
  // Each match receives a block of seeds larger than the action budget.
  let state = createMatchMachine({
    baseSeed: (index + 1) * 32768,
    firstDealer: PLAYER_POSITIONS[index % PLAYER_POSITIONS.length],
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    targetScore: 1000,
  });
  while (!state.score.completed) {
    assert(state.history.length < 2000, "Pilot match exceeded its action budget");
    const deal = state.currentDeal;
    const player = deal.phase === "BIDDING"
      ? deal.bidding.currentPlayer
      : deal.trickSequence?.currentTrick.currentPlayer;
    const seat = PLAYER_POSITIONS.indexOf(player);
    assert(seat >= 0, "Match has no active seat");
    const command = chooseCommand(createPlayerClientSnapshot(state, player), seat);
    assert(command, "Policy has no action");
    const previous = state;
    state = applyPlayerCommandDocument(state, createPlayerCommandDocument(player, command));
    if (onDealEnd && (state.dealNumber !== previous.dealNumber || state.score.completed)) {
      onDealEnd({
        TEAM_0: state.score.scores.TEAM_0 - previous.score.scores.TEAM_0,
        TEAM_1: state.score.scores.TEAM_1 - previous.score.scores.TEAM_1,
      });
    }
  }
  return state.score;
}

export function count(value, option, max) {
  const n = Number(value);
  assert(/^\d+$/.test(value) && Number.isInteger(n) && n >= 1 && n <= max,
    `${option} must be an integer from 1 to ${max}`);
  return n;
}
