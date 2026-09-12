import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchSessionCommand,
  createMatchMachine,
  createPlayerCommandDocument,
} from "../src/index.js";

describe("matchSession", () => {
  it("applies a valid command for the authenticated player", () => {
    const state =
      createMatchMachine({
        baseSeed: 12345,
      });

    const command =
      createPlayerCommandDocument(
        "PLAYER_1",
        {
          type: "PASS",
        },
      );

    const result =
      applyMatchSessionCommand({
        state,
        authenticatedPlayer:
          "PLAYER_1",
        command,
      });

    expect(
      result.state,
    ).not.toBe(state);

    expect(
      result.snapshot.match.player,
    ).toBe("PLAYER_1");
  });

  it("rejects a command that belongs to another player", () => {
    const state =
      createMatchMachine({
        baseSeed: 12345,
      });

    const command =
      createPlayerCommandDocument(
        "PLAYER_2",
        {
          type: "PASS",
        },
      );

    expect(() =>
      applyMatchSessionCommand({
        state,
        authenticatedPlayer:
          "PLAYER_1",
        command,
      }),
    ).toThrow(
      "Player command identity mismatch",
    );
  });

  it("does not mutate the original state when a command is rejected", () => {
    const state =
      createMatchMachine({
        baseSeed: 12345,
      });

    const originalHistory =
      state.history;

    const command =
      createPlayerCommandDocument(
        "PLAYER_2",
        {
          type: "PASS",
        },
      );

    expect(() =>
      applyMatchSessionCommand({
        state,
        authenticatedPlayer:
          "PLAYER_1",
        command,
      }),
    ).toThrow();

    expect(
      state.history,
    ).toBe(originalHistory);

    expect(
      state.history.length,
    ).toBe(0);
  });

  it("returns a player snapshot after a valid command", () => {
    const state =
      createMatchMachine({
        baseSeed: 12345,
      });

    const command =
      createPlayerCommandDocument(
        "PLAYER_1",
        {
          type: "PASS",
        },
      );

    const result =
      applyMatchSessionCommand({
        state,
        authenticatedPlayer:
          "PLAYER_1",
        command,
      });

    expect(
      result.snapshot,
    ).toBeDefined();

    expect(
      result.snapshot.match.player,
    ).toBe("PLAYER_1");

    expect(
      result.snapshot.actions,
    ).toBeDefined();
  });

  it("propagates engine rejection for an illegal command", () => {
    const state =
      createMatchMachine({
        baseSeed: 12345,
      });

    const command =
      createPlayerCommandDocument(
        "PLAYER_0",
        {
          type: "PASS",
        },
      );

    expect(() =>
      applyMatchSessionCommand({
        state,
        authenticatedPlayer:
          "PLAYER_0",
        command,
      }),
    ).toThrow();
  });

  it("adds a valid command to match history", () => {
    const state =
      createMatchMachine({
        baseSeed: 12345,
      });

    const command =
      createPlayerCommandDocument(
        "PLAYER_1",
        {
          type: "PASS",
        },
      );

    const result =
      applyMatchSessionCommand({
        state,
        authenticatedPlayer:
          "PLAYER_1",
        command,
      });

    expect(
      result.state.history.length,
    ).toBe(1);

    expect(
      result.state.history[0]?.type,
    ).toBe("BIDDING_ACTION");
  });

  it("returns an immutable session result", () => {
    const state =
      createMatchMachine({
        baseSeed: 12345,
      });

    const command =
      createPlayerCommandDocument(
        "PLAYER_1",
        {
          type: "PASS",
        },
      );

    const result =
      applyMatchSessionCommand({
        state,
        authenticatedPlayer:
          "PLAYER_1",
        command,
      });

    expect(
      Object.isFrozen(result),
    ).toBe(true);
  });
});