import { describe, expect, it } from "vitest";

import {
  createLitigeState,
  resolveDealResult,
  resolveLitigeForDeal,
  type TeamPoints,
} from "../src/index.js";

function points(
  team0: number,
  team1: number,
): TeamPoints {
  return Object.freeze({
    TEAM_0: team0,
    TEAM_1: team1,
  });
}

describe("litige", () => {
  it("starts with no pending litige points", () => {
    const state = createLitigeState();

    expect(state.pendingPoints).toBe(0);
    expect(Object.isFrozen(state)).toBe(true);
  });

  it("awards defense points immediately on an 81 to 81 litige", () => {
    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(81, 81),
      null,
    );

    const resolution = resolveLitigeForDeal(
      createLitigeState(),
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(0, 81),
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(81);
  });

  it("stores the taker comparison points as pending litige points", () => {
    const dealResult = resolveDealResult(
      "PLAYER_1",
      points(81, 81),
      null,
    );

    const resolution = resolveLitigeForDeal(
      createLitigeState(),
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(81, 0),
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(81);
  });

  it("supports a 91 to 91 litige involving Belote", () => {
    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(91, 71),
      {
        team: "TEAM_1",
        points: 20,
      },
    );

    const resolution = resolveLitigeForDeal(
      createLitigeState(),
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(0, 91),
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(91);
  });

  it("awards previous pending litige points to the next successful taker team", () => {
    const state = Object.freeze({
      pendingPoints: 81,
    });

    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(90, 72),
      null,
    );

    const resolution = resolveLitigeForDeal(
      state,
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(171, 72),
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(0);
  });

  it("awards previous pending points to a successful TEAM_1 taker", () => {
    const state = Object.freeze({
      pendingPoints: 81,
    });

    const dealResult = resolveDealResult(
      "PLAYER_1",
      points(70, 92),
      null,
    );

    const resolution = resolveLitigeForDeal(
      state,
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(70, 173),
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(0);
  });

  it("awards pending litige points to the taker team even when the new contract fails", () => {
    const state = Object.freeze({
      pendingPoints: 81,
    });

    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(70, 92),
      null,
    );

    const resolution = resolveLitigeForDeal(
      state,
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(81, 162),
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(0);
  });

  it("gives the previous pending litige to the new defense on consecutive litige", () => {
    const state = Object.freeze({
      pendingPoints: 81,
    });

    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(81, 81),
      null,
    );

    const resolution = resolveLitigeForDeal(
      state,
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(0, 162),
    );
  });

  it("creates a fresh pending litige after consecutive litige", () => {
    const state = Object.freeze({
      pendingPoints: 81,
    });

    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(81, 81),
      null,
    );

    const resolution = resolveLitigeForDeal(
      state,
      dealResult,
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(81);
  });

  it("handles consecutive 91 point litiges correctly", () => {
    const state = Object.freeze({
      pendingPoints: 91,
    });

    const dealResult = resolveDealResult(
      "PLAYER_1",
      points(71, 91),
      {
        team: "TEAM_0",
        points: 20,
      },
    );

    const resolution = resolveLitigeForDeal(
      state,
      dealResult,
    );

    expect(resolution.awardedPoints).toEqual(
      points(182, 0),
    );

    expect(
      resolution.nextLitigeState.pendingPoints,
    ).toBe(91);
  });

  it("rejects negative pending litige points", () => {
    const state = Object.freeze({
      pendingPoints: -1,
    });

    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(90, 72),
      null,
    );

    expect(() =>
      resolveLitigeForDeal(
        state,
        dealResult,
      ),
    ).toThrow(
      "Pending litige points cannot be negative.",
    );
  });

  it("returns immutable resolution objects", () => {
    const dealResult = resolveDealResult(
      "PLAYER_0",
      points(81, 81),
      null,
    );

    const resolution = resolveLitigeForDeal(
      createLitigeState(),
      dealResult,
    );

    expect(Object.isFrozen(resolution)).toBe(true);
    expect(
      Object.isFrozen(resolution.awardedPoints),
    ).toBe(true);
    expect(
      Object.isFrozen(
        resolution.nextLitigeState,
      ),
    ).toBe(true);
  });
});