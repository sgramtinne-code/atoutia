import {
  createHash,
  randomBytes,
} from "node:crypto";

export const AUTH_IDENTITY_ID_PREFIX =
  "aid1_";

export const AUTH_IDENTITY_SUBJECT_HASH_LENGTH =
  64;

const AUTH_IDENTITY_SUBJECT_DOMAIN =
  "atoutia-auth-identity-subject-v1";

export const AUTH_IDENTITY_PROVIDERS =
  Object.freeze(
    [
      "GOOGLE",
    ] as const,
  );

export type AuthIdentityProvider =
  (
    typeof AUTH_IDENTITY_PROVIDERS
  )[number];

export interface AuthIdentity {
  readonly identityId:
    string;

  readonly accountId:
    string;

  readonly provider:
    AuthIdentityProvider;

  readonly subjectHash:
    string;

  readonly createdAtMs:
    number;
}

export interface CreateAuthIdentityInput {
  readonly accountId:
    string;

  readonly provider:
    AuthIdentityProvider;

  readonly providerSubject:
    string;

  readonly createdAtMs:
    number;
}

function isNonEmptyTrimmedString(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.length >
      0 &&
    value ===
      value.trim()
  );
}

export function isAuthIdentityProvider(
  value:
    unknown,
): value is AuthIdentityProvider {
  return (
    typeof value ===
      "string" &&
    (
      AUTH_IDENTITY_PROVIDERS as
        readonly string[]
    ).includes(
      value,
    )
  );
}

export function isAuthIdentityId(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    /^aid1_[0-9a-f]{32}$/.test(
      value,
    )
  );
}

export function isAuthIdentitySubjectHash(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    new RegExp(
      `^[0-9a-f]{${AUTH_IDENTITY_SUBJECT_HASH_LENGTH}}$`,
    ).test(
      value,
    )
  );
}

export function createAuthIdentityId():
  string {
  return (
    AUTH_IDENTITY_ID_PREFIX +
    randomBytes(
      16,
    ).toString(
      "hex",
    )
  );
}

export function createAuthIdentitySubjectHash(
  provider:
    AuthIdentityProvider,

  providerSubject:
    string,
): string {
  if (
    !isAuthIdentityProvider(
      provider,
    )
  ) {
    throw new Error(
      "Authentication identity provider is invalid.",
    );
  }

  if (
    !isNonEmptyTrimmedString(
      providerSubject,
    )
  ) {
    throw new Error(
      "Authentication identity provider subject is invalid.",
    );
  }

  if (
    providerSubject.length >
      512
  ) {
    throw new Error(
      "Authentication identity provider subject is too long.",
    );
  }

  return createHash(
    "sha256",
  )
    .update(
      AUTH_IDENTITY_SUBJECT_DOMAIN,
      "utf8",
    )
    .update(
      "\0",
      "utf8",
    )
    .update(
      provider,
      "utf8",
    )
    .update(
      "\0",
      "utf8",
    )
    .update(
      providerSubject,
      "utf8",
    )
    .digest(
      "hex",
    );
}

export function createAuthIdentity(
  input:
    CreateAuthIdentityInput,
): AuthIdentity {
  if (
    !isNonEmptyTrimmedString(
      input.accountId,
    )
  ) {
    throw new Error(
      "Authentication identity account identifier is invalid.",
    );
  }

  if (
    !Number.isSafeInteger(
      input.createdAtMs,
    ) ||
    input.createdAtMs <
      0
  ) {
    throw new Error(
      "Authentication identity creation time is invalid.",
    );
  }

  return Object.freeze({
    identityId:
      createAuthIdentityId(),

    accountId:
      input.accountId,

    provider:
      input.provider,

    subjectHash:
      createAuthIdentitySubjectHash(
        input.provider,
        input.providerSubject,
      ),

    createdAtMs:
      input.createdAtMs,
  });
}