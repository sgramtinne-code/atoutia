import type {
  PlayerCommand,
} from "./playerCommandFormat.js";
import {
  BELOTE_ENGINE_VERSION,
} from "./version.js";

export const LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION =
  1;

export interface LiveMatchRoomCommandDocument {
  readonly formatVersion: number;
  readonly engineVersion: string;
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly command: PlayerCommand;
}

function cloneCommand(
  command: PlayerCommand,
): PlayerCommand {
  if (command.type === "PASS") {
    return Object.freeze({
      type: "PASS",
    });
  }

  if (command.type === "TAKE") {
    return Object.freeze({
      type: "TAKE",
      suit: command.suit,
    });
  }

  return Object.freeze({
    type: "PLAY_CARD",
    card: Object.freeze({
      suit:
        command.card.suit,

      rank:
        command.card.rank,
    }),
  });
}

export function createLiveMatchRoomCommandDocument(
  sessionId: string,
  expectedRevision: number,
  command: PlayerCommand,
): LiveMatchRoomCommandDocument {
  return Object.freeze({
    formatVersion:
      LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    sessionId,

    expectedRevision,

    command:
      cloneCommand(command),
  });
}