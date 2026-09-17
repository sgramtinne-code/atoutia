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

const runningServers:
  RunningAuthServer[] = [];

async function startAuthServer():
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

      refreshSessionDurationMs:
        120_000,

      bootstrapAuthenticationEnabled:
        true,
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
  "auth logout HTTP",
  () => {
    it(
      "revokes the session through the logout endpoint",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startAuthServer();

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/logout`,
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
          204,
        );

        expect(
          await response.text(),
        ).toBe(
          "",
        );

        expect(
          authService.authenticate(
            created.accessToken,
          ),
        ).toBeUndefined();

        expect(
          authService.refreshSession(
            created.refreshToken,
          ),
        ).toBeUndefined();
      },
    );

    it(
      "returns the same response for an unknown refresh token",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/logout`,
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
          204,
        );

        expect(
          await response.text(),
        ).toBe(
          "",
        );
      },
    );

    it(
      "keeps repeated logout idempotent",
      async () => {
        const {
          baseUrl,
          authService,
        } =
          await startAuthServer();

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

        const requestOptions = {
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
        };

        const firstResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/logout`,
            requestOptions,
          );

        const secondResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/logout`,
            requestOptions,
          );

        expect(
          firstResponse.status,
        ).toBe(
          204,
        );

        expect(
          secondResponse.status,
        ).toBe(
          204,
        );
      },
    );

    it(
      "rejects a malformed logout request",
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
              `${baseUrl}/api/v1/auth/logout`,
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
      "returns method not allowed for unsupported logout methods",
      async () => {
        const {
          baseUrl,
        } =
          await startAuthServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/logout`,
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
      },
    );

    it(
      "keeps logout available when bootstrap authentication is disabled",
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
                10_000,

            bootstrapAuthenticationEnabled:
              false,
          });

        const account =
          authService.createAccount();

        const created =
          authService.createSession(
            account.accountId,
          );

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
          server.close();

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

        const response =
          await fetch(
            `${running.baseUrl}/api/v1/auth/logout`,
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
          204,
        );

        expect(
          authService.authenticate(
            created.accessToken,
          ),
        ).toBeUndefined();
      },
    );
  },
);