import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION } from "../packages/belote-engine/dist/index.js";
import { cardId, cards, count, encodeFeatures, format, inputSize, memoryFormat, memoryInputSize, playMatch, styles, teacher } from "./pilot.mjs";

function generateSplit(firstIndex, matches, history) {
  const rows = [];
  for (let index = firstIndex; index < firstIndex + matches; index++) {
    playMatch(index, (snapshot, seat, completedTricks) => {
      const command = teacher(snapshot, seat);
      if (seat > 0 && command?.type === "PLAY_CARD" && snapshot.actions.legalCards.length > 1) {
        assert(rows.length < 100000, "Pilot exceeded its dataset budget");
        const legal = snapshot.actions.legalCards.map(cardId);
        const target = cardId(command.card);
        assert(legal.includes(target), "Teacher chose a card outside the legal mask");
        rows.push([encodeFeatures(snapshot, seat, completedTricks), legal, target]);
      }
      return command;
    }, undefined, history);
  }
  assert(rows.length > 0, "No decisions to learn in this split");
  return rows;
}

const { values } = parseArgs({ options: {
  train: { type: "string", default: "64" },
  validation: { type: "string", default: "16" },
  history: { type: "boolean", default: false },
} });
const trainMatches = count(values.train, "--train", 256);
const validationMatches = count(values.validation, "--validation", 64);
const train = generateSplit(0, trainMatches, values.history);
// Reserve a separate seed block, even when the requested training size changes.
const validation = generateSplit(1024, validationMatches, values.history);
console.error(`Generated ${train.length} training choices and ${validation.length} validation choices.`);
console.log(JSON.stringify({
  format: values.history ? memoryFormat : format,
  engineVersion: BELOTE_ENGINE_VERSION,
  rulesVersion: CURRENT_MATCH_RULES_VERSION,
  teacher: "varied-v1",
  cards,
  styles,
  inputSize: values.history ? memoryInputSize : inputSize,
  trainMatches,
  validationMatches,
  train,
  validation,
}));
