import assert from "node:assert/strict";
import {
  BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, PLAYER_POSITIONS,
} from "../packages/belote-engine/dist/index.js";
import { boldStyle, playBoldPolicy, winningCardsWhenClosing } from "./bold-policy.mjs";
import { loadBoldSeatModels } from "./bold-seat-study.mjs";
import { predict } from "./policy.mjs";

const firstSeedIndex = 33024;
const seeds = 256;

function evaluateSeat(seat, models) {
  const player = PLAYER_POSITIONS[seat];
  const team = getPlayerTeam(player);
  const opponent = team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
  const margin = (score) => score.scores[team] - score.scores[opponent];
  const indices = Array.from({ length: seeds }, (_, offset) => firstSeedIndex + offset);
  const referenceWins = indices.filter((index) => playBoldPolicy(index, seat).winner === team).length;

  return {
    seat: player,
    team,
    referenceWins,
    models: models.map(({ seed, mode, policy }) => {
      let baselineWins = 0;
      let ruleWins = 0;
      let gainedWins = 0;
      let lostWins = 0;
      let marginChange = 0;
      let interventions = 0;
      let affectedMatches = 0;
      for (const index of indices) {
        const baseline = playBoldPolicy(index, seat, policy);
        const before = interventions;
        const treated = playBoldPolicy(index, seat, policy, (snapshot, history, command) => {
          const winning = winningCardsWhenClosing(snapshot);
          if (winning.length === 0 || winning.includes(command.card)) return command;
          interventions++;
          return predict(snapshot, seat, policy.weights, history, boldStyle, winning);
        });
        const baselineWon = baseline.winner === team;
        const ruleWon = treated.winner === team;
        baselineWins += Number(baselineWon);
        ruleWins += Number(ruleWon);
        gainedWins += Number(ruleWon && !baselineWon);
        lostWins += Number(baselineWon && !ruleWon);
        marginChange += margin(treated) - margin(baseline);
        affectedMatches += Number(interventions > before);
      }
      return {
        seed, mode, baselineWins, ruleWins, gainedWins, lostWins,
        meanMarginChange: marginChange / seeds, interventions, affectedMatches,
      };
    }),
  };
}

try {
  const directory = process.argv[2];
  assert(directory && process.argv.length === 3, "Supply the seat imitation study run directory");
  const models = loadBoldSeatModels(directory);
  const bySeat = [1, 2, 3].map((seat) => evaluateSeat(seat, models));
  console.log(JSON.stringify({
    format: "atoutia-bold-closing-rule-v1",
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    firstSeedIndex,
    seeds,
    totalMatches: seeds * bySeat.length * (1 + 2 * models.length),
    bySeat,
  }, null, 2));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
