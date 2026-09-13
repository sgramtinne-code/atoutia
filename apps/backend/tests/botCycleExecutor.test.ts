import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEFAULT_BOT_CYCLE_MAX_COMMANDS,
  executeBotCycle,
} from "../src/botCycleExecutor.js";

import {
  LiveRoomNotFoundError,
  LiveRoomStore,
} from "../src/liveRoomStore.js";

interface StartedRoom {
  readonly roomStore:
    LiveRoomStore;

  readonly sessionId:
    string;
}

function createStartedRoom():
  StartedRoom {
  const roomStore =
    new LiveRoomStore();

  const room =
    roomStore.create({
      mode:
        "CASUAL",
    });

  const sessionId =
    room.managedRoom.room.session
      .sessionId;

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      0,

    player:
      "PLAYER_0",

    participantId:
      "participant-0",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      "participant-1",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      "participant-2",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      "participant-3",
  });

  roomStore.start({
    sessionId,

    expectedRevision:
      4,
  });

  return Object.freeze({
    roomStore,
    sessionId,
  });
}

describe(
  "BOT cycle executor",
  () => {
    it(
      "uses a bounded default command limit",
      () => {
        expect(
          DEFAULT_BOT_CYCLE_MAX_COMMANDS,
        ).toBe(
          32,
        );
      },
    );

    it(
      "rejects an unknown room",
      () => {
        const roomStore =
          new LiveRoomStore();

        expect(
          () =>
            executeBotCycle({
              roomStore,

              sessionId:
                "ms1_00000000000000000000000000000000",
            }),
        ).toThrow(
          LiveRoomNotFoundError,
        );
      },
    );

    it(
      "rejects invalid command limits",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        for (
          const maxCommands
          of [
            0,
            -1,
            1.5,
            Number.NaN,
            Number.POSITIVE_INFINITY,
          ]
        ) {
          expect(
            () =>
              executeBotCycle({
                roomStore,

                sessionId,

                maxCommands,
              }),
          ).toThrow(
            "BOT cycle maxCommands must be a positive safe integer.",
          );
        }

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );
      },
    );

    it(
      "does nothing before the match starts",
      () => {
        const roomStore =
          new LiveRoomStore();

        const room =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const result =
          executeBotCycle({
            roomStore,

            sessionId,
          });

        expect(
          result,
        ).toEqual({
          status:
            "ROOM_NOT_IN_PROGRESS",

          commandsApplied:
            0,

          initialRevision:
            0,

          finalRevision:
            0,

          lastPlayer:
            null,
        });
      },
    );

    it(
      "does nothing when the active seat is HUMAN-controlled",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        const result =
          executeBotCycle({
            roomStore,

            sessionId,
          });

        expect(
          result,
        ).toEqual({
          status:
            "NO_BOT_ACTION",

          commandsApplied:
            0,

          initialRevision:
            5,

          finalRevision:
            5,

          lastPlayer:
            null,
        });
      },
    );

    it(
      "executes one BOT command and stops when the next player is HUMAN",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_1",
          });

        const result =
          executeBotCycle({
            roomStore,

            sessionId,
          });

        expect(
          result,
        ).toEqual({
          status:
            "NO_BOT_ACTION",

          commandsApplied:
            1,

          initialRevision:
            5,

          finalRevision:
            6,

          lastPlayer:
            "PLAYER_1",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          6,
        );
      },
    );

    it(
      "executes consecutive BOT players in the same cycle",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_1",
          });

        roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_2",
          });

        const result =
          executeBotCycle({
            roomStore,

            sessionId,
          });

        expect(
          result,
        ).toEqual({
          status:
            "NO_BOT_ACTION",

          commandsApplied:
            2,

          initialRevision:
            5,

          finalRevision:
            7,

          lastPlayer:
            "PLAYER_2",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          7,
        );
      },
    );

    it(
      "stops exactly at the configured command limit",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_0",
          });

        roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_1",
          });

        roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_2",
          });

        roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_3",
          });

        const result =
          executeBotCycle({
            roomStore,

            sessionId,

            maxCommands:
              5,
          });

        expect(
          result.status,
        ).toBe(
          "COMMAND_LIMIT_REACHED",
        );

        expect(
          result.commandsApplied,
        ).toBe(
          5,
        );

        expect(
          result.initialRevision,
        ).toBe(
          5,
        );

        expect(
          result.finalRevision,
        ).toBe(
          10,
        );

        expect(
          result.lastPlayer,
        ).not.toBeNull();

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          10,
        );
      },
    );
  },
);