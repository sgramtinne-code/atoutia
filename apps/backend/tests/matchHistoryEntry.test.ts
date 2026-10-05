import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createMatchHistoryEntry,
} from "../src/matchHistoryEntry.js";

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
  "match history entry",
  () => {
    it(
      "presents a normal win from the participant team perspective",
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
              100_000,

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

        expect(
          createMatchHistoryEntry(
            result,
            PARTICIPANTS.PLAYER_0,
          ),
        ).toEqual({
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          completedAtMs:
            100_000,

          completion:
            "NORMAL",

          outcome:
            "WIN",

          score: {
            targetScore:
              1_000,

            ownTeam:
              1_021,

            opponentTeam:
              845,
          },

          forfeit:
            null,
        });
      },
    );

    it(
      "presents a normal loss with scores reversed to the participant perspective",
      () => {
        const result =
          createNormalMatchResult({
            sessionId:
              SESSION_ID,

            mode:
              "CASUAL",

            participants:
              PARTICIPANTS,

            completedAtMs:
              200_000,

            winningTeam:
              "TEAM_0",

            score: {
              targetScore:
                1_000,

              TEAM_0:
                1_050,

              TEAM_1:
                910,
            },
          });

        expect(
          createMatchHistoryEntry(
            result,
            PARTICIPANTS.PLAYER_1,
          ),
        ).toEqual({
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "CASUAL",

          completedAtMs:
            200_000,

          completion:
            "NORMAL",

          outcome:
            "LOSS",

          score: {
            targetScore:
              1_000,

            ownTeam:
              910,

            opponentTeam:
              1_050,
          },

          forfeit:
            null,
        });
      },
    );

    it(
      "presents a win when the opposing team forfeits",
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
              300_000,

            forfeitingPlayer:
              "PLAYER_1",

            losingTeam:
              "TEAM_1",

            winningTeam:
              "TEAM_0",
          });

        expect(
          createMatchHistoryEntry(
            result,
            PARTICIPANTS.PLAYER_0,
          ),
        ).toEqual({
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          completedAtMs:
            300_000,

          completion:
            "FORFEIT",

          outcome:
            "WIN",

          score:
            null,

          forfeit: {
            reason:
              "PLAYER_ABSENCE",

            byOwnTeam:
              false,

            bySelf:
              false,
          },
        });
      },
    );

    it(
      "distinguishes a partner forfeit from the participant own forfeit",
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
              400_000,

            forfeitingPlayer:
              "PLAYER_2",

            losingTeam:
              "TEAM_0",

            winningTeam:
              "TEAM_1",
          });

        expect(
          createMatchHistoryEntry(
            result,
            PARTICIPANTS.PLAYER_0,
          ),
        ).toEqual({
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          completedAtMs:
            400_000,

          completion:
            "FORFEIT",

          outcome:
            "LOSS",

          score:
            null,

          forfeit: {
            reason:
              "PLAYER_ABSENCE",

            byOwnTeam:
              true,

            bySelf:
              false,
          },
        });

        expect(
          createMatchHistoryEntry(
            result,
            PARTICIPANTS.PLAYER_2,
          ),
        ).toEqual({
          formatVersion:
            1,

          sessionId:
            SESSION_ID,

          mode:
            "RANKED",

          completedAtMs:
            400_000,

          completion:
            "FORFEIT",

          outcome:
            "LOSS",

          score:
            null,

          forfeit: {
            reason:
              "PLAYER_ABSENCE",

            byOwnTeam:
              true,

            bySelf:
              true,
          },
        });
      },
    );

    it(
      "rejects a participant that is not part of the match result",
      () => {
        const result =
          createNormalMatchResult({
            sessionId:
              SESSION_ID,

            mode:
              "PRIVATE",

            participants:
              PARTICIPANTS,

            completedAtMs:
              500_000,

            winningTeam:
              "TEAM_1",

            score: {
              targetScore:
                1_000,

              TEAM_0:
                900,

              TEAM_1:
                1_010,
            },
          });

        expect(
          () =>
            createMatchHistoryEntry(
              result,
              "participant-unknown",
            ),
        ).toThrow(
          "Match history participant is not part of result: participant-unknown",
        );
      },
    );
  },
);
