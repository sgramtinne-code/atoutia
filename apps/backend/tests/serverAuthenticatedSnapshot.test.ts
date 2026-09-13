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
          200_000,

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
): {
  readonly accountId:
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

  expectedRevision:
    number,
): Promise<void> {
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
            player:
              "PLAYER_1",

            expectedRevision,
          }),
      },
    );

  expect(
    response.status,
  ).toBe(
    200,
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
  "authenticated room snapshot",
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
            `${baseUrl}/api/v1/rooms/${room.sessionId}/snapshot`,
            {
              method:
                "POST",
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
            `${baseUrl}/api/v1/rooms/${room.sessionId}/snapshot`,
            {
              method:
                "POST",

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
      "returns the snapshot using the authenticated participant identity",
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

        await claimSeat(
          baseUrl,
          room.sessionId,
          identity.token,
          room.revision,
        );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/snapshot`,
            {
              method:
                "POST",

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

        const snapshot =
          await response.json() as {
            readonly sessionId:
              string;

            readonly revision:
              number;
          };

        expect(
          snapshot.sessionId,
        ).toBe(
          room.sessionId,
        );

        expect(
          snapshot.revision,
        ).toBe(
          room.revision +
          1,
        );
      },
    );

    it(
      "accepts an explicit empty object body",
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

        await claimSeat(
          baseUrl,
          room.sessionId,
          identity.token,
          room.revision,
        );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/snapshot`,
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
                JSON.stringify(
                  {},
                ),
            },
          );

        expect(
          response.status,
        ).toBe(
          200,
        );
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

        await claimSeat(
          baseUrl,
          room.sessionId,
          identity.token,
          room.revision,
        );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/snapshot`,
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
      "does not let another authenticated account read the participant snapshot",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startServer();

        const owner =
          createIdentity(
            authService,
          );

        const attacker =
          createIdentity(
            authService,
          );

        const room =
          await createRoom(
            baseUrl,
          );

        await claimSeat(
          baseUrl,
          room.sessionId,
          owner.token,
          room.revision,
        );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/snapshot`,
            {
              method:
                "POST",

              headers: {
                authorization:
                  `Bearer ${attacker.token}`,
              },
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
      "keeps legacy snapshot behavior when auth is not configured",
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

          const claimResponse =
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
                      "legacy-participant",

                    player:
                      "PLAYER_1",

                    expectedRevision:
                      room.revision,
                  }),
              },
            );

          expect(
            claimResponse.status,
          ).toBe(
            200,
          );

          const response =
            await fetch(
              `${baseUrl}/api/v1/rooms/${room.sessionId}/snapshot`,
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
                      "legacy-participant",
                  }),
              },
            );

          expect(
            response.status,
          ).toBe(
            200,
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