import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

export const LIVE_ROOM_TEAMS = [
  "TEAM_0",
  "TEAM_1",
] as const;

export type LiveRoomTeam =
  typeof LIVE_ROOM_TEAMS[number];

export type LiveRoomCompletion =
  | "NORMAL"
  | "FORFEIT";

export type LiveRoomAdjudication =
  | {
      readonly status:
        "ACTIVE";

      readonly completion:
        null;

      readonly completedAtMs:
        null;
    }
  | {
      readonly status:
        "COMPLETED";

      readonly completion:
        "NORMAL";

      readonly completedAtMs:
        number;
    }
  | {
      readonly status:
        "COMPLETED";

      readonly completion:
        "FORFEIT";

      readonly reason:
        "PLAYER_ABSENCE";

      readonly forfeitingPlayer:
        PlayerPosition;

      readonly losingTeam:
        LiveRoomTeam;

      readonly winningTeam:
        LiveRoomTeam;

      readonly completedAtMs:
        number;
    };

export interface CreateNormalLiveRoomAdjudicationOptions {
  readonly completedAtMs:
    number;
}

export interface CreatePlayerAbsenceForfeitAdjudicationOptions {
  readonly forfeitingPlayer:
    PlayerPosition;

  readonly completedAtMs:
    number;
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
      "completedAtMs must be a non-negative safe integer.",
    );
  }
}

export function getLiveRoomPlayerTeam(
  player:
    PlayerPosition,
): LiveRoomTeam {
  switch (
    player
  ) {
    case "PLAYER_0":
    case "PLAYER_2":
      return "TEAM_0";

    case "PLAYER_1":
    case "PLAYER_3":
      return "TEAM_1";
  }
}

export function getOpposingLiveRoomTeam(
  team:
    LiveRoomTeam,
): LiveRoomTeam {
  switch (
    team
  ) {
    case "TEAM_0":
      return "TEAM_1";

    case "TEAM_1":
      return "TEAM_0";
  }
}

export function createActiveLiveRoomAdjudication():
  LiveRoomAdjudication {
  return Object.freeze({
    status:
      "ACTIVE",

    completion:
      null,

    completedAtMs:
      null,
  });
}

export function createNormalLiveRoomAdjudication(
  options:
    CreateNormalLiveRoomAdjudicationOptions,
): LiveRoomAdjudication {
  assertValidCompletedAtMs(
    options.completedAtMs,
  );

  return Object.freeze({
    status:
      "COMPLETED",

    completion:
      "NORMAL",

    completedAtMs:
      options.completedAtMs,
  });
}

export function createPlayerAbsenceForfeitAdjudication(
  options:
    CreatePlayerAbsenceForfeitAdjudicationOptions,
): LiveRoomAdjudication {
  assertValidCompletedAtMs(
    options.completedAtMs,
  );

  const losingTeam =
    getLiveRoomPlayerTeam(
      options.forfeitingPlayer,
    );

  const winningTeam =
    getOpposingLiveRoomTeam(
      losingTeam,
    );

  return Object.freeze({
    status:
      "COMPLETED",

    completion:
      "FORFEIT",

    reason:
      "PLAYER_ABSENCE",

    forfeitingPlayer:
      options.forfeitingPlayer,

    losingTeam,

    winningTeam,

    completedAtMs:
      options.completedAtMs,
  });
}