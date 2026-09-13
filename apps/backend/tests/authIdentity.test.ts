import {
  describe,
  expect,
  it,
} from "vitest";

import {
  AUTH_IDENTITY_ID_PREFIX,
  AUTH_IDENTITY_SUBJECT_HASH_LENGTH,
  createAuthIdentity,
  createAuthIdentityId,
  createAuthIdentitySubjectHash,
  isAuthIdentityId,
  isAuthIdentityProvider,
  isAuthIdentitySubjectHash,
} from "../src/authIdentity.js";

describe(
  "authentication identity",
  () => {
    it(
      "creates an opaque authentication identity identifier",
      () => {
        const identityId =
          createAuthIdentityId();

        expect(
          identityId.startsWith(
            AUTH_IDENTITY_ID_PREFIX,
          ),
        ).toBe(
          true,
        );

        expect(
          isAuthIdentityId(
            identityId,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "recognizes supported authentication identity providers",
      () => {
        expect(
          isAuthIdentityProvider(
            "GOOGLE",
          ),
        ).toBe(
          true,
        );

        expect(
          isAuthIdentityProvider(
            "UNKNOWN",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "creates a stable provider subject hash",
      () => {
        const first =
          createAuthIdentitySubjectHash(
            "GOOGLE",
            "google-subject-123",
          );

        const second =
          createAuthIdentitySubjectHash(
            "GOOGLE",
            "google-subject-123",
          );

        expect(
          first,
        ).toBe(
          second,
        );

        expect(
          first,
        ).toHaveLength(
          AUTH_IDENTITY_SUBJECT_HASH_LENGTH,
        );

        expect(
          isAuthIdentitySubjectHash(
            first,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "does not expose the provider subject in the hash",
      () => {
        const providerSubject =
          "google-subject-secret-value";

        const subjectHash =
          createAuthIdentitySubjectHash(
            "GOOGLE",
            providerSubject,
          );

        expect(
          subjectHash,
        ).not.toContain(
          providerSubject,
        );
      },
    );

    it(
      "produces different hashes for different provider subjects",
      () => {
        const first =
          createAuthIdentitySubjectHash(
            "GOOGLE",
            "subject-a",
          );

        const second =
          createAuthIdentitySubjectHash(
            "GOOGLE",
            "subject-b",
          );

        expect(
          first,
        ).not.toBe(
          second,
        );
      },
    );

    it(
      "rejects malformed provider subjects",
      () => {
        expect(
          () =>
            createAuthIdentitySubjectHash(
              "GOOGLE",
              "",
            ),
        ).toThrow(
          "Authentication identity provider subject is invalid.",
        );

        expect(
          () =>
            createAuthIdentitySubjectHash(
              "GOOGLE",
              " subject ",
            ),
        ).toThrow(
          "Authentication identity provider subject is invalid.",
        );

        expect(
          () =>
            createAuthIdentitySubjectHash(
              "GOOGLE",
              "x".repeat(
                513,
              ),
            ),
        ).toThrow(
          "Authentication identity provider subject is too long.",
        );
      },
    );

    it(
      "creates an authentication identity linked to an Atoutia account",
      () => {
        const identity =
          createAuthIdentity({
            accountId:
              "acc1_0123456789abcdef0123456789abcdef",

            provider:
              "GOOGLE",

            providerSubject:
              "google-user-123",

            createdAtMs:
              1_000,
          });

        expect(
          isAuthIdentityId(
            identity.identityId,
          ),
        ).toBe(
          true,
        );

        expect(
          identity.accountId,
        ).toBe(
          "acc1_0123456789abcdef0123456789abcdef",
        );

        expect(
          identity.provider,
        ).toBe(
          "GOOGLE",
        );

        expect(
          isAuthIdentitySubjectHash(
            identity.subjectHash,
          ),
        ).toBe(
          true,
        );

        expect(
          identity.createdAtMs,
        ).toBe(
          1_000,
        );

        expect(
          Object.isFrozen(
            identity,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "rejects an invalid account identifier",
      () => {
        expect(
          () =>
            createAuthIdentity({
              accountId:
                "",

              provider:
                "GOOGLE",

              providerSubject:
                "google-user-123",

              createdAtMs:
                1_000,
            }),
        ).toThrow(
          "Authentication identity account identifier is invalid.",
        );

        expect(
          () =>
            createAuthIdentity({
              accountId:
                " account ",

              provider:
                "GOOGLE",

              providerSubject:
                "google-user-123",

              createdAtMs:
                1_000,
            }),
        ).toThrow(
          "Authentication identity account identifier is invalid.",
        );
      },
    );

    it(
      "rejects an invalid creation time",
      () => {
        expect(
          () =>
            createAuthIdentity({
              accountId:
                "acc1_0123456789abcdef0123456789abcdef",

              provider:
                "GOOGLE",

              providerSubject:
                "google-user-123",

              createdAtMs:
                -1,
            }),
        ).toThrow(
          "Authentication identity creation time is invalid.",
        );

        expect(
          () =>
            createAuthIdentity({
              accountId:
                "acc1_0123456789abcdef0123456789abcdef",

              provider:
                "GOOGLE",

              providerSubject:
                "google-user-123",

              createdAtMs:
                1.5,
            }),
        ).toThrow(
          "Authentication identity creation time is invalid.",
        );
      },
    );
  },
);