import {
  describe,
  expect,
  it,
} from "vitest";

import {
  PARTICIPANT_ID_PREFIX,
  createParticipantIdForAccount,
  isParticipantIdentity,
} from "../src/participantIdentity.js";

describe(
  "participant identity",
  () => {
    it(
      "derives a stable opaque participant identifier from an account",
      () => {
        const accountId =
          "acc1_00000000000000000000000000000000";

        const first =
          createParticipantIdForAccount(
            accountId,
          );

        const second =
          createParticipantIdForAccount(
            accountId,
          );

        expect(
          first,
        ).toBe(
          second,
        );

        expect(
          first,
        ).toMatch(
          /^pid1_[0-9a-f]{64}$/,
        );

        expect(
          first.startsWith(
            PARTICIPANT_ID_PREFIX,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "does not expose the account identifier",
      () => {
        const accountId =
          "acc1_1234567890abcdef1234567890abcdef";

        const participantId =
          createParticipantIdForAccount(
            accountId,
          );

        expect(
          participantId,
        ).not.toContain(
          accountId,
        );

        expect(
          participantId,
        ).not.toContain(
          "1234567890abcdef1234567890abcdef",
        );
      },
    );

    it(
      "produces different participant identifiers for different accounts",
      () => {
        const first =
          createParticipantIdForAccount(
            "acc1_00000000000000000000000000000000",
          );

        const second =
          createParticipantIdForAccount(
            "acc1_11111111111111111111111111111111",
          );

        expect(
          first,
        ).not.toBe(
          second,
        );
      },
    );

    it(
      "rejects an empty account identifier",
      () => {
        expect(
          () =>
            createParticipantIdForAccount(
              "",
            ),
        ).toThrow(
          "Account identifier is invalid.",
        );
      },
    );

    it(
      "rejects surrounding whitespace",
      () => {
        expect(
          () =>
            createParticipantIdForAccount(
              " acc1_00000000000000000000000000000000 ",
            ),
        ).toThrow(
          "Account identifier is invalid.",
        );
      },
    );

    it(
      "recognizes valid participant identities",
      () => {
        const participantId =
          createParticipantIdForAccount(
            "acc1_00000000000000000000000000000000",
          );

        expect(
          isParticipantIdentity(
            participantId,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "rejects malformed participant identities",
      () => {
        expect(
          isParticipantIdentity(
            "participant-1",
          ),
        ).toBe(
          false,
        );

        expect(
          isParticipantIdentity(
            "pid1_1234",
          ),
        ).toBe(
          false,
        );

        expect(
          isParticipantIdentity(
            null,
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);