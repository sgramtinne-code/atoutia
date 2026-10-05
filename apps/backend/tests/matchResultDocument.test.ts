import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createForfeitMatchResult,
  createNormalMatchResult,
} from "../src/matchResult.js";

import {
  parseMatchResultDocument,
  serializeMatchResultDocument,
} from "../src/matchResultDocument.js";

const SESSION_ID =
  "ms1_00000000000000000000000000000000";

const PARTICIPANTS =
  Object.freeze({
    PLAYER_0:
      "participant-0",

    PLAYER_1:
      "participant-1",

    PLAYER_2:
      "participant-2",

    PLAYER_3:
      "participant-3",
  });

describe(
  "match result persistence document",
  () => {
    it(
      "round-trips a normal match result",
      () => {
        const result =
          createNormalMatchResult({
            sessionId:
              SESSION_ID,

            mode:
              "RANKED",

            participants:
              PARTICIPANTS,

            completedAtMs:
              123_456,

            winningTeam:
              "TEAM_0",

            score: {
              targetScore:
                1_000,

              TEAM_0:
                1_021,

              TEAM_1:
                845,
            },
          });

        const serialized =
          serializeMatchResultDocument(
            result,
          );

        expect(
          parseMatchResultDocument(
            serialized,
          ),
        ).toEqual(
          result,
        );
      },
    );

    it(
      "round-trips a forfeit match result",
      () => {
        const result =
          createForfeitMatchResult({
            sessionId:
              SESSION_ID,

            mode:
              "RANKED",

            participants:
              PARTICIPANTS,

            completedAtMs:
              500_000,

            forfeitingPlayer:
              "PLAYER_3",

            losingTeam:
              "TEAM_1",

            winningTeam:
              "TEAM_0",
          });

        const serialized =
          serializeMatchResultDocument(
            result,
          );

        expect(
          parseMatchResultDocument(
            serialized,
          ),
        ).toEqual(
          result,
        );
      },
    );

    it(
      "rejects invalid JSON",
      () => {
        expect(
          () =>
            parseMatchResultDocument(
              "{invalid",
            ),
        ).toThrow(
          "Invalid persisted match result JSON.",
        );
      },
    );

    it(
      "rejects a non-object document",
      () => {
        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                [],
              ),
            ),
        ).toThrow(
          "Persisted match result document must be an object.",
        );
      },
    );

    it(
      "rejects an unsupported format version",
      () => {
        const document = {
          formatVersion:
            2,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          participants:
            PARTICIPANTS,

          completedAtMs:
            123_456,

          completion:
            "NORMAL",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score: {
            targetScore:
              1_000,

            TEAM_0:
              1_021,

            TEAM_1:
              845,
          },

          reason:
            null,

          forfeitingPlayer:
            null,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Unsupported persisted match result format version.",
        );
      },
    );

    it(
      "rejects unexpected document fields",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "CASUAL",

          participants:
            PARTICIPANTS,

          completedAtMs:
            123_456,

          completion:
            "NORMAL",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score: {
            targetScore:
              1_000,

            TEAM_0:
              1_021,

            TEAM_1:
              845,
          },

          reason:
            null,

          forfeitingPlayer:
            null,

          unexpected:
            true,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Invalid persisted match result document structure.",
        );
      },
    );

    it(
      "rejects malformed participants",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "CASUAL",

          participants: {
            PLAYER_0:
              "participant-0",

            PLAYER_1:
              "participant-1",

            PLAYER_2:
              "participant-2",
          },

          completedAtMs:
            123_456,

          completion:
            "NORMAL",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score: {
            targetScore:
              1_000,

            TEAM_0:
              1_021,

            TEAM_1:
              845,
          },

          reason:
            null,

          forfeitingPlayer:
            null,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Invalid persisted match result participants.",
        );
      },
    );

    it(
      "rejects a malformed normal score",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "CASUAL",

          participants:
            PARTICIPANTS,

          completedAtMs:
            123_456,

          completion:
            "NORMAL",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score: {
            targetScore:
              "1000",

            TEAM_0:
              1_021,

            TEAM_1:
              845,
          },

          reason:
            null,

          forfeitingPlayer:
            null,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Invalid persisted match result score.",
        );
      },
    );

    it(
      "rejects a normal result whose score does not represent a completed match",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "CASUAL",

          participants:
            PARTICIPANTS,

          completedAtMs:
            123_456,

          completion:
            "NORMAL",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score: {
            targetScore:
              1_000,

            TEAM_0:
              900,

            TEAM_1:
              850,
          },

          reason:
            null,

          forfeitingPlayer:
            null,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Match result score does not represent a completed match.",
        );
      },
    );

    it(
      "rejects an inconsistent normal losing team",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          participants:
            PARTICIPANTS,

          completedAtMs:
            123_456,

          completion:
            "NORMAL",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_0",

          score: {
            targetScore:
              1_000,

            TEAM_0:
              1_021,

            TEAM_1:
              845,
          },

          reason:
            null,

          forfeitingPlayer:
            null,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Persisted normal match result losing team is inconsistent.",
        );
      },
    );

    it(
      "rejects invalid normal completion metadata",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          participants:
            PARTICIPANTS,

          completedAtMs:
            123_456,

          completion:
            "NORMAL",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score: {
            targetScore:
              1_000,

            TEAM_0:
              1_021,

            TEAM_1:
              845,
          },

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            null,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Invalid persisted normal match result.",
        );
      },
    );

    it(
      "rejects malformed forfeit metadata",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          participants:
            PARTICIPANTS,

          completedAtMs:
            500_000,

          completion:
            "FORFEIT",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score:
            null,

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "INVALID_PLAYER",
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Invalid persisted forfeit match result.",
        );
      },
    );

    it(
      "rejects a forfeit whose player does not belong to the losing team",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          participants:
            PARTICIPANTS,

          completedAtMs:
            500_000,

          completion:
            "FORFEIT",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score:
            null,

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "PLAYER_0",
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Match result forfeiting player does not belong to the losing team.",
        );
      },
    );

    it(
      "rejects an unknown completion type",
      () => {
        const document = {
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          participants:
            PARTICIPANTS,

          completedAtMs:
            500_000,

          completion:
            "CANCELLED",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score:
            null,

          reason:
            null,

          forfeitingPlayer:
            null,
        };

        expect(
          () =>
            parseMatchResultDocument(
              JSON.stringify(
                document,
              ),
            ),
        ).toThrow(
          "Invalid persisted match result completion.",
        );
      },
    );
  },
);
