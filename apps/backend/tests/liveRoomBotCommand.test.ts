import {
  describe,
  expect,
  it,
} from "vitest";

import {
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
  "live room BOT command",
  () => {
    it(
      "rejects the BOT command path for a HUMAN-controlled seat",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        expect(
          () =>
            roomStore.applyBotCommand({
              sessionId,

              expectedRevision:
                5,

              player:
                "PLAYER_1",

              command: {
                type:
                  "PASS",
              },
            }),
        ).toThrow(
          "Live room seat PLAYER_1 is not bot-controlled.",
        );

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
      "applies a legal command for a BOT-controlled seat",
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
          roomStore.applyBotCommand({
            sessionId,

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
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          6,
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
      "rejects a stale BOT command revision",
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

        expect(
          () =>
            roomStore.applyBotCommand({
              sessionId,

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
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );
      },
    );

    it(
      "rejects a BOT command when the BOT seat is not the active player",
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

        expect(
          () =>
            roomStore.applyBotCommand({
              sessionId,

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
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );
      },
    );
  },
);