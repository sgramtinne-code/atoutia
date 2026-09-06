import { describe, expect, it } from "vitest";

import {
  addDealPointsToMatch,
  createMatchScoreState,
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

describe("match score", () => {
  it("creates a match with zero scores", () => {
    const state =
      createMatchScoreState();

    expect(state.targetScore).toBe(1000);

    expect(state.scores).toEqual({
      TEAM_0: 0,
      TEAM_1: 0,
    });

    expect(state.completed).toBe(false);
    expect(state.winner).toBeNull();
  });

  it("supports a custom target score", () => {
    const state =
      createMatchScoreState(500);

    expect(state.targetScore).toBe(500);
  });

  it("rejects a zero target score", () => {
    expect(() =>
      createMatchScoreState(0),
    ).toThrow(
      "Target score must be a positive integer.",
    );
  });

  it("rejects a negative target score", () => {
    expect(() =>
      createMatchScoreState(-100),
    ).toThrow(
      "Target score must be a positive integer.",
    );
  });

  it("rejects a non-integer target score", () => {
    expect(() =>
      createMatchScoreState(1000.5),
    ).toThrow(
      "Target score must be a positive integer.",
    );
  });

  it("adds deal points to both teams", () => {
    const result =
      addDealPointsToMatch(
        createMatchScoreState(),
        points(90, 72),
      );

    expect(result.scores).toEqual({
      TEAM_0: 90,
      TEAM_1: 72,
    });

    expect(result.completed).toBe(false);
  });

  it("accumulates points over several deals", () => {
    let state =
      createMatchScoreState();

    state = addDealPointsToMatch(
      state,
      points(90, 72),
    );

    state = addDealPointsToMatch(
      state,
      points(162, 0),
    );

    expect(state.scores).toEqual({
      TEAM_0: 252,
      TEAM_1: 72,
    });
  });

  it("declares TEAM_0 winner when target is reached", () => {
    let state =
      createMatchScoreState(200);

    state = addDealPointsToMatch(
      state,
      points(150, 50),
    );

    state = addDealPointsToMatch(
      state,
      points(60, 102),
    );

    expect(state.scores).toEqual({
      TEAM_0: 210,
      TEAM_1: 152,
    });

    expect(state.completed).toBe(true);
    expect(state.winner).toBe("TEAM_0");
  });

  it("declares TEAM_1 winner when target is reached", () => {
    const state =
      addDealPointsToMatch(
        createMatchScoreState(200),
        points(50, 220),
      );

    expect(state.completed).toBe(true);
    expect(state.winner).toBe("TEAM_1");
  });

  it("uses the highest score if both teams cross the target on the same deal", () => {
    const state =
      addDealPointsToMatch(
        createMatchScoreState(100),
        points(120, 140),
      );

    expect(state.completed).toBe(true);
    expect(state.winner).toBe("TEAM_1");
  });

  it("does not end the match on an exact tie above target", () => {
    const state =
      addDealPointsToMatch(
        createMatchScoreState(100),
        points(120, 120),
      );

    expect(state.scores).toEqual({
      TEAM_0: 120,
      TEAM_1: 120,
    });

    expect(state.completed).toBe(false);
    expect(state.winner).toBeNull();
  });

  it("continues after a tie above target until one team leads", () => {
    let state =
      addDealPointsToMatch(
        createMatchScoreState(100),
        points(120, 120),
      );

    state = addDealPointsToMatch(
      state,
      points(20, 0),
    );

    expect(state.scores).toEqual({
      TEAM_0: 140,
      TEAM_1: 120,
    });

    expect(state.completed).toBe(true);
    expect(state.winner).toBe("TEAM_0");
  });

  it("rejects negative deal points", () => {
    expect(() =>
      addDealPointsToMatch(
        createMatchScoreState(),
        points(-1, 163),
      ),
    ).toThrow(
      "Deal points cannot be negative.",
    );
  });

  it("rejects adding points after the match has ended", () => {
    const completed =
      addDealPointsToMatch(
        createMatchScoreState(100),
        points(150, 50),
      );

    expect(() =>
      addDealPointsToMatch(
        completed,
        points(0, 162),
      ),
    ).toThrow(
      "Match is already completed.",
    );
  });

  it("returns immutable match state", () => {
    const state =
      addDealPointsToMatch(
        createMatchScoreState(),
        points(90, 72),
      );

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.scores)).toBe(true);
  });
});