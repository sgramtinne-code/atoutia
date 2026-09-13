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
      },
    );
  },
);