import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createBotTakeoverHandler,
} from "../src/botTakeoverHandler.js";

import {
  executePendingAbsenceResolution,
} from "../src/absenceResolutionExecutor.js";

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
  "bot takeover handler",
  () => {
    it(
      "transfers an occupied HUMAN seat to BOT control",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        const handler =
          createBotTakeoverHandler({
            roomStore,
          });

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          controller:
            "HUMAN",
        });

        handler({
          sessionId,

          player:
            "PLAYER_1",
        });

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          controller:
            "BOT",
        });
      },
    );

    it(
      "is idempotent when the same seat is already BOT-controlled",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        const handler =
          createBotTakeoverHandler({
            roomStore,
          });

        handler({
          sessionId,

          player:
            "PLAYER_1",
        });

        const first =
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          );

        handler({
          sessionId,

          player:
            "PLAYER_1",
        });

        const second =
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          );

        expect(
          second,
        ).toBe(
          first,
        );

        expect(
          second.controller,
        ).toBe(
          "BOT",
        );
      },
    );

    it(
      "does not change the game revision",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        const handler =
          createBotTakeoverHandler({
            roomStore,
          });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        handler({
          sessionId,

          player:
            "PLAYER_1",
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
      "rejects BOT takeover when the seat is not occupied",
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

        const handler =
          createBotTakeoverHandler({
            roomStore,
          });

        expect(
          () =>
            handler({
              sessionId,

              player:
                "PLAYER_2",
            }),
        ).toThrow(
          "Cannot transfer unoccupied live room seat PLAYER_2 to BOT control.",
        );

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_2",
          ),
        ).toEqual({
          player:
            "PLAYER_2",

          controller:
            "HUMAN",
        });
      },
    );

    it(
      "integrates with the absence resolution executor",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        const botTakeoverHandler =
          createBotTakeoverHandler({
            roomStore,
          });

        const teamForfeitHandler =
          vi.fn();

        const result =
          await executePendingAbsenceResolution({
            roomStore,

            sessionId,

            player:
              "PLAYER_1",

            handlers: {
              executeBotTakeover:
                botTakeoverHandler,

              executeTeamForfeit:
                teamForfeitHandler,
            },
          });

        expect(
          result.status,
        ).toBe(
          "EXECUTED",
        );

        expect(
          result.resolution,
        ).toEqual({
          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",

          status:
            "RESOLVED_BY_BOT",
        });

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          controller:
            "BOT",
        });

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",

          status:
            "RESOLVED_BY_BOT",
        });

        expect(
          teamForfeitHandler,
        ).not.toHaveBeenCalled();

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
      "keeps the absence resolution PENDING when BOT takeover fails",
      async () => {
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

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_0",

            action:
              "BOT_TAKEOVER",
          });

        const botTakeoverHandler =
          createBotTakeoverHandler({
            roomStore,
          });

        await expect(
          executePendingAbsenceResolution({
            roomStore,

            sessionId,

            player:
              "PLAYER_0",

            handlers: {
              executeBotTakeover:
                botTakeoverHandler,

              executeTeamForfeit:
                vi.fn(),
            },
          }),
        ).rejects.toThrow(
          "Cannot transfer unoccupied live room seat PLAYER_0 to BOT control.",
        );

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "BOT_TAKEOVER",

          status:
            "PENDING",
        });

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          controller:
            "HUMAN",
        });
      },
    );
  },
);