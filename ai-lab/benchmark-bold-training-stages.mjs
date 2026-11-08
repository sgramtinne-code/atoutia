import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, PLAYER_POSITIONS } from "../packages/belote-engine/dist/index.js";
import { playBoldPolicy } from "./bold-policy.mjs";
import { loadPolicy, validateRewardPair } from "./policy.mjs";

const firstSeedIndex = 30208;
const seeds = 512;

function loadStages(study, confirmation, previous, seed) {
  assert(
    previous?.seed === seed && previous.format === "atoutia-bold-memory-reward-confirmation-pair-v1"
      && previous.firstSeedIndex === firstSeedIndex && previous.seeds === seeds
      && previous.engineVersion === BELOTE_ENGINE_VERSION && previous.rulesVersion === CURRENT_MATCH_RULES_VERSION,
    `Unexpected confirmation report for seed ${seed}`,
  );
  const directory = `seed-${seed}`;
  const imitation = loadPolicy(join(study, directory, "on.json"));
  const match = loadPolicy(join(confirmation, directory, "match.json"));
  const deal = loadPolicy(join(confirmation, directory, "deal.json"));
  const policies = { imitation, match, deal };
  assert(Object.values(policies).every((policy) => policy.source.historyMode === "on"),
    `All three policies must use active trick memory for seed ${seed}`);
  validateRewardPair(match, deal);
  assert(
    imitation.imitation.seed === seed && imitation.initialCheckpointSha256 === undefined
      && imitation.checkpointSha256 === match.initialCheckpointSha256
      && imitation.checkpointSha256 === previous.initialCheckpointSha256
      && match.checkpointSha256 === previous.matchCheckpointSha256
      && deal.checkpointSha256 === previous.dealCheckpointSha256,
    `Checkpoints do not match the completed confirmation for seed ${seed}`,
  );
  assert.deepEqual(match.training, previous.matchTraining);
  assert.deepEqual(deal.training, previous.dealTraining);
  return policies;
}

function evaluateSeat(seat, policies) {
  const player = PLAYER_POSITIONS[seat];
  const team = getPlayerTeam(player);
  const opponent = team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
  const margin = (score) => score.scores[team] - score.scores[opponent];
  const entries = Object.entries(policies);
  const totals = Object.fromEntries(entries.map(([stage]) => [stage, { wins: 0, marginDifference: 0 }]));
  let referenceWins = 0;
  for (let index = firstSeedIndex; index < firstSeedIndex + seeds; index++) {
    const reference = playBoldPolicy(index, seat);
    referenceWins += Number(reference.winner === team);
    for (const [stage, policy] of entries) {
      const score = playBoldPolicy(index, seat, policy);
      totals[stage].wins += Number(score.winner === team);
      totals[stage].marginDifference += margin(score) - margin(reference);
    }
  }
  const stages = Object.fromEntries(entries.map(([stage]) => {
    const { wins, marginDifference } = totals[stage];
    return [stage, { wins, meanMarginVsReference: marginDifference / seeds }];
  }));
  return { seat: player, team, referenceWins, stages };
}

function run(study, confirmation) {
  const previous = JSON.parse(readFileSync(join(confirmation, "report.json"), "utf8"));
  assert(previous.format === "atoutia-bold-memory-reward-confirmation-v1"
    && Array.isArray(previous.repetitions) && previous.repetitions.length === 3,
  "Use a completed three-seed reward confirmation");
  const inputs = [1234, 1235, 1236].map((seed, index) => {
    const report = previous.repetitions[index];
    return { seed, report, policies: loadStages(study, confirmation, report, seed) };
  });
  const repetitions = inputs.map(({ seed, report, policies }) => {
    console.error(`Evaluating imitation and reinforced policies for seed ${seed}`);
    const bySeat = [1, 2, 3].map((seat, index) => {
      const row = evaluateSeat(seat, policies);
      const expected = report.bySeat[index];
      const marginChange = row.stages.deal.meanMarginVsReference - row.stages.match.meanMarginVsReference;
      assert(
        row.seat === expected.seat && row.referenceWins === expected.referenceWins
          && row.stages.match.wins === expected.matchWins && row.stages.deal.wins === expected.dealWins
          && marginChange === expected.meanMarginChange,
        `Evaluation did not reproduce the confirmation for seed ${seed}, ${row.seat}`,
      );
      return row;
    });
    return { seed, bySeat };
  });
  return {
    format: "atoutia-bold-training-stages-v1",
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    firstSeedIndex,
    seeds,
    totalMatches: repetitions.length * 3 * seeds * 4,
    repetitions,
  };
}

try {
  const { values } = parseArgs({ options: {
    study: { type: "string" }, confirmation: { type: "string" },
  } });
  assert(values.study && values.confirmation, "Supply --study DIR and --confirmation DIR");
  console.log(JSON.stringify(run(values.study, values.confirmation), null, 2));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
