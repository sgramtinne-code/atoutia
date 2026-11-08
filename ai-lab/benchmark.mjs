import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import {
  BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, PLAYER_POSITIONS,
} from "../packages/belote-engine/dist/index.js";
import { cardId, count, encodeFeatures, playMatch, styles, teacher } from "./pilot.mjs";
import { legalScores, loadPolicy } from "./policy.mjs";

function predict(snapshot, seat, weights, history) {
  const legal = snapshot.actions.legalCards;
  const scores = legalScores(encodeFeatures(snapshot, seat, history), legal, weights);
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
  const score = playMatch(index, (snapshot, seat, history) => {
    if (seat !== modelSeat || snapshot.actions.mode !== "PLAY_CARD") return teacher(snapshot, seat);
    const legal = snapshot.actions.legalCards;
    if (legal.length === 1) return { type: "PLAY_CARD", card: legal[0] };
    decisions++;
    return predict(snapshot, seat, policy.weights, history);
  }, undefined, policy.source.historyMode === "on");
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

function compareBlock(initial, candidate, firstSeedIndex, seeds) {
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
  return groups;
}

function summarize(groups, seeds) {
  return groups.map(({ marginChange, ...group }) => ({
    ...group,
    meanMarginChange: marginChange / seeds,
  }));
}

function compare(initial, candidate, seeds, trial) {
  const historyTrial = trial === "history" || trial === "history-confirmation";
  if (historyTrial) {
    assert(initial.source.historyMode === "off" && candidate.source.historyMode === "on",
      "Supply the masked-history policy first and the history policy second");
    assert(initial.imitation.datasetSha256 === candidate.imitation.datasetSha256
      && initial.imitation.epochs === candidate.imitation.epochs,
      "History trials must use the same dataset and epoch count");
  } else if (trial === "reward") {
    assert(initial.initialCheckpointSha256 && initial.initialCheckpointSha256 === candidate.initialCheckpointSha256,
      "Reward trials must start from the same checkpoint");
    const match = initial.training;
    const deal = candidate.training;
    assert(match?.rewardMode === "match" && deal?.rewardMode === "deal",
      "Supply the match-reward policy first and the deal-reward policy second");
    assert(Number.isInteger(match.rounds) && match.rounds > 0 && match.rounds === deal.rounds
      && Number.isInteger(match.matchesPerRound) && match.matchesPerRound > 0
      && match.matchesPerRound === deal.matchesPerRound, "Reward trials must use the same training budget");
  } else {
    assert(candidate.initialCheckpointSha256 === initial.checkpointSha256,
      "Candidate campaign does not originate from the supplied initial checkpoint");
  }
  // Confirmation starts beyond the last self-play seed index (4096 + 128 * 96 - 1).
  const firstSeedIndex = { history: 3584, "history-confirmation": 16384, reward: 3328, checkpoint: 3072 }[trial];
  const reportFormat = {
    history: "atoutia-card-history-trial-v1",
    "history-confirmation": "atoutia-card-history-confirmation-v1",
    reward: "atoutia-card-reward-trial-v1",
    checkpoint: "atoutia-card-held-out-comparison-v1",
  }[trial];
  const blockSize = trial === "history-confirmation" ? 128 : seeds;
  const blocks = [];
  for (let index = firstSeedIndex; index < firstSeedIndex + seeds; index += blockSize) {
    blocks.push({ firstSeedIndex: index, groups: compareBlock(initial, candidate, index, blockSize) });
  }
  const totals = blocks[0].groups.map((group, i) => {
    const total = { ...group };
    for (const block of blocks.slice(1)) {
      for (const key of ["heuristicWins", "initialWins", "candidateWins", "gainedWins", "lostWins", "marginChange"]) {
        total[key] += block.groups[i][key];
      }
    }
    return total;
  });
  return {
    format: reportFormat,
    initialCheckpointSha256: initial.checkpointSha256,
    candidateCheckpointSha256: candidate.checkpointSha256,
    ...(trial === "reward" ? { matchTraining: initial.training, dealTraining: candidate.training } : {}),
    ...(historyTrial ? { training: initial.imitation } : {}),
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    firstSeedIndex,
    seeds,
    totalMatches: seeds * (1 + 2 * totals.length),
    byStyle: summarize(totals, seeds),
    ...(trial === "history-confirmation" ? {
      byBlock: blocks.map((block) => ({
        firstSeedIndex: block.firstSeedIndex,
        seeds: blockSize,
        byStyle: summarize(block.groups, blockSize),
      })),
    } : {}),
  };
}

try {
  const { values } = parseArgs({ options: {
    policy: { type: "string" },
    candidate: { type: "string" },
    "reward-trial": { type: "boolean", default: false },
    "history-trial": { type: "boolean", default: false },
    "history-confirmation": { type: "boolean", default: false },
    seeds: { type: "string" },
  } });
  assert(values.policy, "Usage: node ai-lab/benchmark.mjs --policy FILE [--candidate FILE] [--seeds 1..128]");
  const trials = [
    values["history-trial"] && "history",
    values["reward-trial"] && "reward",
    values["history-confirmation"] && "history-confirmation",
  ].filter(Boolean);
  assert(trials.length <= 1, "Choose one trial mode");
  const trial = trials[0] ?? "checkpoint";
  assert(trial === "checkpoint" || values.candidate, "Trial requires a candidate");
  const confirmation = trial === "history-confirmation";
  assert(!confirmation || values.seeds === undefined, "History confirmation uses exactly 512 seeds");
  const seeds = confirmation ? 512 : count(values.seeds ?? "32", "--seeds", 128);
  const initial = loadPolicy(values.policy);
  const report = values.candidate
    ? compare(initial, loadPolicy(values.candidate), seeds, trial)
    : benchmark(initial, seeds);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
