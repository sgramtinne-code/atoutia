import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createForfeitMatchResult,
  createNormalMatchResult,
} from "../src/matchResult.js";

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
  "match result",
  () => {
    it(
      "creates a normal completed match result",
      () => {
        expect(
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
          }),
        ).toEqual({
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
            null,

          forfeitingPlayer:
            null,
        });
      },
    );

    it(
      "creates a player absence forfeit without inventing a final score",
      () => {
        expect(
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
              "PLAYER_1",

            losingTeam:
              "TEAM_1",

            winningTeam:
              "TEAM_0",
          }),
        ).toEqual({
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
            "PLAYER_1",
        });
      },
    );

    it(
      "rejects an invalid session identifier",
      () => {
        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                "invalid-session",

              mode:
                "CASUAL",

              participants:
                PARTICIPANTS,

              completedAtMs:
                1_000,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  1_000,

                TEAM_0:
                  1_010,

                TEAM_1:
                  800,
              },
            }),
        ).toThrow(
          "Match result session identifier is invalid.",
        );
      },
    );

    it(
      "rejects invalid completion timestamps",
      () => {
        expect(
          () =>
            createForfeitMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "RANKED",

              participants:
                PARTICIPANTS,

              completedAtMs:
                -1,

              forfeitingPlayer:
                "PLAYER_0",

              losingTeam:
                "TEAM_0",

              winningTeam:
                "TEAM_1",
            }),
        ).toThrow(
          "Match result completedAtMs must be a non-negative safe integer.",
        );

        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "CASUAL",

              participants:
                PARTICIPANTS,

              completedAtMs:
                Number.NaN,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  1_000,

                TEAM_0:
                  1_010,

                TEAM_1:
                  800,
              },
            }),
        ).toThrow(
          "Match result completedAtMs must be a non-negative safe integer.",
        );
      },
    );

    it(
      "requires four unique participants",
      () => {
        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "PRIVATE",

              participants: {
                PLAYER_0:
                  "same-player",

                PLAYER_1:
                  "same-player",

                PLAYER_2:
                  "participant-2",

                PLAYER_3:
                  "participant-3",
              },

              completedAtMs:
                1_000,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  1_000,

                TEAM_0:
                  1_010,

                TEAM_1:
                  800,
              },
            }),
        ).toThrow(
          "Match result participants must be unique.",
        );
      },
    );

    it(
      "rejects malformed participant identifiers",
      () => {
        expect(
          () =>
            createForfeitMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "RANKED",

              participants: {
                ...PARTICIPANTS,

                PLAYER_2:
                  " participant-2",
              },

              completedAtMs:
                2_000,

              forfeitingPlayer:
                "PLAYER_1",

              losingTeam:
                "TEAM_1",

              winningTeam:
                "TEAM_0",
            }),
        ).toThrow(
          "Match result participant identifier is invalid.",
        );
      },
    );

    it(
      "rejects invalid normal score values",
      () => {
        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "CASUAL",

              participants:
                PARTICIPANTS,

              completedAtMs:
                3_000,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  0,

                TEAM_0:
                  100,

                TEAM_1:
                  90,
              },
            }),
        ).toThrow(
          "Match result targetScore must be a positive safe integer.",
        );

        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "CASUAL",

              participants:
                PARTICIPANTS,

              completedAtMs:
                3_000,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  1_000,

                TEAM_0:
                  -1,

                TEAM_1:
                  90,
              },
            }),
        ).toThrow(
          "Match result TEAM_0 score must be a non-negative safe integer.",
        );
      },
    );

    it(
      "rejects a normal result when no team has reached the target score",
      () => {
        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "CASUAL",

              participants:
                PARTICIPANTS,

              completedAtMs:
                4_000,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  1_000,

                TEAM_0:
                  900,

                TEAM_1:
                  850,
              },
            }),
        ).toThrow(
          "Match result score does not represent a completed match.",
        );
      },
    );

    it(
      "rejects a normal result when the declared winner disagrees with the score",
      () => {
        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "RANKED",

              participants:
                PARTICIPANTS,

              completedAtMs:
                5_000,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  1_000,

                TEAM_0:
                  1_005,

                TEAM_1:
                  1_080,
              },
            }),
        ).toThrow(
          "Match result winning team does not match the final score.",
        );
      },
    );

    it(
      "accepts a normal result when both teams reach the target and the higher score wins",
      () => {
        expect(
          createNormalMatchResult({
            sessionId:
              SESSION_ID,

            mode:
              "RANKED",

            participants:
              PARTICIPANTS,

            completedAtMs:
              6_000,

            winningTeam:
              "TEAM_1",

            score: {
              targetScore:
                1_000,

              TEAM_0:
                1_005,

              TEAM_1:
                1_080,
            },
          }).winningTeam,
        ).toBe(
          "TEAM_1",
        );
      },
    );

    it(
      "rejects a tied normal result even when both teams reached the target score",
      () => {
        expect(
          () =>
            createNormalMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "RANKED",

              participants:
                PARTICIPANTS,

              completedAtMs:
                6_500,

              winningTeam:
                "TEAM_0",

              score: {
                targetScore:
                  1_000,

                TEAM_0:
                  1_050,

                TEAM_1:
                  1_050,
              },
            }),
        ).toThrow(
          "Match result score does not represent a completed match.",
        );
      },
    );

    it(
      "rejects inconsistent forfeit teams",
      () => {
        expect(
          () =>
            createForfeitMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "RANKED",

              participants:
                PARTICIPANTS,

              completedAtMs:
                7_000,

              forfeitingPlayer:
                "PLAYER_1",

              losingTeam:
                "TEAM_0",

              winningTeam:
                "TEAM_1",
            }),
        ).toThrow(
          "Match result forfeiting player does not belong to the losing team.",
        );

        expect(
          () =>
            createForfeitMatchResult({
              sessionId:
                SESSION_ID,

              mode:
                "RANKED",

              participants:
                PARTICIPANTS,

              completedAtMs:
                7_000,

              forfeitingPlayer:
                "PLAYER_0",

              losingTeam:
                "TEAM_0",

              winningTeam:
                "TEAM_0",
            }),
        ).toThrow(
          "Match result winning and losing teams are inconsistent.",
        );
      },
    );
  },
);
