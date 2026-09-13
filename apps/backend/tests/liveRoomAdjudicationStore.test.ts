import type {
  LiveMatchRoomCommandDocument,
  PlayerCommand,
} from "@atoutia/belote-engine";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LiveRoomCompletedError,
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
  "live room adjudication store",
  () => {
    it(
      "initializes every room with ACTIVE adjudication",
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

        expect(
          roomStore.getAdjudication(
            sessionId,
          ),
        ).toEqual({
          status:
            "ACTIVE",

          completion:
            null,

          completedAtMs:
            null,
        });
      },
    );

    it(
      "records a ranked PLAYER_0 absence forfeit without changing the game revision",
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

        const adjudication =
          roomStore.forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_0",

            completedAtMs:
              500_000,
          });

        expect(
          adjudication,
        ).toEqual({
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
            500_000,
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
      "records a ranked PLAYER_3 absence forfeit with TEAM_1 losing",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRankedRoom();

        expect(
          roomStore.forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_3",

            completedAtMs:
              750_000,
          }),
        ).toEqual({
          status:
            "COMPLETED",

          completion:
            "FORFEIT",

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "PLAYER_3",

          losingTeam:
            "TEAM_1",

          winningTeam:
            "TEAM_0",

          completedAtMs:
            750_000,
        });
      },
    );

    it(
      "rejects player absence forfeit outside RANKED mode",
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

        expect(
          () =>
            roomStore.forfeitForPlayerAbsence({
              sessionId,

              player:
                "PLAYER_0",

              completedAtMs:
                1_000,
            }),
        ).toThrow(
          `Player absence forfeit requires RANKED mode: ${sessionId}`,
        );
      },
    );

    it(
      "rejects player absence forfeit before the ranked room is in progress",
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

        expect(
          () =>
            roomStore.forfeitForPlayerAbsence({
              sessionId,

              player:
                "PLAYER_0",

              completedAtMs:
                1_000,
            }),
        ).toThrow(
          `Player absence forfeit requires an IN_PROGRESS room: ${sessionId}`,
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

        const first =
          roomStore.forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_1",

            completedAtMs:
              2_000,
          });

        const second =
          roomStore.forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_1",

            completedAtMs:
              9_999,
          });

        expect(
          second,
        ).toBe(
          first,
        );

        expect(
          second.completedAtMs,
        ).toBe(
          2_000,
        );
      },
    );

    it(
      "rejects a conflicting second forfeit after the room is completed",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRankedRoom();

        roomStore.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_0",

          completedAtMs:
            2_000,
        });

        expect(
          () =>
            roomStore.forfeitForPlayerAbsence({
              sessionId,

              player:
                "PLAYER_1",

              completedAtMs:
                3_000,
            }),
        ).toThrow(
          LiveRoomCompletedError,
        );
      },
    );

    it(
      "rejects human and BOT game commands after adjudication completes the room",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRankedRoom();

        roomStore.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_0",

          completedAtMs:
            2_000,
        });

        const revision =
          roomStore.get(
            sessionId,
          )?.revision;

        const unusedDocument =
          null as unknown as
            LiveMatchRoomCommandDocument;

        const unusedCommand =
          null as unknown as
            PlayerCommand;

        expect(
          () =>
            roomStore.applyCommand({
              sessionId,

              participantId:
                "participant-1",

              document:
                unusedDocument,
            }),
        ).toThrow(
          LiveRoomCompletedError,
        );

        expect(
          () =>
            roomStore.applyBotCommand({
              sessionId,

              expectedRevision:
                revision ??
                0,

              player:
                "PLAYER_1",

              command:
                unusedCommand,
            }),
        ).toThrow(
          LiveRoomCompletedError,
        );

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          revision,
        );
      },
    );
  },
);