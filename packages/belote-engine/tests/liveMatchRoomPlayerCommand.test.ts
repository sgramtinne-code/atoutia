import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyLiveMatchRoomPlayerCommand,
  applyManagedLiveMatchRoomPlayerCommand,
  applyRevisionedLiveMatchRoomPlayerCommand,
  claimRevisionedLiveMatchRoomSeat,
  createLiveMatchRoom,
  createManagedLiveMatchRoom,
  createRevisionedLiveMatchRoom,
  startRevisionedLiveMatchRoom,
  type RevisionedLiveMatchRoom,
} from "../src/index.js";

function createStartedRoom():
  RevisionedLiveMatchRoom {
  let room =
    createRevisionedLiveMatchRoom({
      baseSeed:
        123456,
    });

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,

      expectedRevision:
        0,

      player:
        "PLAYER_0",

      participantId:
        "participant-0",
    });

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,

      expectedRevision:
        1,

      player:
        "PLAYER_1",

      participantId:
        "participant-1",
    });

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,

      expectedRevision:
        2,

      player:
        "PLAYER_2",

      participantId:
        "participant-2",
    });

  room =
    claimRevisionedLiveMatchRoomSeat({
      room,

      expectedRevision:
        3,

      player:
        "PLAYER_3",

      participantId:
        "participant-3",
    });

  return startRevisionedLiveMatchRoom({
    room,

    expectedRevision:
      4,
  });
}

describe(
  "authoritative live room player command",
  () => {
    it(
      "applies a legal command directly for an explicit player",
      () => {
        const room =
          createStartedRoom();

        const result =
          applyRevisionedLiveMatchRoomPlayerCommand({
            room,

            expectedRevision:
              5,

            player:
              "PLAYER_1",

            command: {
              type:
                "PASS",
            },
          });

        expect(
          result.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          result.room.revision,
        ).toBe(
          6,
        );

        expect(
          result.room.managedRoom.phase,
        ).toBe(
          "IN_PROGRESS",
        );

        expect(
          result.snapshot.match.public
            .biddingPlayer,
        ).toBe(
          "PLAYER_2",
        );

        expect(
          result.snapshot.actions.mode,
        ).toBe(
          "WAIT",
        );
      },
    );

    it(
      "rejects a stale revision before applying the command",
      () => {
        const room =
          createStartedRoom();

        expect(
          () =>
            applyRevisionedLiveMatchRoomPlayerCommand({
              room,

              expectedRevision:
                4,

              player:
                "PLAYER_1",

              command: {
                type:
                  "PASS",
              },
            }),
        ).toThrow(
          "Match room revision mismatch:",
        );

        expect(
          room.revision,
        ).toBe(
          5,
        );
      },
    );

    it(
      "rejects an explicit player who is not allowed to act",
      () => {
        const room =
          createStartedRoom();

        expect(
          () =>
            applyRevisionedLiveMatchRoomPlayerCommand({
              room,

              expectedRevision:
                5,

              player:
                "PLAYER_0",

              command: {
                type:
                  "PASS",
              },
            }),
        ).toThrow();

        expect(
          room.revision,
        ).toBe(
          5,
        );
      },
    );

    it(
      "rejects an authoritative command for an unoccupied seat",
      () => {
        const room =
          createLiveMatchRoom({
            baseSeed:
              123456,
          });

        expect(
          () =>
            applyLiveMatchRoomPlayerCommand({
              room,

              player:
                "PLAYER_2",

              command: {
                type:
                  "PASS",
              },
            }),
        ).toThrow(
          "Cannot apply authoritative command for unoccupied match seat PLAYER_2",
        );
      },
    );

    it(
      "preserves the managed room lifecycle guard",
      () => {
        const managedRoom =
          createManagedLiveMatchRoom({
            baseSeed:
              123456,
          });

        expect(
          () =>
            applyManagedLiveMatchRoomPlayerCommand({
              managedRoom,

              player:
                "PLAYER_1",

              command: {
                type:
                  "PASS",
              },
            }),
        ).toThrow(
          "Cannot apply match command while room phase is WAITING_FOR_PLAYERS",
        );
      },
    );
  },
);