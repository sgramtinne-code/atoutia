import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

import type {
  LiveRoomAdjudication,
  LiveRoomTeam,
} from "./liveRoomAdjudication.js";

export const LIVE_ROOM_ADJUDICATION_FORMAT_VERSION =
  1;

export interface ActiveLiveRoomAdjudicationDocument {
  readonly formatVersion:
    1;

  readonly status:
    "ACTIVE";

  readonly completion:
    null;

  readonly completedAtMs:
    null;
}

export interface NormalLiveRoomAdjudicationDocument {
  readonly formatVersion:
    1;

  readonly status:
    "COMPLETED";

  readonly completion:
    "NORMAL";

  readonly completedAtMs:
    number;
}

export interface ForfeitLiveRoomAdjudicationDocument {
  readonly formatVersion:
    1;

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
}

export type LiveRoomAdjudicationDocument =
  | ActiveLiveRoomAdjudicationDocument
  | NormalLiveRoomAdjudicationDocument
  | ForfeitLiveRoomAdjudicationDocument;

export function createLiveRoomAdjudicationDocument(
  adjudication:
    LiveRoomAdjudication,
): LiveRoomAdjudicationDocument {
  if (
    adjudication.status ===
    "ACTIVE"
  ) {
    return Object.freeze({
      formatVersion:
        LIVE_ROOM_ADJUDICATION_FORMAT_VERSION,

      status:
        "ACTIVE",

      completion:
        null,

      completedAtMs:
        null,
    });
  }

  if (
    adjudication.completion ===
    "NORMAL"
  ) {
    return Object.freeze({
      formatVersion:
        LIVE_ROOM_ADJUDICATION_FORMAT_VERSION,

      status:
        "COMPLETED",

      completion:
        "NORMAL",

      completedAtMs:
        adjudication.completedAtMs,
    });
  }

  return Object.freeze({
    formatVersion:
      LIVE_ROOM_ADJUDICATION_FORMAT_VERSION,

    status:
      "COMPLETED",

    completion:
      "FORFEIT",

    reason:
      adjudication.reason,

    forfeitingPlayer:
      adjudication.forfeitingPlayer,

    losingTeam:
      adjudication.losingTeam,

    winningTeam:
      adjudication.winningTeam,

    completedAtMs:
      adjudication.completedAtMs,
  });
}