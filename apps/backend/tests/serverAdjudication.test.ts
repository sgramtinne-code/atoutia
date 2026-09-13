import type {
  AddressInfo,
} from "node:net";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createBackendServer,
} from "../src/server.js";

type BackendServer =
  ReturnType<
    typeof createBackendServer
  >;

interface RunningBackend {
  readonly server:
    BackendServer;

  readonly baseUrl:
    string;

  readonly roomStore:
    LiveRoomStore;
}

const runningBackends:
  RunningBackend[] = [];

async function startBackend():
  Promise<RunningBackend> {
  const roomStore =
    new LiveRoomStore();

  const server =
    createBackendServer({
      roomStore,
    });

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      server.once(
        "error",
        reject,
      );

      server.listen(
        0,
        "127.0.0.1",
        () => {
          resolve();
        },
      );
    },
  );

  const address =
    server.address();

  if (
    address ===
      null ||
    typeof address ===
      "string"
  ) {
    throw new Error(
      "Expected TCP server address.",
    );
  }

  const port =
    (
      address as
        AddressInfo
    ).port;

  const running:
    RunningBackend = {
      server,

      baseUrl:
        `http://127.0.0.1:${port}`,

      roomStore,
    };

  runningBackends.push(
    running,
  );

  return running;
}

async function stopBackend(
  running:
    RunningBackend,
): Promise<void> {
  if (
    !running.server.listening
  ) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      running.server.close(
        (
          error,
        ) => {
          if (
            error !==
            undefined
          ) {
            reject(
              error,
            );

            return;
          }

          resolve();
        },
      );
    },
  );
}

function createStartedRankedRoom(
  roomStore:
    LiveRoomStore,
): string {
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

  return sessionId;
}

afterEach(
  async () => {
    const backends =
      runningBackends.splice(
        0,
      );

    for (
      const running
      of backends
    ) {
      await stopBackend(
        running,
      );
    }
  },
);

describe(
  "server live room adjudication",
  () => {
    it(
      "exposes ACTIVE adjudication when a room is created",
      async () => {
        const running =
          await startBackend();

        const response =
          await fetch(
            `${running.baseUrl}/api/v1/rooms`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  mode:
                    "RANKED",
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          201,
        );

        const body =
          await response.json() as {
            readonly mode:
              string;

            readonly adjudication:
              unknown;
          };

        expect(
          body.mode,
        ).toBe(
          "RANKED",
        );

        expect(
          body.adjudication,
        ).toEqual({
          formatVersion:
            1,

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
      "exposes ACTIVE adjudication when a room is retrieved",
      async () => {
        const running =
          await startBackend();

        const room =
          running.roomStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const response =
          await fetch(
            `${running.baseUrl}/api/v1/rooms/${sessionId}`,
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const body =
          await response.json() as {
            readonly sessionId:
              string;

            readonly adjudication:
              unknown;
          };

        expect(
          body.sessionId,
        ).toBe(
          sessionId,
        );

        expect(
          body.adjudication,
        ).toEqual({
          formatVersion:
            1,

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
      "exposes completed ranked FORFEIT adjudication from GET room",
      async () => {
        const running =
          await startBackend();

        const sessionId =
          createStartedRankedRoom(
            running.roomStore,
          );

        running.roomStore
          .forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_2",

            completedAtMs:
              123_456,
          });

        const response =
          await fetch(
            `${running.baseUrl}/api/v1/rooms/${sessionId}`,
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const body =
          await response.json() as {
            readonly revision:
              number;

            readonly adjudication:
              unknown;
          };

        expect(
          body.revision,
        ).toBe(
          5,
        );

        expect(
          body.adjudication,
        ).toEqual({
          formatVersion:
            1,

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
            123_456,
        });
      },
    );

    it(
      "does not expose private engine state through adjudication",
      async () => {
        const running =
          await startBackend();

        const sessionId =
          createStartedRankedRoom(
            running.roomStore,
          );

        running.roomStore
          .forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_3",

            completedAtMs:
              900_000,
          });

        const response =
          await fetch(
            `${running.baseUrl}/api/v1/rooms/${sessionId}`,
          );

        const body =
          await response.json() as
            Record<
              string,
              unknown
            >;

        const serialized =
          JSON.stringify(
            body.adjudication,
          );

        expect(
          serialized,
        ).not.toContain(
          "baseSeed",
        );

        expect(
          serialized,
        ).not.toContain(
          "hands",
        );

        expect(
          serialized,
        ).not.toContain(
          "participantId",
        );
      },
    );
  },
);