import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import {
  applyPlayerCommandDocument,
  BELOTE_ENGINE_VERSION,
  cardKey,
  createDeck,
  createMatchMachine,
  createPlayerClientSnapshot,
  createPlayerCommandDocument,
  CURRENT_MATCH_RULES_VERSION,
  PLAYER_POSITIONS,
  SUITS,
} from "../packages/belote-engine/dist/index.js";
import { chooseStyledOfflineBot } from "../packages/offline-game/dist/botPolicies.js";
import { chooseOfflineBot } from "../packages/offline-game/dist/index.js";

const styles = ["CAREFUL", "TEAM", "BOLD"];
const cards = createDeck().map(cardKey);
const cardIds = new Map(cards.map((key, index) => [key, index]));
const maxActions = 2000;
const maxRows = 100000;
const seedStride = 32768;

function cardId(card) {
  const id = cardIds.get(cardKey(card));
  assert(id !== undefined, "Unknown card");
  return id;
}

function encode(snapshot, command, seat) {
  const { hand, public: table } = snapshot.match;
  const trump = SUITS.indexOf(table.trumpSuit);
  assert(trump >= 0 && table.currentTrick, "Card play requires a trump and current trick");
  const features = hand.map(cardId);
  features.push(32 + trump, 164 + seat - 1);
  for (const play of table.currentTrick.plays) {
    const relativeSeat = (PLAYER_POSITIONS.indexOf(play.player) - seat + 4) % 4;
    features.push(36 + relativeSeat * 32 + cardId(play.card));
  }
  const legal = snapshot.actions.legalCards.map(cardId);
  const target = cardId(command.card);
  assert(legal.includes(target), "Teacher chose a card outside the legal mask");
  return [features, legal, target];
}

function generateSplit(firstIndex, matches) {
  const rows = [];
  for (let index = firstIndex; index < firstIndex + matches; index++) {
    let state = createMatchMachine({
      baseSeed: (index + 1) * seedStride,
      firstDealer: PLAYER_POSITIONS[index % PLAYER_POSITIONS.length],
      rulesVersion: CURRENT_MATCH_RULES_VERSION,
      targetScore: 1000,
    });
    while (!state.score.completed) {
      assert(state.history.length < maxActions, "Pilot match exceeded its action budget");
      const deal = state.currentDeal;
      const player = deal.phase === "BIDDING"
        ? deal.bidding.currentPlayer
        : deal.trickSequence?.currentTrick.currentPlayer;
      const seat = PLAYER_POSITIONS.indexOf(player);
      assert(seat >= 0, "Match has no active seat");
      const snapshot = createPlayerClientSnapshot(state, player);
      const command = seat === 0
        ? chooseOfflineBot(snapshot)
        : chooseStyledOfflineBot(snapshot, "varied-v1");
      assert(command, "Teacher has no action");
      if (seat > 0 && command.type === "PLAY_CARD" && snapshot.actions.legalCards.length > 1) {
        assert(rows.length < maxRows, "Pilot exceeded its dataset budget");
        rows.push(encode(snapshot, command, seat));
      }
      state = applyPlayerCommandDocument(state, createPlayerCommandDocument(player, command));
    }
  }
  assert(rows.length > 0, "No decisions to learn in this split");
  return rows;
}

function count(value, option, max) {
  const n = Number(value);
  assert(/^\d+$/.test(value) && Number.isInteger(n) && n >= 1 && n <= max,
    `${option} must be an integer from 1 to ${max}`);
  return n;
}

const { values } = parseArgs({ options: {
  train: { type: "string", default: "64" },
  validation: { type: "string", default: "16" },
} });
const trainMatches = count(values.train, "--train", 256);
const validationMatches = count(values.validation, "--validation", 64);
const train = generateSplit(0, trainMatches);
// Reserve a separate seed block, even when the requested training size changes.
const validation = generateSplit(1024, validationMatches);
console.error(`Generated ${train.length} training choices and ${validation.length} validation choices.`);
console.log(JSON.stringify({
  format: "atoutia-card-imitation-v1",
  engineVersion: BELOTE_ENGINE_VERSION,
  rulesVersion: CURRENT_MATCH_RULES_VERSION,
  teacher: "varied-v1",
  cards,
  styles,
  inputSize: 167,
  trainMatches,
  validationMatches,
  train,
  validation,
}));
