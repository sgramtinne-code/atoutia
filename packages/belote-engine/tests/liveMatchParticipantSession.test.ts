import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyParticipantCommand,
  claimLiveMatchSeat,
  createEmptyLiveMatchSeats,
  createLiveMatchSession,
  createParticipantSnapshot,
} from "../src/index.js";

function createTestContext() {
  const session =
    createLiveMatchSession({
      baseSeed: 1000,
      randomBytes:
        (bytes) => {
          bytes.fill(0xab);

          return bytes;
        },
    });

  const currentPlayer =
    session.state.currentDeal
      .bidding.currentPlayer;

  const seats =
    claimLiveMatchSeat({
      seats:
        createEmptyLiveMatchSeats(),

      player:
        currentPlayer,

      participantId:
        "participant-a",
    });

  return {
    session,
    seats,
    currentPlayer,
  };
}

describe(
  "live match participant session",
  () => {
    it("creates a private snapshot from participant identity", () => {
      const {
        session,
        seats,
        currentPlayer,
      } = createTestContext();

      const snapshot =
        createParticipantSnapshot(
          {
            session,
            seats,
          },
          "participant-a",
        );

      expect(
        snapshot.match.player,
      ).toBe(
        currentPlayer,
      );
    });

    it("rejects snapshot access for an unseated participant", () => {
      const {
        session,
        seats,
      } = createTestContext();

      expect(() =>
        createParticipantSnapshot(
          {
            session,
            seats,
          },
          "participant-x",
        ),
      ).toThrow(
        "Participant participant-x does not occupy a match seat",
      );
    });

    it("applies a command using the participant seat", () => {
      const {
        session,
        seats,
        currentPlayer,
      } = createTestContext();

      const result =
        applyParticipantCommand({
          context: {
            session,
            seats,
          },

          participantId:
            "participant-a",

          command: {
            type: "PASS",
          },
        });

      expect(
        result.player,
      ).toBe(
        currentPlayer,
      );

      expect(
        result.context.session
          .state.history.length,
      ).toBe(1);

      expect(
        result.snapshot.match.player,
      ).toBe(
        currentPlayer,
      );
    });

    it("preserves the live session ID", () => {
      const {
        session,
        seats,
      } = createTestContext();

      const result =
        applyParticipantCommand({
          context: {
            session,
            seats,
          },

          participantId:
            "participant-a",

          command: {
            type: "PASS",
          },
        });

      expect(
        result.context.session
          .sessionId,
      ).toBe(
        session.sessionId,
      );
    });

    it("preserves seat assignments after a command", () => {
      const {
        session,
        seats,
      } = createTestContext();

      const result =
        applyParticipantCommand({
          context: {
            session,
            seats,
          },

          participantId:
            "participant-a",

          command: {
            type: "PASS",
          },
        });

      expect(
        result.context.seats,
      ).toBe(
        seats,
      );
    });

    it("does not mutate the original session", () => {
      const {
        session,
        seats,
      } = createTestContext();

      const result =
        applyParticipantCommand({
          context: {
            session,
            seats,
          },

          participantId:
            "participant-a",

          command: {
            type: "PASS",
          },
        });

      expect(
        session.state.history.length,
      ).toBe(0);

      expect(
        result.context.session
          .state.history.length,
      ).toBe(1);
    });

    it("rejects commands from an unseated participant", () => {
      const {
        session,
        seats,
      } = createTestContext();

      expect(() =>
        applyParticipantCommand({
          context: {
            session,
            seats,
          },

          participantId:
            "participant-x",

          command: {
            type: "PASS",
          },
        }),
      ).toThrow(
        "Participant participant-x does not occupy a match seat",
      );

      expect(
        session.state.history.length,
      ).toBe(0);
    });

    it("still lets the engine reject an illegal seated-player command", () => {
      const session =
        createLiveMatchSession({
          baseSeed: 2000,
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

      const seats =
        claimLiveMatchSeat({
          seats:
            createEmptyLiveMatchSeats(),

          player:
            wrongPlayer,

          participantId:
            "participant-b",
        });

      expect(() =>
        applyParticipantCommand({
          context: {
            session,
            seats,
          },

          participantId:
            "participant-b",

          command: {
            type: "PASS",
          },
        }),
      ).toThrow();

      expect(
        session.state.history.length,
      ).toBe(0);
    });

    it("returns immutable context and result objects", () => {
      const {
        session,
        seats,
      } = createTestContext();

      const result =
        applyParticipantCommand({
          context: {
            session,
            seats,
          },

          participantId:
            "participant-a",

          command: {
            type: "PASS",
          },
        });

      expect(
        Object.isFrozen(result),
      ).toBe(true);

      expect(
        Object.isFrozen(
          result.context,
        ),
      ).toBe(true);
    });
  },
);