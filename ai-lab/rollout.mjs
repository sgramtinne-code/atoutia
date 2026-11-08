import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import {
  getPlayerTeam, Mulberry32Random, PLAYER_POSITIONS,
} from "../packages/belote-engine/dist/index.js";
import { cardId, count, encodeFeatures, playMatch, teacher } from "./pilot.mjs";
import { legalScores, loadPolicy } from "./policy.mjs";

function sample(scores, random) {
  const top = Math.max(...scores);
  const probabilities = scores.map((score) => Math.exp(score - top));
  let threshold = random.next() * probabilities.reduce((sum, weight) => sum + weight, 0);
  for (const [i, weight] of probabilities.entries()) {
    threshold -= weight;
    if (threshold < 0) return i;
  }
  return probabilities.length - 1;
}

function rollout(policy, round, matches) {
  // Reserve a fresh block for every round, outside the pilot and benchmark blocks.
  const firstIndex = 4096 + (round - 1) * 96;
  const episodes = [];
  for (let offset = 0; offset < matches; offset++) {
    const index = firstIndex + offset;
    const modelSeat = 1 + offset % 3;
    const team = getPlayerTeam(PLAYER_POSITIONS[modelSeat]);
    const random = new Mulberry32Random(index ^ 0x1da9f5);
    const rows = [];
    const result = playMatch(index, (snapshot, seat) => {
      if (seat !== modelSeat || snapshot.actions.mode !== "PLAY_CARD") return teacher(snapshot, seat);
      const legal = snapshot.actions.legalCards;
      if (legal.length === 1) return { type: "PLAY_CARD", card: legal[0] };
      assert(legal.length > 1, "No legal model action");
      const features = encodeFeatures(snapshot, seat);
      const selected = legal[sample(legalScores(features, legal, policy.weights), random)];
      rows.push([features, legal.map(cardId), cardId(selected)]);
      return { type: "PLAY_CARD", card: selected };
    });
    assert(rows.length > 0, "Completed match has no model decisions");
    episodes.push({ reward: result.winner === team ? 1 : -1, rows });
  }
  return { format: "atoutia-card-rollout-v1", round, firstIndex, episodes };
}

try {
  const { values } = parseArgs({ options: {
    policy: { type: "string" },
    round: { type: "string" },
    matches: { type: "string" },
  } });
  assert(values.policy, "A policy file is required");
  const round = count(values.round, "--round", 128);
  const matches = count(values.matches, "--matches", 96);
  assert(matches % 3 === 0, "Use a multiple of three matches to cover all styles");
  console.log(JSON.stringify(rollout(loadPolicy(values.policy), round, matches)));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
