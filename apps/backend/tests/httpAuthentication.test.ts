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
  authenticateHttpParticipant,
} from "../src/httpAuthentication.js";

import {
  createParticipantIdForAccount,
} from "../src/participantIdentity.js";

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
      `http://127.0.0.1:${port}/`,
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
  "HTTP authentication",
  () => {
    it(
      "reports a missing authorization header",
      async () => {
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
                1_000,
          });

        const captured =
          await captureRequest();

        expect(
          authenticateHttpParticipant(
            captured.request,
            authService,
          ),
        ).toEqual({
          status:
            "MISSING",
        });

        repository.close();
      },
    );

    it(
      "rejects a non-Bearer authorization scheme",
      async () => {
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
                1_000,
          });

        const captured =
          await captureRequest({
            authorization:
              "Basic abc",
          });

        expect(
          authenticateHttpParticipant(
            captured.request,
            authService,
          ),
        ).toEqual({
          status:
            "INVALID",
        });

        repository.close();
      },
    );

    it(
      "rejects malformed Bearer authorization",
      async () => {
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
                1_000,
          });

        const captured =
          await captureRequest({
            authorization:
              "Bearer token with spaces",
          });

        expect(
          authenticateHttpParticipant(
            captured.request,
            authService,
          ),
        ).toEqual({
          status:
            "INVALID",
        });

        repository.close();
      },
    );

    it(
      "rejects an unknown Bearer token",
      async () => {
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
                1_000,
          });

        const captured =
          await captureRequest({
            authorization:
              "Bearer atk1_unknown",
          });

        expect(
          authenticateHttpParticipant(
            captured.request,
            authService,
          ),
        ).toEqual({
          status:
            "INVALID",
        });

        repository.close();
      },
    );

    it(
      "resolves account, auth session and participant identity from a valid token",
      async () => {
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
                1_000,

            sessionDurationMs:
              60_000,
          });

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

        const captured =
          await captureRequest({
            authorization:
              `Bearer ${created.token}`,
          });

        const result =
          authenticateHttpParticipant(
            captured.request,
            authService,
          );

        expect(
          result,
        ).toEqual({
          status:
            "AUTHENTICATED",

          identity: {
            accountId:
              account.accountId,

            authSessionId:
              created.session.sessionId,

            participantId:
              createParticipantIdForAccount(
                account.accountId,
              ),
          },
        });

        repository.close();
      },
    );

    it(
      "rejects an expired session",
      async () => {
        let now =
          1_000;

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
                now,

            sessionDurationMs:
              1_000,
          });

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

        now =
          2_000;

        const captured =
          await captureRequest({
            authorization:
              `Bearer ${created.token}`,
          });

        expect(
          authenticateHttpParticipant(
            captured.request,
            authService,
          ),
        ).toEqual({
          status:
            "INVALID",
        });

        repository.close();
      },
    );

    it(
      "rejects a revoked session",
      async () => {
        let now =
          1_000;

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
                now,
          });

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

        now =
          2_000;

        expect(
          authService.revokeSession(
            created.session.sessionId,
          ),
        ).toBe(
          true,
        );

        const captured =
          await captureRequest({
            authorization:
              `Bearer ${created.token}`,
          });

        expect(
          authenticateHttpParticipant(
            captured.request,
            authService,
          ),
        ).toEqual({
          status:
            "INVALID",
        });

        repository.close();
      },
    );
  },
);