import {
  createMatchMachine,
  type MatchMachineState,
} from "./matchMachine.js";
import {
  applyMatchSessionCommand,
} from "./matchSession.js";
import {
  createMatchSessionId,
  type MatchSessionRandomBytes,
} from "./matchSessionId.js";
import type {
  PlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import {
  createPlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import type {
  PlayerCommandDocument,
} from "./playerCommandFormat.js";
import type {
  PlayerPosition,
} from "./players.js";

export interface CreateLiveMatchSessionOptions {
  readonly baseSeed: number;
  readonly firstDealer?: PlayerPosition;
  readonly targetScore?: number;
  readonly randomBytes?: MatchSessionRandomBytes;
}

export interface LiveMatchSession {
  readonly sessionId: string;
  readonly state: MatchMachineState;
}

export interface ApplyLiveMatchSessionCommandOptions {
  readonly session: LiveMatchSession;
  readonly authenticatedPlayer: PlayerPosition;
  readonly command: PlayerCommandDocument;
}

export interface LiveMatchSessionCommandResult {
  readonly session: LiveMatchSession;
  readonly snapshot: PlayerClientSnapshot;
}

export function createLiveMatchSession(
  options: CreateLiveMatchSessionOptions,
): LiveMatchSession {
  const state =
    createMatchMachine({
      baseSeed:
        options.baseSeed,

      ...(options.firstDealer ===
      undefined
        ? {}
        : {
            firstDealer:
              options.firstDealer,
          }),

      ...(options.targetScore ===
      undefined
        ? {}
        : {
            targetScore:
              options.targetScore,
          }),
    });

  const sessionId =
    options.randomBytes === undefined
      ? createMatchSessionId()
      : createMatchSessionId(
          options.randomBytes,
        );

  return Object.freeze({
    sessionId,
    state,
  });
}

export function createLiveMatchSessionSnapshot(
  session: LiveMatchSession,
  player: PlayerPosition,
): PlayerClientSnapshot {
  return createPlayerClientSnapshot(
    session.state,
    player,
  );
}

export function applyLiveMatchSessionCommand(
  options: ApplyLiveMatchSessionCommandOptions,
): LiveMatchSessionCommandResult {
  const {
    session,
    authenticatedPlayer,
    command,
  } = options;

  const result =
    applyMatchSessionCommand({
      state:
        session.state,

      authenticatedPlayer,

      command,
    });

  const nextSession: LiveMatchSession =
    Object.freeze({
      sessionId:
        session.sessionId,

      state:
        result.state,
    });

  return Object.freeze({
    session:
      nextSession,

    snapshot:
      result.snapshot,
  });
}