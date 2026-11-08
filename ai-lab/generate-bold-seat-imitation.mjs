import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION } from "../packages/belote-engine/dist/index.js";
import { boldStyle, boldTableAction } from "./bold-policy.mjs";
import { cardId, cards, encodeFeatures, memoryFormat, memoryInputSize, playMatch, styles } from "./pilot.mjs";

function collect(firstIndex, matches, rotated) {
  const bySeat = [[], [], []];
  for (let offset = 0; offset < matches; offset++) {
    const boldSeat = rotated ? 1 + offset % 3 : 3;
    playMatch(firstIndex + offset, (snapshot, seat, history) => {
      const command = boldTableAction(snapshot, seat, boldSeat);
      if (seat === boldSeat && command?.type === "PLAY_CARD" && snapshot.actions.legalCards.length > 1) {
        const legal = snapshot.actions.legalCards.map(cardId);
        const target = cardId(command.card);
        assert(legal.includes(target), "Teacher chose a card outside the legal mask");
        bySeat[seat - 1].push([encodeFeatures(snapshot, seat, history, boldStyle), legal, target]);
      }
      return command;
    }, undefined, true);
  }
  return bySeat;
}

function evenlySample(rows, size) {
  return Array.from({ length: size }, (_, index) => rows[Math.floor(index * rows.length / size)]);
}

function split(firstIndex, matches) {
  const [, , fixed] = collect(firstIndex, matches, false);
  const rotated = collect(firstIndex, matches, true);
  const perSeat = Math.min(Math.floor(fixed.length / 3), ...rotated.map((rows) => rows.length));
  assert(perSeat > 0 && perSeat * 3 <= 100000, "Invalid balanced Bold decision budget");
  return {
    fixed: evenlySample(fixed, perSeat * 3),
    rotated: rotated.flatMap((rows) => evenlySample(rows, perSeat)),
    fixedBySeat: [0, 0, perSeat * 3],
    rotatedBySeat: [perSeat, perSeat, perSeat],
  };
}

try {
  const output = process.argv[2];
  assert(output && process.argv.length === 3, "Supply an output directory");
  const train = split(32000, 768);
  const validation = split(32768, 192);
  for (const mode of ["fixed", "rotated"]) {
    writeFileSync(join(output, `${mode}-data.json`), JSON.stringify({
      format: memoryFormat,
      engineVersion: BELOTE_ENGINE_VERSION,
      rulesVersion: CURRENT_MATCH_RULES_VERSION,
      teacher: `bold-${mode}-v1`,
      cards, styles, inputSize: memoryInputSize,
      trainMatches: 768, validationMatches: 192,
      trainBySeat: train[`${mode}BySeat`],
      validationBySeat: validation[`${mode}BySeat`],
      train: train[mode],
      validation: validation[mode],
    }), { flag: "wx" });
  }
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
