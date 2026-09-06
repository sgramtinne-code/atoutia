import { describe, expect, it } from "vitest";

import {
  resolveDealResult,
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

describe("deal result", () => {
  it("recognizes a successful contract for TEAM_0", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(90, 72),
      null,
    );

    expect(result.status).toBe("CONTRACT_MADE");
    expect(result.takerTeam).toBe("TEAM_0");
    expect(result.defendingTeam).toBe("TEAM_1");

    expect(result.awardedPoints).toEqual(
      points(90, 72),
    );
  });

  it("recognizes a successful contract for TEAM_1", () => {
    const result = resolveDealResult(
      "PLAYER_3",
      points(70, 92),
      null,
    );

    expect(result.status).toBe("CONTRACT_MADE");
    expect(result.takerTeam).toBe("TEAM_1");
  });

  it("recognizes a failed contract", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(70, 92),
      null,
    );

    expect(result.status).toBe("CONTRACT_FAILED");

    expect(result.awardedPoints).toEqual(
      points(0, 162),
    );
  });

  it("keeps taker Belote points when the contract fails", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(60, 102),
      {
        team: "TEAM_0",
        points: 20,
      },
    );

    expect(result.status).toBe("CONTRACT_FAILED");

    expect(result.awardedPoints).toEqual(
      points(20, 162),
    );
  });

  it("adds defending Belote to the defense on a failed contract", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(70, 92),
      {
        team: "TEAM_1",
        points: 20,
      },
    );

    expect(result.status).toBe("CONTRACT_FAILED");

    expect(result.awardedPoints).toEqual(
      points(0, 182),
    );
  });

  it("includes Belote when deciding whether the contract succeeds", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(75, 87),
      {
        team: "TEAM_0",
        points: 20,
      },
    );

    expect(result.comparisonPoints).toEqual(
      points(95, 87),
    );

    expect(result.status).toBe("CONTRACT_MADE");
  });

  it("can make the defense stronger through Belote", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(85, 77),
      {
        team: "TEAM_1",
        points: 20,
      },
    );

    expect(result.comparisonPoints).toEqual(
      points(85, 97),
    );

    expect(result.status).toBe("CONTRACT_FAILED");
  });

  it("identifies an equality as litige for later resolution", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(81, 81),
      null,
    );

    expect(result.status).toBe("LITIGE");
  });

  it("identifies a 91 to 91 equality with Belote as litige", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(91, 71),
      {
        team: "TEAM_1",
        points: 20,
      },
    );

    expect(result.comparisonPoints).toEqual(
      points(91, 91),
    );

    expect(result.status).toBe("LITIGE");
  });

  it("rejects raw points that do not total 162", () => {
    expect(() =>
      resolveDealResult(
        "PLAYER_0",
        points(80, 80),
        null,
      ),
    ).toThrow(
      "Raw trick points must total exactly 162.",
    );
  });

  it("rejects negative raw points", () => {
    expect(() =>
      resolveDealResult(
        "PLAYER_0",
        points(-1, 163),
        null,
      ),
    ).toThrow(
      "Raw trick points cannot be negative.",
    );
  });

  it("returns immutable result objects", () => {
    const result = resolveDealResult(
      "PLAYER_0",
      points(90, 72),
      null,
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(
      Object.isFrozen(result.comparisonPoints),
    ).toBe(true);
    expect(
      Object.isFrozen(result.awardedPoints),
    ).toBe(true);
  });
});