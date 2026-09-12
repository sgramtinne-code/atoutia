import {
  applyLiveMatchSessionCommand,
  createLiveMatchSessionSnapshot,
  type LiveMatchSession,
  type LiveMatchSessionCommandResult,
} from "./liveMatchSession.js";
import {
  getLiveMatchSeatForParticipant,
  type LiveMatchSeats,
} from "./liveMatchSeats.js";
import {
  createPlayerCommandDocument,
  type PlayerCommand,
} from "./playerCommandFormat.js";
import type {
  PlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import type {
  PlayerPosition,
} from "./players.js";

export interface LiveMatchParticipantContext {
  readonly session: LiveMatchSession;
  readonly seats: LiveMatchSeats;
}

export interface ApplyParticipantCommandOptions {
  readonly context: LiveMatchParticipantContext;
  readonly participantId: string;
  readonly command: PlayerCommand;
}

export interface ApplyParticipantCommandResult {
  readonly context: LiveMatchParticipantContext;
  readonly player: PlayerPosition;
  readonly snapshot: PlayerClientSnapshot;
}

function getRequiredParticipantPlayer(
  seats: LiveMatchSeats,
  participantId: string,
): PlayerPosition {
  const player =
    getLiveMatchSeatForParticipant(
      seats,
      participantId,
    );

  if (player === null) {
    throw new Error(
      `Participant ${participantId} does not occupy a match seat`,
    );
  }

  return player;
}

export function createParticipantSnapshot(
  context: LiveMatchParticipantContext,
  participantId: string,
): PlayerClientSnapshot {
  const player =
    getRequiredParticipantPlayer(
      context.seats,
      participantId,
    );

  return createLiveMatchSessionSnapshot(
    context.session,
    player,
  );
}

export function applyParticipantCommand(
  options: ApplyParticipantCommandOptions,
): ApplyParticipantCommandResult {
  const {
    context,
    participantId,
    command,
  } = options;

  const player =
    getRequiredParticipantPlayer(
      context.seats,
      participantId,
    );

  const commandDocument =
    createPlayerCommandDocument(
      player,
      command,
    );

  const result:
    LiveMatchSessionCommandResult =
      applyLiveMatchSessionCommand({
        session:
          context.session,

        authenticatedPlayer:
          player,

        command:
          commandDocument,
      });

  const nextContext:
    LiveMatchParticipantContext =
      Object.freeze({
        session:
          result.session,

        seats:
          context.seats,
      });

  return Object.freeze({
    context:
      nextContext,

    player,

    snapshot:
      result.snapshot,
  });
}