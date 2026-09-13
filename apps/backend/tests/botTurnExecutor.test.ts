import {
  describe,
  expect,
  it,
} from "vitest";

import {
  executeBotTurn,
} from "../src/botTurnExecutor.js";

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
  "BOT turn executor",
  () => {
    it(
      "rejects an unknown room",
      () => {
        const roomStore =
          new LiveRoomStore();

        expect(
          () =>
            executeBotTurn({
              roomStore,

              sessionId:
                "ms1_00000000000000000000000000000000",

              player:
                "PLAYER_0",
            }),
        ).toThrow(
          LiveRoomNotFoundError,
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
          executeBotTurn({
            roomStore,

            sessionId,

            player:
              "PLAYER_0",
          });

        expect(
          result,
        ).toEqual({
          status:
            "ROOM_NOT_IN_PROGRESS",

          player:
            "PLAYER_0",

          revision:
            0,

          command:
            null,
        });
      },
    );

    it(
      "does not execute commands for a HUMAN-controlled seat",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        const result =
          executeBotTurn({
            roomStore,

            sessionId,

            player:
              "PLAYER_1",
          });

        expect(
          result,
        ).toEqual({
          status:
            "NOT_BOT_CONTROLLED",

          player:
            "PLAYER_1",

          revision:
            5,

          command:
            null,
        });

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
      "does nothing when a BOT-controlled seat is not currently active",
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

        const result =
          executeBotTurn({
            roomStore,

            sessionId,

            player:
              "PLAYER_0",
          });

        expect(
          result,
        ).toEqual({
          status:
            "NO_COMMAND",

          player:
            "PLAYER_0",

          revision:
            5,

          command:
            null,
        });

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
      "applies one deterministic BOT command when the BOT is active",
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
          executeBotTurn({
            roomStore,

            sessionId,

            player:
              "PLAYER_1",
          });

        expect(
          result,
        ).toEqual({
          status:
            "COMMAND_APPLIED",

          player:
            "PLAYER_1",

          revision:
            6,

          command: {
            type:
              "PASS",
          },
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
      "executes at most one command per invocation",
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

        const first =
          executeBotTurn({
            roomStore,

            sessionId,

            player:
              "PLAYER_1",
          });

        expect(
          first.status,
        ).toBe(
          "COMMAND_APPLIED",
        );

        expect(
          first.revision,
        ).toBe(
          6,
        );

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          6,
        );

        const second =
          executeBotTurn({
            roomStore,

            sessionId,

            player:
              "PLAYER_2",
          });

        expect(
          second.status,
        ).toBe(
          "COMMAND_APPLIED",
        );

        expect(
          second.revision,
        ).toBe(
          7,
        );

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          7,
        );
      },
    );
  },
);