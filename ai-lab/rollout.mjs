import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import {
  getPlayerTeam, Mulberry32Random, PLAYER_POSITIONS,
} from "../packages/belote-engine/dist/index.js";
import { boldStyle, boldTableAction } from "./bold-policy.mjs";
import { cardId, count, encodeFeatures, format, memoryFormat, playMatch, teacher } from "./pilot.mjs";
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

function rollout(policy, round, matches, rewardMode) {
  // Reserve a fresh block for every round, outside the pilot and benchmark blocks.
  const withMemory = policy.source.format === memoryFormat;
  const firstIndex = (withMemory ? 17408 : 4096) + (round - 1) * 96;
  const episodes = [];
  for (let offset = 0; offset < matches; offset++) {
    const index = firstIndex + offset;
    const modelSeat = 1 + offset % 3;
    const team = getPlayerTeam(PLAYER_POSITIONS[modelSeat]);
    const random = new Mulberry32Random(index ^ 0x1da9f5);
    const rows = [];
    const dealRewards = [];
    const opponent = team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
    const onDealEnd = rewardMode === "deal" ? (points) => {
      const margin = (points[team] - points[opponent]) / 162;
      const reward = Math.max(-1, Math.min(1, margin));
      while (dealRewards.length < rows.length) dealRewards.push(reward);
    } : undefined;
    const result = playMatch(index, (snapshot, seat, history) => {
      if (seat !== modelSeat || snapshot.actions.mode !== "PLAY_CARD") {
        return withMemory ? boldTableAction(snapshot, seat, modelSeat) : teacher(snapshot, seat);
      }
      const legal = snapshot.actions.legalCards;
      if (legal.length === 1) return { type: "PLAY_CARD", card: legal[0] };
      assert(legal.length > 1, "No legal model action");
      const features = encodeFeatures(snapshot, seat, history, withMemory ? boldStyle : undefined);
      const selected = legal[sample(legalScores(features, legal, policy.weights), random)];
      rows.push([features, legal.map(cardId), cardId(selected)]);
      return { type: "PLAY_CARD", card: selected };
    }, onDealEnd, withMemory);
    assert(rows.length > 0, "Completed match has no model decisions");
    const episode = { reward: result.winner === team ? 1 : -1, rows };
    if (rewardMode === "deal") {
      assert(dealRewards.length === rows.length, "Some decisions lack a deal outcome");
      episode.dealRewards = dealRewards;
    }
    episodes.push(episode);
  }
  return {
    format: withMemory ? "atoutia-bold-memory-rollout-v1" : "atoutia-card-rollout-v1",
    round, firstIndex, episodes,
  };
}

try {
  const { values } = parseArgs({ options: {
    policy: { type: "string" },
    round: { type: "string" },
    matches: { type: "string" },
    reward: { type: "string", default: "match" },
  } });
  assert(values.policy, "A policy file is required");
  const round = count(values.round, "--round", 128);
  const matches = count(values.matches, "--matches", 96);
  assert(matches % 3 === 0, "Use a multiple of three matches to cover all PNJ seats");
  assert(["match", "deal"].includes(values.reward), "Reward mode must be match or deal");
  const policy = loadPolicy(values.policy);
  assert(policy.source.format === format || policy.source.historyMode === "on",
    "Supply a v1 pilot policy or a policy with active trick memory");
  console.log(JSON.stringify(rollout(policy, round, matches, values.reward)));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
