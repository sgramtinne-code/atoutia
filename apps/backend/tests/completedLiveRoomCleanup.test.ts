import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  cleanupCompletedLiveRooms,
} from "../src/completedLiveRoomCleanup.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createForfeitMatchResult,
  type MatchResult,
} from "../src/matchResult.js";

const PARTICIPANTS =
  Object.freeze({
    PLAYER_0:
      "cleanup-participant-0",

    PLAYER_1:
      "cleanup-participant-1",

    PLAYER_2:
      "cleanup-participant-2",

    PLAYER_3:
      "cleanup-participant-3",
  });

function claimAllSeats(
  store:
    LiveRoomStore,

  sessionId:
    string,
): void {
  store.claimSeat({
    sessionId,

    expectedRevision:
      0,

    player:
      "PLAYER_0",

    participantId:
      PARTICIPANTS.PLAYER_0,
  });

  store.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      PARTICIPANTS.PLAYER_1,
  });

  store.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      PARTICIPANTS.PLAYER_2,
  });

  store.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      PARTICIPANTS.PLAYER_3,
  });
}

function createCompletedRoom(
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

  claimAllSeats(
    store,
    sessionId,
  );

  store.start({
    sessionId,

    expectedRevision:
      4,
  });

  store.forfeitForPlayerAbsence({
    sessionId,

    player:
      "PLAYER_0",

    completedAtMs:
      123_456,
  });

  return sessionId;
}

function createStoredMatchResult(
  sessionId:
    string,
): MatchResult {
  return createForfeitMatchResult({
    sessionId,

    mode:
      "RANKED",

    participants:
      PARTICIPANTS,

    completedAtMs:
      123_456,

    forfeitingPlayer:
      "PLAYER_0",

    losingTeam:
      "TEAM_0",

    winningTeam:
      "TEAM_1",
  });
}

describe(
  "completed live room cleanup",
  () => {
    it(
      "keeps an active room and does not query match history for it",
      () => {
        const store =
          new LiveRoomStore();

        const room =
          store.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const get =
          vi.fn(
            (
              _sessionId:
                string,
            ): MatchResult | undefined =>
              undefined,
          );

        const result =
          cleanupCompletedLiveRooms({
            roomStore:
              store,

            matchResultRepository: {
              get,
            },

            sessionIds: [
              sessionId,
            ],
          });

        expect(
          result,
        ).toEqual({
          scanned:
            1,

          completed:
            0,

          deleted:
            0,

          skippedWithoutMatchResult:
            0,
        });

        expect(
          get,
        ).not.toHaveBeenCalled();

        expect(
          store.count(),
        ).toBe(
          1,
        );

        expect(
          store.get(
            sessionId,
          ),
        ).toBeDefined();
      },
    );

    it(
      "keeps a completed room when its match result is missing",
      () => {
        const store =
          new LiveRoomStore();

        const sessionId =
          createCompletedRoom(
            store,
          );

        const get =
          vi.fn(
            (
              _sessionId:
                string,
            ): MatchResult | undefined =>
              undefined,
          );

        const result =
          cleanupCompletedLiveRooms({
            roomStore:
              store,

            matchResultRepository: {
              get,
            },

            sessionIds: [
              sessionId,
            ],
          });

        expect(
          result,
        ).toEqual({
          scanned:
            1,

          completed:
            1,

          deleted:
            0,

          skippedWithoutMatchResult:
            1,
        });

        expect(
          get,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          get,
        ).toHaveBeenCalledWith(
          sessionId,
        );

        expect(
          store.count(),
        ).toBe(
          1,
        );

        expect(
          store.get(
            sessionId,
          ),
        ).toBeDefined();
      },
    );

    it(
      "deletes a completed room only after its match result exists",
      () => {
        const store =
          new LiveRoomStore();

        const sessionId =
          createCompletedRoom(
            store,
          );

        const storedResult =
          createStoredMatchResult(
            sessionId,
          );

        const get =
          vi.fn(
            (
              requestedSessionId:
                string,
            ): MatchResult | undefined =>
              requestedSessionId ===
                  sessionId
                ? storedResult
                : undefined,
          );

        const result =
          cleanupCompletedLiveRooms({
            roomStore:
              store,

            matchResultRepository: {
              get,
            },

            sessionIds: [
              sessionId,
            ],
          });

        expect(
          result,
        ).toEqual({
          scanned:
            1,

          completed:
            1,

          deleted:
            1,

          skippedWithoutMatchResult:
            0,
        });

        expect(
          get,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          get,
        ).toHaveBeenCalledWith(
          sessionId,
        );

        expect(
          store.count(),
        ).toBe(
          0,
        );

        expect(
          store.get(
            sessionId,
          ),
        ).toBeUndefined();
      },
    );
  },
);
