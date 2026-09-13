import {
  describe,
  expect,
  it,
} from "vitest";

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
      "stops authenticating an expired token",
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
            created.token,
          ),
        ).toBeDefined();

        now =
          2_000;

        expect(
          service.authenticate(
            created.token,
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

        repository.close();
      },
    );
  },
);