import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

function createStartedRankedRoom(
  store:
    LiveRoomStore,
): string {
  const room =
    store.create({
      mode:
        "RANKED",
    });

  const sessionId =
    room.managedRoom.room.session
      .sessionId;

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

  store.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      "participant-2",
  });

  store.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      "participant-3",
  });

  store.start({
    sessionId,

    expectedRevision:
      4,
  });

  return sessionId;
}

describe(
  "live room adjudication subscription",
  () => {
    it(
      "does not notify when a room is merely created",
      () => {
        const store =
          new LiveRoomStore();

        const listener =
          vi.fn();

        store.subscribeAdjudication(
          listener,
        );

        store.create({
          mode:
            "RANKED",
        });

        expect(
          listener,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "notifies once when a ranked room is forfeited",
      () => {
        const store =
          new LiveRoomStore();

        const sessionId =
          createStartedRankedRoom(
            store,
          );

        const listener =
          vi.fn();

        store.subscribeAdjudication(
          listener,
        );

        store.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_0",

          completedAtMs:
            123_456,
        });

        expect(
          listener,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          listener,
        ).toHaveBeenCalledWith({
          sessionId,

          adjudication: {
            status:
              "COMPLETED",

            completion:
              "FORFEIT",

            reason:
              "PLAYER_ABSENCE",

            forfeitingPlayer:
              "PLAYER_0",

            losingTeam:
              "TEAM_0",

            winningTeam:
              "TEAM_1",

            completedAtMs:
              123_456,
          },
        });
      },
    );

    it(
      "does not notify twice for an idempotent repeated forfeit",
      () => {
        const store =
          new LiveRoomStore();

        const sessionId =
          createStartedRankedRoom(
            store,
          );

        const listener =
          vi.fn();

        store.subscribeAdjudication(
          listener,
        );

        store.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_2",

          completedAtMs:
            100_000,
        });

        store.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_2",

          completedAtMs:
            999_999,
        });

        expect(
          listener,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          store.getAdjudication(
            sessionId,
          ),
        ).toEqual({
          status:
            "COMPLETED",

          completion:
            "FORFEIT",

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "PLAYER_2",

          losingTeam:
            "TEAM_0",

          winningTeam:
            "TEAM_1",

          completedAtMs:
            100_000,
        });
      },
    );

    it(
      "does not change the engine revision when notifying a forfeit",
      () => {
        const store =
          new LiveRoomStore();

        const sessionId =
          createStartedRankedRoom(
            store,
          );

        const revisionBefore =
          store.get(
            sessionId,
          )?.revision;

        const listener =
          vi.fn();

        store.subscribeAdjudication(
          listener,
        );

        store.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_3",

          completedAtMs:
            500_000,
        });

        expect(
          revisionBefore,
        ).toBe(
          5,
        );

        expect(
          store.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        expect(
          listener,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "stops notifying after unsubscribe",
      () => {
        const store =
          new LiveRoomStore();

        const sessionId =
          createStartedRankedRoom(
            store,
          );

        const listener =
          vi.fn();

        const unsubscribe =
          store.subscribeAdjudication(
            listener,
          );

        unsubscribe();

        store.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_1",

          completedAtMs:
            750_000,
        });

        expect(
          listener,
        ).not.toHaveBeenCalled();
      },
    );
  },
);