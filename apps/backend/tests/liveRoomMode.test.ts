import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LiveRoomStore,
  createLiveRoomSummary,
} from "../src/liveRoomStore.js";

describe(
  "live room mode",
  () => {
    it(
      "uses CASUAL by default",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create();

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        expect(
          store.getMode(
            sessionId,
          ),
        ).toBe(
          "CASUAL",
        );

        expect(
          store.requireMode(
            sessionId,
          ),
        ).toBe(
          "CASUAL",
        );
      },
    );

    it(
      "stores PRIVATE mode",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create({
            mode:
              "PRIVATE",
          });

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        expect(
          store.requireMode(
            sessionId,
          ),
        ).toBe(
          "PRIVATE",
        );
      },
    );

    it(
      "stores RANKED mode",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create({
            mode:
              "RANKED",
          });

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        expect(
          store.requireMode(
            sessionId,
          ),
        ).toBe(
          "RANKED",
        );
      },
    );

    it(
      "keeps the mode across room mutations",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create({
            mode:
              "RANKED",
          });

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        store.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "participant-0",
        });

        store.claimSeat({
          sessionId,

          expectedRevision:
            1,

          player:
            "PLAYER_1",

          participantId:
            "participant-1",
        });

        expect(
          store.requireMode(
            sessionId,
          ),
        ).toBe(
          "RANKED",
        );

        expect(
          store.get(
            sessionId,
          )?.revision,
        ).toBe(
          2,
        );
      },
    );

    it(
      "returns undefined for an unknown room",
      () => {
        const store =
          new LiveRoomStore();

        expect(
          store.getMode(
            "ms1_00000000000000000000000000000000",
          ),
        ).toBeUndefined();
      },
    );

    it(
      "rejects requireMode for an unknown room",
      () => {
        const store =
          new LiveRoomStore();

        expect(
          () =>
            store.requireMode(
              "ms1_00000000000000000000000000000000",
            ),
        ).toThrow(
          "Live room not found",
        );
      },
    );

    it(
      "includes CASUAL in a legacy room summary by default",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create();

        expect(
          createLiveRoomSummary(
            room,
          ).mode,
        ).toBe(
          "CASUAL",
        );
      },
    );

    it(
      "creates a summary with the stored PRIVATE mode",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create({
            mode:
              "PRIVATE",
          });

        expect(
          store.createSummary(
            room,
          ),
        ).toEqual({
          sessionId:
            room.managedRoom.room
              .session.sessionId,

          mode:
            "PRIVATE",

          revision:
            0,

          phase:
            "WAITING_FOR_PLAYERS",

          occupiedSeats:
            0,

          seats: {
            PLAYER_0:
              false,

            PLAYER_1:
              false,

            PLAYER_2:
              false,

            PLAYER_3:
              false,
          },
        });
      },
    );

    it(
      "keeps RANKED in summaries after mutations",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create({
            mode:
              "RANKED",
          });

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        const claimed =
          store.claimSeat({
            sessionId,

            expectedRevision:
              0,

            player:
              "PLAYER_0",

            participantId:
              "participant-0",
          });

        expect(
          store.createSummary(
            claimed,
          ),
        ).toEqual({
          sessionId,

          mode:
            "RANKED",

          revision:
            1,

          phase:
            "WAITING_FOR_PLAYERS",

          occupiedSeats:
            1,

          seats: {
            PLAYER_0:
              true,

            PLAYER_1:
              false,

            PLAYER_2:
              false,

            PLAYER_3:
              false,
          },
        });
      },
    );
  },
);