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
  "LiveRoomStore",
  () => {
    it(
      "starts empty",
      () => {
        const store =
          new LiveRoomStore();

        expect(
          store.count(),
        ).toBe(0);
      },
    );

    it(
      "creates and stores a room",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create();

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        expect(
          store.get(
            sessionId,
          ),
        ).toBe(
          room,
        );

        expect(
          store.count(),
        ).toBe(1);
      },
    );

    it(
      "creates a safe room summary",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create();

        expect(
          createLiveRoomSummary(
            room,
          ),
        ).toEqual({
          sessionId:
            room.managedRoom.room
              .session.sessionId,

          mode:
            "CASUAL",

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

          adjudication: {
            formatVersion:
              1,

            status:
              "ACTIVE",

            completion:
              null,

            completedAtMs:
              null,
          },
        });
      },
    );

    it(
      "claims and releases a seat",
      () => {
        const store =
          new LiveRoomStore();

        const created =
          store.create();

        const sessionId =
          created.managedRoom.room
            .session.sessionId;

        const claimed =
          store.claimSeat({
            sessionId,

            expectedRevision:
              0,

            player:
              "PLAYER_0",

            participantId:
              "participant-a",
          });

        expect(
          claimed.revision,
        ).toBe(1);

        expect(
          createLiveRoomSummary(
            claimed,
          ).seats.PLAYER_0,
        ).toBe(true);

        const released =
          store.releaseSeat({
            sessionId,

            expectedRevision:
              1,

            player:
              "PLAYER_0",

            participantId:
              "participant-a",
          });

        expect(
          released.revision,
        ).toBe(2);

        expect(
          createLiveRoomSummary(
            released,
          ).seats.PLAYER_0,
        ).toBe(false);
      },
    );

    it(
      "becomes ready with four participants and can start",
      () => {
        const store =
          new LiveRoomStore();

        const created =
          store.create();

        const sessionId =
          created.managedRoom.room
            .session.sessionId;

        store.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "p0",
        });

        store.claimSeat({
          sessionId,

          expectedRevision:
            1,

          player:
            "PLAYER_1",

          participantId:
            "p1",
        });

        store.claimSeat({
          sessionId,

          expectedRevision:
            2,

          player:
            "PLAYER_2",

          participantId:
            "p2",
        });

        const ready =
          store.claimSeat({
            sessionId,

            expectedRevision:
              3,

            player:
              "PLAYER_3",

            participantId:
              "p3",
          });

        expect(
          ready.revision,
        ).toBe(4);

        expect(
          ready.managedRoom.phase,
        ).toBe(
          "READY",
        );

        const started =
          store.start({
            sessionId,

            expectedRevision:
              4,
          });

        expect(
          started.revision,
        ).toBe(5);

        expect(
          started.managedRoom.phase,
        ).toBe(
          "IN_PROGRESS",
        );
      },
    );

    it(
      "creates a secure participant snapshot",
      () => {
        const store =
          new LiveRoomStore();

        const created =
          store.create();

        const sessionId =
          created.managedRoom.room
            .session.sessionId;

        store.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "p0",
        });

        const snapshot =
          store.createParticipantSnapshot({
            sessionId,

            participantId:
              "p0",
          });

        expect(
          snapshot.sessionId,
        ).toBe(
          sessionId,
        );

        expect(
          snapshot.revision,
        ).toBe(1);

        expect(
          snapshot.player,
        ).toBe(
          "PLAYER_0",
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
      },
    );

    it(
      "rejects a snapshot for an unseated participant",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create();

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        expect(
          () =>
            store.createParticipantSnapshot({
              sessionId,

              participantId:
                "not-seated",
            }),
        ).toThrow();
      },
    );
  },
);