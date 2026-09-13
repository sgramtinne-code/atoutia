import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createTeamForfeitHandler,
} from "../src/teamForfeitHandler.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

interface StartedRankedRoom {
  readonly roomStore:
    LiveRoomStore;

  readonly sessionId:
    string;
}

function createStartedRankedRoom():
  StartedRankedRoom {
  const roomStore =
    new LiveRoomStore();

  const room =
    roomStore.create({
      mode:
        "RANKED",
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
  "team forfeit handler",
  () => {
    it(
      "records a ranked absence forfeit",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRankedRoom();

        const handler =
          createTeamForfeitHandler({
            roomStore,

            now:
              () =>
                123_456,
          });

        handler({
          sessionId,

          player:
            "PLAYER_1",
        });

        expect(
          roomStore.getAdjudication(
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
            "PLAYER_1",

          losingTeam:
            "TEAM_1",

          winningTeam:
            "TEAM_0",

          completedAtMs:
            123_456,
        });
      },
    );

    it(
      "does not change the game revision",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRankedRoom();

        const beforeRevision =
          roomStore.get(
            sessionId,
          )?.revision;

        const handler =
          createTeamForfeitHandler({
            roomStore,

            now:
              () =>
                500_000,
          });

        handler({
          sessionId,

          player:
            "PLAYER_0",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          beforeRevision,
        );
      },
    );

    it(
      "is idempotent for the same forfeiting player",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRankedRoom();

        let currentTime =
          1_000;

        const handler =
          createTeamForfeitHandler({
            roomStore,

            now:
              () =>
                currentTime,
          });

        handler({
          sessionId,

          player:
            "PLAYER_2",
        });

        const first =
          roomStore.getAdjudication(
            sessionId,
          );

        currentTime =
          9_999;

        handler({
          sessionId,

          player:
            "PLAYER_2",
        });

        const second =
          roomStore.getAdjudication(
            sessionId,
          );

        expect(
          second,
        ).toBe(
          first,
        );

        expect(
          second.completedAtMs,
        ).toBe(
          1_000,
        );
      },
    );

    it(
      "rejects a ranked absence forfeit before the room starts",
      () => {
        const roomStore =
          new LiveRoomStore();

        const room =
          roomStore.create({
            mode:
              "RANKED",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const handler =
          createTeamForfeitHandler({
            roomStore,

            now:
              () =>
                1_000,
          });

        expect(
          () =>
            handler({
              sessionId,

              player:
                "PLAYER_0",
            }),
        ).toThrow(
          `Player absence forfeit requires an IN_PROGRESS room: ${sessionId}`,
        );
      },
    );

    it(
      "rejects a forfeit outside RANKED mode",
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
          createTeamForfeitHandler({
            roomStore,

            now:
              () =>
                1_000,
          });

        expect(
          () =>
            handler({
              sessionId,

              player:
                "PLAYER_0",
            }),
        ).toThrow(
          `Player absence forfeit requires RANKED mode: ${sessionId}`,
        );
      },
    );
  },
);