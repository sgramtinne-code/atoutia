import {
  createServer,
  type IncomingMessage,
  type Server,
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
  createParticipantIdForAccount,
} from "../src/participantIdentity.js";

import {
  authenticateRealtimeConnection,
} from "../src/realtimeAuthentication.js";

import {
  SQLiteAuthRepository,
} from "../src/sqliteAuthRepository.js";

interface CapturedRequest {
  readonly server:
    Server;

  readonly request:
    IncomingMessage;
}

const servers:
  Server[] = [];

async function captureRequest(
  path:
    string,

  headers:
    Record<
      string,
      string
    > = {},
): Promise<CapturedRequest> {
  let resolveRequest:
    (
      request:
        IncomingMessage,
    ) => void;

  const requestPromise =
    new Promise<
      IncomingMessage
    >(
      (
        resolve,
      ) => {
        resolveRequest =
          resolve;
      },
    );

  const server =
    createServer(
      (
        request,
        response,
      ) => {
        resolveRequest(
          request,
        );

        response.writeHead(
          204,
        );

        response.end();
      },
    );

  servers.push(
    server,
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
    throw new Error(
      "Expected TCP server address.",
    );
  }

  const {
    port,
  } =
    address as
      AddressInfo;

  const responsePromise =
    fetch(
      `http://127.0.0.1:${port}${path}`,
      {
        headers,
      },
    );

  const request =
    await requestPromise;

  await responsePromise;

  return Object.freeze({
    server,
    request,
  });
}

function createAuthService(): {
  readonly repository:
    SQLiteAuthRepository;

  readonly authService:
    AuthService;
} {
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
          500_000,

      sessionDurationMs:
        60_000,
    });

  return Object.freeze({
    repository,
    authService,
  });
}

function createValidSessionId():
  string {
  const roomStore =
    new LiveRoomStore();

  const room =
    roomStore.create();

  return room
    .managedRoom
    .room
    .session
    .sessionId;
}

afterEach(
  async () => {
    const activeServers =
      servers.splice(
        0,
      );

    for (
      const server
      of activeServers
    ) {
      if (
        !server.listening
      ) {
        continue;
      }

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

describe(
  "realtime authentication",
  () => {
    it(
      "requires authentication",
      async () => {
        const {
          repository,
          authService,
        } =
          createAuthService();

        const sessionId =
          createValidSessionId();

        try {
          const captured =
            await captureRequest(
              `/ws?sessionId=${sessionId}`,
            );

          expect(
            authenticateRealtimeConnection(
              captured.request,
              authService,
            ),
          ).toEqual({
            status:
              "AUTH_REQUIRED",
          });
        } finally {
          repository.close();
        }
      },
    );

    it(
      "rejects an invalid bearer token",
      async () => {
        const {
          repository,
          authService,
        } =
          createAuthService();

        const sessionId =
          createValidSessionId();

        try {
          const captured =
            await captureRequest(
              `/ws?sessionId=${sessionId}`,

              {
                authorization:
                  "Bearer atk1_invalid",
              },
            );

          expect(
            authenticateRealtimeConnection(
              captured.request,
              authService,
            ),
          ).toEqual({
            status:
              "AUTH_INVALID",
          });
        } finally {
          repository.close();
        }
      },
    );

    it(
      "rejects a missing session identifier",
      async () => {
        const {
          repository,
          authService,
        } =
          createAuthService();

        const account =
          authService.createAccount();

        const session =
          authService.createSession(
            account.accountId,
          );

        try {
          const captured =
            await captureRequest(
              "/ws",

              {
                authorization:
                  `Bearer ${session.token}`,
              },
            );

          expect(
            authenticateRealtimeConnection(
              captured.request,
              authService,
            ),
          ).toEqual({
            status:
              "INVALID_CONNECTION_PARAMETERS",
          });
        } finally {
          repository.close();
        }
      },
    );

    it(
      "rejects an invalid session identifier",
      async () => {
        const {
          repository,
          authService,
        } =
          createAuthService();

        const account =
          authService.createAccount();

        const session =
          authService.createSession(
            account.accountId,
          );

        try {
          const captured =
            await captureRequest(
              "/ws?sessionId=invalid",

              {
                authorization:
                  `Bearer ${session.token}`,
              },
            );

          expect(
            authenticateRealtimeConnection(
              captured.request,
              authService,
            ),
          ).toEqual({
            status:
              "INVALID_CONNECTION_PARAMETERS",
          });
        } finally {
          repository.close();
        }
      },
    );

    it(
      "rejects a client supplied participant identifier",
      async () => {
        const {
          repository,
          authService,
        } =
          createAuthService();

        const account =
          authService.createAccount();

        const session =
          authService.createSession(
            account.accountId,
          );

        const sessionId =
          createValidSessionId();

        try {
          const captured =
            await captureRequest(
              `/ws?sessionId=${sessionId}&participantId=client-controlled`,

              {
                authorization:
                  `Bearer ${session.token}`,
              },
            );

          expect(
            authenticateRealtimeConnection(
              captured.request,
              authService,
            ),
          ).toEqual({
            status:
              "INVALID_CONNECTION_PARAMETERS",
          });
        } finally {
          repository.close();
        }
      },
    );

    it(
      "derives the realtime participant identity from the authenticated account",
      async () => {
        const {
          repository,
          authService,
        } =
          createAuthService();

        const account =
          authService.createAccount();

        const authSession =
          authService.createSession(
            account.accountId,
          );

        const sessionId =
          createValidSessionId();

        try {
          const captured =
            await captureRequest(
              `/ws?sessionId=${sessionId}`,

              {
                authorization:
                  `Bearer ${authSession.token}`,
              },
            );

          expect(
            authenticateRealtimeConnection(
              captured.request,
              authService,
            ),
          ).toEqual({
            status:
              "AUTHENTICATED",

            connection: {
              sessionId,

              accountId:
                account.accountId,

              authSessionId:
                authSession
                  .session
                  .sessionId,

              participantId:
                createParticipantIdForAccount(
                  account.accountId,
                ),
            },
          });
        } finally {
          repository.close();
        }
      },
    );

    it(
      "rejects a revoked authentication session",
      async () => {
        const {
          repository,
          authService,
        } =
          createAuthService();

        const account =
          authService.createAccount();

        const authSession =
          authService.createSession(
            account.accountId,
          );

        const sessionId =
          createValidSessionId();

        expect(
          authService.revokeSession(
            authSession
              .session
              .sessionId,
          ),
        ).toBe(
          true,
        );

        try {
          const captured =
            await captureRequest(
              `/ws?sessionId=${sessionId}`,

              {
                authorization:
                  `Bearer ${authSession.token}`,
              },
            );

          expect(
            authenticateRealtimeConnection(
              captured.request,
              authService,
            ),
          ).toEqual({
            status:
              "AUTH_INVALID",
          });
        } finally {
          repository.close();
        }
      },
    );
  },
);