import {
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "@atoutia/belote-engine";

import {
  createForfeitMatchResult,
  createNormalMatchResult,
  MATCH_RESULT_FORMAT_VERSION,
  type MatchResult,
  type MatchResultParticipants,
  type MatchResultScore,
} from "./matchResult.js";

import {
  LIVE_ROOM_TEAMS,
  type LiveRoomTeam,
} from "./liveRoomAdjudication.js";

import {
  isMatchMode,
  type MatchMode,
} from "./matchMode.js";

function isObject(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function hasExactKeys(
  value:
    Record<
      string,
      unknown
    >,

  keys:
    readonly string[],
): boolean {
  const actual =
    Object.keys(
      value,
    ).sort();

  const expected =
    [
      ...keys,
    ].sort();

  return (
    actual.length ===
      expected.length &&
    actual.every(
      (
        key,
        index,
      ) =>
        key ===
        expected[
          index
        ]
    )
  );
}

function isPlayerPosition(
  value:
    unknown,
): value is PlayerPosition {
  return (
    typeof value ===
      "string" &&
    (
      PLAYER_POSITIONS as
        readonly string[]
    ).includes(
      value,
    )
  );
}

function isLiveRoomTeam(
  value:
    unknown,
): value is LiveRoomTeam {
  return (
    typeof value ===
      "string" &&
    (
      LIVE_ROOM_TEAMS as
        readonly string[]
    ).includes(
      value,
    )
  );
}

function parseParticipants(
  value:
    unknown,
): MatchResultParticipants {
  if (
    !isObject(
      value,
    ) ||
    !hasExactKeys(
      value,
      [
        "PLAYER_0",
        "PLAYER_1",
        "PLAYER_2",
        "PLAYER_3",
      ],
    ) ||
    typeof value.PLAYER_0 !==
      "string" ||
    typeof value.PLAYER_1 !==
      "string" ||
    typeof value.PLAYER_2 !==
      "string" ||
    typeof value.PLAYER_3 !==
      "string"
  ) {
    throw new Error(
      "Invalid persisted match result participants.",
    );
  }

  return Object.freeze({
    PLAYER_0:
      value.PLAYER_0,

    PLAYER_1:
      value.PLAYER_1,

    PLAYER_2:
      value.PLAYER_2,

    PLAYER_3:
      value.PLAYER_3,
  });
}

function parseScore(
  value:
    unknown,
): MatchResultScore {
  if (
    !isObject(
      value,
    ) ||
    !hasExactKeys(
      value,
      [
        "targetScore",
        "TEAM_0",
        "TEAM_1",
      ],
    ) ||
    typeof value.targetScore !==
      "number" ||
    typeof value.TEAM_0 !==
      "number" ||
    typeof value.TEAM_1 !==
      "number"
  ) {
    throw new Error(
      "Invalid persisted match result score.",
    );
  }

  return Object.freeze({
    targetScore:
      value.targetScore,

    TEAM_0:
      value.TEAM_0,

    TEAM_1:
      value.TEAM_1,
  });
}

function assertCommonDocumentShape(
  value:
    Record<
      string,
      unknown
    >,
): {
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
} {
  if (
    value.formatVersion !==
      MATCH_RESULT_FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported persisted match result format version.",
    );
  }

  if (
    typeof value.sessionId !==
      "string"
  ) {
    throw new Error(
      "Invalid persisted match result session identifier.",
    );
  }

  if (
    !isMatchMode(
      value.mode,
    )
  ) {
    throw new Error(
      "Invalid persisted match result mode.",
    );
  }

  if (
    typeof value.completedAtMs !==
      "number"
  ) {
    throw new Error(
      "Invalid persisted match result completion timestamp.",
    );
  }

  if (
    !isLiveRoomTeam(
      value.winningTeam,
    ) ||
    !isLiveRoomTeam(
      value.losingTeam,
    )
  ) {
    throw new Error(
      "Invalid persisted match result teams.",
    );
  }

  return Object.freeze({
    sessionId:
      value.sessionId,

    mode:
      value.mode,

    participants:
      parseParticipants(
        value.participants,
      ),

    completedAtMs:
      value.completedAtMs,

    winningTeam:
      value.winningTeam,

    losingTeam:
      value.losingTeam,
  });
}

export function parseMatchResultDocument(
  text:
    string,
): MatchResult {
  let value:
    unknown;

  try {
    value =
      JSON.parse(
        text,
      ) as unknown;
  } catch {
    throw new Error(
      "Invalid persisted match result JSON.",
    );
  }

  if (
    !isObject(
      value,
    )
  ) {
    throw new Error(
      "Persisted match result document must be an object.",
    );
  }

  if (
    !hasExactKeys(
      value,
      [
        "formatVersion",
        "sessionId",
        "mode",
        "participants",
        "completedAtMs",
        "completion",
        "winningTeam",
        "losingTeam",
        "score",
        "reason",
        "forfeitingPlayer",
      ],
    )
  ) {
    throw new Error(
      "Invalid persisted match result document structure.",
    );
  }

  const common =
    assertCommonDocumentShape(
      value,
    );

  if (
    value.completion ===
      "NORMAL"
  ) {
    if (
      value.reason !==
        null ||
      value.forfeitingPlayer !==
        null
    ) {
      throw new Error(
        "Invalid persisted normal match result.",
      );
    }

    const result =
      createNormalMatchResult({
        sessionId:
          common.sessionId,

        mode:
          common.mode,

        participants:
          common.participants,

        completedAtMs:
          common.completedAtMs,

        winningTeam:
          common.winningTeam,

        score:
          parseScore(
            value.score,
          ),
      });

    if (
      result.losingTeam !==
        common.losingTeam
    ) {
      throw new Error(
        "Persisted normal match result losing team is inconsistent.",
      );
    }

    return result;
  }

  if (
    value.completion ===
      "FORFEIT"
  ) {
    if (
      value.score !==
        null ||
      value.reason !==
        "PLAYER_ABSENCE" ||
      !isPlayerPosition(
        value.forfeitingPlayer,
      )
    ) {
      throw new Error(
        "Invalid persisted forfeit match result.",
      );
    }

    return createForfeitMatchResult({
      sessionId:
        common.sessionId,

      mode:
        common.mode,

      participants:
        common.participants,

      completedAtMs:
        common.completedAtMs,

      forfeitingPlayer:
        value.forfeitingPlayer,

      losingTeam:
        common.losingTeam,

      winningTeam:
        common.winningTeam,
    });
  }

  throw new Error(
    "Invalid persisted match result completion.",
  );
}

export function serializeMatchResultDocument(
  result:
    MatchResult,
): string {
  return JSON.stringify(
    result,
  );
}
