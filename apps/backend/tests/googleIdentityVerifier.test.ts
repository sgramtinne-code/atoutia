import {
  describe,
  expect,
  it,
} from "vitest";

import {
  GoogleIdentityVerifier,
  type GoogleIdTokenVerificationFunction,
} from "../src/googleIdentityVerifier.js";

describe(
  "GoogleIdentityVerifier",
  () => {
    it(
      "returns a verified external identity for a valid Google ID token",
      async () => {
        const calls: {
          idToken:
            string;

          audience:
            string;
        }[] = [];

        const verifyIdToken:
          GoogleIdTokenVerificationFunction =
          async (
            idToken,
            audience,
          ) => {
            calls.push({
              idToken,
              audience,
            });

            return {
              sub:
                "google-subject-123",
            };
          };

        const verifier =
          new GoogleIdentityVerifier({
            clientId:
              "atoutia-client.apps.googleusercontent.com",

            verifyIdToken,
          });

        const result =
          await verifier.verify(
            "header.payload.signature",
          );

        expect(
          result,
        ).toEqual({
          provider:
            "GOOGLE",

          providerSubject:
            "google-subject-123",
        });

        expect(
          calls,
        ).toEqual([
          {
            idToken:
              "header.payload.signature",

            audience:
              "atoutia-client.apps.googleusercontent.com",
          },
        ]);

        expect(
          Object.isFrozen(
            result,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "rejects a blank Google ID token before verification",
      async () => {
        let calls =
          0;

        const verifier =
          new GoogleIdentityVerifier({
            clientId:
              "atoutia-client.apps.googleusercontent.com",

            verifyIdToken:
              async () => {
                calls +=
                  1;

                return {
                  sub:
                    "google-subject-123",
                };
              },
          });

        expect(
          await verifier.verify(
            "",
          ),
        ).toBeUndefined();

        expect(
          await verifier.verify(
            " token ",
          ),
        ).toBeUndefined();

        expect(
          calls,
        ).toBe(
          0,
        );
      },
    );

    it(
      "rejects an excessively large Google ID token before verification",
      async () => {
        let calls =
          0;

        const verifier =
          new GoogleIdentityVerifier({
            clientId:
              "atoutia-client.apps.googleusercontent.com",

            verifyIdToken:
              async () => {
                calls +=
                  1;

                return {
                  sub:
                    "google-subject-123",
                };
              },
          });

        expect(
          await verifier.verify(
            "a".repeat(
              16_385,
            ),
          ),
        ).toBeUndefined();

        expect(
          calls,
        ).toBe(
          0,
        );
      },
    );

    it(
      "rejects a token when Google verification fails",
      async () => {
        const verifier =
          new GoogleIdentityVerifier({
            clientId:
              "atoutia-client.apps.googleusercontent.com",

            verifyIdToken:
              async () => {
                throw new Error(
                  "Invalid Google token.",
                );
              },
          });

        expect(
          await verifier.verify(
            "invalid.google.token",
          ),
        ).toBeUndefined();
      },
    );

    it(
      "rejects a verified token without a subject",
      async () => {
        const verifier =
          new GoogleIdentityVerifier({
            clientId:
              "atoutia-client.apps.googleusercontent.com",

            verifyIdToken:
              async () =>
                ({}),
          });

        expect(
          await verifier.verify(
            "header.payload.signature",
          ),
        ).toBeUndefined();
      },
    );

    it(
      "rejects malformed Google subjects",
      async () => {
        for (
          const subject
          of [
            "",
            " invalid ",
            "a".repeat(
              513,
            ),
          ]
        ) {
          const verifier =
            new GoogleIdentityVerifier({
              clientId:
                "atoutia-client.apps.googleusercontent.com",

              verifyIdToken:
                async () => ({
                  sub:
                    subject,
                }),
            });

          expect(
            await verifier.verify(
              "header.payload.signature",
            ),
          ).toBeUndefined();
        }
      },
    );

    it(
      "rejects an invalid Google client ID",
      () => {
        expect(
          () =>
            new GoogleIdentityVerifier({
              clientId:
                "",
            }),
        ).toThrow(
          "Google client ID is invalid.",
        );

        expect(
          () =>
            new GoogleIdentityVerifier({
              clientId:
                " invalid ",
            }),
        ).toThrow(
          "Google client ID is invalid.",
        );
      },
    );
  },
);