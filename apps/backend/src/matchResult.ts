import {
  isMatchSessionId,
  type PlayerPosition,
} from "@atoutia/belote-engine";

import {
  getLiveRoomPlayerTeam,
  getOpposingLiveRoomTeam,
  type LiveRoomTeam,
} from "./liveRoomAdjudication.js";

import type {
  MatchMode,
} from "./matchMode.js";

export const MATCH_RESULT_FORMAT_VERSION =
  1;

export interface MatchResultParticipants {
  readonly PLAYER_0:
    string;

  readonly PLAYER_1:
    string;

  readonly PLAYER_2:
    string;

  readonly PLAYER_3:
    string;
}

export interface MatchResultScore {
  readonly targetScore:
    number;

  readonly TEAM_0:
    number;

  readonly TEAM_1:
    number;
}

interface MatchResultBase {
  readonly formatVersion:
    1;

  readonly sessionId:
    string;

  readonly mode:
    MatchMode;

  readonly participants:
    MatchResultParticipants;

  readonly completedAtMs:
    number;

  readonly winningTeam:
    LiveRoomTeam;

  readonly losingTeam:
    LiveRoomTeam;
}

export interface NormalMatchResult
  extends MatchResultBase {
  readonly completion:
    "NORMAL";

  readonly score:
    MatchResultScore;

  readonly reason:
    null;

  readonly forfeitingPlayer:
    null;
}

export interface ForfeitMatchResult
  extends MatchResultBase {
  readonly completion:
    "FORFEIT";

  readonly score:
    null;

  readonly reason:
    "PLAYER_ABSENCE";

  readonly forfeitingPlayer:
    PlayerPosition;
}

export type MatchResult =
  | NormalMatchResult
  | ForfeitMatchResult;

export interface CreateNormalMatchResultOptions {
  readonly sessionId:
    string;

  readonly mode:
    MatchMode;

  readonly participants:
    MatchResultParticipants;

  readonly completedAtMs:
    number;

  readonly winningTeam:
    LiveRoomTeam;

  readonly score:
    MatchResultScore;
}

export interface CreateForfeitMatchResultOptions {
  readonly sessionId:
    string;

  readonly mode:
    MatchMode;

  readonly participants:
    MatchResultParticipants;

  readonly completedAtMs:
    number;

  readonly forfeitingPlayer:
    PlayerPosition;

  readonly losingTeam:
    LiveRoomTeam;

  readonly winningTeam:
    LiveRoomTeam;
}

function assertValidSessionId(
  sessionId:
    string,
): void {
  if (
    !isMatchSessionId(
      sessionId,
    )
  ) {
    throw new Error(
      "Match result session identifier is invalid.",
    );
  }
}

function assertValidCompletedAtMs(
  completedAtMs:
    number,
): void {
  if (
    !Number.isSafeInteger(
      completedAtMs,
    ) ||
    completedAtMs <
      0
  ) {
    throw new Error(
      "Match result completedAtMs must be a non-negative safe integer.",
    );
  }
}

function assertValidParticipantId(
  participantId:
    string,
): void {
  if (
    participantId.trim().length ===
      0 ||
    participantId !==
      participantId.trim() ||
    participantId.length >
      128
  ) {
    throw new Error(
      "Match result participant identifier is invalid.",
    );
  }
}

function freezeParticipants(
  participants:
    MatchResultParticipants,
): MatchResultParticipants {
  const values =
    [
      participants.PLAYER_0,
      participants.PLAYER_1,
      participants.PLAYER_2,
      participants.PLAYER_3,
    ];

  for (
    const participantId
    of values
  ) {
    assertValidParticipantId(
      participantId,
    );
  }

  if (
    new Set(
      values,
    ).size !==
      values.length
  ) {
    throw new Error(
      "Match result participants must be unique.",
    );
  }

  return Object.freeze({
    PLAYER_0:
      participants.PLAYER_0,

    PLAYER_1:
      participants.PLAYER_1,

    PLAYER_2:
      participants.PLAYER_2,

    PLAYER_3:
      participants.PLAYER_3,
  });
}

function assertValidTeamPair(
  winningTeam:
    LiveRoomTeam,

  losingTeam:
    LiveRoomTeam,
): void {
  if (
    winningTeam ===
      losingTeam ||
    getOpposingLiveRoomTeam(
      winningTeam,
    ) !==
      losingTeam
  ) {
    throw new Error(
      "Match result winning and losing teams are inconsistent.",
    );
  }
}

function assertValidScoreValue(
  value:
    number,

  name:
    string,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      0
  ) {
    throw new Error(
      `Match result ${name} must be a non-negative safe integer.`,
    );
  }
}

function freezeScore(
  score:
    MatchResultScore,
): MatchResultScore {
  if (
    !Number.isSafeInteger(
      score.targetScore,
    ) ||
    score.targetScore <=
      0
  ) {
    throw new Error(
      "Match result targetScore must be a positive safe integer.",
    );
  }

  assertValidScoreValue(
    score.TEAM_0,
    "TEAM_0 score",
  );

  assertValidScoreValue(
    score.TEAM_1,
    "TEAM_1 score",
  );

  return Object.freeze({
    targetScore:
      score.targetScore,

    TEAM_0:
      score.TEAM_0,

    TEAM_1:
      score.TEAM_1,
  });
}

function determineCompletedScoreWinner(
  score:
    MatchResultScore,
): LiveRoomTeam | null {
  const team0Reached =
    score.TEAM_0 >=
    score.targetScore;

  const team1Reached =
    score.TEAM_1 >=
    score.targetScore;

  if (
    !team0Reached &&
    !team1Reached
  ) {
    return null;
  }

  if (
    team0Reached &&
    !team1Reached
  ) {
    return "TEAM_0";
  }

  if (
    team1Reached &&
    !team0Reached
  ) {
    return "TEAM_1";
  }

  if (
    score.TEAM_0 >
      score.TEAM_1
  ) {
    return "TEAM_0";
  }

  if (
    score.TEAM_1 >
      score.TEAM_0
  ) {
    return "TEAM_1";
  }

  return null;
}

function assertValidCommonFields(
  sessionId:
    string,

  completedAtMs:
    number,

  winningTeam:
    LiveRoomTeam,

  losingTeam:
    LiveRoomTeam,
): void {
  assertValidSessionId(
    sessionId,
  );

  assertValidCompletedAtMs(
    completedAtMs,
  );

  assertValidTeamPair(
    winningTeam,
    losingTeam,
  );
}

export function createNormalMatchResult(
  options:
    CreateNormalMatchResultOptions,
): NormalMatchResult {
  const losingTeam =
    getOpposingLiveRoomTeam(
      options.winningTeam,
    );

  assertValidCommonFields(
    options.sessionId,
    options.completedAtMs,
    options.winningTeam,
    losingTeam,
  );

  const score =
    freezeScore(
      options.score,
    );

  const scoreWinner =
    determineCompletedScoreWinner(
      score,
    );

  if (
    scoreWinner ===
      null
  ) {
    throw new Error(
      "Match result score does not represent a completed match.",
    );
  }

  if (
    scoreWinner !==
      options.winningTeam
  ) {
    throw new Error(
      "Match result winning team does not match the final score.",
    );
  }

  return Object.freeze({
    formatVersion:
      MATCH_RESULT_FORMAT_VERSION,

    sessionId:
      options.sessionId,

    mode:
      options.mode,

    participants:
      freezeParticipants(
        options.participants,
      ),

    completedAtMs:
      options.completedAtMs,

    completion:
      "NORMAL",

    winningTeam:
      options.winningTeam,

    losingTeam,

    score,

    reason:
      null,

    forfeitingPlayer:
      null,
  });
}

export function createForfeitMatchResult(
  options:
    CreateForfeitMatchResultOptions,
): ForfeitMatchResult {
  assertValidCommonFields(
    options.sessionId,
    options.completedAtMs,
    options.winningTeam,
    options.losingTeam,
  );

  if (
    getLiveRoomPlayerTeam(
      options.forfeitingPlayer,
    ) !==
      options.losingTeam
  ) {
    throw new Error(
      "Match result forfeiting player does not belong to the losing team.",
    );
  }

  return Object.freeze({
    formatVersion:
      MATCH_RESULT_FORMAT_VERSION,

    sessionId:
      options.sessionId,

    mode:
      options.mode,

    participants:
      freezeParticipants(
        options.participants,
      ),

    completedAtMs:
      options.completedAtMs,

    completion:
      "FORFEIT",

    winningTeam:
      options.winningTeam,

    losingTeam:
      options.losingTeam,

    score:
      null,

    reason:
      "PLAYER_ABSENCE",

    forfeitingPlayer:
      options.forfeitingPlayer,
  });
}
