import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyLiveMatchRoomNetworkCommand,
  claimRevisionedLiveMatchRoomSeat,
  createLiveMatchRoomCommandDocument,
  createRevisionedLiveMatchRoom,
  startRevisionedLiveMatchRoom,
} from "../src/index.js";

function createStartedRoom() {
  let room =
    createRevisionedLiveMatchRoom({
      baseSeed: 1000,

      randomBytes:
        (bytes) => {
          bytes.fill(0xab);

          return bytes;
        },
    });

  const assignments = [
    {
      player: "PLAYER_0",
      participantId: "a",
    },
    {
      player: "PLAYER_1",
      participantId: "b",
    },
    {
      player: "PLAYER_2",
      participantId: "c",
    },
    {
      player: "PLAYER_3",
      participantId: "d",
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

  return startRevisionedLiveMatchRoom({
    room,

    expectedRevision:
      room.revision,
  });
}

function participantForCurrentPlayer(
  room: ReturnType<
    typeof createStartedRoom
  >,
): string {
  const player =
    room.managedRoom.room.session
      .state.currentDeal.bidding
      .currentPlayer;

  const participantByPlayer = {
    PLAYER_0: "a",
    PLAYER_1: "b",
    PLAYER_2: "c",
    PLAYER_3: "d",
  } as const;

  return participantByPlayer[
    player
  ];
}

describe(
  "live match room network adapter",
  () => {
    it("applies a valid network command", () => {
      const room =
        createStartedRoom();

      const participantId =
        participantForCurrentPlayer(
          room,
        );

      const document =
        createLiveMatchRoomCommandDocument(
          room.managedRoom.room
            .session.sessionId,

          room.revision,

          {
            type: "PASS",
          },
        );

      const result =
        applyLiveMatchRoomNetworkCommand({
          room,
          participantId,
          document,
        });

      expect(
        result.room.revision,
      ).toBe(
        room.revision + 1,
      );

      expect(
        result.room.managedRoom.room
          .session.state.history
          .length,
      ).toBe(1);
    });

    it("returns a secure client snapshot", () => {
      const room =
        createStartedRoom();

      const participantId =
        participantForCurrentPlayer(
          room,
        );

      const document =
        createLiveMatchRoomCommandDocument(
          room.managedRoom.room
            .session.sessionId,

          room.revision,

          {
            type: "PASS",
          },
        );

      const result =
        applyLiveMatchRoomNetworkCommand({
          room,
          participantId,
          document,
        });

      expect(
        result.snapshot.sessionId,
      ).toBe(
        result.room.managedRoom
          .room.session.sessionId,
      );

      expect(
        result.snapshot.revision,
      ).toBe(
        result.room.revision,
      );
    });

    it("rejects a command for another session", () => {
      const room =
        createStartedRoom();

      const participantId =
        participantForCurrentPlayer(
          room,
        );

      const document =
        createLiveMatchRoomCommandDocument(
          "ms1_cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",

          room.revision,

          {
            type: "PASS",
          },
        );

      expect(() =>
        applyLiveMatchRoomNetworkCommand({
          room,
          participantId,
          document,
        }),
      ).toThrow(
        "Live room command session mismatch",
      );
    });

    it("rejects a stale revision", () => {
      const room =
        createStartedRoom();

      const participantId =
        participantForCurrentPlayer(
          room,
        );

      const document =
        createLiveMatchRoomCommandDocument(
          room.managedRoom.room
            .session.sessionId,

          room.revision - 1,

          {
            type: "PASS",
          },
        );

      expect(() =>
        applyLiveMatchRoomNetworkCommand({
          room,
          participantId,
          document,
        }),
      ).toThrow(
        "Match room revision mismatch",
      );
    });

    it("rejects an unseated participant", () => {
      const room =
        createStartedRoom();

      const document =
        createLiveMatchRoomCommandDocument(
          room.managedRoom.room
            .session.sessionId,

          room.revision,

          {
            type: "PASS",
          },
        );

      expect(() =>
        applyLiveMatchRoomNetworkCommand({
          room,

          participantId:
            "unknown",

          document,
        }),
      ).toThrow(
        "does not occupy a match seat",
      );
    });

    it("lets the engine reject a wrong-turn participant", () => {
      const room =
        createStartedRoom();

      const currentParticipant =
        participantForCurrentPlayer(
          room,
        );

      const wrongParticipant =
        currentParticipant === "a"
          ? "b"
          : "a";

      const document =
        createLiveMatchRoomCommandDocument(
          room.managedRoom.room
            .session.sessionId,

          room.revision,

          {
            type: "PASS",
          },
        );

      expect(() =>
        applyLiveMatchRoomNetworkCommand({
          room,

          participantId:
            wrongParticipant,

          document,
        }),
      ).toThrow();
    });

    it("does not mutate the previous room", () => {
      const room =
        createStartedRoom();

      const participantId =
        participantForCurrentPlayer(
          room,
        );

      const originalRevision =
        room.revision;

      const document =
        createLiveMatchRoomCommandDocument(
          room.managedRoom.room
            .session.sessionId,

          room.revision,

          {
            type: "PASS",
          },
        );

      const result =
        applyLiveMatchRoomNetworkCommand({
          room,
          participantId,
          document,
        });

      expect(
        room.revision,
      ).toBe(
        originalRevision,
      );

      expect(
        result.room.revision,
      ).toBe(
        originalRevision + 1,
      );
    });

    it("returns an immutable result", () => {
      const room =
        createStartedRoom();

      const participantId =
        participantForCurrentPlayer(
          room,
        );

      const document =
        createLiveMatchRoomCommandDocument(
          room.managedRoom.room
            .session.sessionId,

          room.revision,

          {
            type: "PASS",
          },
        );

      const result =
        applyLiveMatchRoomNetworkCommand({
          room,
          participantId,
          document,
        });

      expect(
        Object.isFrozen(result),
      ).toBe(true);
    });
  },
);