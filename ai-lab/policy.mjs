import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION } from "../packages/belote-engine/dist/index.js";
import { cardId, cards, encodeFeatures, format, inputSize, memoryFormat, memoryInputSize, styles } from "./pilot.mjs";

function vector(values, length) {
  return Array.isArray(values) && values.length === length && values.every(Number.isFinite);
}

function matrix(values, rows, columns) {
  return Array.isArray(values) && values.length === rows && values.every((row) => vector(row, columns));
}

export function loadPolicy(path) {
  assert(statSync(path).size <= 2 * 1024 * 1024, "Policy exceeds the pilot size limit");
  const policy = JSON.parse(readFileSync(path, "utf8"));
  assert(policy?.format === "atoutia-card-policy-v1", "Unsupported policy format");
  assert(/^[0-9a-f]{64}$/.test(policy.checkpointSha256), "Missing checkpoint fingerprint");
  const { source, weights } = policy;
  const expected = {
    format, inputSize, styles, cards, teacher: "varied-v1",
    engineVersion: BELOTE_ENGINE_VERSION, rulesVersion: CURRENT_MATCH_RULES_VERSION,
  };
  if (source?.format === memoryFormat) {
    assert(["on", "off"].includes(source.historyMode), "Invalid history mode");
    Object.assign(expected, { format: memoryFormat, inputSize: memoryInputSize, historyMode: source.historyMode });
    if (["bold-fixed-v1", "bold-rotated-v1"].includes(source.teacher)) {
      const { seed, trainChoices, validationChoices } = policy.imitation ?? {};
      assert(
        source.historyMode === "on" && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff
          && [trainChoices, validationChoices].every((size) => Number.isInteger(size) && size >= 1 && size <= 100000),
        "Invalid Bold seat imitation metadata",
      );
      expected.teacher = source.teacher;
    }
    const { datasetSha256, epochs } = policy.imitation ?? {};
    assert(typeof datasetSha256 === "string" && /^[0-9a-f]{64}$/.test(datasetSha256)
      && Number.isInteger(epochs) && epochs >= 1 && epochs <= 20, "Invalid history training metadata");
  }
  assert(isDeepStrictEqual(source, expected), "Policy metadata does not match this pilot and engine");
  assert(
    matrix(weights?.["0.weight"], 128, expected.inputSize) && vector(weights["0.bias"], 128)
    && matrix(weights["2.weight"], cards.length, 128) && vector(weights["2.bias"], cards.length),
    "Invalid policy weights",
  );
  return policy;
}

export function validateRewardPair(initial, candidate) {
  assert(initial.initialCheckpointSha256 && initial.initialCheckpointSha256 === candidate.initialCheckpointSha256,
    "Reward trials must start from the same checkpoint");
  const match = initial.training;
  const deal = candidate.training;
  assert(match?.rewardMode === "match" && deal?.rewardMode === "deal",
    "Supply the match-reward policy first and the deal-reward policy second");
  assert(Number.isInteger(match.rounds) && match.rounds > 0 && match.rounds === deal.rounds
    && Number.isInteger(match.matchesPerRound) && match.matchesPerRound > 0
    && match.matchesPerRound === deal.matchesPerRound, "Reward trials must use the same training budget");
}

export function legalScores(features, legal, weights) {
  const hidden = weights["0.weight"].map((row, i) => {
    let value = weights["0.bias"][i];
    for (const feature of features) value += row[feature];
    return Math.max(0, value);
  });
  return legal.map((card) => {
    const id = cardId(card);
    const row = weights["2.weight"][id];
    let score = weights["2.bias"][id];
    for (let i = 0; i < hidden.length; i++) score += row[i] * hidden[i];
    assert(Number.isFinite(score), "Policy produced a non-finite score");
    return score;
  });
}

export function predict(snapshot, seat, weights, history, styleIndex) {
  const legal = snapshot.actions.legalCards;
  const scores = legalScores(encodeFeatures(snapshot, seat, history, styleIndex), legal, weights);
  let best = 0;
  for (let i = 1; i < legal.length; i++) {
    if (scores[i] > scores[best] || (scores[i] === scores[best] && cardId(legal[i]) < cardId(legal[best]))) {
      best = i;
    }
  }
  assert(legal[best], "Policy has no legal card to play");
  return { type: "PLAY_CARD", card: legal[best] };
}
