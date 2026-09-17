import {
  describe,
  expect,
  it,
} from "vitest";

import {
  AUTH_ACCOUNT_ID_PREFIX,
  AUTH_REFRESH_TOKEN_PREFIX,
  AUTH_SESSION_ID_PREFIX,
  AUTH_TOKEN_PREFIX,
  createAuthAccount,
  createAuthSession,
  hashAuthToken,
  isAuthRefreshCredentialUsable,
  isAuthSessionUsable,
  revokeAuthSession,
  rotateAuthSession,
} from "../src/auth.js";

describe(
  "auth",
  () => {
    it(
      "creates an opaque account identifier",
      () => {
        const account =
          createAuthAccount({
            createdAtMs:
              1_000,
          });

        expect(
          account.accountId,
        ).toMatch(
          /^acc1_[0-9a-f]{32}$/,
        );

        expect(
          account.accountId.startsWith(
            AUTH_ACCOUNT_ID_PREFIX,
          ),
        ).toBe(
          true,
        );

        expect(
          account,
        ).toEqual({
          accountId:
            account.accountId,

          status:
            "ACTIVE",

          createdAtMs:
            1_000,
        });

        expect(
          Object.isFrozen(
            account,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "creates access and refresh credentials without storing plaintext tokens",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              10_000,

            durationMs:
              5_000,

            refreshDurationMs:
              20_000,
          });

        expect(
          created.session.sessionId,
        ).toMatch(
          /^as1_[0-9a-f]{32}$/,
        );

        expect(
          created.session.sessionId.startsWith(
            AUTH_SESSION_ID_PREFIX,
          ),
        ).toBe(
          true,
        );

        expect(
          created.accessToken.startsWith(
            AUTH_TOKEN_PREFIX,
          ),
        ).toBe(
          true,
        );

        expect(
          created.token,
        ).toBe(
          created.accessToken,
        );

        expect(
          created.refreshToken.startsWith(
            AUTH_REFRESH_TOKEN_PREFIX,
          ),
        ).toBe(
          true,
        );

        expect(
          created.session.tokenHash,
        ).toBe(
          hashAuthToken(
            created.accessToken,
          ),
        );

        expect(
          created.refreshCredential.tokenHash,
        ).toBe(
          hashAuthToken(
            created.refreshToken,
          ),
        );

        expect(
          created.session.tokenHash,
        ).not.toContain(
          created.accessToken,
        );

        expect(
          created.refreshCredential.tokenHash,
        ).not.toContain(
          created.refreshToken,
        );

        expect(
          created.refreshCredential.sessionId,
        ).toBe(
          created.session.sessionId,
        );

        expect(
          created.session.createdAtMs,
        ).toBe(
          10_000,
        );

        expect(
          created.session.expiresAtMs,
        ).toBe(
          15_000,
        );

        expect(
          created.refreshCredential.expiresAtMs,
        ).toBe(
          30_000,
        );

        expect(
          created.session.revokedAtMs,
        ).toBeNull();
      },
    );

    it(
      "uses a stable SHA-256 token hash",
      () => {
        expect(
          hashAuthToken(
            "atk1_example",
          ),
        ).toBe(
          hashAuthToken(
            "atk1_example",
          ),
        );

        expect(
          hashAuthToken(
            "atk1_example",
          ),
        ).not.toBe(
          hashAuthToken(
            "atk1_other",
          ),
        );

        expect(
          hashAuthToken(
            "atk1_example",
          ),
        ).toMatch(
          /^[0-9a-f]{64}$/,
        );
      },
    );

    it(
      "rejects malformed token text",
      () => {
        expect(
          () =>
            hashAuthToken(
              "",
            ),
        ).toThrow(
          "Auth token is invalid.",
        );

        expect(
          () =>
            hashAuthToken(
              " token ",
            ),
        ).toThrow(
          "Auth token is invalid.",
        );
      },
    );

    it(
      "recognizes active and expired access sessions",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,

            durationMs:
              1_000,

            refreshDurationMs:
              10_000,
          });

        expect(
          isAuthSessionUsable(
            created.session,
            1_999,
          ),
        ).toBe(
          true,
        );

        expect(
          isAuthSessionUsable(
            created.session,
            2_000,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "keeps the refresh credential usable after the access token expires",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,

            durationMs:
              1_000,

            refreshDurationMs:
              10_000,
          });

        expect(
          isAuthSessionUsable(
            created.session,
            2_000,
          ),
        ).toBe(
          false,
        );

        expect(
          isAuthRefreshCredentialUsable(
            created.session,
            created.refreshCredential,
            2_000,
          ),
        ).toBe(
          true,
        );

        expect(
          isAuthRefreshCredentialUsable(
            created.session,
            created.refreshCredential,
            11_000,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "rotates both tokens without extending the maximum refresh lifetime",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,

            durationMs:
              1_000,

            refreshDurationMs:
              10_000,
          });

        const rotated =
          rotateAuthSession({
            session:
              created.session,

            refreshCredential:
              created.refreshCredential,

            refreshedAtMs:
              2_000,

            durationMs:
              2_000,
          });

        expect(
          rotated.session.sessionId,
        ).toBe(
          created.session.sessionId,
        );

        expect(
          rotated.session.accountId,
        ).toBe(
          created.session.accountId,
        );

        expect(
          rotated.accessToken,
        ).not.toBe(
          created.accessToken,
        );

        expect(
          rotated.refreshToken,
        ).not.toBe(
          created.refreshToken,
        );

        expect(
          rotated.session.tokenHash,
        ).not.toBe(
          created.session.tokenHash,
        );

        expect(
          rotated.refreshCredential.tokenHash,
        ).not.toBe(
          created.refreshCredential.tokenHash,
        );

        expect(
          rotated.session.expiresAtMs,
        ).toBe(
          4_000,
        );

        expect(
          rotated.refreshCredential.expiresAtMs,
        ).toBe(
          11_000,
        );

        expect(
          rotated.refreshCredential.createdAtMs,
        ).toBe(
          2_000,
        );
      },
    );

    it(
      "rejects refresh rotation after refresh expiration",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,

            durationMs:
              1_000,

            refreshDurationMs:
              2_000,
          });

        expect(
          () =>
            rotateAuthSession({
              session:
                created.session,

              refreshCredential:
                created.refreshCredential,

              refreshedAtMs:
                3_000,
            }),
        ).toThrow(
          "Auth refresh credential is not usable.",
        );
      },
    );

    it(
      "rejects an access lifetime longer than the refresh lifetime",
      () => {
        expect(
          () =>
            createAuthSession({
              accountId:
                "acc1_00000000000000000000000000000000",

              createdAtMs:
                1_000,

              durationMs:
                10_000,

              refreshDurationMs:
                5_000,
            }),
        ).toThrow(
          "Auth access token duration must not exceed refresh token duration.",
        );
      },
    );

    it(
      "revokes an active session",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,

            durationMs:
              5_000,
          });

        const revoked =
          revokeAuthSession(
            created.session,
            2_000,
          );

        expect(
          revoked.revokedAtMs,
        ).toBe(
          2_000,
        );

        expect(
          isAuthSessionUsable(
            revoked,
            2_001,
          ),
        ).toBe(
          false,
        );

        expect(
          isAuthRefreshCredentialUsable(
            revoked,
            created.refreshCredential,
            2_001,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "keeps revocation idempotent",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        const first =
          revokeAuthSession(
            created.session,
            2_000,
          );

        const second =
          revokeAuthSession(
            first,
            3_000,
          );

        expect(
          second,
        ).toBe(
          first,
        );

        expect(
          second.revokedAtMs,
        ).toBe(
          2_000,
        );
      },
    );
  },
);