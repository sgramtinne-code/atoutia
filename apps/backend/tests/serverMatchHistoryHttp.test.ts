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
  createForfeitMatchResult,
  createNormalMatchResult,
} from "../src/matchResult.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createParticipantIdForAccount,
} from "../src/participantIdentity.js";

import {
  createBackendServer,
} from "../src/server.js";

import {
  SQLiteAuthRepository,
} from "../src/sqliteAuthRepository.js";

import {
  SQLiteMatchResultRepository,
} from "../src/sqliteMatchResultRepository.js";

interface RunningServer {
  readonly server:
    Server;

  readonly authRepository:
    SQLiteAuthRepository;

  readonly matchResultRepository:
    SQLiteMatchResultRepository;

  readonly authService:
    AuthService;

  readonly baseUrl:
    string;
}

const runningServers:
  RunningServer[] = [];

const SESSION_0 =
  "ms1_00000000000000000000000000000010";

const SESSION_1 =
  "ms1_00000000000000000000000000000011";

const SESSION_2 =
  "ms1_00000000000000000000000000000012";

async function startServer():
  Promise<RunningServer> {
  const authRepository =
    new SQLiteAuthRepository({
      databasePath:
        ":memory:",
    });

  const matchResultRepository =
    new SQLiteMatchResultRepository({
      databasePath:
        ":memory:",
    });

  const authService =
    new AuthService({
      repository:
        authRepository,

      now:
        () =>
          1_000_000,

      sessionDurationMs:
        60_000,
    });

  const roomStore =
    new LiveRoomStore();

  const serverOptions = {
    roomStore,
    authService,
    matchResultRepository,
  };

  const server =
    createBackendServer(
      serverOptions,
    );

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
    matchResultRepository.close();
    authRepository.close();

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
      authRepository,
      matchResultRepository,
      authService,

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
): {
  readonly accountId:
    string;

  readonly participantId:
    string;

  readonly token:
    string;
} {
  const account =
    authService.createAccount();

  const session =
    authService.createSession(
      account.accountId,
    );

  return Object.freeze({
    accountId:
      account.accountId,

    participantId:
      createParticipantIdForAccount(
        account.accountId,
      ),

    token:
      session.token,
  });
}

function saveFixtureResults(
  repository:
    SQLiteMatchResultRepository,

  participantId:
    string,
): void {
  repository.save(
    createNormalMatchResult({
      sessionId:
        SESSION_0,

      mode:
        "CASUAL",

      participants: {
        PLAYER_0:
          participantId,

        PLAYER_1:
          "history-opponent-0",

        PLAYER_2:
          "history-partner-0",

        PLAYER_3:
          "history-opponent-1",
      },

      completedAtMs:
        100_000,

      winningTeam:
        "TEAM_0",

      score: {
        targetScore:
          1_000,

        TEAM_0:
          1_025,

        TEAM_1:
          840,
      },
    }),
  );

  repository.save(
    createForfeitMatchResult({
      sessionId:
        SESSION_1,

      mode:
        "RANKED",

      participants: {
        PLAYER_0:
          "history-opponent-2",

        PLAYER_1:
          participantId,

        PLAYER_2:
          "history-opponent-3",

        PLAYER_3:
          "history-partner-1",
      },

      completedAtMs:
        200_000,

      forfeitingPlayer:
        "PLAYER_3",

      losingTeam:
        "TEAM_1",

      winningTeam:
        "TEAM_0",
    }),
  );

  repository.save(
    createNormalMatchResult({
      sessionId:
        SESSION_2,

      mode:
        "PRIVATE",

      participants: {
        PLAYER_0:
          "unrelated-0",

        PLAYER_1:
          "unrelated-1",

        PLAYER_2:
          "unrelated-2",

        PLAYER_3:
          "unrelated-3",
      },

      completedAtMs:
        300_000,

      winningTeam:
        "TEAM_1",

      score: {
        targetScore:
          1_000,

        TEAM_0:
          900,

        TEAM_1:
          1_030,
      },
    }),
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

      running.matchResultRepository
        .close();

      running.authRepository
        .close();
    }
  },
);

describe(
  "authenticated match history HTTP",
  () => {
    it(
      "requires authentication",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/matches/history`,
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

        const response =
          await fetch(
            `${baseUrl}/api/v1/matches/history`,
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
      "returns only the authenticated participant history from newest to oldest",
      async () => {
        const {
          baseUrl,
          authService,
          matchResultRepository,
        } =
          await startServer();

        const identity =
          createIdentity(
            authService,
          );

        saveFixtureResults(
          matchResultRepository,
          identity.participantId,
        );

        const response =
          await fetch(
            `${baseUrl}/api/v1/matches/history`,
            {
              headers: {
                authorization:
                  `Bearer ${identity.token}`,
              },
            },
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          await response.json(),
        ).toEqual({
          formatVersion:
            1,

          entries: [
            {
              formatVersion:
                1,

              sessionId:
                SESSION_1,

              mode:
                "RANKED",

              completedAtMs:
                200_000,

              completion:
                "FORFEIT",

              outcome:
                "LOSS",

              score:
                null,

              forfeit: {
                reason:
                  "PLAYER_ABSENCE",

                byOwnTeam:
                  true,

                bySelf:
                  false,
              },
            },

            {
              formatVersion:
                1,

              sessionId:
                SESSION_0,

              mode:
                "CASUAL",

              completedAtMs:
                100_000,

              completion:
                "NORMAL",

              outcome:
                "WIN",

              score: {
                targetScore:
                  1_000,

                ownTeam:
                  1_025,

                opponentTeam:
                  840,
              },

              forfeit:
                null,
            },
          ],
        });
      },
    );

    it(
      "applies an explicit result limit",
      async () => {
        const {
          baseUrl,
          authService,
          matchResultRepository,
        } =
          await startServer();

        const identity =
          createIdentity(
            authService,
          );

        saveFixtureResults(
          matchResultRepository,
          identity.participantId,
        );

        const response =
          await fetch(
            `${baseUrl}/api/v1/matches/history?limit=1`,
            {
              headers: {
                authorization:
                  `Bearer ${identity.token}`,
              },
            },
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const body =
          await response.json() as {
            readonly formatVersion:
              number;

            readonly entries:
              readonly {
                readonly sessionId:
                  string;
              }[];
          };

        expect(
          body.formatVersion,
        ).toBe(
          1,
        );

        expect(
          body.entries,
        ).toEqual([
          {
            formatVersion:
              1,

            sessionId:
              SESSION_1,

            mode:
              "RANKED",

            completedAtMs:
              200_000,

            completion:
              "FORFEIT",

            outcome:
              "LOSS",

            score:
              null,

            forfeit: {
              reason:
                "PLAYER_ABSENCE",

              byOwnTeam:
                true,

              bySelf:
                false,
            },
          },
        ]);
      },
    );

    it(
      "rejects invalid limits and client controlled participant queries",
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

        const invalidQueries =
          [
            "?limit=0",
            "?limit=101",
            "?limit=1.5",
            "?limit=abc",
            "?participantId=someone-else",
            "?limit=10&participantId=someone-else",
          ];

        for (
          const query
          of invalidQueries
        ) {
          const response =
            await fetch(
              `${baseUrl}/api/v1/matches/history${query}`,
              {
                headers: {
                  authorization:
                    `Bearer ${identity.token}`,
                },
              },
            );

          expect(
            response.status,
            query,
          ).toBe(
            400,
          );

          expect(
            await response.json(),
            query,
          ).toEqual({
            error:
              "INVALID_REQUEST",
          });
        }
      },
    );
  },
);
