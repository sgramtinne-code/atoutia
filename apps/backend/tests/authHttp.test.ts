import {
  createServer,
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
  handleAuthHttpRequest,
} from "../src/authHttp.js";

import {
  AuthService,
} from "../src/authService.js";

import {
  SQLiteAuthRepository,
} from "../src/sqliteAuthRepository.js";

interface RunningAuthServer {
  readonly server:
    Server;

  readonly repository:
    SQLiteAuthRepository;

  readonly authService:
    AuthService;

  readonly baseUrl:
    string;
}

interface SessionHttpResponse {
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
  RunningAuthServer[] = [];

async function startAuthServer(
  bootstrapAuthenticationEnabled =
    true,
):
  Promise<
    RunningAuthServer
  > {
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
          10_000,

      sessionDurationMs:
        60_000,

      bootstrapAuthenticationEnabled,
    });

  const server =
    createServer(
      (
        request,
        response,
      ) => {
        void handleAuthHttpRequest(
          request,
          response,
          authService,
        ).then(
          (
            handled,
          ) => {
            if (
              handled
            ) {
              return;
            }

            response.writeHead(
              418,
            );

            response.end(
              "NOT_AUTH",
            );
          },
        );
      },
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
    RunningAuthServer = {
      server,
      repository,
      authService,

      baseUrl:
        `http://127.0.0.1:${port}`,
    };

  runningServers.push(
    running,
  );

  return running;
}

async function createAccount(
  baseUrl:
    string,
): Promise<{
  readonly accountId:
    string;

  readonly status:
    string;

  readonly createdAtMs:
    number;
}> {
  const response =
    await fetch(
      `${baseUrl}/api/v1/auth/accounts`,
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
    readonly accountId:
      string;

    readonly status:
      string;

    readonly createdAtMs:
      number;
  };
}

async function createSession(
  baseUrl:
    string,

  accountId:
    string,
): Promise<
  SessionHttpResponse
> {
  const response =
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
            accountId,
          }),
      },
    );

  expect(
    response.status,
  ).toBe(
    201,
  );

  return await response.json() as
    SessionHttpResponse;
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
  "auth HTTP",
  () => {
    it(
      "creates an account when bootstrap authentication is enabled",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const account =
          await createAccount(
            baseUrl,
          );

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
          10_000,
        );
      },
    );

    it(
      "rejects an invalid account creation body",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/accounts`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  unexpected:
                    true,
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
      "creates an auth session with access and refresh tokens without exposing hashes",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const account =
          await createAccount(
            baseUrl,
          );

        const created =
          await createSession(
            baseUrl,
            account.accountId,
          );

        expect(
          created.token,
        ).toMatch(
          /^atk1_/,
        );

        expect(
          created.accessToken,
        ).toBe(
          created.token,
        );

        expect(
          created.refreshToken,
        ).toMatch(
          /^art1_/,
        );

        expect(
          created.session.accountId,
        ).toBe(
          account.accountId,
        );

        expect(
          created.session.createdAtMs,
        ).toBe(
          10_000,
        );

        expect(
          created.session.expiresAtMs,
        ).toBe(
          70_000,
        );

        expect(
          created.session.revokedAtMs,
        ).toBeNull();

        expect(
          created.session,
        ).not.toHaveProperty(
          "tokenHash",
        );

        expect(
          created,
        ).not.toHaveProperty(
          "refreshCredential",
        );
      },
    );

    it(
      "rotates an auth session through the refresh endpoint",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const account =
          await createAccount(
            baseUrl,
          );

        const created =
          await createSession(
            baseUrl,
            account.accountId,
          );

        const response =
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
                    created.refreshToken,
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const refreshed =
          await response.json() as
            SessionHttpResponse;

        expect(
          refreshed.session.sessionId,
        ).toBe(
          created.session.sessionId,
        );

        expect(
          refreshed.accessToken,
        ).not.toBe(
          created.accessToken,
        );

        expect(
          refreshed.refreshToken,
        ).not.toBe(
          created.refreshToken,
        );

        expect(
          refreshed.token,
        ).toBe(
          refreshed.accessToken,
        );

        const oldMeResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${created.accessToken}`,
              },
            },
          );

        expect(
          oldMeResponse.status,
        ).toBe(
          401,
        );

        const newMeResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${refreshed.accessToken}`,
              },
            },
          );

        expect(
          newMeResponse.status,
        ).toBe(
          200,
        );
      },
    );

    it(
      "rejects reuse of a rotated refresh token",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const account =
          await createAccount(
            baseUrl,
          );

        const created =
          await createSession(
            baseUrl,
            account.accountId,
          );

        const firstResponse =
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
                    created.refreshToken,
                }),
            },
          );

        expect(
          firstResponse.status,
        ).toBe(
          200,
        );

        const secondResponse =
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
                    created.refreshToken,
                }),
            },
          );

        expect(
          secondResponse.status,
        ).toBe(
          401,
        );

        expect(
          await secondResponse.json(),
        ).toEqual({
          error:
            "AUTH_REFRESH_INVALID",
        });
      },
    );

    it(
      "rejects an unknown refresh token",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
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
                    "art1_unknown",
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
            "AUTH_REFRESH_INVALID",
        });
      },
    );

    it(
      "rejects malformed refresh requests",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const invalidBodies =
          [
            {},
            {
              refreshToken:
                "",
            },
            {
              refreshToken:
                " invalid ",
            },
            {
              refreshToken:
                "atk1_not-a-refresh-token",
            },
            {
              refreshToken:
                123,
            },
            {
              refreshToken:
                "art1_example",

              unexpected:
                true,
            },
          ];

        for (
          const body
          of invalidBodies
        ) {
          const response =
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
                  JSON.stringify(
                    body,
                  ),
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
        }
      },
    );

    it(
      "keeps refresh available when bootstrap authentication is disabled",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startAuthServer(
            false,
          );

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

        const response =
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
                    created.refreshToken,
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          200,
        );

        const refreshed =
          await response.json() as
            SessionHttpResponse;

        expect(
          refreshed.session.accountId,
        ).toBe(
          account.accountId,
        );
      },
    );

    it(
      "rejects session creation for an unknown account",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
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
                    "acc1_ffffffffffffffffffffffffffffffff",
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          404,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "AUTH_ACCOUNT_NOT_FOUND",
        });
      },
    );

    it(
      "hides account bootstrap endpoint when bootstrap authentication is disabled",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer(
            false,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/accounts`,
            {
              method:
                "POST",
            },
          );

        expect(
          response.status,
        ).toBe(
          404,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "NOT_FOUND",
        });
      },
    );

    it(
      "hides session bootstrap endpoint when bootstrap authentication is disabled",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startAuthServer(
            false,
          );

        const account =
          authService.createAccount();

        const response =
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
          response.status,
        ).toBe(
          404,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "NOT_FOUND",
        });
      },
    );

    it(
      "keeps current account authentication available when bootstrap is disabled",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startAuthServer(
            false,
          );

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${created.token}`,
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
          accountId:
            account.accountId,

          authSessionId:
            created.session.sessionId,
        });
      },
    );

    it(
      "requires authentication for the current account endpoint",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
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
          await startAuthServer();

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
      "returns the authenticated account for a valid bearer token",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const account =
          await createAccount(
            baseUrl,
          );

        const created =
          await createSession(
            baseUrl,
            account.accountId,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${created.accessToken}`,
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
          accountId:
            account.accountId,

          authSessionId:
            created.session.sessionId,
        });
      },
    );

    it(
      "rejects an invalid authorization scheme",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  "Basic abc",
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
      "returns method not allowed for unsupported auth methods",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/accounts`,
          );

        expect(
          response.status,
        ).toBe(
          405,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "METHOD_NOT_ALLOWED",
        });

        const refreshResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/refresh`,
          );

        expect(
          refreshResponse.status,
        ).toBe(
          405,
        );

        expect(
          await refreshResponse.json(),
        ).toEqual({
          error:
            "METHOD_NOT_ALLOWED",
        });
      },
    );

    it(
      "returns not found for an unknown auth route",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/unknown`,
          );

        expect(
          response.status,
        ).toBe(
          404,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "NOT_FOUND",
        });
      },
    );

    it(
      "does not consume non-auth routes",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/health`,
          );

        expect(
          response.status,
        ).toBe(
          418,
        );

        expect(
          await response.text(),
        ).toBe(
          "NOT_AUTH",
        );
      },
    );
  },
);