import type {
  Server,
} from "node:http";

import type {
  AddressInfo,
} from "node:net";

import {
  BELOTE_ENGINE_VERSION,
} from "@atoutia/belote-engine";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  AuthService,
} from "../src/authService.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createBackendServer,
} from "../src/server.js";

import {
  SQLiteAuthRepository,
} from "../src/sqliteAuthRepository.js";

interface RunningServer {
  readonly server:
    Server;

  readonly repository:
    SQLiteAuthRepository;

  readonly authService:
    AuthService;

  readonly roomStore:
    LiveRoomStore;

  readonly baseUrl:
    string;
}

interface Identity {
  readonly accountId:
    string;

  readonly token:
    string;
}

const runningServers:
  RunningServer[] = [];

const PLAYER_POSITIONS =
  [
    "PLAYER_0",
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
  ] as const;

async function startServer():
  Promise<RunningServer> {
  const repository =
    new SQLiteAuthRepository({
      databasePath:
        ":memory:",
    });

  const authService =
    new AuthService({
      repository,

      now:
        () =>
          300_000,

      sessionDurationMs:
        60_000,
    });

  const roomStore =
    new LiveRoomStore();

  const server =
    createBackendServer({
      roomStore,
      authService,
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
    RunningServer = {
      server,
      repository,
      authService,
      roomStore,

      baseUrl:
        `http://127.0.0.1:${port}`,
  };

  runningServers.push(
    running,
  );

  return running;
}

function createIdentity(
  authService:
    AuthService,
): Identity {
  const account =
    authService.createAccount();

  const session =
    authService.createSession(
      account.accountId,
    );

  return Object.freeze({
    accountId:
      account.accountId,

    token:
      session.token,
  });
}

async function createRoom(
  baseUrl:
    string,
): Promise<{
  readonly sessionId:
    string;

  readonly revision:
    number;
}> {
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

  return await response.json() as {
    readonly sessionId:
      string;

    readonly revision:
      number;
  };
}

async function claimSeat(
  baseUrl:
    string,

  sessionId:
    string,

  token:
    string,

  player:
    string,

  expectedRevision:
    number,
): Promise<number> {
  const response =
    await fetch(
      `${baseUrl}/api/v1/rooms/${sessionId}/seats`,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",

          authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify({
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

  const body =
    await response.json() as {
      readonly revision:
        number;
    };

  return body.revision;
}

async function claimAllAuthenticatedSeats(
  baseUrl:
    string,

  sessionId:
    string,

  identities:
    readonly Identity[],

  initialRevision:
    number,
): Promise<number> {
  let revision =
    initialRevision;

  for (
    let index =
      0;
    index <
      PLAYER_POSITIONS.length;
    index +=
      1
  ) {
    const identity =
      identities[
        index
      ];

    const player =
      PLAYER_POSITIONS[
        index
      ];

    if (
      identity ===
        undefined ||
      player ===
        undefined
    ) {
      throw new Error(
        "Missing authenticated player fixture.",
      );
    }

    revision =
      await claimSeat(
        baseUrl,
        sessionId,
        identity.token,
        player,
        revision,
      );
  }

  return revision;
}

async function startMatch(
  baseUrl:
    string,

  sessionId:
    string,

  expectedRevision:
    number,
): Promise<number> {
  const response =
    await fetch(
      `${baseUrl}/api/v1/rooms/${sessionId}/start`,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            expectedRevision,
          }),
      },
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
    };

  return body.revision;
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
  },
);

describe(
  "authenticated room command",
  () => {
    it(
      "requires authentication when auth is enabled",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const room =
          await createRoom(
            baseUrl,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/commands`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  document: {
                    formatVersion:
                      1,

                    engineVersion:
                      BELOTE_ENGINE_VERSION,

                    sessionId:
                      room.sessionId,

                    expectedRevision:
                      0,

                    command: {
                      type:
                        "PASS",
                    },
                  },
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          401,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "AUTH_REQUIRED",
        });
      },
    );

    it(
      "rejects an invalid bearer token",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const room =
          await createRoom(
            baseUrl,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/commands`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                authorization:
                  "Bearer atk1_invalid",
              },

              body:
                JSON.stringify({
                  document: {
                    formatVersion:
                      1,

                    engineVersion:
                      BELOTE_ENGINE_VERSION,

                    sessionId:
                      room.sessionId,

                    expectedRevision:
                      0,

                    command: {
                      type:
                        "PASS",
                    },
                  },
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          401,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "AUTH_INVALID",
        });
      },
    );

    it(
      "rejects a client supplied participant identifier when auth is enabled",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const identity =
          createIdentity(
            authService,
          );

        const room =
          await createRoom(
            baseUrl,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/commands`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                authorization:
                  `Bearer ${identity.token}`,
              },

              body:
                JSON.stringify({
                  participantId:
                    "client-controlled-participant",

                  document: {
                    formatVersion:
                      1,

                    engineVersion:
                      BELOTE_ENGINE_VERSION,

                    sessionId:
                      room.sessionId,

                    expectedRevision:
                      room.revision,

                    command: {
                      type:
                        "PASS",
                    },
                  },
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          400,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "INVALID_COMMAND",
        });
      },
    );

    it(
      "applies a command using the authenticated participant identity",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const players =
          [
            createIdentity(
              authService,
            ),
            createIdentity(
              authService,
            ),
            createIdentity(
              authService,
            ),
            createIdentity(
              authService,
            ),
          ];

        const room =
          await createRoom(
            baseUrl,
          );

        let revision =
          await claimAllAuthenticatedSeats(
            baseUrl,
            room.sessionId,
            players,
            room.revision,
          );

        revision =
          await startMatch(
            baseUrl,
            room.sessionId,
            revision,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/commands`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                authorization:
                  `Bearer ${players[1]!.token}`,
              },

              body:
                JSON.stringify({
                  document: {
                    formatVersion:
                      1,

                    engineVersion:
                      BELOTE_ENGINE_VERSION,

                    sessionId:
                      room.sessionId,

                    expectedRevision:
                      revision,

                    command: {
                      type:
                        "PASS",
                    },
                  },
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const snapshot =
          await response.json() as {
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
          snapshot.revision,
        ).toBe(
          revision +
          1,
        );

        expect(
          snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          snapshot.game.actions.mode,
        ).toBe(
          "WAIT",
        );

        expect(
          snapshot.game.match.public
            .biddingPlayer,
        ).toBe(
          "PLAYER_2",
        );
      },
    );

    it(
      "does not let another authenticated account act for the active player",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const players =
          [
            createIdentity(
              authService,
            ),
            createIdentity(
              authService,
            ),
            createIdentity(
              authService,
            ),
            createIdentity(
              authService,
            ),
          ];

        const attacker =
          createIdentity(
            authService,
          );

        const room =
          await createRoom(
            baseUrl,
          );

        let revision =
          await claimAllAuthenticatedSeats(
            baseUrl,
            room.sessionId,
            players,
            room.revision,
          );

        revision =
          await startMatch(
            baseUrl,
            room.sessionId,
            revision,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/commands`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                authorization:
                  `Bearer ${attacker.token}`,
              },

              body:
                JSON.stringify({
                  document: {
                    formatVersion:
                      1,

                    engineVersion:
                      BELOTE_ENGINE_VERSION,

                    sessionId:
                      room.sessionId,

                    expectedRevision:
                      revision,

                    command: {
                      type:
                        "PASS",
                    },
                  },
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          403,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "PARTICIPANT_FORBIDDEN",
        });
      },
    );

    it(
      "rejects a command document for another session",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const identity =
          createIdentity(
            authService,
          );

        const first =
          await createRoom(
            baseUrl,
          );

        const second =
          await createRoom(
            baseUrl,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${first.sessionId}/commands`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                authorization:
                  `Bearer ${identity.token}`,
              },

              body:
                JSON.stringify({
                  document: {
                    formatVersion:
                      1,

                    engineVersion:
                      BELOTE_ENGINE_VERSION,

                    sessionId:
                      second.sessionId,

                    expectedRevision:
                      0,

                    command: {
                      type:
                        "PASS",
                    },
                  },
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          409,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "SESSION_MISMATCH",
        });
      },
    );

    it(
      "keeps legacy command behavior when auth is not configured",
      async () => {
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

        const {
          port,
        } =
          address as
            AddressInfo;

        const baseUrl =
          `http://127.0.0.1:${port}`;

        try {
          const room =
            await createRoom(
              baseUrl,
            );

          let revision =
            room.revision;

          const legacyPlayers =
            [
              "legacy-0",
              "legacy-1",
              "legacy-2",
              "legacy-3",
            ] as const;

          for (
            let index =
              0;
            index <
              legacyPlayers.length;
            index +=
              1
          ) {
            const participantId =
              legacyPlayers[
                index
              ];

            const player =
              PLAYER_POSITIONS[
                index
              ];

            if (
              participantId ===
                undefined ||
              player ===
                undefined
            ) {
              throw new Error(
                "Missing legacy player fixture.",
              );
            }

            const response =
              await fetch(
                `${baseUrl}/api/v1/rooms/${room.sessionId}/seats`,
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
                      expectedRevision:
                        revision,
                    }),
                },
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
              };

            revision =
              body.revision;
          }

          revision =
            await startMatch(
              baseUrl,
              room.sessionId,
              revision,
            );

          const response =
            await fetch(
              `${baseUrl}/api/v1/rooms/${room.sessionId}/commands`,
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
                      "legacy-1",

                    document: {
                      formatVersion:
                        1,

                      engineVersion:
                        BELOTE_ENGINE_VERSION,

                      sessionId:
                        room.sessionId,

                      expectedRevision:
                        revision,

                      command: {
                        type:
                          "PASS",
                      },
                    },
                  }),
              },
            );

          expect(
            response.status,
          ).toBe(
            200,
          );

          const snapshot =
            await response.json() as {
              readonly revision:
                number;

              readonly player:
                string;
            };

          expect(
            snapshot.revision,
          ).toBe(
            revision +
            1,
          );

          expect(
            snapshot.player,
          ).toBe(
            "PLAYER_1",
          );
        } finally {
          await new Promise<void>(
            (
              resolve,
            ) => {
              server.close(
                () => {
                  resolve();
                },
              );
            },
          );
        }
      },
    );
  },
);