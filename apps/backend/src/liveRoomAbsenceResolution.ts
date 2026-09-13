import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

import type {
  AbsenceResolutionAction,
} from "./absenceResolution.js";

export type PendingAbsenceResolutionAction =
  Exclude<
    AbsenceResolutionAction,
    "NONE"
  >;

export type LiveRoomAbsenceResolutionStatus =
  | "PENDING"
  | "RESOLVED_BY_BOT"
  | "RESOLVED_BY_FORFEIT"
  | "RESOLVED_MANUALLY";

export type ResolvedLiveRoomAbsenceResolutionStatus =
  Exclude<
    LiveRoomAbsenceResolutionStatus,
    "PENDING"
  >;

export interface LiveRoomAbsenceResolution {
  readonly player:
    PlayerPosition;

  readonly action:
    PendingAbsenceResolutionAction;

  readonly status:
    LiveRoomAbsenceResolutionStatus;
}

export interface CreatePendingAbsenceResolutionOptions {
  readonly player:
    PlayerPosition;

  readonly action:
    PendingAbsenceResolutionAction;
}

export interface ResolveLiveRoomAbsenceResolutionOptions {
  readonly resolution:
    LiveRoomAbsenceResolution;

  readonly status:
    ResolvedLiveRoomAbsenceResolutionStatus;
}

function expectedResolutionStatus(
  action:
    PendingAbsenceResolutionAction,
): ResolvedLiveRoomAbsenceResolutionStatus {
  switch (
    action
  ) {
    case "MANUAL_ONLY":
      return "RESOLVED_MANUALLY";

    case "BOT_TAKEOVER":
      return "RESOLVED_BY_BOT";

    case "TEAM_FORFEIT":
      return "RESOLVED_BY_FORFEIT";
  }
}

export function createPendingAbsenceResolution(
  options:
    CreatePendingAbsenceResolutionOptions,
): LiveRoomAbsenceResolution {
  return Object.freeze({
    player:
      options.player,

    action:
      options.action,

    status:
      "PENDING",
  });
}

export function resolveLiveRoomAbsenceResolution(
  options:
    ResolveLiveRoomAbsenceResolutionOptions,
): LiveRoomAbsenceResolution {
  const expectedStatus =
    expectedResolutionStatus(
      options.resolution.action,
    );

  if (
    options.status !==
    expectedStatus
  ) {
    throw new Error(
      `Absence resolution action ${options.resolution.action} cannot resolve as ${options.status}.`,
    );
  }

  if (
    options.resolution.status ===
    options.status
  ) {
    return options.resolution;
  }

  if (
    options.resolution.status !==
    "PENDING"
  ) {
    throw new Error(
      `Absence resolution for ${options.resolution.player} is already resolved as ${options.resolution.status}.`,
    );
  }

  return Object.freeze({
    player:
      options.resolution.player,

    action:
      options.resolution.action,

    status:
      options.status,
  });
}