import {
  createPlayerAvailableActions,
  type PlayerCommand,
  type PlayerPosition,
} from "@atoutia/belote-engine";

import {
  chooseBotCommand,
} from "./botStrategy.js";

import {
  LiveRoomNotFoundError,
  LiveRoomStore,
} from "./liveRoomStore.js";

export type BotTurnExecutionStatus =
  | "ROOM_NOT_IN_PROGRESS"
  | "NOT_BOT_CONTROLLED"
  | "NO_COMMAND"
  | "COMMAND_APPLIED";

export interface ExecuteBotTurnOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export interface BotTurnExecutionResult {
  readonly status:
    BotTurnExecutionStatus;

  readonly player:
    PlayerPosition;

  readonly revision:
    number;

  readonly command:
    PlayerCommand | null;
}

function createResult(
  status:
    BotTurnExecutionStatus,

  player:
    PlayerPosition,

  revision:
    number,

  command:
    PlayerCommand | null,
): BotTurnExecutionResult {
  return Object.freeze({
    status,
    player,
    revision,
    command,
  });
}

export function executeBotTurn(
  options:
    ExecuteBotTurnOptions,
): BotTurnExecutionResult {
  const room =
    options.roomStore.get(
      options.sessionId,
    );

  if (
    room ===
    undefined
  ) {
    throw new LiveRoomNotFoundError(
      options.sessionId,
    );
  }

  if (
    room.managedRoom.phase !==
    "IN_PROGRESS"
  ) {
    return createResult(
      "ROOM_NOT_IN_PROGRESS",
      options.player,
      room.revision,
      null,
    );
  }

  const control =
    options.roomStore
      .getSeatControl(
        options.sessionId,
        options.player,
      );

  if (
    control.controller !==
    "BOT"
  ) {
    return createResult(
      "NOT_BOT_CONTROLLED",
      options.player,
      room.revision,
      null,
    );
  }

  const actions =
    createPlayerAvailableActions(
      room.managedRoom.room.session
        .state,
      options.player,
    );

  const command =
    chooseBotCommand(
      actions,
    );

  if (
    command ===
    null
  ) {
    return createResult(
      "NO_COMMAND",
      options.player,
      room.revision,
      null,
    );
  }

  const result =
    options.roomStore
      .applyBotCommand({
        sessionId:
          options.sessionId,

        expectedRevision:
          room.revision,

        player:
          options.player,

        command,
      });

  return createResult(
    "COMMAND_APPLIED",
    options.player,
    result.room.revision,
    command,
  );
}