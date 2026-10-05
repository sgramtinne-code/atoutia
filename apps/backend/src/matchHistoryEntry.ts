import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

import {
  getLiveRoomPlayerTeam,
  getOpposingLiveRoomTeam,
  type LiveRoomTeam,
} from "./liveRoomAdjudication.js";

import type {
  MatchResult,
} from "./matchResult.js";

import type {
  MatchMode,
} from "./matchMode.js";

export const MATCH_HISTORY_ENTRY_FORMAT_VERSION =
  1;

export type MatchHistoryOutcome =
  | "WIN"
  | "LOSS";

export interface MatchHistoryScore {
  readonly targetScore:
    number;

  readonly ownTeam:
    number;

  readonly opponentTeam:
    number;
}

export interface MatchHistoryForfeit {
  readonly reason:
    "PLAYER_ABSENCE";

  readonly byOwnTeam:
    boolean;

  readonly bySelf:
    boolean;
}

export interface MatchHistoryEntry {
  readonly formatVersion:
    1;

  readonly sessionId:
    string;

  readonly mode:
    MatchMode;

  readonly completedAtMs:
    number;

  readonly completion:
    "NORMAL" |
    "FORFEIT";

  readonly outcome:
    MatchHistoryOutcome;

  readonly score:
    MatchHistoryScore | null;

  readonly forfeit:
    MatchHistoryForfeit | null;
}

function findParticipantPlayer(
  result:
    MatchResult,

  participantId:
    string,
): PlayerPosition {
  if (
    result.participants.PLAYER_0 ===
      participantId
  ) {
    return "PLAYER_0";
  }

  if (
    result.participants.PLAYER_1 ===
      participantId
  ) {
    return "PLAYER_1";
  }

  if (
    result.participants.PLAYER_2 ===
      participantId
  ) {
    return "PLAYER_2";
  }

  if (
    result.participants.PLAYER_3 ===
      participantId
  ) {
    return "PLAYER_3";
  }

  throw new Error(
    `Match history participant is not part of result: ${participantId}`,
  );
}

function createHistoryScore(
  result:
    MatchResult,

  ownTeam:
    LiveRoomTeam,
): MatchHistoryScore | null {
  if (
    result.completion !==
      "NORMAL"
  ) {
    return null;
  }

  const opponentTeam =
    getOpposingLiveRoomTeam(
      ownTeam,
    );

  return Object.freeze({
    targetScore:
      result.score.targetScore,

    ownTeam:
      result.score[
        ownTeam
      ],

    opponentTeam:
      result.score[
        opponentTeam
      ],
  });
}

function createHistoryForfeit(
  result:
    MatchResult,

  player:
    PlayerPosition,

  ownTeam:
    LiveRoomTeam,
): MatchHistoryForfeit | null {
  if (
    result.completion !==
      "FORFEIT"
  ) {
    return null;
  }

  return Object.freeze({
    reason:
      result.reason,

    byOwnTeam:
      result.losingTeam ===
        ownTeam,

    bySelf:
      result.forfeitingPlayer ===
        player,
  });
}

export function createMatchHistoryEntry(
  result:
    MatchResult,

  participantId:
    string,
): MatchHistoryEntry {
  const player =
    findParticipantPlayer(
      result,
      participantId,
    );

  const ownTeam =
    getLiveRoomPlayerTeam(
      player,
    );

  const outcome:
    MatchHistoryOutcome =
      result.winningTeam ===
        ownTeam
        ? "WIN"
        : "LOSS";

  return Object.freeze({
    formatVersion:
      MATCH_HISTORY_ENTRY_FORMAT_VERSION,

    sessionId:
      result.sessionId,

    mode:
      result.mode,

    completedAtMs:
      result.completedAtMs,

    completion:
      result.completion,

    outcome,

    score:
      createHistoryScore(
        result,
        ownTeam,
      ),

    forfeit:
      createHistoryForfeit(
        result,
        player,
        ownTeam,
      ),
  });
}
