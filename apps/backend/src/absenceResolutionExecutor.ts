import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

import type {
  LiveRoomAbsenceResolution,
} from "./liveRoomAbsenceResolution.js";

import {
  LiveRoomStore,
} from "./liveRoomStore.js";

export interface ExecuteBotTakeoverOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export interface ExecuteTeamForfeitOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export interface AbsenceResolutionExecutionHandlers {
  readonly executeBotTakeover:
    (
      options:
        ExecuteBotTakeoverOptions,
    ) => void | Promise<void>;

  readonly executeTeamForfeit:
    (
      options:
        ExecuteTeamForfeitOptions,
    ) => void | Promise<void>;
}

export type AbsenceResolutionExecutionResult =
  | {
      readonly status:
        "NO_PENDING_RESOLUTION";

      readonly resolution:
        null;
    }
  | {
      readonly status:
        "MANUAL_ACTION_REQUIRED";

      readonly resolution:
        LiveRoomAbsenceResolution;
    }
  | {
      readonly status:
        "ALREADY_RESOLVED";

      readonly resolution:
        LiveRoomAbsenceResolution;
    }
  | {
      readonly status:
        "EXECUTED";

      readonly resolution:
        LiveRoomAbsenceResolution;
    };

export interface ExecutePendingAbsenceResolutionOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly handlers:
    AbsenceResolutionExecutionHandlers;

  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export async function executePendingAbsenceResolution(
  options:
    ExecutePendingAbsenceResolutionOptions,
): Promise<AbsenceResolutionExecutionResult> {
  const resolution =
    options.roomStore
      .getAbsenceResolution(
        options.sessionId,
        options.player,
      );

  if (
    resolution ===
    undefined
  ) {
    return Object.freeze({
      status:
        "NO_PENDING_RESOLUTION",

      resolution:
        null,
    });
  }

  if (
    resolution.status !==
    "PENDING"
  ) {
    return Object.freeze({
      status:
        "ALREADY_RESOLVED",

      resolution,
    });
  }

  switch (
    resolution.action
  ) {
    case "MANUAL_ONLY":
      return Object.freeze({
        status:
          "MANUAL_ACTION_REQUIRED",

        resolution,
      });

    case "BOT_TAKEOVER": {
      await options.handlers
        .executeBotTakeover({
          sessionId:
            options.sessionId,

          player:
            options.player,
        });

      const resolved =
        options.roomStore
          .resolveAbsenceResolution({
            sessionId:
              options.sessionId,

            player:
              options.player,

            status:
              "RESOLVED_BY_BOT",
          });

      return Object.freeze({
        status:
          "EXECUTED",

        resolution:
          resolved,
      });
    }

    case "TEAM_FORFEIT": {
      await options.handlers
        .executeTeamForfeit({
          sessionId:
            options.sessionId,

          player:
            options.player,
        });

      const resolved =
        options.roomStore
          .resolveAbsenceResolution({
            sessionId:
              options.sessionId,

            player:
              options.player,

            status:
              "RESOLVED_BY_FORFEIT",
          });

      return Object.freeze({
        status:
          "EXECUTED",

        resolution:
          resolved,
      });
    }
  }
}