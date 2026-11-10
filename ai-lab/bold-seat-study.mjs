import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION } from "../packages/belote-engine/dist/index.js";
import { loadPolicy } from "./policy.mjs";

export const studyFirstSeedIndex = 30720;
export const studySeeds = 256;
const modes = ["fixed", "rotated"];

export function loadBoldSeatModels(directory) {
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
        && repetition.training?.seed === seed && repetition.firstSeedIndex === studyFirstSeedIndex && repetition.seeds === studySeeds
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
