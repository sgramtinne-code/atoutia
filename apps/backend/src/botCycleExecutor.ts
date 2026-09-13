import {
  PLAYER_POSITIONS,
  createPlayerAvailableActions,
  type PlayerPosition,
} from "@atoutia/belote-engine";

import {
  executeBotTurn,
} from "./botTurnExecutor.js";

import {
  LiveRoomNotFoundError,
  LiveRoomStore,
} from "./liveRoomStore.js";

export const DEFAULT_BOT_CYCLE_MAX_COMMANDS =
  32;

export type BotCycleExecutionStatus =
  | "ROOM_NOT_IN_PROGRESS"
  | "NO_BOT_ACTION"
  | "COMMAND_LIMIT_REACHED";

export interface ExecuteBotCycleOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly sessionId:
    string;

  readonly maxCommands?:
    number;
}

export interface BotCycleExecutionResult {
  readonly status:
    BotCycleExecutionStatus;

  readonly commandsApplied:
    number;

  readonly initialRevision:
    number;

  readonly finalRevision:
    number;

  readonly lastPlayer:
    PlayerPosition | null;
}

function assertValidMaxCommands(
  maxCommands:
    number,
): void {
  if (
    !Number.isSafeInteger(
      maxCommands,
    ) ||
    maxCommands <=
      0
  ) {
    throw new Error(
      "BOT cycle maxCommands must be a positive safe integer.",
    );
  }
}

function findActionableBotPlayer(
  roomStore:
    LiveRoomStore,

  sessionId:
    string,
): PlayerPosition | null {
  const room =
    roomStore.get(
      sessionId,
    );

  if (
    room ===
    undefined
  ) {
    throw new LiveRoomNotFoundError(
      sessionId,
    );
  }

  if (
    room.managedRoom.phase !==
    "IN_PROGRESS"
  ) {
    return null;
  }

  for (
    const player
    of PLAYER_POSITIONS
  ) {
    const control =
      roomStore.getSeatControl(
        sessionId,
        player,
      );

    if (
      control.controller !==
      "BOT"
    ) {
      continue;
    }

    const actions =
      createPlayerAvailableActions(
        room.managedRoom.room.session
          .state,
        player,
      );

    if (
      actions.mode ===
        "BID" ||
      actions.mode ===
        "PLAY_CARD"
    ) {
      return player;
    }
  }

  return null;
}

export function executeBotCycle(
  options:
    ExecuteBotCycleOptions,
): BotCycleExecutionResult {
  const initialRoom =
    options.roomStore.get(
      options.sessionId,
    );

  if (
    initialRoom ===
    undefined
  ) {
    throw new LiveRoomNotFoundError(
      options.sessionId,
    );
  }

  const maxCommands =
    options.maxCommands ??
    DEFAULT_BOT_CYCLE_MAX_COMMANDS;

  assertValidMaxCommands(
    maxCommands,
  );

  const initialRevision =
    initialRoom.revision;

  if (
    initialRoom.managedRoom.phase !==
    "IN_PROGRESS"
  ) {
    return Object.freeze({
      status:
        "ROOM_NOT_IN_PROGRESS",

      commandsApplied:
        0,

      initialRevision,

      finalRevision:
        initialRevision,

      lastPlayer:
        null,
    });
  }

  let commandsApplied =
    0;

  let lastPlayer:
    PlayerPosition | null =
      null;

  while (
    commandsApplied <
    maxCommands
  ) {
    const player =
      findActionableBotPlayer(
        options.roomStore,
        options.sessionId,
      );

    if (
      player ===
      null
    ) {
      const currentRoom =
        options.roomStore.get(
          options.sessionId,
        );

      if (
        currentRoom ===
        undefined
      ) {
        throw new LiveRoomNotFoundError(
          options.sessionId,
        );
      }

      return Object.freeze({
        status:
          currentRoom.managedRoom
            .phase ===
          "IN_PROGRESS"
            ? "NO_BOT_ACTION"
            : "ROOM_NOT_IN_PROGRESS",

        commandsApplied,

        initialRevision,

        finalRevision:
          currentRoom.revision,

        lastPlayer,
      });
    }

    const result =
      executeBotTurn({
        roomStore:
          options.roomStore,

        sessionId:
          options.sessionId,

        player,
      });

    if (
      result.status !==
      "COMMAND_APPLIED"
    ) {
      const currentRoom =
        options.roomStore.get(
          options.sessionId,
        );

      if (
        currentRoom ===
        undefined
      ) {
        throw new LiveRoomNotFoundError(
          options.sessionId,
        );
      }

      return Object.freeze({
        status:
          currentRoom.managedRoom
            .phase ===
          "IN_PROGRESS"
            ? "NO_BOT_ACTION"
            : "ROOM_NOT_IN_PROGRESS",

        commandsApplied,

        initialRevision,

        finalRevision:
          currentRoom.revision,

        lastPlayer,
      });
    }

    commandsApplied +=
      1;

    lastPlayer =
      player;
  }

  const finalRoom =
    options.roomStore.get(
      options.sessionId,
    );

  if (
    finalRoom ===
    undefined
  ) {
    throw new LiveRoomNotFoundError(
      options.sessionId,
    );
  }

  return Object.freeze({
    status:
      "COMMAND_LIMIT_REACHED",

    commandsApplied,

    initialRevision,

    finalRevision:
      finalRoom.revision,

    lastPlayer,
  });
}