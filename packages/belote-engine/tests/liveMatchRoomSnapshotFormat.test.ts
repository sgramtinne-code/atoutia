import {
  describe,
  expect,
  it,
} from "vitest";

import {
  BELOTE_ENGINE_VERSION,
  LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION,
  claimRevisionedLiveMatchRoomSeat,
  createLiveMatchRoomSnapshotDocument,
  createRevisionedLiveMatchRoom,
  startRevisionedLiveMatchRoom,
} from "../src/index.js";

function createRoom() {
  return createRevisionedLiveMatchRoom({
    baseSeed: 1000,

    randomBytes:
      (bytes) => {
        bytes.fill(0xab);

        return bytes;
      },
  });
}

function createRoomWithPlayerA() {
  const room =
    createRoom();

  return claimRevisionedLiveMatchRoomSeat({
    room,
    expectedRevision:
      room.revision,
    player:
      "PLAYER_0",
    participantId:
      "participant-a",
  });
}

function createReadyRoom() {
  let room =
    createRoom();

  const assignments = [
    {
      player:
        "PLAYER_0",
      participantId:
        "participant-a",
    },
    {
      player:
        "PLAYER_1",
      participantId:
        "participant-b",
    },
    {
      player:
        "PLAYER_2",
      participantId:
        "participant-c",
    },
    {
      player:
        "PLAYER_3",
      participantId:
        "participant-d",
    },
  ] as const;

  for (
    const assignment of
    assignments
  ) {
    room =
      claimRevisionedLiveMatchRoomSeat({
        room,

        expectedRevision:
          room.revision,

        player:
          assignment.player,

        participantId:
          assignment.participantId,
      });
  }

  return room;
}

describe(
  "live match room snapshot format",
  () => {
    it("uses version one", () => {
      expect(
        LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION,
      ).toBe(1);
    });

    it("contains the current engine version", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.engineVersion,
      ).toBe(
        BELOTE_ENGINE_VERSION,
      );
    });

    it("contains the live session ID", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.sessionId,
      ).toBe(
        "ms1_abababababababababababababababab",
      );
    });

    it("contains the current room revision", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.revision,
      ).toBe(1);
    });

    it("contains the current room phase", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.phase,
      ).toBe(
        "WAITING_FOR_PLAYERS",
      );
    });

    it("contains the requesting player's seat", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.player,
      ).toBe(
        "PLAYER_0",
      );
    });

    it("exposes occupancy without exposing participant IDs", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.seats,
      ).toEqual([
        {
          player:
            "PLAYER_0",
          occupied:
            true,
        },
        {
          player:
            "PLAYER_1",
          occupied:
            false,
        },
        {
          player:
            "PLAYER_2",
          occupied:
            false,
        },
        {
          player:
            "PLAYER_3",
          occupied:
            false,
        },
      ]);

      expect(
        JSON.stringify(
          snapshot.seats,
        ),
      ).not.toContain(
        "participant-a",
      );
    });

    it("contains the requesting player's secure game snapshot", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.game.match.player,
      ).toBe(
        "PLAYER_0",
      );
    });

    it("reflects READY state when all seats are occupied", () => {
      const room =
        createReadyRoom();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        snapshot.phase,
      ).toBe(
        "READY",
      );

      expect(
        snapshot.revision,
      ).toBe(4);

      expect(
        snapshot.seats.every(
          (seat) =>
            seat.occupied,
        ),
      ).toBe(true);
    });

    it("reflects IN_PROGRESS after the match starts", () => {
      const ready =
        createReadyRoom();

      const started =
        startRevisionedLiveMatchRoom({
          room:
            ready,

          expectedRevision:
            ready.revision,
        });

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          started,
          "participant-a",
        );

      expect(
        snapshot.phase,
      ).toBe(
        "IN_PROGRESS",
      );

      expect(
        snapshot.revision,
      ).toBe(5);
    });

    it("rejects an unseated participant", () => {
      const room =
        createRoomWithPlayerA();

      expect(() =>
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-x",
        ),
      ).toThrow(
        "Participant participant-x does not occupy a match seat",
      );
    });

    it("returns immutable top-level and seat structures", () => {
      const room =
        createRoomWithPlayerA();

      const snapshot =
        createLiveMatchRoomSnapshotDocument(
          room,
          "participant-a",
        );

      expect(
        Object.isFrozen(snapshot),
      ).toBe(true);

      expect(
        Object.isFrozen(
          snapshot.seats,
        ),
      ).toBe(true);

      expect(
        snapshot.seats.every(
          (seat) =>
            Object.isFrozen(seat),
        ),
      ).toBe(true);
    });
  },
);