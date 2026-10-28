import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { applyMatchBiddingAction, applyMatchCardPlay, createMatchMachine, getLegalCards } from "../dist/index.js";
import { parseArguments } from "./simulate-matches.mjs";
import { assertMatchState, runCampaign, seedAt, validateOptions } from "./simulation.mjs";

const cliPath = fileURLToPath(new URL("./simulate-matches.mjs", import.meta.url));
const run = (options) => runCampaign(options, { now: () => 0 });

function playingState() {
  const state = createMatchMachine({ baseSeed: 42 });
  return applyMatchBiddingAction(state, {
    type: "TAKE", player: state.currentDeal.bidding.currentPlayer,
    suit: state.currentDeal.initialDeal.turnUpCard.suit,
  });
}

test("complete seeded matches reach 1000 points and replay identically", () => {
  const report = run({ matches: 12, startSeed: 20261028 });
  assert.equal(report.status, "PASSED", JSON.stringify(report.failure));
  assert.equal(report.targetScore, 1000);
  assert.equal(report.matchesCompleted, 12);
  assert.equal(report.totals.replaysVerified, 12);
  assert.equal(report.totals.cardPlays, report.totals.playedDeals * 32);
  assert(report.totals.playedDeals > 12, "Campaign must play multi-deal matches.");
  assert(report.totals.firstRoundTakes > 0);
  assert(report.totals.secondRoundTakes > 0);
  assert(report.totals.allPassDeals > 0);
  assert.equal(report.totals.illegalActionsRejected, 24);
  assert.equal(report.totals.winner_TEAM_0 + report.totals.winner_TEAM_1, 12);
  for (let player = 0; player < 4; player += 1) assert.equal(report.totals["dealer_PLAYER_" + player], 3);
  assert.equal(report.failure, null);
  assert.equal(report.incomplete, null);
  assert.match(report.transcriptSha256, /^[a-f0-9]{64}$/);
});

test("same options reproduce the full report and transcript", () => {
  const options = { matches: 3, startSeed: 4294967295 };
  assert.deepEqual(run(options), run(options));
  assert.notEqual(run(options).transcriptSha256, run({ ...options, startSeed: 4294967294 }).transcriptSha256);
});

test("each seed can be replayed alone without relying on preceding matches", () => {
  const startSeed = 20261028;
  const combined = run({ matches: 3, startSeed });
  const totals = Object.fromEntries(Object.keys(combined.totals).map((key) => [key, 0]));
  for (let index = 0; index < 3; index += 1) {
    const single = run({ matches: 1, startSeed: seedAt(startSeed, index) });
    assert.equal(single.status, "PASSED");
    for (const key of Object.keys(totals)) totals[key] += single.totals[key];
  }
  assert.deepEqual(combined.totals, totals);
});

test("action limit fails with an exact seed, action and replayable partial history", () => {
  const options = { matches: 3, startSeed: 7, maxActionsPerMatch: 1 };
  const report = run(options);
  assert.equal(report.status, "FAILED");
  assert.equal(report.matchesCompleted, 0);
  assert.equal(report.totals.actions, 0, "Partial matches must not inflate completed totals.");
  assert.equal(report.failure.baseSeed, 7);
  assert.equal(report.failure.actions, 1);
  assert.equal(report.failure.history.length, 1);
  assert(report.failure.lastAction);
  assert.match(report.failure.reason, /action limit/);
  assert.deepEqual(report.failure, run({ ...options, matches: 1 }).failure);
});

test("time budget produces INCOMPLETE, never a passing empty campaign", () => {
  let tick = 0;
  const report = runCampaign({ matches: 2, startSeed: 9, maxDurationMs: 1 }, { now: () => tick++ });
  assert.equal(report.status, "INCOMPLETE");
  assert.equal(report.matchesCompleted, 0);
  assert.equal(report.failure, null);
  assert.equal(report.incomplete.baseSeed, 9);
});

test("card invariant detects a duplicated card even with 32 total cards", () => {
  const state = structuredClone(playingState());
  state.currentDeal.trickSequence.hands.PLAYER_0[0] = state.currentDeal.trickSequence.hands.PLAYER_1[0];
  assert.throws(() => assertMatchState(state), /32 distinct cards/);
});

test("card invariant detects a missing card and invalid hand count", () => {
  const state = structuredClone(playingState());
  state.currentDeal.trickSequence.hands.PLAYER_0.pop();
  assert.throws(() => assertMatchState(state), /Remaining hand size/);
});

test("turn invariant detects a wrong player during a partially played trick", () => {
  const initial = playingState();
  const sequence = initial.currentDeal.trickSequence;
  const player = sequence.currentTrick.currentPlayer;
  const card = getLegalCards(sequence.hands[player], player, [], initial.currentDeal.trumpSuit)[0];
  const state = structuredClone(applyMatchCardPlay(initial, player, card).state);
  state.currentDeal.trickSequence.currentTrick.currentPlayer = player;
  assert.throws(() => assertMatchState(state), /Wrong current player/);
});

test("winner invariant detects an impossible score/completion combination", () => {
  const state = structuredClone(createMatchMachine({ baseSeed: 1 }));
  state.score.scores.TEAM_0 = 1000;
  assert.throws(() => assertMatchState(state), /Match winner/);
});

test("CLI rejects malformed, duplicate, unknown and unbounded arguments", () => {
  for (const args of [
    ["--matches", "0"], ["--matches", "1000001"], ["--matches", "1.5"],
    ["--matches", "1e3"], ["--matches", "-1"], ["--matches"],
    ["--matches", "1", "--matches", "2"], ["--unknown", "1"],
    ["--start-seed", "4294967296"], ["--max-duration-ms", "0"],
    ["--report", ""],
  ]) assert.throws(() => parseArguments(args), undefined, JSON.stringify(args));
  assert.throws(() => validateOptions({ matches: Number.NaN }));
  assert.throws(() => validateOptions({ unexpected: 1 }));
});

test("real CLI returns JSON, saves an identical report and never overwrites a file", () => {
  const dir = mkdtempSync(join(tmpdir(), "atoutia-simulation-"));
  try {
    const path = join(dir, "report.json");
    const args = [cliPath, "--matches", "1", "--start-seed", "20261028", "--report", path];
    const result = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, "PASSED");
    assert.equal(readFileSync(path, "utf8"), result.stdout);
    writeFileSync(path, "keep this file");
    const repeated = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 15000 });
    assert.equal(repeated.status, 1);
    assert.equal(readFileSync(path, "utf8"), "keep this file");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("real CLI reports a bounded failure and exits nonzero", () => {
  const result = spawnSync(process.execPath, [cliPath, "--matches", "2", "--max-actions-per-match", "1"], { encoding: "utf8", timeout: 15000 });
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "FAILED");
  assert.equal(report.matchesCompleted, 0);
  assert.equal(report.failure.baseSeed, 20261028);
});

test("real CLI exits 2 when its campaign budget cannot complete the request", () => {
  const result = spawnSync(process.execPath, [cliPath, "--matches", "1000000", "--max-duration-ms", "1"], { encoding: "utf8", timeout: 15000 });
  assert.equal(result.status, 2);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "INCOMPLETE");
  assert(report.matchesCompleted < report.config.matches);
  assert.equal(report.failure, null);
});
