import { describe, expect, it } from "vitest";
import { resolveDealResult, resolveLitigeForDeal } from "../src/index.js";

describe("pending litige goes to the next deal winner", () => {
  it.each([
    ["PLAYER_0", { TEAM_0: 70, TEAM_1: 92 }, { TEAM_0: 0, TEAM_1: 243 }],
    ["PLAYER_1", { TEAM_0: 92, TEAM_1: 70 }, { TEAM_0: 243, TEAM_1: 0 }],
  ] as const)("awards the pending bonus to defense after %s fails", (taker, points, expected) => {
    const result = resolveLitigeForDeal({ pendingPoints: 81 }, resolveDealResult(taker, points, null));
    expect(result.awardedPoints).toEqual(expected);
    expect(result.nextLitigeState.pendingPoints).toBe(0);
  });

  it.each([
    ["PLAYER_0", { TEAM_0: 70, TEAM_1: 92 }, "TEAM_0", { TEAM_0: 20, TEAM_1: 253 }],
    ["PLAYER_1", { TEAM_0: 92, TEAM_1: 70 }, "TEAM_1", { TEAM_0: 253, TEAM_1: 20 }],
  ] as const)("preserves %s's unstealable Belote while defense receives the bonus", (taker, points, beloteTeam, expected) => {
    const result = resolveLitigeForDeal({ pendingPoints: 91 }, resolveDealResult(taker, points, { team: beloteTeam, points: 20 }));
    expect(result.awardedPoints).toEqual(expected);
    expect(result.nextLitigeState.pendingPoints).toBe(0);
  });
});
