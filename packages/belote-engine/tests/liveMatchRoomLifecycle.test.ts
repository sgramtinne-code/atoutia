import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyManagedLiveMatchRoomCommand,
  claimManagedLiveMatchRoomSeat,
  createManagedLiveMatchRoom,
  createManagedLiveMatchRoomParticipantSnapshot,
  releaseManagedLiveMatchRoomSeat,
  startManagedLiveMatchRoom,
} from "../src/index.js";

function createTestRoom() {
  return createManagedLiveMatchRoom({
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
    claimManagedLiveMatchRoomSeat({
      managedRoom: room,
      player: "PLAYER_0",
      participantId: "a",
    });

  room =
    claimManagedLiveMatchRoomSeat({
      managedRoom: room,
      player: "PLAYER_1",
      participantId: "b",
    });

  room =
    claimManagedLiveMatchRoomSeat({
      managedRoom: room,
      player: "PLAYER_2",
      participantId: "c",
    });

  room =
    claimManagedLiveMatchRoomSeat({
      managedRoom: room,
      player: "PLAYER_3",
      participantId: "d",
    });

  return room;
}

describe(
  "live match room lifecycle",
  () => {
    it("creates a room waiting for players", () => {
      const room =
        createTestRoom();

      expect(
        room.phase,
      ).toBe(
        "WAITING_FOR_PLAYERS",
      );

      expect(
        Object.isFrozen(room),
      ).toBe(true);
    });

    it("remains waiting while fewer than four seats are occupied", () => {
      const initial =
        createTestRoom();

      const room =
        claimManagedLiveMatchRoomSeat({
          managedRoom:
            initial,
          player:
            "PLAYER_0",
          participantId:
            "a",
        });

      expect(
        room.phase,
      ).toBe(
        "WAITING_FOR_PLAYERS",
      );
    });

    it("becomes ready when all four seats are occupied", () => {
      const room =
        fillAllSeats();

      expect(
        room.phase,
      ).toBe(
        "READY",
      );
    });

    it("returns to waiting if a player leaves before start", () => {
      const ready =
        fillAllSeats();

      const room =
        releaseManagedLiveMatchRoomSeat({
          managedRoom:
            ready,
          player:
            "PLAYER_3",
          participantId:
            "d",
        });

      expect(
        room.phase,
      ).toBe(
        "WAITING_FOR_PLAYERS",
      );
    });

    it("rejects starting before all four players are present", () => {
      const room =
        createTestRoom();

      expect(() =>
        startManagedLiveMatchRoom(
          room,
        ),
      ).toThrow(
        "Cannot start match while room phase is WAITING_FOR_PLAYERS",
      );
    });

    it("starts a ready room", () => {
      const ready =
        fillAllSeats();

      const started =
        startManagedLiveMatchRoom(
          ready,
        );

      expect(
        started.phase,
      ).toBe(
        "IN_PROGRESS",
      );

      expect(
        started.room,
      ).toBe(
        ready.room,
      );
    });

    it("rejects commands before the match starts", () => {
      const ready =
        fillAllSeats();

      expect(() =>
        applyManagedLiveMatchRoomCommand({
          managedRoom:
            ready,

          participantId:
            "a",

          command: {
            type: "PASS",
          },
        }),
      ).toThrow(
        "Cannot apply match command while room phase is READY",
      );
    });

    it("applies commands after the match starts", () => {
      const ready =
        fillAllSeats();

      const started =
        startManagedLiveMatchRoom(
          ready,
        );

      const currentPlayer =
        started.room.session.state
          .currentDeal.bidding
          .currentPlayer;

      const participantByPlayer = {
        PLAYER_0: "a",
        PLAYER_1: "b",
        PLAYER_2: "c",
        PLAYER_3: "d",
      } as const;

      const participantId =
        participantByPlayer[
          currentPlayer
        ];

      const result =
        applyManagedLiveMatchRoomCommand({
          managedRoom:
            started,

          participantId,

          command: {
            type: "PASS",
          },
        });

      expect(
        result.managedRoom.phase,
      ).toBe(
        "IN_PROGRESS",
      );

      expect(
        result.managedRoom.room
          .session.state.history
          .length,
      ).toBe(1);

      expect(
        result.player,
      ).toBe(
        currentPlayer,
      );
    });

    it("rejects seat claims once the match has started", () => {
      const started =
        startManagedLiveMatchRoom(
          fillAllSeats(),
        );

      expect(() =>
        claimManagedLiveMatchRoomSeat({
          managedRoom:
            started,

          player:
            "PLAYER_0",

          participantId:
            "a",
        }),
      ).toThrow(
        "Cannot change match seats while room phase is IN_PROGRESS",
      );
    });

    it("rejects seat releases once the match has started", () => {
      const started =
        startManagedLiveMatchRoom(
          fillAllSeats(),
        );

      expect(() =>
        releaseManagedLiveMatchRoomSeat({
          managedRoom:
            started,

          player:
            "PLAYER_0",

          participantId:
            "a",
        }),
      ).toThrow(
        "Cannot change match seats while room phase is IN_PROGRESS",
      );
    });

    it("creates participant snapshots before match start", () => {
      const ready =
        fillAllSeats();

      const snapshot =
        createManagedLiveMatchRoomParticipantSnapshot(
          ready,
          "a",
        );

      expect(
        snapshot.match.player,
      ).toBe(
        "PLAYER_0",
      );
    });

    it("does not mutate the previous managed room", () => {
      const ready =
        fillAllSeats();

      const started =
        startManagedLiveMatchRoom(
          ready,
        );

      expect(
        ready.phase,
      ).toBe(
        "READY",
      );

      expect(
        started.phase,
      ).toBe(
        "IN_PROGRESS",
      );

      expect(
        started,
      ).not.toBe(
        ready,
      );
    });
  },
);