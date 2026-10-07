import type {
  LiveRoomStore,
} from "./liveRoomStore.js";

import type {
  MatchResultRepository,
} from "./matchResultRepository.js";

export interface CleanupCompletedLiveRoomsOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly matchResultRepository:
    Pick<
      MatchResultRepository,
      "get"
    >;

  readonly sessionIds:
    readonly string[];
}

export interface CompletedLiveRoomCleanupResult {
  readonly scanned:
    number;

  readonly completed:
    number;

  readonly deleted:
    number;

  readonly skippedWithoutMatchResult:
    number;
}

export function cleanupCompletedLiveRooms(
  options:
    CleanupCompletedLiveRoomsOptions,
): CompletedLiveRoomCleanupResult {
  let completed =
    0;

  let deleted =
    0;

  let skippedWithoutMatchResult =
    0;

  for (
    const sessionId
    of options.sessionIds
  ) {
    const room =
      options.roomStore.get(
        sessionId,
      );

    if (
      room ===
        undefined
    ) {
      continue;
    }

    const adjudication =
      options.roomStore
        .getAdjudication(
          sessionId,
        );

    if (
      adjudication.status !==
        "COMPLETED"
    ) {
      continue;
    }

    completed +=
      1;

    const matchResult =
      options.matchResultRepository
        .get(
          sessionId,
        );

    if (
      matchResult ===
        undefined
    ) {
      skippedWithoutMatchResult +=
        1;

      continue;
    }

    if (
      options.roomStore
        .deleteCompleted(
          sessionId,
        )
    ) {
      deleted +=
        1;
    }
  }

  return Object.freeze({
    scanned:
      options.sessionIds.length,

    completed,

    deleted,

    skippedWithoutMatchResult,
  });
}
