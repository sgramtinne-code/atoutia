import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, PLAYER_POSITIONS } from "../packages/belote-engine/dist/index.js";
import { boldStyle, boldTableAction } from "./bold-policy.mjs";
import { count, playMatch } from "./pilot.mjs";
import { loadPolicy, predict } from "./policy.mjs";

function score(index, modelSeat, policy) {
  return playMatch(index, (snapshot, seat, history) => {
    const { actions } = snapshot;
    if (seat !== modelSeat || !policy || actions.mode !== "PLAY_CARD") {
      return boldTableAction(snapshot, seat, modelSeat);
    }
    if (actions.legalCards.length === 1) return { type: "PLAY_CARD", card: actions.legalCards[0] };
    return predict(snapshot, seat, policy.weights, history, boldStyle);
  }, undefined, policy?.source.historyMode === "on");
}

function compareSeat(seat, firstSeedIndex, seeds, off, on) {
  const team = getPlayerTeam(PLAYER_POSITIONS[seat]);
  const opponent = team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
  let referenceWins = 0;
  let offWins = 0;
  let onWins = 0;
  let gainedWins = 0;
  let lostWins = 0;
  let marginChange = 0;
  for (let index = firstSeedIndex; index < firstSeedIndex + seeds; index++) {
    const reference = score(index, seat);
    const before = off ? score(index, seat, off) : reference;
    const after = score(index, seat, on);
    const wonBefore = before.winner === team;
    const wonAfter = after.winner === team;
    referenceWins += Number(reference.winner === team);
    offWins += Number(wonBefore);
    onWins += Number(wonAfter);
    gainedWins += Number(wonAfter && !wonBefore);
    lostWins += Number(wonBefore && !wonAfter);
    marginChange += (after.scores[team] - after.scores[opponent]) - (before.scores[team] - before.scores[opponent]);
  }
  return {
    seat: PLAYER_POSITIONS[seat], team, referenceWins, offWins, onWins, gainedWins, lostWins,
    meanMarginChange: marginChange / seeds,
  };
}

function main() {
  const { values } = parseArgs({ options: {
    off: { type: "string" }, on: { type: "string" }, policy: { type: "string" }, seeds: { type: "string" },
  } });
  if (values.policy !== undefined) {
    assert(values.off === undefined && values.on === undefined, "Choose a single policy or an off/on pair");
    const policy = loadPolicy(values.policy);
    assert(policy.source.historyMode === "on", "Supply a policy with active trick memory");
    const firstSeedIndex = 29696;
    const seeds = count(values.seeds ?? "256", "--seeds", 256);
    const bySeat = [1, 2, 3].map((seat) => {
      const { offWins, onWins, meanMarginChange, ...result } =
        compareSeat(seat, firstSeedIndex, seeds, undefined, policy);
      return { ...result, modelWins: onWins, meanMarginVsReference: meanMarginChange };
    });
    return {
      format: "atoutia-bold-memory-reinforcement-benchmark-v1",
      engineVersion: BELOTE_ENGINE_VERSION,
      rulesVersion: CURRENT_MATCH_RULES_VERSION,
      checkpointSha256: policy.checkpointSha256,
      firstSeedIndex,
      seeds,
      totalMatches: seeds * bySeat.length * 2,
      bySeat,
    };
  }
  assert(values.off && values.on, "Supply --off FILE and --on FILE");
  const firstSeedIndex = 16896;
  const seeds = count(values.seeds ?? "128", "--seeds", 128);
  const off = loadPolicy(values.off);
  const on = loadPolicy(values.on);
  assert(off.source.historyMode === "off" && on.source.historyMode === "on", "Supply the off and on policies in order");
  const { datasetSha256, epochs, seed } = off.imitation;
  assert(
    datasetSha256 === on.imitation.datasetSha256 && epochs === on.imitation.epochs
      && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff && seed === on.imitation.seed,
    "Use the same dataset, epoch count and explicit initialization seed",
  );
  const bySeat = [1, 2, 3].map((seat) => compareSeat(seat, firstSeedIndex, seeds, off, on));
  return {
    format: "atoutia-bold-memory-pair-v1",
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    training: off.imitation,
    offCheckpointSha256: off.checkpointSha256,
    onCheckpointSha256: on.checkpointSha256,
    firstSeedIndex,
    seeds,
    totalMatches: seeds * bySeat.length * 3,
    bySeat,
  };
}

try {
  console.log(JSON.stringify(main(), null, 2));
} catch (error) {
  console.error(`AI Lab: ${error.message}`);
  process.exitCode = 1;
}
