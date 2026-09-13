import type {
  RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

import {
  executeBotCycle,
  type BotCycleExecutionResult,
} from "./botCycleExecutor.js";

import {
  LiveRoomStore,
} from "./liveRoomStore.js";

export interface BotCycleScheduler {
  request(
    sessionId:
      string,
  ): void;

  close():
    void;
}

export interface CreateBotCycleSchedulerOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly executeCycle?:
    (
      options: {
        readonly roomStore:
          LiveRoomStore;

        readonly sessionId:
          string;
      },
    ) => BotCycleExecutionResult;
}

export function createBotCycleScheduler(
  options:
    CreateBotCycleSchedulerOptions,
): BotCycleScheduler {
  const executeCycle =
    options.executeCycle ??
    executeBotCycle;

  const pendingSessions =
    new Set<
      string
    >();

  const runningSessions =
    new Set<
      string
    >();

  let closed =
    false;

  function request(
    sessionId:
      string,
  ): void {
    if (
      closed ||
      pendingSessions.has(
        sessionId,
      ) ||
      runningSessions.has(
        sessionId,
      )
    ) {
      return;
    }

    pendingSessions.add(
      sessionId,
    );

    queueMicrotask(
      () => {
        if (
          closed
        ) {
          pendingSessions.delete(
            sessionId,
          );

          return;
        }

        if (
          !pendingSessions.delete(
            sessionId,
          )
        ) {
          return;
        }

        if (
          runningSessions.has(
            sessionId,
          )
        ) {
          return;
        }

        runningSessions.add(
          sessionId,
        );

        try {
          executeCycle({
            roomStore:
              options.roomStore,

            sessionId,
          });
        } finally {
          runningSessions.delete(
            sessionId,
          );
        }
      },
    );
  }

  const unsubscribe =
    options.roomStore.subscribe(
      (
        room:
          RevisionedLiveMatchRoom,
      ) => {
        request(
          room.managedRoom.room.session
            .sessionId,
        );
      },
    );

  return Object.freeze({
    request,

    close():
      void {
      if (
        closed
      ) {
        return;
      }

      closed =
        true;

      pendingSessions.clear();

      unsubscribe();
    },
  });
}