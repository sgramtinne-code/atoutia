import {
  createPlayerClientSnapshot,
  type PlayerClientSnapshot,
} from "./playerClientSnapshot.js";
import {
  applyPlayerCommandDocument,
} from "./playerCommandApply.js";
import type {
  PlayerCommandDocument,
} from "./playerCommandFormat.js";
import type {
  MatchMachineState,
} from "./matchMachine.js";
import type {
  PlayerPosition,
} from "./players.js";

export interface ApplyMatchSessionCommandOptions {
  readonly state: MatchMachineState;
  readonly authenticatedPlayer: PlayerPosition;
  readonly command: PlayerCommandDocument;
}

export interface MatchSessionCommandResult {
  readonly state: MatchMachineState;
  readonly snapshot: PlayerClientSnapshot;
}

function assertCommandPlayerMatchesAuthenticatedPlayer(
  authenticatedPlayer: PlayerPosition,
  command: PlayerCommandDocument,
): void {
  if (command.player !== authenticatedPlayer) {
    throw new Error(
      `Player command identity mismatch: authenticated player is ${authenticatedPlayer}, command belongs to ${command.player}`,
    );
  }
}

export function applyMatchSessionCommand(
  options: ApplyMatchSessionCommandOptions,
): MatchSessionCommandResult {
  const {
    state,
    authenticatedPlayer,
    command,
  } = options;

  assertCommandPlayerMatchesAuthenticatedPlayer(
    authenticatedPlayer,
    command,
  );

  const nextState =
    applyPlayerCommandDocument(
      state,
      command,
    );

  const snapshot =
    createPlayerClientSnapshot(
      nextState,
      authenticatedPlayer,
    );

  return Object.freeze({
    state: nextState,
    snapshot,
  });
}