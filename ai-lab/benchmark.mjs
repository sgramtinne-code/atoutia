import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import {
  BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, PLAYER_POSITIONS,
} from "../packages/belote-engine/dist/index.js";
import { cardId, count, encodeFeatures, playMatch, styles, teacher } from "./pilot.mjs";
import { legalScores, loadPolicy } from "./policy.mjs";

function predict(snapshot, seat, weights) {
  const legal = snapshot.actions.legalCards;
  const scores = legalScores(encodeFeatures(snapshot, seat), legal, weights);
  let best = 0;
  for (let i = 1; i < legal.length; i++) {
    if (scores[i] > scores[best] || (scores[i] === scores[best] && cardId(legal[i]) < cardId(legal[best]))) {
      best = i;
    }
  }
  assert(legal[best], "Policy has no legal card to play");
  return { type: "PLAY_CARD", card: legal[best] };
}

function playPolicy(index, modelSeat, policy) {
  let decisions = 0;
  const score = playMatch(index, (snapshot, seat) => {
    if (seat !== modelSeat || snapshot.actions.mode !== "PLAY_CARD") return teacher(snapshot, seat);
    const legal = snapshot.actions.legalCards;
    if (legal.length === 1) return { type: "PLAY_CARD", card: legal[0] };
    decisions++;
    return predict(snapshot, seat, policy.weights);
  });
  return { score, decisions };
}

function margin(score, team) {
  const opponent = team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
  return score.scores[team] - score.scores[opponent];
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
      const { score: result, decisions } = playPolicy(index, i + 1, policy);
      group.modelDecisions += decisions;
      const baselineWon = baseline.winner === group.team;
      const modelWon = result.winner === group.team;
      group.baselineWins += Number(baselineWon);
      group.modelWins += Number(modelWon);
      group.gainedWins += Number(modelWon && !baselineWon);
      group.lostWins += Number(baselineWon && !modelWon);
      group.marginChange += margin(result, group.team) - margin(baseline, group.team);
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

function compare(initial, candidate, seeds) {
  assert(candidate.initialCheckpointSha256 === initial.checkpointSha256,
    "Candidate campaign does not originate from the supplied initial checkpoint");
  // Separate from imitation, the development benchmark, and all self-play rounds.
  const firstSeedIndex = 3072;
  const groups = styles.map((style, index) => {
    const seat = PLAYER_POSITIONS[index + 1];
    return {
      style, seat, team: getPlayerTeam(seat),
      heuristicWins: 0, initialWins: 0, candidateWins: 0,
      gainedWins: 0, lostWins: 0, marginChange: 0,
    };
  });
  for (let index = firstSeedIndex; index < firstSeedIndex + seeds; index++) {
    const baseline = playMatch(index, teacher);
    for (const [i, group] of groups.entries()) {
      const before = playPolicy(index, i + 1, initial).score;
      const after = playPolicy(index, i + 1, candidate).score;
      const beforeWon = before.winner === group.team;
      const afterWon = after.winner === group.team;
      group.heuristicWins += Number(baseline.winner === group.team);
      group.initialWins += Number(beforeWon);
      group.candidateWins += Number(afterWon);
      group.gainedWins += Number(afterWon && !beforeWon);
      group.lostWins += Number(beforeWon && !afterWon);
      group.marginChange += margin(after, group.team) - margin(before, group.team);
    }
  }
  return {
    format: "atoutia-card-held-out-comparison-v1",
    initialCheckpointSha256: initial.checkpointSha256,
    candidateCheckpointSha256: candidate.checkpointSha256,
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    firstSeedIndex,
    seeds,
    totalMatches: seeds * (1 + 2 * groups.length),
    byStyle: groups.map(({ marginChange, ...group }) => ({
      ...group,
      meanMarginChange: marginChange / seeds,
    })),
  };
}

try {
  const { values } = parseArgs({ options: {
    policy: { type: "string" },
    candidate: { type: "string" },
    seeds: { type: "string", default: "32" },
  } });
  assert(values.policy, "Usage: node ai-lab/benchmark.mjs --policy FILE [--candidate FILE] [--seeds 1..128]");
  const seeds = count(values.seeds, "--seeds", 128);
  const initial = loadPolicy(values.policy);
  const report = values.candidate
    ? compare(initial, loadPolicy(values.candidate), seeds)
    : benchmark(initial, seeds);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
