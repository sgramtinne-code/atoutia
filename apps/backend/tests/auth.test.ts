import {
  describe,
  expect,
  it,
} from "vitest";

import {
  AUTH_ACCOUNT_ID_PREFIX,
  AUTH_SESSION_ID_PREFIX,
  AUTH_TOKEN_PREFIX,
  createAuthAccount,
  createAuthSession,
  hashAuthToken,
  isAuthSessionUsable,
  revokeAuthSession,
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
      "creates a session with an opaque token whose hash is stored separately",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              10_000,

            durationMs:
              5_000,
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
          created.token.startsWith(
            AUTH_TOKEN_PREFIX,
          ),
        ).toBe(
          true,
        );

        expect(
          created.session.tokenHash,
        ).toBe(
          hashAuthToken(
            created.token,
          ),
        );

        expect(
          created.session.tokenHash,
        ).not.toContain(
          created.token,
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
      "recognizes active and expired sessions",
      () => {
        const created =
          createAuthSession({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,

            durationMs:
              1_000,
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