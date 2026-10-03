import type {
  Server,
} from "node:http";

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

const PLAYER_POSITIONS =
  [
    "PLAYER_0",
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
  ] as const;

type TestPlayer =
  typeof PLAYER_POSITIONS[number];

const runningServers:
  RunningServer[] = [];

async function listen(
  server:
    Server,
): Promise<string> {
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

  return `http://127.0.0.1:${port}`;
}

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
          400_000,

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

  const baseUrl =
    await listen(
      server,
    );

  const running:
    RunningServer = {
      server,
      repository,
      authService,
      roomStore,
      baseUrl,
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

function createIdentities(
  authService:
    AuthService,
): readonly Identity[] {
  return Object.freeze(
    PLAYER_POSITIONS.map(
      () =>
        createIdentity(
          authService,
        ),
    ),
  );
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

async function claimAuthenticatedSeat(
  baseUrl:
    string,

  sessionId:
    string,

  token:
    string,

  player:
    TestPlayer,

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
        "Missing authenticated start fixture.",
      );
    }

    revision =
      await claimAuthenticatedSeat(
        baseUrl,
        sessionId,
        identity.token,
        player,
        revision,
      );
  }

  return revision;
}

async function startAuthenticatedRoom(
  baseUrl:
    string,

  sessionId:
    string,

  token:
    string,

  expectedRevision:
    number,
): Promise<Response> {
  return await fetch(
    `${baseUrl}/api/v1/rooms/${sessionId}/start`,
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
          expectedRevision,
        }),
    },
  );
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
  "authenticated room start",
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
            `${baseUrl}/api/v1/rooms/${room.sessionId}/start`,
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
                    room.revision,
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
            `${baseUrl}/api/v1/rooms/${room.sessionId}/start`,
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
                  expectedRevision:
                    room.revision,
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
      "lets the authenticated PLAYER_0 start a ready room",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const identities =
          createIdentities(
            authService,
          );

        const room =
          await createRoom(
            baseUrl,
          );

        const revision =
          await claimAllAuthenticatedSeats(
            baseUrl,
            room.sessionId,
            identities,
            room.revision,
          );

        expect(
          revision,
        ).toBe(
          4,
        );

        const host =
          identities[0];

        if (
          host ===
            undefined
        ) {
          throw new Error(
            "Missing PLAYER_0 identity.",
          );
        }

        const response =
          await startAuthenticatedRoom(
            baseUrl,
            room.sessionId,
            host.token,
            revision,
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          await response.json(),
        ).toMatchObject({
          sessionId:
            room.sessionId,

          revision:
            5,

          phase:
            "IN_PROGRESS",

          occupiedSeats:
            4,
        });
      },
    );

    it(
      "rejects authenticated PLAYER_1 PLAYER_2 and PLAYER_3",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const identities =
          createIdentities(
            authService,
          );

        const room =
          await createRoom(
            baseUrl,
          );

        const revision =
          await claimAllAuthenticatedSeats(
            baseUrl,
            room.sessionId,
            identities,
            room.revision,
          );

        for (
          let index =
            1;

          index <
            identities.length;

          index +=
            1
        ) {
          const identity =
            identities[
              index
            ];

          if (
            identity ===
              undefined
          ) {
            throw new Error(
              "Missing non-host identity.",
            );
          }

          const response =
            await startAuthenticatedRoom(
              baseUrl,
              room.sessionId,
              identity.token,
              revision,
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
        }

        const current =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}`,
          );

        expect(
          current.status,
        ).toBe(
          200,
        );

        expect(
          await current.json(),
        ).toMatchObject({
          revision,
          phase:
            "READY",
          occupiedSeats:
            4,
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
            `${baseUrl}/api/v1/rooms/${room.sessionId}/start`,
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

                  expectedRevision:
                    room.revision,
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
            "INVALID_REQUEST",
        });
      },
    );

    it(
      "rejects a stale expected revision",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const identities =
          createIdentities(
            authService,
          );

        const room =
          await createRoom(
            baseUrl,
          );

        const revision =
          await claimAllAuthenticatedSeats(
            baseUrl,
            room.sessionId,
            identities,
            room.revision,
          );

        const host =
          identities[0];

        if (
          host ===
            undefined
        ) {
          throw new Error(
            "Missing PLAYER_0 identity.",
          );
        }

        const response =
          await startAuthenticatedRoom(
            baseUrl,
            room.sessionId,
            host.token,
            revision -
              1,
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
            "REVISION_MISMATCH",
        });
      },
    );

    it(
      "rejects starting a room that is not ready",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const host =
          createIdentity(
            authService,
          );

        const room =
          await createRoom(
            baseUrl,
          );

        const revision =
          await claimAuthenticatedSeat(
            baseUrl,
            room.sessionId,
            host.token,
            "PLAYER_0",
            room.revision,
          );

        const response =
          await startAuthenticatedRoom(
            baseUrl,
            room.sessionId,
            host.token,
            revision,
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
            "COMMAND_REJECTED",
        });
      },
    );

    it(
      "keeps legacy start behavior when auth is not configured",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const server =
          createBackendServer({
            roomStore,
          });

        const baseUrl =
          await listen(
            server,
          );

        try {
          const room =
            await createRoom(
              baseUrl,
            );

          let revision =
            room.revision;

          for (
            let index =
              0;

            index <
              PLAYER_POSITIONS.length;

            index +=
              1
          ) {
            const player =
              PLAYER_POSITIONS[
                index
              ];

            if (
              player ===
                undefined
            ) {
              throw new Error(
                "Missing legacy start fixture.",
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
                      participantId:
                        `legacy-start-${index}`,

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

          const response =
            await fetch(
              `${baseUrl}/api/v1/rooms/${room.sessionId}/start`,
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
                      revision,
                  }),
              },
            );

          expect(
            response.status,
          ).toBe(
            200,
          );

          expect(
            await response.json(),
          ).toMatchObject({
            sessionId:
              room.sessionId,

            revision:
              revision +
              1,

            phase:
              "IN_PROGRESS",
          });
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