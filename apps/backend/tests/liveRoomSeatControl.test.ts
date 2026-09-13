import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assertBotControlsLiveRoomSeat,
  assertHumanControlsLiveRoomSeat,
  createLiveRoomSeatControl,
  transferLiveRoomSeatControlToBot,
} from "../src/liveRoomSeatControl.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

function createRoom():
  {
    readonly roomStore:
      LiveRoomStore;

    readonly sessionId:
      string;
  } {
  const roomStore =
    new LiveRoomStore();

  const room =
    roomStore.create({
      mode:
        "CASUAL",
    });

  return {
    roomStore,

    sessionId:
      room.managedRoom.room.session
        .sessionId,
  };
}

describe(
  "live room seat control",
  () => {
    it(
      "creates HUMAN control by default",
      () => {
        expect(
          createLiveRoomSeatControl({
            player:
              "PLAYER_0",
          }),
        ).toEqual({
          player:
            "PLAYER_0",

          controller:
            "HUMAN",
        });
      },
    );

    it(
      "transfers HUMAN control to BOT",
      () => {
        const humanControl =
          createLiveRoomSeatControl({
            player:
              "PLAYER_1",
          });

        expect(
          transferLiveRoomSeatControlToBot({
            control:
              humanControl,
          }),
        ).toEqual({
          player:
            "PLAYER_1",

          controller:
            "BOT",
        });
      },
    );

    it(
      "is idempotent when BOT control is transferred again",
      () => {
        const botControl =
          createLiveRoomSeatControl({
            player:
              "PLAYER_2",

            controller:
              "BOT",
          });

        expect(
          transferLiveRoomSeatControlToBot({
            control:
              botControl,
          }),
        ).toBe(
          botControl,
        );
      },
    );

    it(
      "asserts HUMAN control",
      () => {
        const control =
          createLiveRoomSeatControl({
            player:
              "PLAYER_0",
          });

        expect(
          () =>
            assertHumanControlsLiveRoomSeat(
              control,
            ),
        ).not.toThrow();

        expect(
          () =>
            assertBotControlsLiveRoomSeat(
              control,
            ),
        ).toThrow(
          "is not bot-controlled",
        );
      },
    );

    it(
      "asserts BOT control",
      () => {
        const control =
          createLiveRoomSeatControl({
            player:
              "PLAYER_3",

            controller:
              "BOT",
          });

        expect(
          () =>
            assertBotControlsLiveRoomSeat(
              control,
            ),
        ).not.toThrow();

        expect(
          () =>
            assertHumanControlsLiveRoomSeat(
              control,
            ),
        ).toThrow(
          "is not human-controlled",
        );
      },
    );

    it(
      "initializes all room seats as HUMAN-controlled",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        expect(
          roomStore.listSeatControls(
            sessionId,
          ),
        ).toEqual([
          {
            player:
              "PLAYER_0",

            controller:
              "HUMAN",
          },

          {
            player:
              "PLAYER_1",

            controller:
              "HUMAN",
          },

          {
            player:
              "PLAYER_2",

            controller:
              "HUMAN",
          },

          {
            player:
              "PLAYER_3",

            controller:
              "HUMAN",
          },
        ]);
      },
    );

    it(
      "returns a single room seat control",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

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
      "rejects BOT takeover of an unoccupied seat",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        expect(
          () =>
            roomStore.transferSeatControlToBot({
              sessionId,

              player:
                "PLAYER_0",
            }),
        ).toThrow(
          "Cannot transfer unoccupied live room seat PLAYER_0 to BOT control.",
        );

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

    it(
      "transfers an occupied seat to BOT control",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "participant-0",
        });

        expect(
          roomStore.transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_0",
          }),
        ).toEqual({
          player:
            "PLAYER_0",

          controller:
            "BOT",
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
            "BOT",
        });
      },
    );

    it(
      "keeps BOT takeover idempotent",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_1",

          participantId:
            "participant-1",
        });

        const first =
          roomStore.transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_1",
          });

        const second =
          roomStore.transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_1",
          });

        expect(
          second,
        ).toBe(
          first,
        );
      },
    );

    it(
      "does not change game revision when control moves to BOT",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_2",

          participantId:
            "participant-2",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );

        roomStore.transferSeatControlToBot({
          sessionId,

          player:
            "PLAYER_2",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );
      },
    );

    it(
      "keeps seat control metadata across game mutations",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "participant-0",
        });

        roomStore.transferSeatControlToBot({
          sessionId,

          player:
            "PLAYER_0",
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

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          controller:
            "BOT",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          2,
        );
      },
    );
  },
);