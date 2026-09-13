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
  type ExternalIdentityVerifier,
} from "../src/authService.js";

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

  readonly verificationCalls:
    string[];
}

interface GoogleAuthResponse {
  readonly token:
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

  readonly accountCreated:
    boolean;
}

const runningServers:
  RunningServer[] = [];

async function startServer(
  googleEnabled =
    true,
): Promise<RunningServer> {
  const repository =
    new SQLiteAuthRepository({
      databasePath:
        ":memory:",
    });

  const verificationCalls:
    string[] = [];

  const googleVerifier:
    ExternalIdentityVerifier = {
      verify:
        async (
          proof,
        ) => {
          verificationCalls.push(
            proof,
          );

          if (
            proof !==
              "valid-google-id-token"
          ) {
            return undefined;
          }

          return Object.freeze({
            provider:
              "GOOGLE",

            providerSubject:
              "google-subject-123",
          });
        },
  };

  const authService =
    new AuthService({
      repository,

      now:
        () =>
          50_000,

      sessionDurationMs:
        60_000,

      ...(
        googleEnabled
          ? {
              externalIdentityVerifiers:
                Object.freeze({
                  GOOGLE:
                    googleVerifier,
                }),
            }
          : {}
      ),
    });

  const server =
    createBackendServer({
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
      verificationCalls,

      baseUrl:
        `http://127.0.0.1:${port}`,
  };

  runningServers.push(
    running,
  );

  return running;
}

async function authenticateWithGoogle(
  baseUrl:
    string,

  idToken:
    string,
): Promise<{
  readonly response:
    Response;

  readonly body:
    GoogleAuthResponse;
}> {
  const response =
    await fetch(
      `${baseUrl}/api/v1/auth/google`,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            idToken,
          }),
      },
    );

  const body =
    await response.json() as
      GoogleAuthResponse;

  return {
    response,
    body,
  };
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
  "Google authentication HTTP",
  () => {
    it(
      "creates an Atoutia account and session from a valid Google identity proof",
      async () => {
        const {
          baseUrl,
          verificationCalls,
        } =
          await startServer();

        const {
          response,
          body,
        } =
          await authenticateWithGoogle(
            baseUrl,
            "valid-google-id-token",
          );

        expect(
          response.status,
        ).toBe(
          201,
        );

        expect(
          body.token,
        ).toMatch(
          /^atk1_/,
        );

        expect(
          body.session.sessionId,
        ).toMatch(
          /^as1_[0-9a-f]{32}$/,
        );

        expect(
          body.session.accountId,
        ).toMatch(
          /^acc1_[0-9a-f]{32}$/,
        );

        expect(
          body.session.createdAtMs,
        ).toBe(
          50_000,
        );

        expect(
          body.session.expiresAtMs,
        ).toBe(
          110_000,
        );

        expect(
          body.session.revokedAtMs,
        ).toBeNull();

        expect(
          body.accountCreated,
        ).toBe(
          true,
        );

        expect(
          body.session,
        ).not.toHaveProperty(
          "tokenHash",
        );

        expect(
          verificationCalls,
        ).toEqual([
          "valid-google-id-token",
        ]);

        const meResponse =
          await fetch(
            `${baseUrl}/api/v1/auth/me`,
            {
              headers: {
                authorization:
                  `Bearer ${body.token}`,
              },
            },
          );

        expect(
          meResponse.status,
        ).toBe(
          200,
        );

        const me =
          await meResponse.json() as {
            readonly accountId:
              string;

            readonly authSessionId:
              string;
          };

        expect(
          me,
        ).toEqual({
          accountId:
            body.session.accountId,

          authSessionId:
            body.session.sessionId,
        });
      },
    );

    it(
      "reuses the same Atoutia account for repeated Google authentication",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const first =
          await authenticateWithGoogle(
            baseUrl,
            "valid-google-id-token",
          );

        const second =
          await authenticateWithGoogle(
            baseUrl,
            "valid-google-id-token",
          );

        expect(
          first.response.status,
        ).toBe(
          201,
        );

        expect(
          second.response.status,
        ).toBe(
          201,
        );

        expect(
          first.body.accountCreated,
        ).toBe(
          true,
        );

        expect(
          second.body.accountCreated,
        ).toBe(
          false,
        );

        expect(
          second.body.session.accountId,
        ).toBe(
          first.body.session.accountId,
        );

        expect(
          second.body.session.sessionId,
        ).not.toBe(
          first.body.session.sessionId,
        );

        expect(
          second.body.token,
        ).not.toBe(
          first.body.token,
        );
      },
    );

    it(
      "rejects an invalid Google identity proof",
      async () => {
        const {
          baseUrl,
          verificationCalls,
        } =
          await startServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/google`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  idToken:
                    "invalid-google-id-token",
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
            "AUTH_PROVIDER_INVALID",
        });

        expect(
          verificationCalls,
        ).toEqual([
          "invalid-google-id-token",
        ]);
      },
    );

    it(
      "rejects a malformed Google authentication request before verification",
      async () => {
        const {
          baseUrl,
          verificationCalls,
        } =
          await startServer();

        const invalidBodies =
          [
            {},
            {
              idToken:
                "",
            },
            {
              idToken:
                " invalid ",
            },
            {
              idToken:
                123,
            },
            {
              idToken:
                "valid-google-id-token",

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
              `${baseUrl}/api/v1/auth/google`,
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

        expect(
          verificationCalls,
        ).toEqual([]);
      },
    );

    it(
      "returns unavailable when Google authentication is not configured",
      async () => {
        const {
          baseUrl,
          verificationCalls,
        } =
          await startServer(
            false,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/google`,
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  idToken:
                    "valid-google-id-token",
                }),
            },
          );

        expect(
          response.status,
        ).toBe(
          503,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "AUTH_PROVIDER_UNAVAILABLE",
        });

        expect(
          verificationCalls,
        ).toEqual([]);
      },
    );

    it(
      "returns method not allowed for unsupported Google auth methods",
      async () => {
        const {
          baseUrl,
          verificationCalls,
        } =
          await startServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/auth/google`,
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

        expect(
          verificationCalls,
        ).toEqual([]);
      },
    );
  },
);