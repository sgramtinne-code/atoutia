import {
  DatabaseSync,
} from "node:sqlite";

import type {
  AuthAccount,
  AuthAccountStatus,
  AuthSession,
} from "./auth.js";

import type {
  AuthRepository,
} from "./authRepository.js";

interface AuthAccountRow {
  readonly account_id:
    string;

  readonly status:
    string;

  readonly created_at_ms:
    number;
}

interface AuthSessionRow {
  readonly session_id:
    string;

  readonly account_id:
    string;

  readonly token_hash:
    string;

  readonly created_at_ms:
    number;

  readonly expires_at_ms:
    number;

  readonly revoked_at_ms:
    number | null;
}

export interface SQLiteAuthRepositoryOptions {
  readonly databasePath:
    string;
}

function parseAccountStatus(
  value:
    string,
): AuthAccountStatus {
  if (
    value !==
      "ACTIVE"
  ) {
    throw new Error(
      `Unsupported auth account status: ${value}`,
    );
  }

  return value;
}

function mapAccountRow(
  row:
    AuthAccountRow,
): AuthAccount {
  return Object.freeze({
    accountId:
      row.account_id,

    status:
      parseAccountStatus(
        row.status,
      ),

    createdAtMs:
      row.created_at_ms,
  });
}

function mapSessionRow(
  row:
    AuthSessionRow,
): AuthSession {
  return Object.freeze({
    sessionId:
      row.session_id,

    accountId:
      row.account_id,

    tokenHash:
      row.token_hash,

    createdAtMs:
      row.created_at_ms,

    expiresAtMs:
      row.expires_at_ms,

    revokedAtMs:
      row.revoked_at_ms,
  });
}

export class SQLiteAuthRepository
  implements AuthRepository {
  readonly #database:
    DatabaseSync;

  #closed =
    false;

  public constructor(
    options:
      SQLiteAuthRepositoryOptions,
  ) {
    this.#database =
      new DatabaseSync(
        options.databasePath,
      );

    this.#database.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS auth_accounts (
        account_id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS auth_sessions (
        session_id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at_ms INTEGER NOT NULL,
        expires_at_ms INTEGER NOT NULL,
        revoked_at_ms INTEGER,
        FOREIGN KEY(account_id)
          REFERENCES auth_accounts(account_id)
          ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX IF NOT EXISTS auth_sessions_account_id_idx
      ON auth_sessions(account_id);
    `);
  }

  public saveAccount(
    account:
      AuthAccount,
  ): void {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        INSERT INTO auth_accounts (
          account_id,
          status,
          created_at_ms
        )
        VALUES (?, ?, ?)
        ON CONFLICT(account_id)
        DO UPDATE SET
          status = excluded.status,
          created_at_ms = excluded.created_at_ms
      `);

    statement.run(
      account.accountId,
      account.status,
      account.createdAtMs,
    );
  }

  public getAccount(
    accountId:
      string,
  ):
    | AuthAccount
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          account_id,
          status,
          created_at_ms
        FROM auth_accounts
        WHERE account_id = ?
      `);

    const row =
      statement.get(
        accountId,
      ) as unknown as
        | AuthAccountRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapAccountRow(
          row,
        );
  }

  public saveSession(
    session:
      AuthSession,
  ): void {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        INSERT INTO auth_sessions (
          session_id,
          account_id,
          token_hash,
          created_at_ms,
          expires_at_ms,
          revoked_at_ms
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id)
        DO UPDATE SET
          account_id = excluded.account_id,
          token_hash = excluded.token_hash,
          created_at_ms = excluded.created_at_ms,
          expires_at_ms = excluded.expires_at_ms,
          revoked_at_ms = excluded.revoked_at_ms
      `);

    statement.run(
      session.sessionId,
      session.accountId,
      session.tokenHash,
      session.createdAtMs,
      session.expiresAtMs,
      session.revokedAtMs,
    );
  }

  public getSession(
    sessionId:
      string,
  ):
    | AuthSession
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          session_id,
          account_id,
          token_hash,
          created_at_ms,
          expires_at_ms,
          revoked_at_ms
        FROM auth_sessions
        WHERE session_id = ?
      `);

    const row =
      statement.get(
        sessionId,
      ) as unknown as
        | AuthSessionRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapSessionRow(
          row,
        );
  }

  public findSessionByTokenHash(
    tokenHash:
      string,
  ):
    | AuthSession
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          session_id,
          account_id,
          token_hash,
          created_at_ms,
          expires_at_ms,
          revoked_at_ms
        FROM auth_sessions
        WHERE token_hash = ?
      `);

    const row =
      statement.get(
        tokenHash,
      ) as unknown as
        | AuthSessionRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapSessionRow(
          row,
        );
  }

  public close():
    void {
    if (
      this.#closed
    ) {
      return;
    }

    this.#database.close();

    this.#closed =
      true;
  }

  #assertOpen():
    void {
    if (
      this.#closed
    ) {
      throw new Error(
        "SQLite auth repository is closed.",
      );
    }
  }
}