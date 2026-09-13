import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

export type LiveRoomSeatController =
  | "HUMAN"
  | "BOT";

export interface LiveRoomSeatControl {
  readonly player:
    PlayerPosition;

  readonly controller:
    LiveRoomSeatController;
}

export interface CreateLiveRoomSeatControlOptions {
  readonly player:
    PlayerPosition;

  readonly controller?:
    LiveRoomSeatController;
}

export interface TransferLiveRoomSeatControlToBotOptions {
  readonly control:
    LiveRoomSeatControl;
}

export function createLiveRoomSeatControl(
  options:
    CreateLiveRoomSeatControlOptions,
): LiveRoomSeatControl {
  return Object.freeze({
    player:
      options.player,

    controller:
      options.controller ??
      "HUMAN",
  });
}

export function transferLiveRoomSeatControlToBot(
  options:
    TransferLiveRoomSeatControlToBotOptions,
): LiveRoomSeatControl {
  if (
    options.control.controller ===
    "BOT"
  ) {
    return options.control;
  }

  return Object.freeze({
    player:
      options.control.player,

    controller:
      "BOT",
  });
}

export function assertHumanControlsLiveRoomSeat(
  control:
    LiveRoomSeatControl,
): void {
  if (
    control.controller !==
    "HUMAN"
  ) {
    throw new Error(
      `Live room seat ${control.player} is not human-controlled.`,
    );
  }
}

export function assertBotControlsLiveRoomSeat(
  control:
    LiveRoomSeatControl,
): void {
  if (
    control.controller !==
    "BOT"
  ) {
    throw new Error(
      `Live room seat ${control.player} is not bot-controlled.`,
    );
  }
}