import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { BELOTE_ENGINE_VERSION, CURRENT_MATCH_RULES_VERSION, getPlayerTeam, PLAYER_POSITIONS } from "../packages/belote-engine/dist/index.js";
import { playBoldPolicy } from "./bold-policy.mjs";
import { count } from "./pilot.mjs";
import { loadPolicy, validateRewardPair } from "./policy.mjs";

function compareSeat(seat, firstSeedIndex, seeds, beforePolicy, afterPolicy) {
  const team = getPlayerTeam(PLAYER_POSITIONS[seat]);
  const opponent = team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
  let referenceWins = 0;
  let offWins = 0;
  let onWins = 0;
  let gainedWins = 0;
  let lostWins = 0;
  let marginChange = 0;
  for (let index = firstSeedIndex; index < firstSeedIndex + seeds; index++) {
    const reference = playBoldPolicy(index, seat);
    const before = beforePolicy ? playBoldPolicy(index, seat, beforePolicy) : reference;
    const after = playBoldPolicy(index, seat, afterPolicy);
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

function compareRewards(matchPath, dealPath, seeds, confirmation) {
  const match = loadPolicy(matchPath);
  const deal = loadPolicy(dealPath);
  assert(match.source.historyMode === "on" && deal.source.historyMode === "on",
    "Both reward policies must have active trick memory");
  validateRewardPair(match, deal);
  const firstSeedIndex = confirmation ? 30208 : 29952;
  const bySeat = [1, 2, 3].map((seat) => {
    const { offWins, onWins, ...result } = compareSeat(seat, firstSeedIndex, seeds, match, deal);
    return { ...result, matchWins: offWins, dealWins: onWins };
  });
  return {
    format: confirmation ? "atoutia-bold-memory-reward-confirmation-pair-v1" : "atoutia-bold-memory-reward-trial-v1",
    engineVersion: BELOTE_ENGINE_VERSION,
    rulesVersion: CURRENT_MATCH_RULES_VERSION,
    initialCheckpointSha256: match.initialCheckpointSha256,
    matchCheckpointSha256: match.checkpointSha256,
    dealCheckpointSha256: deal.checkpointSha256,
    matchTraining: match.training,
    dealTraining: deal.training,
    firstSeedIndex,
    seeds,
    totalMatches: seeds * bySeat.length * 3,
    bySeat,
  };
}

function main() {
  const { values } = parseArgs({ options: {
    off: { type: "string" }, on: { type: "string" }, policy: { type: "string" },
    match: { type: "string" }, deal: { type: "string" }, seeds: { type: "string" },
    "confirm-reward": { type: "boolean", default: false },
  } });
  const single = values.policy !== undefined;
  const memoryPair = values.off !== undefined || values.on !== undefined;
  const rewardPair = values.match !== undefined || values.deal !== undefined;
  assert([single, memoryPair, rewardPair].filter(Boolean).length <= 1,
    "Choose a single policy, an off/on pair or a match/deal pair");
  const confirmation = values["confirm-reward"];
  assert(!confirmation || (rewardPair && values.seeds === undefined),
    "Reward confirmation requires a match/deal pair and uses exactly 512 seeds");
  if (rewardPair) {
    assert(values.match && values.deal, "Supply --match FILE and --deal FILE");
    const seeds = confirmation ? 512 : count(values.seeds ?? "256", "--seeds", 256);
    return compareRewards(values.match, values.deal, seeds, confirmation);
  }
  if (single) {
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
