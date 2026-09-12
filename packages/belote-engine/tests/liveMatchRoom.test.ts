import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyLiveMatchRoomParticipantCommand,
  claimLiveMatchRoomSeat,
  createLiveMatchRoom,
  createLiveMatchRoomParticipantSnapshot,
  releaseLiveMatchRoomSeat,
} from "../src/index.js";

function createTestRoom() {
  return createLiveMatchRoom({
    baseSeed: 1000,

    randomBytes:
      (bytes) => {
        bytes.fill(0xab);

        return bytes;
      },
  });
}

describe(
  "live match room",
  () => {
    it("creates a room with a live session and four empty seats", () => {
      const room =
        createTestRoom();

      expect(
        room.session.sessionId,
      ).toBe(
        "ms1_abababababababababababababababab",
      );

      expect(
        room.seats.assignments,
      ).toEqual({
        PLAYER_0: null,
        PLAYER_1: null,
        PLAYER_2: null,
        PLAYER_3: null,
      });

      expect(
        Object.isFrozen(room),
      ).toBe(true);
    });

    it("claims a seat without changing the live session", () => {
      const initial =
        createTestRoom();

      const room =
        claimLiveMatchRoomSeat({
          room: initial,
          player: "PLAYER_0",
          participantId:
            "participant-a",
        });

      expect(
        room.session,
      ).toBe(
        initial.session,
      );

      expect(
        room.seats.assignments
          .PLAYER_0,
      ).toBe(
        "participant-a",
      );

      expect(
        initial.seats.assignments
          .PLAYER_0,
      ).toBe(null);
    });

    it("returns the same room when the same participant claims the same seat again", () => {
      const occupied =
        claimLiveMatchRoomSeat({
          room:
            createTestRoom(),

          player:
            "PLAYER_0",

          participantId:
            "participant-a",
        });

      const repeated =
        claimLiveMatchRoomSeat({
          room:
            occupied,

          player:
            "PLAYER_0",

          participantId:
            "participant-a",
        });

      expect(
        repeated,
      ).toBe(
        occupied,
      );
    });

    it("rejects an already occupied seat", () => {
      const occupied =
        claimLiveMatchRoomSeat({
          room:
            createTestRoom(),

          player:
            "PLAYER_1",

          participantId:
            "participant-a",
        });

      expect(() =>
        claimLiveMatchRoomSeat({
          room:
            occupied,

          player:
            "PLAYER_1",

          participantId:
            "participant-b",
        }),
      ).toThrow(
        "Match seat PLAYER_1 is already occupied",
      );
    });

    it("releases a participant seat", () => {
      const occupied =
        claimLiveMatchRoomSeat({
          room:
            createTestRoom(),

          player:
            "PLAYER_2",

          participantId:
            "participant-a",
        });

      const released =
        releaseLiveMatchRoomSeat({
          room:
            occupied,

          player:
            "PLAYER_2",

          participantId:
            "participant-a",
        });

      expect(
        released.seats.assignments
          .PLAYER_2,
      ).toBe(null);

      expect(
        occupied.seats.assignments
          .PLAYER_2,
      ).toBe(
        "participant-a",
      );
    });

    it("creates a player snapshot using only participant identity", () => {
      const initial =
        createTestRoom();

      const currentPlayer =
        initial.session.state
          .currentDeal.bidding
          .currentPlayer;

      const room =
        claimLiveMatchRoomSeat({
          room:
            initial,

          player:
            currentPlayer,

          participantId:
            "participant-a",
        });

      const snapshot =
        createLiveMatchRoomParticipantSnapshot(
          room,
          "participant-a",
        );

      expect(
        snapshot.match.player,
      ).toBe(
        currentPlayer,
      );
    });

    it("rejects private snapshot access for an unseated participant", () => {
      const room =
        createTestRoom();

      expect(() =>
        createLiveMatchRoomParticipantSnapshot(
          room,
          "participant-x",
        ),
      ).toThrow(
        "Participant participant-x does not occupy a match seat",
      );
    });

    it("applies a participant command and preserves seat assignments", () => {
      const initial =
        createTestRoom();

      const currentPlayer =
        initial.session.state
          .currentDeal.bidding
          .currentPlayer;

      const room =
        claimLiveMatchRoomSeat({
          room:
            initial,

          player:
            currentPlayer,

          participantId:
            "participant-a",
        });

      const result =
        applyLiveMatchRoomParticipantCommand({
          room,

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
        result.room.session.state
          .history.length,
      ).toBe(1);

      expect(
        result.room.seats,
      ).toBe(
        room.seats,
      );

      expect(
        result.room.session.sessionId,
      ).toBe(
        room.session.sessionId,
      );
    });

    it("does not mutate the previous room when applying a command", () => {
      const initial =
        createTestRoom();

      const currentPlayer =
        initial.session.state
          .currentDeal.bidding
          .currentPlayer;

      const room =
        claimLiveMatchRoomSeat({
          room:
            initial,

          player:
            currentPlayer,

          participantId:
            "participant-a",
        });

      const result =
        applyLiveMatchRoomParticipantCommand({
          room,

          participantId:
            "participant-a",

          command: {
            type: "PASS",
          },
        });

      expect(
        room.session.state.history
          .length,
      ).toBe(0);

      expect(
        result.room.session.state
          .history.length,
      ).toBe(1);
    });

    it("returns immutable room command results", () => {
      const initial =
        createTestRoom();

      const currentPlayer =
        initial.session.state
          .currentDeal.bidding
          .currentPlayer;

      const room =
        claimLiveMatchRoomSeat({
          room:
            initial,

          player:
            currentPlayer,

          participantId:
            "participant-a",
        });

      const result =
        applyLiveMatchRoomParticipantCommand({
          room,

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
          result.room,
        ),
      ).toBe(true);
    });
  },
);