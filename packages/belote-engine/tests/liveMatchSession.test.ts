import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyLiveMatchSessionCommand,
  createLiveMatchSession,
  createLiveMatchSessionSnapshot,
  createPlayerCommandDocument,
} from "../src/index.js";

describe("live match session", () => {
  it("creates a live match session with a secure session ID", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 1000,
        randomBytes:
          (bytes) => {
            bytes.fill(0xab);

            return bytes;
          },
      });

    expect(
      session.sessionId,
    ).toBe(
      "ms1_abababababababababababababababab",
    );

    expect(
      session.state.baseSeed,
    ).toBe(1000);

    expect(
      Object.isFrozen(session),
    ).toBe(true);
  });

  it("preserves the requested first dealer", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 2000,
        firstDealer:
          "PLAYER_2",
        randomBytes:
          (bytes) =>
            bytes,
      });

    expect(
      session.state.firstDealer,
    ).toBe(
      "PLAYER_2",
    );

    expect(
      session.state.dealer,
    ).toBe(
      "PLAYER_2",
    );
  });

  it("preserves the requested target score", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 3000,
        targetScore: 500,
        randomBytes:
          (bytes) =>
            bytes,
      });

    expect(
      session.state.score.targetScore,
    ).toBe(500);
  });

  it("creates a private snapshot for a player", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 4000,
        randomBytes:
          (bytes) =>
            bytes,
      });

    const player =
      session.state.currentDeal
        .bidding.currentPlayer;

    const snapshot =
      createLiveMatchSessionSnapshot(
        session,
        player,
      );

    expect(
      snapshot.match.player,
    ).toBe(player);

    expect(
      snapshot.actions,
    ).toBeDefined();
  });

  it("applies a valid command to the live session", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 5000,
        randomBytes:
          (bytes) =>
            bytes,
      });

    const player =
      session.state.currentDeal
        .bidding.currentPlayer;

    const command =
      createPlayerCommandDocument(
        player,
        {
          type: "PASS",
        },
      );

    const result =
      applyLiveMatchSessionCommand({
        session,
        authenticatedPlayer:
          player,
        command,
      });

    expect(
      result.session,
    ).not.toBe(session);

    expect(
      result.session.state,
    ).not.toBe(
      session.state,
    );

    expect(
      result.session.sessionId,
    ).toBe(
      session.sessionId,
    );

    expect(
      result.session.state.history
        .length,
    ).toBe(1);

    expect(
      result.snapshot.match.player,
    ).toBe(player);
  });

  it("does not mutate the previous live session", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 6000,
        randomBytes:
          (bytes) =>
            bytes,
      });

    const player =
      session.state.currentDeal
        .bidding.currentPlayer;

    const command =
      createPlayerCommandDocument(
        player,
        {
          type: "PASS",
        },
      );

    const result =
      applyLiveMatchSessionCommand({
        session,
        authenticatedPlayer:
          player,
        command,
      });

    expect(
      session.state.history.length,
    ).toBe(0);

    expect(
      result.session.state.history
        .length,
    ).toBe(1);
  });

  it("rejects command identity spoofing", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 7000,
        randomBytes:
          (bytes) =>
            bytes,
      });

    const currentPlayer =
      session.state.currentDeal
        .bidding.currentPlayer;

    const otherPlayer =
      currentPlayer ===
      "PLAYER_0"
        ? "PLAYER_1"
        : "PLAYER_0";

    const command =
      createPlayerCommandDocument(
        currentPlayer,
        {
          type: "PASS",
        },
      );

    expect(() =>
      applyLiveMatchSessionCommand({
        session,
        authenticatedPlayer:
          otherPlayer,
        command,
      }),
    ).toThrow(
      "Player command identity mismatch",
    );

    expect(
      session.state.history.length,
    ).toBe(0);
  });

  it("rejects engine-invalid commands", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 8000,
        randomBytes:
          (bytes) =>
            bytes,
      });

    const currentPlayer =
      session.state.currentDeal
        .bidding.currentPlayer;

    const wrongPlayer =
      currentPlayer ===
      "PLAYER_0"
        ? "PLAYER_1"
        : "PLAYER_0";

    const command =
      createPlayerCommandDocument(
        wrongPlayer,
        {
          type: "PASS",
        },
      );

    expect(() =>
      applyLiveMatchSessionCommand({
        session,
        authenticatedPlayer:
          wrongPlayer,
        command,
      }),
    ).toThrow();

    expect(
      session.state.history.length,
    ).toBe(0);
  });

  it("returns an immutable command result", () => {
    const session =
      createLiveMatchSession({
        baseSeed: 9000,
        randomBytes:
          (bytes) =>
            bytes,
      });

    const player =
      session.state.currentDeal
        .bidding.currentPlayer;

    const command =
      createPlayerCommandDocument(
        player,
        {
          type: "PASS",
        },
      );

    const result =
      applyLiveMatchSessionCommand({
        session,
        authenticatedPlayer:
          player,
        command,
      });

    expect(
      Object.isFrozen(result),
    ).toBe(true);

    expect(
      Object.isFrozen(
        result.session,
      ),
    ).toBe(true);
  });
});