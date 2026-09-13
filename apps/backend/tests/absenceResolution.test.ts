import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  AbsenceResolutionEvaluation,
} from "../src/absencePolicy.js";

import {
  decideAbsenceResolution,
} from "../src/absenceResolution.js";

function createEvaluation(
  options: {
    readonly mode:
      "PRIVATE"
      | "CASUAL"
      | "RANKED";

    readonly status:
      "NOT_ABSENT"
      | "WAITING"
      | "ELIGIBLE";
  },
): AbsenceResolutionEvaluation {
  if (
    options.status ===
    "NOT_ABSENT"
  ) {
    return Object.freeze({
      status:
        "NOT_ABSENT",

      mode:
        options.mode,

      absentSinceMs:
        null,

      eligibleAtMs:
        null,

      remainingMs:
        null,
    });
  }

  if (
    options.status ===
    "WAITING"
  ) {
    return Object.freeze({
      status:
        "WAITING",

      mode:
        options.mode,

      absentSinceMs:
        1_000,

      eligibleAtMs:
        options.mode ===
          "PRIVATE"
          ? null
          : 181_000,

      remainingMs:
        options.mode ===
          "PRIVATE"
          ? null
          : 180_000,
    });
  }

  return Object.freeze({
    status:
      "ELIGIBLE",

    mode:
      options.mode,

    absentSinceMs:
      1_000,

    eligibleAtMs:
      181_000,

    remainingMs:
      0,
  });
}

describe(
  "absence resolution decision",
  () => {
    it(
      "returns NONE when a PRIVATE player is not absent",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "PRIVATE",

              status:
                "NOT_ABSENT",
            }),
          ),
        ).toEqual({
          action:
            "NONE",

          automatic:
            false,
        });
      },
    );

    it(
      "returns NONE when a CASUAL player is not absent",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "CASUAL",

              status:
                "NOT_ABSENT",
            }),
          ),
        ).toEqual({
          action:
            "NONE",

          automatic:
            false,
        });
      },
    );

    it(
      "returns NONE when a RANKED player is not absent",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "RANKED",

              status:
                "NOT_ABSENT",
            }),
          ),
        ).toEqual({
          action:
            "NONE",

          automatic:
            false,
        });
      },
    );

    it(
      "returns MANUAL_ONLY while a PRIVATE absence is waiting",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "PRIVATE",

              status:
                "WAITING",
            }),
          ),
        ).toEqual({
          action:
            "MANUAL_ONLY",

          automatic:
            false,
        });
      },
    );

    it(
      "keeps PRIVATE resolution manual even for a defensive ELIGIBLE evaluation",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "PRIVATE",

              status:
                "ELIGIBLE",
            }),
          ),
        ).toEqual({
          action:
            "MANUAL_ONLY",

          automatic:
            false,
        });
      },
    );

    it(
      "returns NONE while a CASUAL absence is still waiting",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "CASUAL",

              status:
                "WAITING",
            }),
          ),
        ).toEqual({
          action:
            "NONE",

          automatic:
            false,
        });
      },
    );

    it(
      "allows automatic BOT_TAKEOVER for an eligible CASUAL absence",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "CASUAL",

              status:
                "ELIGIBLE",
            }),
          ),
        ).toEqual({
          action:
            "BOT_TAKEOVER",

          automatic:
            true,
        });
      },
    );

    it(
      "returns NONE while a RANKED absence is still waiting",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "RANKED",

              status:
                "WAITING",
            }),
          ),
        ).toEqual({
          action:
            "NONE",

          automatic:
            false,
        });
      },
    );

    it(
      "allows automatic TEAM_FORFEIT for an eligible RANKED absence",
      () => {
        expect(
          decideAbsenceResolution(
            createEvaluation({
              mode:
                "RANKED",

              status:
                "ELIGIBLE",
            }),
          ),
        ).toEqual({
          action:
            "TEAM_FORFEIT",

          automatic:
            true,
        });
      },
    );
  },
);