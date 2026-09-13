import type {
  Server,
} from "node:http";

import type {
  AddressInfo,
} from "node:net";

import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  BELOTE_ENGINE_VERSION,
} from "@atoutia/belote-engine";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createBackendServer,
} from "../src/server.js";

import {
  SQLiteLiveRoomRepository,
} from "../src/sqliteLiveRoomRepository.js";

interface RunningPersistentServer {
  readonly server:
    Server;

  readonly repository:
    SQLiteLiveRoomRepository;

  readonly roomStore:
    LiveRoomStore;

  readonly baseUrl:
    string;
}

interface RoomSummary {
  readonly sessionId:
    string;

  readonly mode:
    string;

  readonly revision:
    number;

  readonly phase:
    string;

  readonly occupiedSeats:
    number;

  readonly seats:
    Readonly<
      Record<
        string,
        boolean
      >
    >;

  readonly adjudication: {
    readonly formatVersion:
      number;

    readonly status:
      string;

    readonly completion:
      string | null;

    readonly completedAtMs:
      number | null;
  };
}

const runningServers:
  RunningPersistentServer[] = [];

const temporaryDirectories:
  string[] = [];

async function createDatabasePath():
  Promise<string> {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "atoutia-server-restart-",
      ),
    );

  temporaryDirectories.push(
    directory,
  );

  return join(
    directory,
    "atoutia.sqlite",
  );
}

async function startPersistentServer(
  databasePath:
    string,
): Promise<
  RunningPersistentServer
> {
  const repository =
    new SQLiteLiveRoomRepository({
      databasePath,
    });

  const roomStore =
    new LiveRoomStore({
      repository,
    });

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
    repository.close();

    throw new Error(
      "Expected TCP server address.",
    );
  }

  const {
    port,
  } =
    address as
      AddressInfo;

  const running:
    RunningPersistentServer = {
      server,
      repository,
      roomStore,

      baseUrl:
        `http://127.0.0.1:${port}`,
  };

  runningServers.push(
    running,
  );

  return running;
}

async function stopPersistentServer(
  running:
    RunningPersistentServer,
): Promise<void> {
  if (
    running.server.listening
  ) {
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

  running.repository.close();

  const index =
    runningServers.indexOf(
      running,
    );

  if (
    index >=
      0
  ) {
    runningServers.splice(
      index,
      1,
    );
  }
}

async function createRoom(
  baseUrl:
    string,
): Promise<RoomSummary> {
  const response =
    await fetch(
      `${baseUrl}/api/v1/rooms`,
      {
        method:
          "POST",
      },
    );

  expect(
    response.status,
  ).toBe(
    201,
  );

  return await response.json() as
    RoomSummary;
}

async function claimSeat(
  baseUrl:
    string,

  sessionId:
    string,

  player:
    string,

  participantId:
    string,

  expectedRevision:
    number,
): Promise<RoomSummary> {
  const response =
    await fetch(
      `${baseUrl}/api/v1/rooms/${sessionId}/seats`,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            participantId,
            player,
            expectedRevision,
          }),
      },
    );

  expect(
    response.status,
  ).toBe(
    200,
  );

  return await response.json() as
    RoomSummary;
}

async function getRoom(
  baseUrl:
    string,

  sessionId:
    string,
): Promise<RoomSummary> {
  const response =
    await fetch(
      `${baseUrl}/api/v1/rooms/${sessionId}`,
    );

  expect(
    response.status,
  ).toBe(
    200,
  );

  return await response.json() as
    RoomSummary;
}

afterEach(
  async () => {
    const servers =
      runningServers.splice(
        0,
      );

    for (
      const running
      of servers
    ) {
      if (
        running.server.listening
      ) {
        await new Promise<void>(
          (
            resolve,
          ) => {
            running.server.close(
              () => {
                resolve();
              },
            );
          },
        );
      }

      running.repository.close();
    }

    const directories =
      temporaryDirectories.splice(
        0,
      );

    for (
      const directory
      of directories
    ) {
      await rm(
        directory,
        {
          recursive:
            true,

          force:
            true,
        },
      );
    }
  },
);

describe(
  "backend server persistence restart",
  () => {
    it(
      "restores a room created through HTTP after a complete repository and server restart",
      async () => {
        const databasePath =
          await createDatabasePath();

        const first =
          await startPersistentServer(
            databasePath,
          );

        const created =
          await createRoom(
            first.baseUrl,
          );

        expect(
          created.revision,
        ).toBe(
          0,
        );

        expect(
          created.mode,
        ).toBe(
          "CASUAL",
        );

        expect(
          created.phase,
        ).toBe(
          "WAITING_FOR_PLAYERS",
        );

        expect(
          created.adjudication,
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

        const claimed =
          await claimSeat(
            first.baseUrl,
            created.sessionId,
            "PLAYER_0",
            "restart-participant-0",
            0,
          );

        expect(
          claimed.revision,
        ).toBe(
          1,
        );

        expect(
          claimed.occupiedSeats,
        ).toBe(
          1,
        );

        expect(
          claimed.seats.PLAYER_0,
        ).toBe(
          true,
        );

        await stopPersistentServer(
          first,
        );

        const second =
          await startPersistentServer(
            databasePath,
          );

        expect(
          second.roomStore.count(),
        ).toBe(
          1,
        );

        const restored =
          await getRoom(
            second.baseUrl,
            created.sessionId,
          );

        expect(
          restored,
        ).toEqual(
          claimed,
        );

        expect(
          restored.sessionId,
        ).toBe(
          created.sessionId,
        );

        expect(
          restored.mode,
        ).toBe(
          "CASUAL",
        );

        expect(
          restored.revision,
        ).toBe(
          1,
        );

        expect(
          restored.phase,
        ).toBe(
          "WAITING_FOR_PLAYERS",
        );

        expect(
          restored.occupiedSeats,
        ).toBe(
          1,
        );

        expect(
          restored.seats.PLAYER_0,
        ).toBe(
          true,
        );

        expect(
          restored.adjudication,
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

        await stopPersistentServer(
          second,
        );
      },
    );

    it(
      "restores an in-progress engine room and accepts the next HTTP command after restart",
      async () => {
        const databasePath =
          await createDatabasePath();

        const first =
          await startPersistentServer(
            databasePath,
          );

        const created =
          await createRoom(
            first.baseUrl,
          );

        const players = [
          "PLAYER_0",
          "PLAYER_1",
          "PLAYER_2",
          "PLAYER_3",
        ] as const;

        for (
          let index =
            0;

          index <
            players.length;

          index +=
            1
        ) {
          await claimSeat(
            first.baseUrl,
            created.sessionId,
            players[
              index
            ],
            `restart-player-${index}`,
            index,
          );
        }

        const startResponse =
          await fetch(
            `${first.baseUrl}/api/v1/rooms/${created.sessionId}/start`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  expectedRevision:
                    4,
                }),
            },
          );

        expect(
          startResponse.status,
        ).toBe(
          200,
        );

        const started =
          await startResponse.json() as
            RoomSummary;

        expect(
          started.revision,
        ).toBe(
          5,
        );

        expect(
          started.phase,
        ).toBe(
          "IN_PROGRESS",
        );

        await stopPersistentServer(
          first,
        );

        const second =
          await startPersistentServer(
            databasePath,
          );

        const restored =
          await getRoom(
            second.baseUrl,
            created.sessionId,
          );

        expect(
          restored.revision,
        ).toBe(
          5,
        );

        expect(
          restored.phase,
        ).toBe(
          "IN_PROGRESS",
        );

        expect(
          restored.occupiedSeats,
        ).toBe(
          4,
        );

        const snapshotResponse =
          await fetch(
            `${second.baseUrl}/api/v1/rooms/${created.sessionId}/snapshot`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  participantId:
                    "restart-player-1",
                }),
            },
          );

        expect(
          snapshotResponse.status,
        ).toBe(
          200,
        );

        const snapshot =
          await snapshotResponse.json() as {
            readonly revision:
              number;

            readonly player:
              string;

            readonly game: {
              readonly actions: {
                readonly mode:
                  string;
              };
            };
          };

        expect(
          snapshot.revision,
        ).toBe(
          5,
        );

        expect(
          snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          snapshot.game.actions.mode,
        ).toBe(
          "BID",
        );

        const commandResponse =
          await fetch(
            `${second.baseUrl}/api/v1/rooms/${created.sessionId}/commands`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  participantId:
                    "restart-player-1",

                  document: {
                    formatVersion:
                      1,

                    engineVersion:
                      BELOTE_ENGINE_VERSION,

                    sessionId:
                      created.sessionId,

                    expectedRevision:
                      5,

                    command: {
                      type:
                        "PASS",
                    },
                  },
                }),
            },
          );

        expect(
          commandResponse.status,
        ).toBe(
          200,
        );

        const commandResult =
          await commandResponse.json() as {
            readonly revision:
              number;

            readonly player:
              string;

            readonly game: {
              readonly match: {
                readonly public: {
                  readonly biddingPlayer:
                    string | null;
                };
              };

              readonly actions: {
                readonly mode:
                  string;
              };
            };
          };

        expect(
          commandResult.revision,
        ).toBe(
          6,
        );

        expect(
          commandResult.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          commandResult.game.actions.mode,
        ).toBe(
          "WAIT",
        );

        expect(
          commandResult.game.match.public
            .biddingPlayer,
        ).toBe(
          "PLAYER_2",
        );

        await stopPersistentServer(
          second,
        );

        const third =
          await startPersistentServer(
            databasePath,
          );

        const persistedAgain =
          await getRoom(
            third.baseUrl,
            created.sessionId,
          );

        expect(
          persistedAgain.revision,
        ).toBe(
          6,
        );

        expect(
          persistedAgain.phase,
        ).toBe(
          "IN_PROGRESS",
        );

        await stopPersistentServer(
          third,
        );
      },
    );
  },
);