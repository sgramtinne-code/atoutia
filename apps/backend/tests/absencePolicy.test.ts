import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEFAULT_ABSENCE_RESOLUTION_DELAY_MS,
  createAbsencePolicy,
  createCasualAbsencePolicy,
  createPrivateAbsencePolicy,
  createRankedAbsencePolicy,
  evaluateAbsenceResolution,
} from "../src/absencePolicy.js";

describe(
  "absence policy",
  () => {
    it(
      "uses a conservative default resolution delay",
      () => {
        expect(
          DEFAULT_ABSENCE_RESOLUTION_DELAY_MS,
        ).toBe(
          180_000,
        );

        expect(
          createCasualAbsencePolicy(),
        ).toEqual({
          mode:
            "CASUAL",

          resolutionDelayMs:
            180_000,
        });

        expect(
          createRankedAbsencePolicy(),
        ).toEqual({
          mode:
            "RANKED",

          resolutionDelayMs:
            180_000,
        });
      },
    );

    it(
      "keeps private matches manual by default",
      () => {
        expect(
          createPrivateAbsencePolicy(),
        ).toEqual({
          mode:
            "PRIVATE",

          resolutionDelayMs:
            null,
        });
      },
    );

    it(
      "supports a custom resolution delay",
      () => {
        expect(
          createAbsencePolicy({
            mode:
              "CASUAL",

            resolutionDelayMs:
              30_000,
          }),
        ).toEqual({
          mode:
            "CASUAL",

          resolutionDelayMs:
            30_000,
        });
      },
    );

    it(
      "rejects invalid resolution delays",
      () => {
        expect(
          () =>
            createAbsencePolicy({
              mode:
                "RANKED",

              resolutionDelayMs:
                0,
            }),
        ).toThrow();

        expect(
          () =>
            createAbsencePolicy({
              mode:
                "RANKED",

              resolutionDelayMs:
                -1,
            }),
        ).toThrow();

        expect(
          () =>
            createAbsencePolicy({
              mode:
                "RANKED",

              resolutionDelayMs:
                1.5,
            }),
        ).toThrow();
      },
    );

    it(
      "does nothing while a player is CONNECTED",
      () => {
        const evaluation =
          evaluateAbsenceResolution(
            createCasualAbsencePolicy(),
            {
              state:
                "CONNECTED",

              disconnectedAtMs:
                null,

              graceDeadlineAtMs:
                null,
            },
            500_000,
          );

        expect(
          evaluation,
        ).toEqual({
          status:
            "NOT_ABSENT",

          mode:
            "CASUAL",

          absentSinceMs:
            null,

          eligibleAtMs:
            null,

          remainingMs:
            null,
        });
      },
    );

    it(
      "does nothing during the reconnect grace period",
      () => {
        const evaluation =
          evaluateAbsenceResolution(
            createCasualAbsencePolicy(),
            {
              state:
                "RECONNECTING",

              disconnectedAtMs:
                100_000,

              graceDeadlineAtMs:
                220_000,
            },
            150_000,
          );

        expect(
          evaluation.status,
        ).toBe(
          "NOT_ABSENT",
        );
      },
    );

    it(
      "starts the resolution delay when the player becomes ABSENT",
      () => {
        const evaluation =
          evaluateAbsenceResolution(
            createCasualAbsencePolicy(),
            {
              state:
                "ABSENT",

              disconnectedAtMs:
                100_000,

              graceDeadlineAtMs:
                220_000,
            },
            220_000,
          );

        expect(
          evaluation,
        ).toEqual({
          status:
            "WAITING",

          mode:
            "CASUAL",

          absentSinceMs:
            220_000,

          eligibleAtMs:
            400_000,

          remainingMs:
            180_000,
        });
      },
    );

    it(
      "counts down the remaining resolution delay",
      () => {
        const evaluation =
          evaluateAbsenceResolution(
            createCasualAbsencePolicy(),
            {
              state:
                "ABSENT",

              disconnectedAtMs:
                100_000,

              graceDeadlineAtMs:
                220_000,
            },
            350_000,
          );

        expect(
          evaluation,
        ).toEqual({
          status:
            "WAITING",

          mode:
            "CASUAL",

          absentSinceMs:
            220_000,

          eligibleAtMs:
            400_000,

          remainingMs:
            50_000,
        });
      },
    );

    it(
      "becomes eligible exactly at the resolution deadline",
      () => {
        const evaluation =
          evaluateAbsenceResolution(
            createCasualAbsencePolicy(),
            {
              state:
                "ABSENT",

              disconnectedAtMs:
                100_000,

              graceDeadlineAtMs:
                220_000,
            },
            400_000,
          );

        expect(
          evaluation,
        ).toEqual({
          status:
            "ELIGIBLE",

          mode:
            "CASUAL",

          absentSinceMs:
            220_000,

          eligibleAtMs:
            400_000,

          remainingMs:
            0,
        });
      },
    );

    it(
      "does not automatically resolve private match absences",
      () => {
        const evaluation =
          evaluateAbsenceResolution(
            createPrivateAbsencePolicy(),
            {
              state:
                "ABSENT",

              disconnectedAtMs:
                100_000,

              graceDeadlineAtMs:
                220_000,
            },
            9_999_999,
          );

        expect(
          evaluation,
        ).toEqual({
          status:
            "WAITING",

          mode:
            "PRIVATE",

          absentSinceMs:
            220_000,

          eligibleAtMs:
            null,

          remainingMs:
            null,
        });
      },
    );

    it(
      "never performs an automatic game consequence",
      () => {
        const evaluation =
          evaluateAbsenceResolution(
            createRankedAbsencePolicy(),
            {
              state:
                "ABSENT",

              disconnectedAtMs:
                100_000,

              graceDeadlineAtMs:
                220_000,
            },
            500_000,
          );

        expect(
          evaluation.status,
        ).toBe(
          "ELIGIBLE",
        );

        expect(
          evaluation,
        ).not.toHaveProperty(
          "winner",
        );

        expect(
          evaluation,
        ).not.toHaveProperty(
          "forfeit",
        );

        expect(
          evaluation,
        ).not.toHaveProperty(
          "bot",
        );
      },
    );
  },
);