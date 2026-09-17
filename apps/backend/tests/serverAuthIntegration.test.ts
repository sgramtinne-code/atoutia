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

  readonly baseUrl:
    string;
}

interface CreatedSessionResponse {
  readonly token:
    string;

  readonly accessToken:
    string;

  readonly refreshToken:
    string;

  readonly session: {
    readonly sessionId:
      string;

    readonly accountId:
      string;

    readonly createdAtMs:
      number;

    readonly expiresAtMs:
      number;

    readonly revokedAtMs:
      number | null;
  };
}

const runningServers:
  RunningServer[] = [];

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
          50_000,

      sessionDurationMs:
        60_000,

      bootstrapAuthenticationEnabled:
        true,
    });

  const server =
    createBackendServer({
      roomStore:
        new LiveRoomStore(),

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

      baseUrl:
        `http://127.0.0.1:${port}`,
    };

  runningServers.push(
    running,
  );

  return running;
}

async function closeServer(
  running:
    RunningServer,
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
  "backend server auth integration",
  () => {
    it(
      "creates an account authenticates it and rotates its session through the main backend server",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const accountResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/accounts`,
            {
              method:
                "POST",
            },
          );

        expect(
          accountResponse.status,
        ).toBe(
          201,
        );

        const account =
          await accountResponse.json() as {
            readonly accountId:
              string;

            readonly status:
              string;

            readonly createdAtMs:
              number;
          };

        expect(
          account.accountId,
        ).toMatch(
          /^acc1_[0-9a-f]{32}$/,
        );

        expect(
          account.status,
        ).toBe(
          "ACTIVE",
        );

        expect(
          account.createdAtMs,
        ).toBe(
          50_000,
        );

        const sessionResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/sessions`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  accountId:
                    account.accountId,
                }),
            },
          );

        expect(
          sessionResponse.status,
        ).toBe(
          201,
        );

        const createdSession =
          await sessionResponse.json() as
            CreatedSessionResponse;

        expect(
          createdSession.token,
        ).toMatch(
          /^atk1_/,
        );

        expect(
          createdSession.accessToken,
        ).toBe(
          createdSession.token,
        );

        expect(
          createdSession.refreshToken,
        ).toMatch(
          /^art1_/,
        );

        expect(
          createdSession.session.accountId,
        ).toBe(
          account.accountId,
        );

        expect(
          createdSession.session.createdAtMs,
        ).toBe(
          50_000,
        );

        expect(
          createdSession.session.expiresAtMs,
        ).toBe(
          110_000,
        );

        const meResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${createdSession.accessToken}`,
              },
            },
          );

        expect(
          meResponse.status,
        ).toBe(
          200,
        );

        expect(
          await meResponse.json(),
        ).toEqual({
          accountId:
            account.accountId,

          authSessionId:
            createdSession.session.sessionId,
        });

        const refreshResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/refresh`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  refreshToken:
                    createdSession.refreshToken,
                }),
            },
          );

        expect(
          refreshResponse.status,
        ).toBe(
          200,
        );

        const refreshedSession =
          await refreshResponse.json() as
            CreatedSessionResponse;

        expect(
          refreshedSession.session.sessionId,
        ).toBe(
          createdSession.session.sessionId,
        );

        expect(
          refreshedSession.accessToken,
        ).not.toBe(
          createdSession.accessToken,
        );

        expect(
          refreshedSession.refreshToken,
        ).not.toBe(
          createdSession.refreshToken,
        );

        const oldAccessResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${createdSession.accessToken}`,
              },
            },
          );

        expect(
          oldAccessResponse.status,
        ).toBe(
          401,
        );

        const refreshedMeResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${refreshedSession.accessToken}`,
              },
            },
          );

        expect(
          refreshedMeResponse.status,
        ).toBe(
          200,
        );
      },
    );

    it(
      "rejects an invalid bearer token through the main backend server",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  "Bearer atk1_invalid",
              },
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
      "keeps health and room routes working when auth is enabled",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const healthResponse =
          await fetch(
            `${baseUrl}/health`,
          );

        expect(
          healthResponse.status,
        ).toBe(
          200,
        );

        const health =
          await healthResponse.json() as {
            readonly status:
              string;

            readonly liveRooms:
              number;
          };

        expect(
          health.status,
        ).toBe(
          "ok",
        );

        expect(
          health.liveRooms,
        ).toBe(
          0,
        );

        const roomResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms`,
            {
              method:
                "POST",
            },
          );

        expect(
          roomResponse.status,
        ).toBe(
          201,
        );

        const room =
          await roomResponse.json() as {
            readonly sessionId:
              string;

            readonly revision:
              number;
          };

        expect(
          room.sessionId,
        ).toMatch(
          /^ms1_[0-9a-f]{32}$/,
        );

        expect(
          room.revision,
        ).toBe(
          0,
        );

        await closeServer(
          runningServers[
            runningServers.length -
              1
          ]!,
        );
      },
    );
  },
);