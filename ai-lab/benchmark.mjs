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
