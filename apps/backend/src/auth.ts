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

export const AUTH_REFRESH_TOKEN_PREFIX =
  "art1_";

export const DEFAULT_AUTH_ACCESS_TOKEN_DURATION_MS =
  15 *
  60 *
  1_000;

export const DEFAULT_AUTH_REFRESH_TOKEN_DURATION_MS =
  30 *
  24 *
  60 *
  60 *
  1_000;

export const DEFAULT_AUTH_SESSION_DURATION_MS =
  DEFAULT_AUTH_ACCESS_TOKEN_DURATION_MS;

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

export interface AuthRefreshCredential {
  readonly sessionId:
    string;

  readonly tokenHash:
    string;

  readonly createdAtMs:
    number;

  readonly expiresAtMs:
    number;
}

export interface CreatedAuthSession {
  readonly token:
    string;

  readonly accessToken:
    string;

  readonly refreshToken:
    string;

  readonly session:
    AuthSession;

  readonly refreshCredential:
    AuthRefreshCredential;
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

function assertPositiveDuration(
  value:
    number,

  name:
    string,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `${name} must be a positive safe integer.`,
    );
  }
}

function calculateExpiration(
  createdAtMs:
    number,

  durationMs:
    number,

  errorMessage:
    string,
): number {
  const expiresAtMs =
    createdAtMs +
    durationMs;

  if (
    !Number.isSafeInteger(
      expiresAtMs,
    )
  ) {
    throw new Error(
      errorMessage,
    );
  }

  return expiresAtMs;
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

export function createAuthRefreshToken():
  string {
  return (
    AUTH_REFRESH_TOKEN_PREFIX +
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

    readonly refreshDurationMs?:
      number;
  },
): CreatedAuthSession {
  assertTimestamp(
    options.createdAtMs,
    "createdAtMs",
  );

  const durationMs =
    options.durationMs ??
    DEFAULT_AUTH_ACCESS_TOKEN_DURATION_MS;

  assertPositiveDuration(
    durationMs,
    "durationMs",
  );

  const expiresAtMs =
    calculateExpiration(
      options.createdAtMs,
      durationMs,
      "Auth session expiration is outside the safe integer range.",
    );

  const refreshDurationMs =
    options.refreshDurationMs ??
    DEFAULT_AUTH_REFRESH_TOKEN_DURATION_MS;

  assertPositiveDuration(
    refreshDurationMs,
    "refreshDurationMs",
  );

  const refreshExpiresAtMs =
    calculateExpiration(
      options.createdAtMs,
      refreshDurationMs,
      "Auth refresh expiration is outside the safe integer range.",
    );

  if (
    expiresAtMs >
      refreshExpiresAtMs
  ) {
    throw new Error(
      "Auth access token duration must not exceed refresh token duration.",
    );
  }

  const sessionId =
    createAuthSessionId();

  const accessToken =
    createAuthToken();

  const refreshToken =
    createAuthRefreshToken();

  const session:
    AuthSession =
      Object.freeze({
        sessionId,

        accountId:
          options.accountId,

        tokenHash:
          hashAuthToken(
            accessToken,
          ),

        createdAtMs:
          options.createdAtMs,

        expiresAtMs,

        revokedAtMs:
          null,
      });

  const refreshCredential:
    AuthRefreshCredential =
      Object.freeze({
        sessionId,

        tokenHash:
          hashAuthToken(
            refreshToken,
          ),

        createdAtMs:
          options.createdAtMs,

        expiresAtMs:
          refreshExpiresAtMs,
      });

  return Object.freeze({
    token:
      accessToken,

    accessToken,

    refreshToken,

    session,

    refreshCredential,
  });
}

export function isAuthRefreshCredentialUsable(
  session:
    AuthSession,

  refreshCredential:
    AuthRefreshCredential,

  nowMs:
    number,
): boolean {
  assertTimestamp(
    nowMs,
    "nowMs",
  );

  return (
    refreshCredential.sessionId ===
      session.sessionId &&
    session.revokedAtMs ===
      null &&
    nowMs >=
      refreshCredential.createdAtMs &&
    nowMs <
      refreshCredential.expiresAtMs
  );
}

export function rotateAuthSession(
  options: {
    readonly session:
      AuthSession;

    readonly refreshCredential:
      AuthRefreshCredential;

    readonly refreshedAtMs:
      number;

    readonly durationMs?:
      number;
  },
): CreatedAuthSession {
  assertTimestamp(
    options.refreshedAtMs,
    "refreshedAtMs",
  );

  if (
    !isAuthRefreshCredentialUsable(
      options.session,
      options.refreshCredential,
      options.refreshedAtMs,
    )
  ) {
    throw new Error(
      "Auth refresh credential is not usable.",
    );
  }

  const durationMs =
    options.durationMs ??
    DEFAULT_AUTH_ACCESS_TOKEN_DURATION_MS;

  assertPositiveDuration(
    durationMs,
    "durationMs",
  );

  const requestedExpiresAtMs =
    calculateExpiration(
      options.refreshedAtMs,
      durationMs,
      "Auth session expiration is outside the safe integer range.",
    );

  const expiresAtMs =
    Math.min(
      requestedExpiresAtMs,
      options.refreshCredential
        .expiresAtMs,
    );

  const accessToken =
    createAuthToken();

  const refreshToken =
    createAuthRefreshToken();

  const session:
    AuthSession =
      Object.freeze({
        ...options.session,

        tokenHash:
          hashAuthToken(
            accessToken,
          ),

        expiresAtMs,

        revokedAtMs:
          null,
      });

  const refreshCredential:
    AuthRefreshCredential =
      Object.freeze({
        sessionId:
          session.sessionId,

        tokenHash:
          hashAuthToken(
            refreshToken,
          ),

        createdAtMs:
          options.refreshedAtMs,

        expiresAtMs:
          options.refreshCredential
            .expiresAtMs,
      });

  return Object.freeze({
    token:
      accessToken,

    accessToken,

    refreshToken,

    session,

    refreshCredential,
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