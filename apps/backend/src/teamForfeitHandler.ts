import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

import {
  LiveRoomStore,
} from "./liveRoomStore.js";

export interface ExecuteTeamForfeitOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export interface CreateTeamForfeitHandlerOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly now?:
    () => number;
}

export type TeamForfeitHandler =
  (
    options:
      ExecuteTeamForfeitOptions,
  ) => void | Promise<void>;

export function createTeamForfeitHandler(
  options:
    CreateTeamForfeitHandlerOptions,
): TeamForfeitHandler {
  const now =
    options.now ??
    Date.now;

  return (
    forfeitOptions:
      ExecuteTeamForfeitOptions,
  ): void => {
    options.roomStore
      .forfeitForPlayerAbsence({
        sessionId:
          forfeitOptions.sessionId,

        player:
          forfeitOptions.player,

        completedAtMs:
          now(),
      });
  };
}