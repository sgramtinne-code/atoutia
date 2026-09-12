import type {
  Card,
  Suit,
} from "./cards.js";
import type {
  PlayerPosition,
} from "./players.js";
import {
  BELOTE_ENGINE_VERSION,
} from "./version.js";

export const PLAYER_COMMAND_FORMAT_VERSION = 1;

export const PLAYER_COMMAND_TYPES = [
  "PASS",
  "TAKE",
  "PLAY_CARD",
] as const;

export type PlayerCommandType =
  (typeof PLAYER_COMMAND_TYPES)[number];

export interface PassPlayerCommand {
  readonly type: "PASS";
}

export interface TakePlayerCommand {
  readonly type: "TAKE";
  readonly suit: Suit;
}

export interface PlayCardPlayerCommand {
  readonly type: "PLAY_CARD";
  readonly card: Card;
}

export type PlayerCommand =
  | PassPlayerCommand
  | TakePlayerCommand
  | PlayCardPlayerCommand;

export interface PlayerCommandDocument {
  readonly formatVersion: number;
  readonly engineVersion: string;
  readonly player: PlayerPosition;
  readonly command: PlayerCommand;
}

function cloneCard(
  card: Card,
): Card {
  return Object.freeze({
    suit: card.suit,
    rank: card.rank,
  });
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
    card: cloneCard(
      command.card,
    ),
  });
}

export function createPlayerCommandDocument(
  player: PlayerPosition,
  command: PlayerCommand,
): PlayerCommandDocument {
  return Object.freeze({
    formatVersion:
      PLAYER_COMMAND_FORMAT_VERSION,

    engineVersion:
      BELOTE_ENGINE_VERSION,

    player,

    command:
      cloneCommand(command),
  });
}