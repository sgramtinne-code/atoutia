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
  "AuthService logout",
  () => {
    it(
      "revokes a session from its current refresh token",
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
        ).toBeDefined();

        now =
          2_000;

        expect(
          service.revokeSessionByRefreshToken(
            created.refreshToken,
          ),
        ).toBe(
          true,
        );

        expect(
          service.authenticate(
            created.accessToken,
          ),
        ).toBeUndefined();

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
          2_000,
        );

        repository.close();
      },
    );

    it(
      "revokes a session when logout uses a previously consumed refresh token",
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

        now =
          1_500;

        const refreshed =
          service.refreshSession(
            created.refreshToken,
          );

        expect(
          refreshed,
        ).toBeDefined();

        now =
          2_000;

        expect(
          service.revokeSessionByRefreshToken(
            created.refreshToken,
          ),
        ).toBe(
          true,
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
      "returns false for an unknown or malformed refresh token",
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
          service.revokeSessionByRefreshToken(
            "art1_unknown",
          ),
        ).toBe(
          false,
        );

        expect(
          service.revokeSessionByRefreshToken(
            " invalid ",
          ),
        ).toBe(
          false,
        );

        repository.close();
      },
    );

    it(
      "keeps logout idempotent for the same refresh token",
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
          service.revokeSessionByRefreshToken(
            created.refreshToken,
          ),
        ).toBe(
          true,
        );

        now =
          3_000;

        expect(
          service.revokeSessionByRefreshToken(
            created.refreshToken,
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
  },
);