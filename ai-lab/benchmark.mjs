import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { isDeepStrictEqual, parseArgs } from "node:util";
import {
  BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, PLAYER_POSITIONS,
} from "../packages/belote-engine/dist/index.js";
import { cardId, cards, count, encodeFeatures, format, inputSize, playMatch, styles, teacher } from "./pilot.mjs";

function vector(values, length) {
  return Array.isArray(values) && values.length === length && values.every(Number.isFinite);
}

function matrix(values, rows, columns) {
  return Array.isArray(values) && values.length === rows && values.every((row) => vector(row, columns));
}

function loadPolicy(path) {
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

function predict(snapshot, seat, weights) {
  const features = encodeFeatures(snapshot, seat);
  const hidden = weights["0.weight"].map((row, i) => {
    let value = weights["0.bias"][i];
    for (const feature of features) value += row[feature];
    return Math.max(0, value);
  });
  let bestCard;
  let bestId = Infinity;
  let bestScore = -Infinity;
  for (const card of snapshot.actions.legalCards) {
    const id = cardId(card);
    const row = weights["2.weight"][id];
    let score = weights["2.bias"][id];
    for (let i = 0; i < hidden.length; i++) score += row[i] * hidden[i];
    assert(Number.isFinite(score), "Policy produced a non-finite score");
    if (score > bestScore || (score === bestScore && id < bestId)) {
      bestCard = card;
      bestScore = score;
      bestId = id;
    }
  }
  assert(bestCard, "Policy has no legal card to play");
  return { type: "PLAY_CARD", card: bestCard };
}

function benchmark(policy, seeds) {
  const groups = styles.map((style, index) => {
    const seat = PLAYER_POSITIONS[index + 1];
    return {
      style, seat, team: getPlayerTeam(seat),
      baselineWins: 0, modelWins: 0, gainedWins: 0, lostWins: 0,
      marginChange: 0, modelDecisions: 0,
    };
  });
  // Training uses 0..255, validation 1024..1087. Keep these games in a third block.
  for (let index = 2048; index < 2048 + seeds; index++) {
    const baseline = playMatch(index, teacher);
    for (const [i, group] of groups.entries()) {
      const result = playMatch(index, (snapshot, seat) => {
        if (seat !== i + 1 || snapshot.actions.mode !== "PLAY_CARD") return teacher(snapshot, seat);
        const legal = snapshot.actions.legalCards;
        if (legal.length === 1) return { type: "PLAY_CARD", card: legal[0] };
        group.modelDecisions++;
        return predict(snapshot, seat, policy.weights);
      });
      const baselineWon = baseline.winner === group.team;
      const modelWon = result.winner === group.team;
      group.baselineWins += Number(baselineWon);
      group.modelWins += Number(modelWon);
      group.gainedWins += Number(modelWon && !baselineWon);
      group.lostWins += Number(baselineWon && !modelWon);
      const opponent = group.team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
      group.marginChange += (result.scores[group.team] - result.scores[opponent])
        - (baseline.scores[group.team] - baseline.scores[opponent]);
    }
  }
  return {
    format: "atoutia-card-match-benchmark-v1",
    checkpointSha256: policy.checkpointSha256,
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    firstSeedIndex: 2048,
    seeds,
    totalMatches: seeds * (1 + groups.length),
    byStyle: groups.map(({ marginChange, ...group }) => ({
      ...group,
      meanMarginChange: marginChange / seeds,
    })),
  };
}

try {
  const { values } = parseArgs({ options: {
    policy: { type: "string" },
    seeds: { type: "string", default: "32" },
  } });
  assert(values.policy, "Usage: node ai-lab/benchmark.mjs --policy FILE [--seeds 1..128]");
  const seeds = count(values.seeds, "--seeds", 128);
  console.log(JSON.stringify(benchmark(loadPolicy(values.policy), seeds), null, 2));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
