import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  type MatchMachineState,
} from "./matchMachine.js";
import type {
  PlayerCommandDocument,
} from "./playerCommandFormat.js";

export function applyPlayerCommandDocument(
  state: MatchMachineState,
  document: PlayerCommandDocument,
): MatchMachineState {
  const { player, command } = document;

  if (command.type === "PASS") {
    return applyMatchBiddingAction(
      state,
      {
        type: "PASS",
        player,
      },
    );
  }

  if (command.type === "TAKE") {
    return applyMatchBiddingAction(
      state,
      {
        type: "TAKE",
        player,
        suit: command.suit,
      },
    );
  }

  return applyMatchCardPlay(
    state,
    player,
    command.card,
  ).state;
}