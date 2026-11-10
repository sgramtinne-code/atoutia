import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, getTrickWinner, PLAYER_POSITIONS,
} from "../packages/belote-engine/dist/index.js";
import { boldStyle, boldTableAction } from "./bold-policy.mjs";
import { cardId, playMatch } from "./pilot.mjs";
import { loadPolicy, predict } from "./policy.mjs";

const firstSeedIndex = 30720;
const seeds = 256;
const modes = ["fixed", "rotated"];

function loadModels(directory) {
  const study = JSON.parse(readFileSync(join(directory, "report.json"), "utf8"));
  assert(
    study?.format === "atoutia-bold-seat-imitation-study-v1"
      && Array.isArray(study.repetitions) && study.repetitions.length === 3,
    "Use a completed Bold seat imitation study",
  );
  return [1234, 1235, 1236].flatMap((seed, index) => {
    const repetition = study.repetitions[index];
    assert(
      repetition?.format === "atoutia-bold-seat-imitation-pair-v1"
        && repetition.training?.seed === seed && repetition.firstSeedIndex === firstSeedIndex && repetition.seeds === seeds
        && repetition.engineVersion === BELOTE_ENGINE_VERSION && repetition.rulesVersion === CURRENT_MATCH_RULES_VERSION,
      `Unexpected seat imitation report for seed ${seed}`,
    );
    return modes.map((mode) => {
      const policy = loadPolicy(join(directory, `seed-${seed}`, `${mode}.json`));
      assert(
        policy.source.teacher === `bold-${mode}-v1`
          && policy.initialCheckpointSha256 === undefined && policy.imitation.seed === seed
          && policy.checkpointSha256 === repetition[`${mode}CheckpointSha256`],
        `Policy does not match the completed study for seed ${seed}, ${mode}`,
      );
      return { seed, mode, policy };
    });
  });
}

function evaluateSeat(boldSeat, models) {
  const player = PLAYER_POSITIONS[boldSeat];
  const team = getPlayerTeam(player);
  const byTrickPosition = Array.from({ length: 4 }, (_, index) => ({
    position: index + 1,
    decisions: 0,
    leadOpportunities: 0,
    opponentLeadOpportunities: 0,
    models: models.map(({ seed, mode }) => ({
      seed, mode, disagreements: 0, missedLead: 0, missedOpponentLead: 0, tookLeadWithDifferentCard: 0,
    })),
  }));
  for (let index = firstSeedIndex; index < firstSeedIndex + seeds; index++) {
    playMatch(index, (snapshot, seat, history) => {
      const reference = boldTableAction(snapshot, seat, boldSeat);
      const { actions } = snapshot;
      if (seat !== boldSeat || actions.mode !== "PLAY_CARD" || actions.legalCards.length < 2) return reference;

      const { currentTrick, trumpSuit } = snapshot.match.public;
      const plays = currentTrick.plays;
      const row = byTrickPosition[plays.length];
      assert(reference?.type === "PLAY_CARD", "Missing Bold reference card");
      const target = cardId(reference.card);
      // A lead opportunity here requires a real choice between taking the lead and leaving it.
      const leading = plays.length === 0 ? [] : actions.legalCards
        .filter((card) => getTrickWinner([...plays, { player, card }], trumpSuit).player === player)
        .map(cardId);
      const opportunity = leading.length > 0 && leading.length < actions.legalCards.length;
      assert(!opportunity || leading.includes(target), "Bold reference did not take an available lead");
      const opponentAhead = opportunity && getPlayerTeam(getTrickWinner(plays, trumpSuit).player) !== team;
      row.decisions++;
      row.leadOpportunities += Number(opportunity);
      row.opponentLeadOpportunities += Number(opponentAhead);
      for (const [modelIndex, { policy }] of models.entries()) {
        const chosen = cardId(predict(snapshot, seat, policy.weights, history, boldStyle).card);
        if (chosen === target) continue;
        const result = row.models[modelIndex];
        result.disagreements++;
        if (opportunity) {
          if (leading.includes(chosen)) result.tookLeadWithDifferentCard++;
          else {
            result.missedLead++;
            result.missedOpponentLead += Number(opponentAhead);
          }
        }
      }
      return reference;
    }, undefined, true);
  }
  return { seat: player, byTrickPosition };
}

try {
  const directory = process.argv[2];
  assert(directory && process.argv.length === 3, "Supply the seat imitation study run directory");
  const models = loadModels(directory);
  const bySeat = [1, 2, 3].map((seat) => evaluateSeat(seat, models));
  console.log(JSON.stringify({
    format: "atoutia-bold-card-diagnostic-v1",
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    firstSeedIndex,
    seeds,
    referenceMatches: seeds * bySeat.length,
    bySeat,
  }, null, 2));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
