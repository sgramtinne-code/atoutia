import type {
  MatchMode,
} from "./matchMode.js";

export const DEFAULT_ABSENCE_RESOLUTION_DELAY_MS =
  180_000;

export type MatchAbsenceMode =
  MatchMode;

export type AbsenceResolutionStatus =
  | "NOT_ABSENT"
  | "WAITING"
  | "ELIGIBLE";

export interface AbsencePolicy {
  readonly mode:
    MatchAbsenceMode;

  readonly resolutionDelayMs:
    number | null;
}

export interface AbsenceConnectionState {
  readonly state:
    "CONNECTED"
    | "RECONNECTING"
    | "ABSENT";

  readonly disconnectedAtMs:
    number | null;

  readonly graceDeadlineAtMs:
    number | null;
}

export interface AbsenceResolutionEvaluation {
  readonly status:
    AbsenceResolutionStatus;

  readonly mode:
    MatchAbsenceMode;

  readonly absentSinceMs:
    number | null;

  readonly eligibleAtMs:
    number | null;

  readonly remainingMs:
    number | null;
}

export interface CreateAbsencePolicyOptions {
  readonly mode:
    MatchAbsenceMode;

  readonly resolutionDelayMs?:
    number | null;
}

function validateTimestamp(
  value: number,
  name: string,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value < 0
  ) {
    throw new Error(
      `${name} must be a non-negative safe integer.`,
    );
  }
}

function validateDelay(
  value: number,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      "resolutionDelayMs must be a positive safe integer or null.",
    );
  }
}

export function createAbsencePolicy(
  options:
    CreateAbsencePolicyOptions,
): AbsencePolicy {
  const resolutionDelayMs =
    options.resolutionDelayMs ===
    undefined
      ? DEFAULT_ABSENCE_RESOLUTION_DELAY_MS
      : options.resolutionDelayMs;

  if (
    resolutionDelayMs !==
    null
  ) {
    validateDelay(
      resolutionDelayMs,
    );
  }

  return Object.freeze({
    mode:
      options.mode,

    resolutionDelayMs,
  });
}

export function createPrivateAbsencePolicy():
  AbsencePolicy {
  return createAbsencePolicy({
    mode:
      "PRIVATE",

    resolutionDelayMs:
      null,
  });
}

export function createCasualAbsencePolicy():
  AbsencePolicy {
  return createAbsencePolicy({
    mode:
      "CASUAL",
  });
}

export function createRankedAbsencePolicy():
  AbsencePolicy {
  return createAbsencePolicy({
    mode:
      "RANKED",
  });
}

export function evaluateAbsenceResolution(
  policy:
    AbsencePolicy,

  connectionState:
    AbsenceConnectionState,

  nowMs:
    number,
): AbsenceResolutionEvaluation {
  validateTimestamp(
    nowMs,
    "nowMs",
  );

  if (
    connectionState.state !==
    "ABSENT"
  ) {
    return Object.freeze({
      status:
        "NOT_ABSENT",

      mode:
        policy.mode,

      absentSinceMs:
        null,

      eligibleAtMs:
        null,

      remainingMs:
        null,
    });
  }

  const absentSinceMs =
    connectionState
      .graceDeadlineAtMs;

  if (
    absentSinceMs ===
    null
  ) {
    return Object.freeze({
      status:
        "NOT_ABSENT",

      mode:
        policy.mode,

      absentSinceMs:
        null,

      eligibleAtMs:
        null,

      remainingMs:
        null,
    });
  }

  validateTimestamp(
    absentSinceMs,
    "graceDeadlineAtMs",
  );

  if (
    policy.resolutionDelayMs ===
    null
  ) {
    return Object.freeze({
      status:
        "WAITING",

      mode:
        policy.mode,

      absentSinceMs,

      eligibleAtMs:
        null,

      remainingMs:
        null,
    });
  }

  const eligibleAtMs =
    absentSinceMs +
    policy.resolutionDelayMs;

  if (
    !Number.isSafeInteger(
      eligibleAtMs,
    )
  ) {
    throw new Error(
      "Absence resolution deadline exceeds the safe integer range.",
    );
  }

  if (
    nowMs >=
    eligibleAtMs
  ) {
    return Object.freeze({
      status:
        "ELIGIBLE",

      mode:
        policy.mode,

      absentSinceMs,

      eligibleAtMs,

      remainingMs:
        0,
    });
  }

  return Object.freeze({
    status:
      "WAITING",

    mode:
      policy.mode,

    absentSinceMs,

    eligibleAtMs,

    remainingMs:
      eligibleAtMs -
      nowMs,
  });
}