import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

import {
  LiveRoomStore,
} from "./liveRoomStore.js";

export interface ExecuteBotTakeoverOptions {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export interface CreateBotTakeoverHandlerOptions {
  readonly roomStore:
    LiveRoomStore;
}

export type BotTakeoverHandler =
  (
    options:
      ExecuteBotTakeoverOptions,
  ) => void | Promise<void>;

export function createBotTakeoverHandler(
  options:
    CreateBotTakeoverHandlerOptions,
): BotTakeoverHandler {
  return (
    takeoverOptions:
      ExecuteBotTakeoverOptions,
  ): void => {
    options.roomStore
      .transferSeatControlToBot({
        sessionId:
          takeoverOptions.sessionId,

        player:
          takeoverOptions.player,
      });
  };
}