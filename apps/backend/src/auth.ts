import {
  createHash,
  randomBytes,
} from "node:crypto";

export const AUTH_ACCOUNT_ID_PREFIX =
  "acc1_";

export const AUTH_SESSION_ID_PREFIX =
  "as1_";

export const AUTH_TOKEN_PREFIX =
  "atk1_";

export const DEFAULT_AUTH_SESSION_DURATION_MS =
  30 *
  24 *
  60 *
  60 *
  1_000;

export const AUTH_ACCOUNT_STATUSES = [
  "ACTIVE",
] as const;

export type AuthAccountStatus =
  (typeof AUTH_ACCOUNT_STATUSES)[number];

export interface AuthAccount {
  readonly accountId:
    string;

  readonly status:
    AuthAccountStatus;

  readonly createdAtMs:
    number;
}

export interface AuthSession {
  readonly sessionId:
    string;

  readonly accountId:
    string;

  readonly tokenHash:
    string;

  readonly createdAtMs:
    number;

  readonly expiresAtMs:
    number;

  readonly revokedAtMs:
    number | null;
}

export interface CreatedAuthSession {
  readonly token:
    string;

  readonly session:
    AuthSession;
}

export interface AuthenticatedAccount {
  readonly accountId:
    string;

  readonly authSessionId:
    string;
}

function assertTimestamp(
  value:
    number,

  name:
    string,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      0
  ) {
    throw new Error(
      `${name} must be a non-negative safe integer.`,
    );
  }
}

export function createAuthAccountId():
  string {
  return (
    AUTH_ACCOUNT_ID_PREFIX +
    randomBytes(
      16,
    ).toString(
      "hex",
    )
  );
}

export function createAuthSessionId():
  string {
  return (
    AUTH_SESSION_ID_PREFIX +
    randomBytes(
      16,
    ).toString(
      "hex",
    )
  );
}

export function createAuthToken():
  string {
  return (
    AUTH_TOKEN_PREFIX +
    randomBytes(
      32,
    ).toString(
      "base64url",
    )
  );
}

export function hashAuthToken(
  token:
    string,
): string {
  if (
    token.trim().length ===
      0 ||
    token !==
      token.trim()
  ) {
    throw new Error(
      "Auth token is invalid.",
    );
  }

  return createHash(
    "sha256",
  )
    .update(
      token,
      "utf8",
    )
    .digest(
      "hex",
    );
}

export function createAuthAccount(
  options: {
    readonly accountId?:
      string;

    readonly createdAtMs:
      number;
  },
): AuthAccount {
  assertTimestamp(
    options.createdAtMs,
    "createdAtMs",
  );

  return Object.freeze({
    accountId:
      options.accountId ??
      createAuthAccountId(),

    status:
      "ACTIVE",

    createdAtMs:
      options.createdAtMs,
  });
}

export function createAuthSession(
  options: {
    readonly accountId:
      string;

    readonly createdAtMs:
      number;

    readonly durationMs?:
      number;
  },
): CreatedAuthSession {
  assertTimestamp(
    options.createdAtMs,
    "createdAtMs",
  );

  const durationMs =
    options.durationMs ??
    DEFAULT_AUTH_SESSION_DURATION_MS;

  if (
    !Number.isSafeInteger(
      durationMs,
    ) ||
    durationMs <=
      0
  ) {
    throw new Error(
      "durationMs must be a positive safe integer.",
    );
  }

  const expiresAtMs =
    options.createdAtMs +
    durationMs;

  if (
    !Number.isSafeInteger(
      expiresAtMs,
    )
  ) {
    throw new Error(
      "Auth session expiration is outside the safe integer range.",
    );
  }

  const token =
    createAuthToken();

  const session:
    AuthSession = Object.freeze({
      sessionId:
        createAuthSessionId(),

      accountId:
        options.accountId,

      tokenHash:
        hashAuthToken(
          token,
        ),

      createdAtMs:
        options.createdAtMs,

      expiresAtMs,

      revokedAtMs:
        null,
  });

  return Object.freeze({
    token,
    session,
  });
}

export function revokeAuthSession(
  session:
    AuthSession,

  revokedAtMs:
    number,
): AuthSession {
  assertTimestamp(
    revokedAtMs,
    "revokedAtMs",
  );

  if (
    session.revokedAtMs !==
      null
  ) {
    return session;
  }

  if (
    revokedAtMs <
    session.createdAtMs
  ) {
    throw new Error(
      "Auth session cannot be revoked before it was created.",
    );
  }

  return Object.freeze({
    ...session,

    revokedAtMs,
  });
}

export function isAuthSessionUsable(
  session:
    AuthSession,

  nowMs:
    number,
): boolean {
  assertTimestamp(
    nowMs,
    "nowMs",
  );

  return (
    session.revokedAtMs ===
      null &&
    nowMs <
      session.expiresAtMs
  );
}