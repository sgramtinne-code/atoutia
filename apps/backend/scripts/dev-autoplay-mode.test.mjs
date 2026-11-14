import { expect, test } from "vitest";
import { assertHumanRoom, autoplayPlayers, parseAutoplayArguments } from "./dev-autoplay-mode.mjs";
const id = "ms1_" + "0".repeat(32);
const duo = { mode: "PRIVATE", phase: "WAITING_FOR_PLAYERS", occupiedSeats: 2,
  seats: { PLAYER_0: true, PLAYER_1: true, PLAYER_2: false, PLAYER_3: false } };

test("two Android accounts reserve 0/1 and control only 2/3; old modes retain their players", () => {
  expect(parseAutoplayArguments([id, "--android-players-0-1"])).toEqual({ mode: "ANDROID_PLAYERS_0_1", sessionId: id });
  expect(autoplayPlayers("ANDROID_PLAYERS_0_1")).toEqual({ humans: ["PLAYER_0", "PLAYER_1"], bots: ["PLAYER_2", "PLAYER_3"] });
  expect(autoplayPlayers(parseAutoplayArguments([id, "--android-player-0"]).mode).bots).toEqual(["PLAYER_1", "PLAYER_2", "PLAYER_3"]);
  expect(autoplayPlayers(parseAutoplayArguments(["--all-bots"]).mode).bots).toEqual(["PLAYER_0", "PLAYER_1", "PLAYER_2", "PLAYER_3"]);
});

test("invalid modes and extra arguments cannot select bot seats", () => {
  for (const args of [[], ["--all-bots", id], [id, "--android-players-0-1", "extra"], ["ms1_x", "--android-players-0-1"], [id, "--unknown"]]) {
    expect(() => parseAutoplayArguments(args)).toThrow(/Usage/);
  }
  expect(() => autoplayPlayers("__proto__")).toThrow();
});

test("bots refuse ready, started, public, missing-human and occupied-bot rooms before creating an identity", () => {
  expect(() => assertHumanRoom(duo, "ANDROID_PLAYERS_0_1")).not.toThrow();
  for (const room of [ { ...duo, phase: "READY" }, { ...duo, phase: "STARTED" }, { ...duo, mode: "CASUAL" },
    { ...duo, occupiedSeats: 1 }, { ...duo, seats: { ...duo.seats, PLAYER_1: false } },
    { ...duo, seats: { ...duo.seats, PLAYER_2: true } } ]) {
    expect(() => assertHumanRoom(room, "ANDROID_PLAYERS_0_1")).toThrow();
  }
  expect(() => assertHumanRoom({ ...duo, occupiedSeats: 1, seats: { ...duo.seats, PLAYER_1: false } }, "ANDROID_PLAYER_0")).not.toThrow();
});
