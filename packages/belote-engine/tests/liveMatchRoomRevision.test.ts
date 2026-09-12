import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyRevisionedLiveMatchRoomCommand,
  claimRevisionedLiveMatchRoomSeat,
  createRevisionedLiveMatchRoom,
  releaseRevisionedLiveMatchRoomSeat,
  startRevisionedLiveMatchRoom,
} from "../src/index.js";

function createTestRoom() {
  return createRevisionedLiveMatchRoom({
    baseSeed: 1000,

    randomBytes:
      (bytes) => {
        bytes.fill(0xab);

        return bytes;
      },
  });
}

function fillAllSeats() {
  let room =
    createTestRoom();

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,
      expectedRevision:
        room.revision,
      player:
        "PLAYER_0",
      participantId:
        "a",
    });

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,
      expectedRevision:
        room.revision,
      player:
        "PLAYER_1",
      participantId:
        "b",
    });

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,
      expectedRevision:
        room.revision,
      player:
        "PLAYER_2",
      participantId:
        "c",
    });

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,
      expectedRevision:
        room.revision,
      player:
        "PLAYER_3",
      participantId:
        "d",
    });

  return room;
}

describe(
  "live match room revision",
  () => {
    it("starts at revision zero", () => {
      const room =
        createTestRoom();

      expect(
        room.revision,
      ).toBe(0);

      expect(
        Object.isFrozen(room),
      ).toBe(true);
    });

    it("increments revision when a seat is claimed", () => {
      const initial =
        createTestRoom();

      const room =
        claimRevisionedLiveMatchRoomSeat({
          room:
            initial,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "a",
        });

      expect(
        room.revision,
      ).toBe(1);

      expect(
        initial.revision,
      ).toBe(0);
    });

    it("does not increment revision for an idempotent same-seat claim", () => {
      const claimed =
        claimRevisionedLiveMatchRoomSeat({
          room:
            createTestRoom(),

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "a",
        });

      const repeated =
        claimRevisionedLiveMatchRoomSeat({
          room:
            claimed,

          expectedRevision:
            1,

          player:
            "PLAYER_0",

          participantId:
            "a",
        });

      expect(
        repeated,
      ).toBe(
        claimed,
      );

      expect(
        repeated.revision,
      ).toBe(1);
    });

    it("rejects a stale seat claim", () => {
      const room =
        claimRevisionedLiveMatchRoomSeat({
          room:
            createTestRoom(),

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "a",
        });

      expect(() =>
        claimRevisionedLiveMatchRoomSeat({
          room,

          expectedRevision:
            0,

          player:
            "PLAYER_1",

          participantId:
            "b",
        }),
      ).toThrow(
        "Match room revision mismatch: expected 0, current 1",
      );
    });

    it("increments revision when a seat is released", () => {
      const claimed =
        claimRevisionedLiveMatchRoomSeat({
          room:
            createTestRoom(),

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "a",
        });

      const released =
        releaseRevisionedLiveMatchRoomSeat({
          room:
            claimed,

          expectedRevision:
            claimed.revision,

          player:
            "PLAYER_0",

          participantId:
            "a",
        });

      expect(
        released.revision,
      ).toBe(2);
    });

    it("reaches revision four after all four players join", () => {
      const room =
        fillAllSeats();

      expect(
        room.revision,
      ).toBe(4);

      expect(
        room.managedRoom.phase,
      ).toBe(
        "READY",
      );
    });

    it("increments revision when the match starts", () => {
      const ready =
        fillAllSeats();

      const started =
        startRevisionedLiveMatchRoom({
          room:
            ready,

          expectedRevision:
            ready.revision,
        });

      expect(
        started.revision,
      ).toBe(5);

      expect(
        started.managedRoom.phase,
      ).toBe(
        "IN_PROGRESS",
      );
    });

    it("rejects starting with a stale revision", () => {
      const ready =
        fillAllSeats();

      expect(() =>
        startRevisionedLiveMatchRoom({
          room:
            ready,

          expectedRevision:
            3,
        }),
      ).toThrow(
        "Match room revision mismatch: expected 3, current 4",
      );
    });

    it("increments revision after a valid match command", () => {
      const ready =
        fillAllSeats();

      const started =
        startRevisionedLiveMatchRoom({
          room:
            ready,

          expectedRevision:
            ready.revision,
        });

      const currentPlayer =
        started.managedRoom.room
          .session.state.currentDeal
          .bidding.currentPlayer;

      const participantByPlayer = {
        PLAYER_0: "a",
        PLAYER_1: "b",
        PLAYER_2: "c",
        PLAYER_3: "d",
      } as const;

      const result =
        applyRevisionedLiveMatchRoomCommand({
          room:
            started,

          expectedRevision:
            started.revision,

          participantId:
            participantByPlayer[
              currentPlayer
            ],

          command: {
            type: "PASS",
          },
        });

      expect(
        result.room.revision,
      ).toBe(6);

      expect(
        result.room.managedRoom
          .room.session.state.history
          .length,
      ).toBe(1);
    });

    it("rejects replaying the same command with the old revision", () => {
      const ready =
        fillAllSeats();

      const started =
        startRevisionedLiveMatchRoom({
          room:
            ready,

          expectedRevision:
            ready.revision,
        });

      const currentPlayer =
        started.managedRoom.room
          .session.state.currentDeal
          .bidding.currentPlayer;

      const participantByPlayer = {
        PLAYER_0: "a",
        PLAYER_1: "b",
        PLAYER_2: "c",
        PLAYER_3: "d",
      } as const;

      const oldRevision =
        started.revision;

      const first =
        applyRevisionedLiveMatchRoomCommand({
          room:
            started,

          expectedRevision:
            oldRevision,

          participantId:
            participantByPlayer[
              currentPlayer
            ],

          command: {
            type: "PASS",
          },
        });

      expect(() =>
        applyRevisionedLiveMatchRoomCommand({
          room:
            first.room,

          expectedRevision:
            oldRevision,

          participantId:
            participantByPlayer[
              currentPlayer
            ],

          command: {
            type: "PASS",
          },
        }),
      ).toThrow(
        `Match room revision mismatch: expected ${oldRevision}, current ${first.room.revision}`,
      );
    });

    it("rejects invalid negative revisions", () => {
      const room =
        createTestRoom();

      expect(() =>
        claimRevisionedLiveMatchRoomSeat({
          room,

          expectedRevision:
            -1,

          player:
            "PLAYER_0",

          participantId:
            "a",
        }),
      ).toThrow(
        "Match room revision must be a non-negative safe integer",
      );
    });

    it("does not mutate previous revisions", () => {
      const initial =
        createTestRoom();

      const next =
        claimRevisionedLiveMatchRoomSeat({
          room:
            initial,

          expectedRevision:
            initial.revision,

          player:
            "PLAYER_0",

          participantId:
            "a",
        });

      expect(
        initial.revision,
      ).toBe(0);

      expect(
        next.revision,
      ).toBe(1);

      expect(
        initial.managedRoom.room
          .seats.assignments
          .PLAYER_0,
      ).toBe(null);

      expect(
        next.managedRoom.room
          .seats.assignments
          .PLAYER_0,
      ).toBe("a");
    });
  },
);