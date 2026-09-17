import {
  DatabaseSync,
} from "node:sqlite";

import type {
  AuthAccount,
  AuthAccountStatus,
  AuthRefreshCredential,
  AuthSession,
} from "./auth.js";

import {
  isAuthIdentityProvider,
  type AuthIdentity,
  type AuthIdentityProvider,
} from "./authIdentity.js";

import type {
  AuthConsumedRefreshToken,
  AuthRepository,
  AuthRepositoryTransaction,
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

interface AuthRefreshCredentialRow {
  readonly session_id:
    string;

  readonly token_hash:
    string;

  readonly created_at_ms:
    number;

  readonly expires_at_ms:
    number;
}

interface AuthConsumedRefreshTokenRow {
  readonly session_id:
    string;

  readonly token_hash:
    string;

  readonly consumed_at_ms:
    number;

  readonly expires_at_ms:
    number;
}

interface AuthIdentityRow {
  readonly identity_id:
    string;

  readonly account_id:
    string;

  readonly provider:
    string;

  readonly subject_hash:
    string;

  readonly created_at_ms:
    number;
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

function parseIdentityProvider(
  value:
    string,
): AuthIdentityProvider {
  if (
    !isAuthIdentityProvider(
      value,
    )
  ) {
    throw new Error(
      `Unsupported auth identity provider: ${value}`,
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

function mapRefreshCredentialRow(
  row:
    AuthRefreshCredentialRow,
): AuthRefreshCredential {
  return Object.freeze({
    sessionId:
      row.session_id,

    tokenHash:
      row.token_hash,

    createdAtMs:
      row.created_at_ms,

    expiresAtMs:
      row.expires_at_ms,
  });
}

function mapConsumedRefreshTokenRow(
  row:
    AuthConsumedRefreshTokenRow,
): AuthConsumedRefreshToken {
  return Object.freeze({
    sessionId:
      row.session_id,

    tokenHash:
      row.token_hash,

    consumedAtMs:
      row.consumed_at_ms,

    expiresAtMs:
      row.expires_at_ms,
  });
}

function mapIdentityRow(
  row:
    AuthIdentityRow,
): AuthIdentity {
  return Object.freeze({
    identityId:
      row.identity_id,

    accountId:
      row.account_id,

    provider:
      parseIdentityProvider(
        row.provider,
      ),

    subjectHash:
      row.subject_hash,

    createdAtMs:
      row.created_at_ms,
  });
}

export class SQLiteAuthRepository
  implements AuthRepository {
  readonly #database:
    DatabaseSync;

  #closed =
    false;

  #transactionActive =
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
      PRAGMA busy_timeout = 5000;

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

      CREATE TABLE IF NOT EXISTS auth_refresh_credentials (
        session_id TEXT PRIMARY KEY NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at_ms INTEGER NOT NULL,
        expires_at_ms INTEGER NOT NULL,
        FOREIGN KEY(session_id)
          REFERENCES auth_sessions(session_id)
          ON DELETE CASCADE
      ) STRICT;

      CREATE TABLE IF NOT EXISTS auth_consumed_refresh_tokens (
        token_hash TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        consumed_at_ms INTEGER NOT NULL,
        expires_at_ms INTEGER NOT NULL,
        FOREIGN KEY(session_id)
          REFERENCES auth_sessions(session_id)
          ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX IF NOT EXISTS auth_consumed_refresh_tokens_session_id_idx
      ON auth_consumed_refresh_tokens(session_id);

      CREATE TABLE IF NOT EXISTS auth_identities (
        identity_id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        subject_hash TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL,
        FOREIGN KEY(account_id)
          REFERENCES auth_accounts(account_id)
          ON DELETE CASCADE,
        UNIQUE(provider, subject_hash)
      ) STRICT;

      CREATE INDEX IF NOT EXISTS auth_identities_account_id_idx
      ON auth_identities(account_id);
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

  public saveRefreshCredential(
    credential:
      AuthRefreshCredential,
  ): void {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        INSERT INTO auth_refresh_credentials (
          session_id,
          token_hash,
          created_at_ms,
          expires_at_ms
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id)
        DO UPDATE SET
          token_hash = excluded.token_hash,
          created_at_ms = excluded.created_at_ms,
          expires_at_ms = excluded.expires_at_ms
      `);

    statement.run(
      credential.sessionId,
      credential.tokenHash,
      credential.createdAtMs,
      credential.expiresAtMs,
    );
  }

  public getRefreshCredential(
    sessionId:
      string,
  ):
    | AuthRefreshCredential
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          session_id,
          token_hash,
          created_at_ms,
          expires_at_ms
        FROM auth_refresh_credentials
        WHERE session_id = ?
      `);

    const row =
      statement.get(
        sessionId,
      ) as unknown as
        | AuthRefreshCredentialRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapRefreshCredentialRow(
          row,
        );
  }

  public findRefreshCredentialByTokenHash(
    tokenHash:
      string,
  ):
    | AuthRefreshCredential
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          session_id,
          token_hash,
          created_at_ms,
          expires_at_ms
        FROM auth_refresh_credentials
        WHERE token_hash = ?
      `);

    const row =
      statement.get(
        tokenHash,
      ) as unknown as
        | AuthRefreshCredentialRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapRefreshCredentialRow(
          row,
        );
  }

  public saveConsumedRefreshToken(
    consumedRefreshToken:
      AuthConsumedRefreshToken,
  ): void {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        INSERT INTO auth_consumed_refresh_tokens (
          token_hash,
          session_id,
          consumed_at_ms,
          expires_at_ms
        )
        VALUES (?, ?, ?, ?)
      `);

    statement.run(
      consumedRefreshToken.tokenHash,
      consumedRefreshToken.sessionId,
      consumedRefreshToken.consumedAtMs,
      consumedRefreshToken.expiresAtMs,
    );
  }

  public findConsumedRefreshTokenByTokenHash(
    tokenHash:
      string,
  ):
    | AuthConsumedRefreshToken
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          session_id,
          token_hash,
          consumed_at_ms,
          expires_at_ms
        FROM auth_consumed_refresh_tokens
        WHERE token_hash = ?
      `);

    const row =
      statement.get(
        tokenHash,
      ) as unknown as
        | AuthConsumedRefreshTokenRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapConsumedRefreshTokenRow(
          row,
        );
  }

  public saveIdentity(
    identity:
      AuthIdentity,
  ): void {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        INSERT INTO auth_identities (
          identity_id,
          account_id,
          provider,
          subject_hash,
          created_at_ms
        )
        VALUES (?, ?, ?, ?, ?)
      `);

    statement.run(
      identity.identityId,
      identity.accountId,
      identity.provider,
      identity.subjectHash,
      identity.createdAtMs,
    );
  }

  public getIdentity(
    identityId:
      string,
  ):
    | AuthIdentity
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          identity_id,
          account_id,
          provider,
          subject_hash,
          created_at_ms
        FROM auth_identities
        WHERE identity_id = ?
      `);

    const row =
      statement.get(
        identityId,
      ) as unknown as
        | AuthIdentityRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapIdentityRow(
          row,
        );
  }

  public findIdentityByProviderAndSubjectHash(
    provider:
      AuthIdentityProvider,

    subjectHash:
      string,
  ):
    | AuthIdentity
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT
          identity_id,
          account_id,
          provider,
          subject_hash,
          created_at_ms
        FROM auth_identities
        WHERE provider = ?
          AND subject_hash = ?
      `);

    const row =
      statement.get(
        provider,
        subjectHash,
      ) as unknown as
        | AuthIdentityRow
        | undefined;

    return row ===
      undefined
      ? undefined
      : mapIdentityRow(
          row,
        );
  }

  public transaction<T>(
    operation:
      (
        repository:
          AuthRepositoryTransaction,
      ) => T,
  ): T {
    this.#assertOpen();

    if (
      this.#transactionActive
    ) {
      throw new Error(
        "Nested SQLite auth transactions are not supported.",
      );
    }

    this.#transactionActive =
      true;

    try {
      this.#database.exec(
        "BEGIN IMMEDIATE;",
      );

      try {
        const result =
          operation(
            this,
          );

        this.#database.exec(
          "COMMIT;",
        );

        return result;
      } catch (
        error
      ) {
        try {
          this.#database.exec(
            "ROLLBACK;",
          );
        } catch {
          // Preserve the original transaction error.
        }

        throw error;
      }
    } finally {
      this.#transactionActive =
        false;
    }
  }

  public close():
    void {
    if (
      this.#closed
    ) {
      return;
    }

    if (
      this.#transactionActive
    ) {
      throw new Error(
        "Cannot close SQLite auth repository during a transaction.",
      );
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