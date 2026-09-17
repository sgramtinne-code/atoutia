import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createAuthIdentitySubjectHash,
} from "../src/authIdentity.js";

import {
  AuthService,
} from "../src/authService.js";

import {
  SQLiteAuthRepository,
} from "../src/sqliteAuthRepository.js";

describe(
  "AuthService",
  () => {
    it(
      "creates an account and authenticates a newly issued token",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,

            sessionDurationMs:
              10_000,

            refreshSessionDurationMs:
              20_000,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        expect(
          service.authenticate(
            created.accessToken,
          ),
        ).toEqual({
          accountId:
            account.accountId,

          authSessionId:
            created.session.sessionId,
        });

        now =
          2_000;

        expect(
          service.authenticate(
            created.token,
          ),
        ).toEqual({
          accountId:
            account.accountId,

          authSessionId:
            created.session.sessionId,
        });

        repository.close();
      },
    );

    it(
      "never authenticates an unknown token",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                1_000,
          });

        expect(
          service.authenticate(
            "atk1_unknown",
          ),
        ).toBeUndefined();

        expect(
          service.authenticate(
            " invalid ",
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "stops authenticating an expired access token",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,

            sessionDurationMs:
              1_000,

            refreshSessionDurationMs:
              10_000,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        now =
          1_999;

        expect(
          service.authenticate(
            created.accessToken,
          ),
        ).toBeDefined();

        now =
          2_000;

        expect(
          service.authenticate(
            created.accessToken,
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "rotates a refresh token and invalidates the previous access token",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,

            sessionDurationMs:
              1_000,

            refreshSessionDurationMs:
              10_000,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        now =
          1_500;

        const refreshed =
          service.refreshSession(
            created.refreshToken,
          );

        expect(
          refreshed,
        ).toBeDefined();

        expect(
          refreshed?.session.sessionId,
        ).toBe(
          created.session.sessionId,
        );

        expect(
          refreshed?.accessToken,
        ).not.toBe(
          created.accessToken,
        );

        expect(
          refreshed?.refreshToken,
        ).not.toBe(
          created.refreshToken,
        );

        expect(
          service.authenticate(
            created.accessToken,
          ),
        ).toBeUndefined();

        expect(
          service.authenticate(
            refreshed!.accessToken,
          ),
        ).toEqual({
          accountId:
            account.accountId,

          authSessionId:
            created.session.sessionId,
        });

        repository.close();
      },
    );

    it(
      "detects refresh token replay and revokes the whole session",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,

            sessionDurationMs:
              1_000,

            refreshSessionDurationMs:
              10_000,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        now =
          1_500;

        const refreshed =
          service.refreshSession(
            created.refreshToken,
          );

        expect(
          refreshed,
        ).toBeDefined();

        expect(
          service.authenticate(
            refreshed!.accessToken,
          ),
        ).toBeDefined();

        now =
          1_600;

        expect(
          service.refreshSession(
            created.refreshToken,
          ),
        ).toBeUndefined();

        expect(
          repository.getSession(
            created.session.sessionId,
          )?.revokedAtMs,
        ).toBe(
          1_600,
        );

        expect(
          service.authenticate(
            refreshed!.accessToken,
          ),
        ).toBeUndefined();

        expect(
          service.refreshSession(
            refreshed!.refreshToken,
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "refreshes a session after its access token expires",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,

            sessionDurationMs:
              1_000,

            refreshSessionDurationMs:
              10_000,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        now =
          2_000;

        expect(
          service.authenticate(
            created.accessToken,
          ),
        ).toBeUndefined();

        const refreshed =
          service.refreshSession(
            created.refreshToken,
          );

        expect(
          refreshed,
        ).toBeDefined();

        expect(
          service.authenticate(
            refreshed!.accessToken,
          )?.accountId,
        ).toBe(
          account.accountId,
        );

        repository.close();
      },
    );

    it(
      "rejects malformed unknown and expired refresh tokens",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,

            sessionDurationMs:
              1_000,

            refreshSessionDurationMs:
              2_000,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        expect(
          service.refreshSession(
            " invalid ",
          ),
        ).toBeUndefined();

        expect(
          service.refreshSession(
            "art1_unknown",
          ),
        ).toBeUndefined();

        now =
          3_000;

        expect(
          service.refreshSession(
            created.refreshToken,
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "stops authenticating a revoked token",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        now =
          2_000;

        expect(
          service.revokeSession(
            created.session.sessionId,
          ),
        ).toBe(
          true,
        );

        expect(
          service.authenticate(
            created.token,
          ),
        ).toBeUndefined();

        expect(
          service.refreshSession(
            created.refreshToken,
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "keeps session revocation idempotent",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        now =
          2_000;

        expect(
          service.revokeSession(
            created.session.sessionId,
          ),
        ).toBe(
          true,
        );

        now =
          3_000;

        expect(
          service.revokeSession(
            created.session.sessionId,
          ),
        ).toBe(
          true,
        );

        expect(
          repository.getSession(
            created.session.sessionId,
          )?.revokedAtMs,
        ).toBe(
          2_000,
        );

        repository.close();
      },
    );

    it(
      "rejects session creation for an unknown account",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                1_000,
          });

        expect(
          () =>
            service.createSession(
              "acc1_ffffffffffffffffffffffffffffffff",
            ),
        ).toThrow(
          "Auth account is not available.",
        );

        repository.close();
      },
    );

    it(
      "survives repository restart and authenticates the same token",
      () => {
        const databasePath =
          ":memory:";

        const repository =
          new SQLiteAuthRepository({
            databasePath,
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                1_000,
          });

        const account =
          service.createAccount();

        const created =
          service.createSession(
            account.accountId,
          );

        expect(
          service.authenticate(
            created.token,
          )?.accountId,
        ).toBe(
          account.accountId,
        );

        expect(
          repository
            .findRefreshCredentialByTokenHash(
              created.refreshCredential
                .tokenHash,
            ),
        ).toEqual(
          created.refreshCredential,
        );

        repository.close();
      },
    );

    it(
      "creates an account, identity and session for a new verified external identity",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                1_000,

            sessionDurationMs:
              10_000,

            refreshSessionDurationMs:
              20_000,
          });

        const result =
          service
            .createSessionForVerifiedExternalIdentity({
              provider:
                "GOOGLE",

              providerSubject:
                "google-user-123",
            });

        expect(
          result.accountCreated,
        ).toBe(
          true,
        );

        expect(
          result.identity.accountId,
        ).toBe(
          result.account.accountId,
        );

        expect(
          result.identity.provider,
        ).toBe(
          "GOOGLE",
        );

        expect(
          result.identity.subjectHash,
        ).toBe(
          createAuthIdentitySubjectHash(
            "GOOGLE",
            "google-user-123",
          ),
        );

        expect(
          repository.getAccount(
            result.account.accountId,
          ),
        ).toEqual(
          result.account,
        );

        expect(
          repository.getIdentity(
            result.identity.identityId,
          ),
        ).toEqual(
          result.identity,
        );

        expect(
          repository.getRefreshCredential(
            result.createdSession
              .session
              .sessionId,
          ),
        ).toEqual(
          result.createdSession
            .refreshCredential,
        );

        expect(
          service.authenticate(
            result.createdSession.token,
          ),
        ).toEqual({
          accountId:
            result.account.accountId,

          authSessionId:
            result.createdSession
              .session
              .sessionId,
        });

        repository.close();
      },
    );

    it(
      "reuses the same account for an already known verified external identity",
      () => {
        let now =
          1_000;

        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                now,
          });

        const first =
          service
            .createSessionForVerifiedExternalIdentity({
              provider:
                "GOOGLE",

              providerSubject:
                "google-user-123",
            });

        now =
          2_000;

        const second =
          service
            .createSessionForVerifiedExternalIdentity({
              provider:
                "GOOGLE",

              providerSubject:
                "google-user-123",
            });

        expect(
          first.accountCreated,
        ).toBe(
          true,
        );

        expect(
          second.accountCreated,
        ).toBe(
          false,
        );

        expect(
          second.account.accountId,
        ).toBe(
          first.account.accountId,
        );

        expect(
          second.identity.identityId,
        ).toBe(
          first.identity.identityId,
        );

        expect(
          second.createdSession
            .session
            .sessionId,
        ).not.toBe(
          first.createdSession
            .session
            .sessionId,
        );

        expect(
          service.authenticate(
            first.createdSession.token,
          )?.accountId,
        ).toBe(
          first.account.accountId,
        );

        expect(
          service.authenticate(
            second.createdSession.token,
          )?.accountId,
        ).toBe(
          first.account.accountId,
        );

        repository.close();
      },
    );

    it(
      "creates different accounts for different verified external identities",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                1_000,
          });

        const first =
          service
            .createSessionForVerifiedExternalIdentity({
              provider:
                "GOOGLE",

              providerSubject:
                "google-user-a",
            });

        const second =
          service
            .createSessionForVerifiedExternalIdentity({
              provider:
                "GOOGLE",

              providerSubject:
                "google-user-b",
            });

        expect(
          first.account.accountId,
        ).not.toBe(
          second.account.accountId,
        );

        expect(
          first.identity.subjectHash,
        ).not.toBe(
          second.identity.subjectHash,
        );

        repository.close();
      },
    );

    it(
      "rejects an invalid verified external identity subject",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                1_000,
          });

        expect(
          () =>
            service
              .createSessionForVerifiedExternalIdentity({
                provider:
                  "GOOGLE",

                providerSubject:
                  "",
              }),
        ).toThrow(
          "Authentication identity provider subject is invalid.",
        );

        expect(
          () =>
            service
              .createSessionForVerifiedExternalIdentity({
                provider:
                  "GOOGLE",

                providerSubject:
                  " invalid ",
              }),
        ).toThrow(
          "Authentication identity provider subject is invalid.",
        );

        repository.close();
      },
    );

    it(
      "stores only the derived subject hash and not the external provider subject",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const service =
          new AuthService({
            repository,

            now:
              () =>
                1_000,
          });

        const providerSubject =
          "sensitive-google-subject";

        const result =
          service
            .createSessionForVerifiedExternalIdentity({
              provider:
                "GOOGLE",

              providerSubject,
            });

        const persisted =
          repository
            .findIdentityByProviderAndSubjectHash(
              "GOOGLE",
              createAuthIdentitySubjectHash(
                "GOOGLE",
                providerSubject,
              ),
            );

        expect(
          persisted,
        ).toEqual(
          result.identity,
        );

        expect(
          result.identity.subjectHash,
        ).not.toContain(
          providerSubject,
        );

        repository.close();
      },
    );

    it(
      "rolls back account external identity session and refresh credential when session creation fails",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const providerSubject =
          "google-user-rollback";

        const subjectHash =
          createAuthIdentitySubjectHash(
            "GOOGLE",
            providerSubject,
          );

        const failingService =
          new AuthService({
            repository,

            now:
              () =>
                1_000,

            sessionDurationMs:
              Number.MAX_SAFE_INTEGER,
          });

        expect(
          () =>
            failingService
              .createSessionForVerifiedExternalIdentity({
                provider:
                  "GOOGLE",

                providerSubject,
              }),
        ).toThrow(
          "Auth session expiration is outside the safe integer range.",
        );

        expect(
          repository
            .findIdentityByProviderAndSubjectHash(
              "GOOGLE",
              subjectHash,
            ),
        ).toBeUndefined();

        const workingService =
          new AuthService({
            repository,

            now:
              () =>
                2_000,

            sessionDurationMs:
              10_000,

            refreshSessionDurationMs:
              20_000,
          });

        const result =
          workingService
            .createSessionForVerifiedExternalIdentity({
              provider:
                "GOOGLE",

              providerSubject,
            });

        expect(
          result.accountCreated,
        ).toBe(
          true,
        );

        expect(
          repository
            .findIdentityByProviderAndSubjectHash(
              "GOOGLE",
              subjectHash,
            ),
        ).toEqual(
          result.identity,
        );

        expect(
          repository.getRefreshCredential(
            result.createdSession
              .session
              .sessionId,
          ),
        ).toEqual(
          result.createdSession
            .refreshCredential,
        );

        expect(
          workingService.authenticate(
            result.createdSession.token,
          )?.accountId,
        ).toBe(
          result.account.accountId,
        );

        repository.close();
      },
    );
  },
);