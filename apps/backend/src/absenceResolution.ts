import type {
  AbsenceResolutionEvaluation,
} from "./absencePolicy.js";

export type AbsenceResolutionAction =
  | "NONE"
  | "MANUAL_ONLY"
  | "BOT_TAKEOVER"
  | "TEAM_FORFEIT";

export interface AbsenceResolutionDecision {
  readonly action:
    AbsenceResolutionAction;

  readonly automatic:
    boolean;
}

const NO_RESOLUTION_DECISION:
  AbsenceResolutionDecision =
    Object.freeze({
      action:
        "NONE",

      automatic:
        false,
    });

const PRIVATE_MANUAL_DECISION:
  AbsenceResolutionDecision =
    Object.freeze({
      action:
        "MANUAL_ONLY",

      automatic:
        false,
    });

const CASUAL_BOT_DECISION:
  AbsenceResolutionDecision =
    Object.freeze({
      action:
        "BOT_TAKEOVER",

      automatic:
        true,
    });

const RANKED_FORFEIT_DECISION:
  AbsenceResolutionDecision =
    Object.freeze({
      action:
        "TEAM_FORFEIT",

      automatic:
        true,
    });

export function decideAbsenceResolution(
  evaluation:
    AbsenceResolutionEvaluation,
): AbsenceResolutionDecision {
  if (
    evaluation.status ===
    "NOT_ABSENT"
  ) {
    return NO_RESOLUTION_DECISION;
  }

  if (
    evaluation.mode ===
    "PRIVATE"
  ) {
    return PRIVATE_MANUAL_DECISION;
  }

  if (
    evaluation.status !==
    "ELIGIBLE"
  ) {
    return NO_RESOLUTION_DECISION;
  }

  switch (
    evaluation.mode
  ) {
    case "CASUAL":
      return CASUAL_BOT_DECISION;

    case "RANKED":
      return RANKED_FORFEIT_DECISION;
  }
}