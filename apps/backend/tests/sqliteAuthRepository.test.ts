import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  createAuthAccount,
  createAuthSession,
  revokeAuthSession,
} from "../src/auth.js";

import {
  createAuthIdentity,
} from "../src/authIdentity.js";

import {
  SQLiteAuthRepository,
} from "../src/sqliteAuthRepository.js";

const temporaryDirectories:
  string[] = [];

async function createDatabasePath():
  Promise<string> {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "atoutia-auth-",
      ),
    );

  temporaryDirectories.push(
    directory,
  );

  return join(
    directory,
    "auth.sqlite",
  );
}

afterEach(
  async () => {
    const directories =
      temporaryDirectories.splice(
        0,
      );

    for (
      const directory
      of directories
    ) {
      await rm(
        directory,
        {
          recursive:
            true,

          force:
            true,
        },
      );
    }
  },
);

describe(
  "SQLiteAuthRepository",
  () => {
    it(
      "stores and retrieves an account",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const account =
          createAuthAccount({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        repository.saveAccount(
          account,
        );

        expect(
          repository.getAccount(
            account.accountId,
          ),
        ).toEqual(
          account,
        );

        repository.close();
      },
    );

    it(
      "stores and finds a session by token hash",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const account =
          createAuthAccount({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        repository.saveAccount(
          account,
        );

        const created =
          createAuthSession({
            accountId:
              account.accountId,

            createdAtMs:
              2_000,
          });

        repository.saveSession(
          created.session,
        );

        expect(
          repository.getSession(
            created.session.sessionId,
          ),
        ).toEqual(
          created.session,
        );

        expect(
          repository.findSessionByTokenHash(
            created.session.tokenHash,
          ),
        ).toEqual(
          created.session,
        );

        repository.close();
      },
    );

    it(
      "persists session revocation",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const account =
          createAuthAccount({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        repository.saveAccount(
          account,
        );

        const created =
          createAuthSession({
            accountId:
              account.accountId,

            createdAtMs:
              2_000,
          });

        repository.saveSession(
          created.session,
        );

        const revoked =
          revokeAuthSession(
            created.session,
            3_000,
          );

        repository.saveSession(
          revoked,
        );

        expect(
          repository.getSession(
            created.session.sessionId,
          ),
        ).toEqual(
          revoked,
        );

        repository.close();
      },
    );

    it(
      "stores and retrieves an external authentication identity",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const account =
          createAuthAccount({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        repository.saveAccount(
          account,
        );

        const identity =
          createAuthIdentity({
            accountId:
              account.accountId,

            provider:
              "GOOGLE",

            providerSubject:
              "google-user-123",

            createdAtMs:
              2_000,
          });

        repository.saveIdentity(
          identity,
        );

        expect(
          repository.getIdentity(
            identity.identityId,
          ),
        ).toEqual(
          identity,
        );

        expect(
          repository.findIdentityByProviderAndSubjectHash(
            identity.provider,
            identity.subjectHash,
          ),
        ).toEqual(
          identity,
        );

        repository.close();
      },
    );

    it(
      "returns undefined for an unknown external authentication identity",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        expect(
          repository.getIdentity(
            "aid1_00000000000000000000000000000000",
          ),
        ).toBeUndefined();

        expect(
          repository.findIdentityByProviderAndSubjectHash(
            "GOOGLE",
            "0".repeat(
              64,
            ),
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "prevents an external authentication identity from being rebound",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const firstAccount =
          createAuthAccount({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        const secondAccount =
          createAuthAccount({
            accountId:
              "acc1_11111111111111111111111111111111",

            createdAtMs:
              1_000,
          });

        repository.saveAccount(
          firstAccount,
        );

        repository.saveAccount(
          secondAccount,
        );

        const identity =
          createAuthIdentity({
            accountId:
              firstAccount.accountId,

            provider:
              "GOOGLE",

            providerSubject:
              "google-user-123",

            createdAtMs:
              2_000,
          });

        repository.saveIdentity(
          identity,
        );

        const reboundIdentity =
          Object.freeze({
            ...identity,

            accountId:
              secondAccount.accountId,

            subjectHash:
              "f".repeat(
                64,
              ),

            createdAtMs:
              3_000,
          });

        expect(
          () =>
            repository.saveIdentity(
              reboundIdentity,
            ),
        ).toThrow();

        expect(
          repository.getIdentity(
            identity.identityId,
          ),
        ).toEqual(
          identity,
        );

        expect(
          repository.findIdentityByProviderAndSubjectHash(
            identity.provider,
            identity.subjectHash,
          ),
        ).toEqual(
          identity,
        );

        expect(
          repository.findIdentityByProviderAndSubjectHash(
            reboundIdentity.provider,
            reboundIdentity.subjectHash,
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "prevents one provider subject from being linked to multiple accounts",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const firstAccount =
          createAuthAccount({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        const secondAccount =
          createAuthAccount({
            accountId:
              "acc1_11111111111111111111111111111111",

            createdAtMs:
              1_000,
          });

        repository.saveAccount(
          firstAccount,
        );

        repository.saveAccount(
          secondAccount,
        );

        const firstIdentity =
          createAuthIdentity({
            accountId:
              firstAccount.accountId,

            provider:
              "GOOGLE",

            providerSubject:
              "shared-google-user",

            createdAtMs:
              2_000,
          });

        const secondIdentity =
          createAuthIdentity({
            accountId:
              secondAccount.accountId,

            provider:
              "GOOGLE",

            providerSubject:
              "shared-google-user",

            createdAtMs:
              3_000,
          });

        repository.saveIdentity(
          firstIdentity,
        );

        expect(
          () =>
            repository.saveIdentity(
              secondIdentity,
            ),
        ).toThrow();

        expect(
          repository.findIdentityByProviderAndSubjectHash(
            firstIdentity.provider,
            firstIdentity.subjectHash,
          ),
        ).toEqual(
          firstIdentity,
        );

        repository.close();
      },
    );

    it(
      "rejects an external authentication identity whose account does not exist",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const identity =
          createAuthIdentity({
            accountId:
              "acc1_ffffffffffffffffffffffffffffffff",

            provider:
              "GOOGLE",

            providerSubject:
              "google-user-123",

            createdAtMs:
              1_000,
          });

        expect(
          () =>
            repository.saveIdentity(
              identity,
            ),
        ).toThrow();

        repository.close();
      },
    );

    it(
      "survives close and reopen",
      async () => {
        const databasePath =
          await createDatabasePath();

        const account =
          createAuthAccount({
            accountId:
              "acc1_00000000000000000000000000000000",

            createdAtMs:
              1_000,
          });

        const firstRepository =
          new SQLiteAuthRepository({
            databasePath,
          });

        firstRepository.saveAccount(
          account,
        );

        const created =
          createAuthSession({
            accountId:
              account.accountId,

            createdAtMs:
              2_000,
          });

        firstRepository.saveSession(
          created.session,
        );

        const identity =
          createAuthIdentity({
            accountId:
              account.accountId,

            provider:
              "GOOGLE",

            providerSubject:
              "google-user-123",

            createdAtMs:
              3_000,
          });

        firstRepository.saveIdentity(
          identity,
        );

        firstRepository.close();

        const secondRepository =
          new SQLiteAuthRepository({
            databasePath,
          });

        expect(
          secondRepository.getAccount(
            account.accountId,
          ),
        ).toEqual(
          account,
        );

        expect(
          secondRepository.findSessionByTokenHash(
            created.session.tokenHash,
          ),
        ).toEqual(
          created.session,
        );

        expect(
          secondRepository.getIdentity(
            identity.identityId,
          ),
        ).toEqual(
          identity,
        );

        expect(
          secondRepository.findIdentityByProviderAndSubjectHash(
            identity.provider,
            identity.subjectHash,
          ),
        ).toEqual(
          identity,
        );

        secondRepository.close();
      },
    );

    it(
      "rejects a session whose account does not exist",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        const created =
          createAuthSession({
            accountId:
              "acc1_ffffffffffffffffffffffffffffffff",

            createdAtMs:
              1_000,
          });

        expect(
          () =>
            repository.saveSession(
              created.session,
            ),
        ).toThrow();

        repository.close();
      },
    );

    it(
      "rejects operations after close",
      () => {
        const repository =
          new SQLiteAuthRepository({
            databasePath:
              ":memory:",
          });

        repository.close();

        expect(
          () =>
            repository.getAccount(
              "acc1_00000000000000000000000000000000",
            ),
        ).toThrow(
          "SQLite auth repository is closed.",
        );

        expect(
          () =>
            repository.getIdentity(
              "aid1_00000000000000000000000000000000",
            ),
        ).toThrow(
          "SQLite auth repository is closed.",
        );
      },
    );
  },
);