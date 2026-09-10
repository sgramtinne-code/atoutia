import {
  parseMatchReplayDocument,
} from "./matchReplayJson.js";
import {
  replayMatchDocument,
} from "./matchReplay.js";
import type {
  MatchMachineState,
} from "./matchMachine.js";
import type {
  MatchReplayDocument,
} from "./matchReplayFormat.js";

export interface ValidatedMatchReplay {
  readonly document: MatchReplayDocument;
  readonly state: MatchMachineState;
}

export function validateAndReplayMatchReplayJson(
  json: string,
): ValidatedMatchReplay {
  const document =
    parseMatchReplayDocument(json);

  const state =
    replayMatchDocument(document);

  return Object.freeze({
    document,
    state,
  });
}