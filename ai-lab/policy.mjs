import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION } from "../packages/belote-engine/dist/index.js";
import { cardId, cards, format, inputSize, styles } from "./pilot.mjs";

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
  assert(isDeepStrictEqual(source, {
    format, inputSize, styles, cards, teacher: "varied-v1",
    engineVersion: BELOTE_ENGINE_VERSION, rulesVersion: CURRENT_MATCH_RULES_VERSION,
  }), "Policy metadata does not match this pilot and engine");
  assert(
    matrix(weights?.["0.weight"], 128, inputSize) && vector(weights["0.bias"], 128)
    && matrix(weights["2.weight"], cards.length, 128) && vector(weights["2.bias"], cards.length),
    "Invalid policy weights",
  );
  return policy;
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
