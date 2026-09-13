import type {
  PlayerPosition,
} from "@atoutia/belote-engine";

import {
  createBotTakeoverHandler,
} from "./botTakeoverHandler.js";

import {
  executePendingAbsenceResolution,
} from "./absenceResolutionExecutor.js";

import {
  LiveRoomStore,
} from "./liveRoomStore.js";

import {
  createTeamForfeitHandler,
} from "./teamForfeitHandler.js";

export interface AbsenceResolutionCoordinator {
  request(
    sessionId:
      string,

    player:
      PlayerPosition,
  ): void;

  close():
    void;
}

export interface AbsenceResolutionCoordinatorErrorContext {
  readonly sessionId:
    string;

  readonly player:
    PlayerPosition;
}

export interface CreateAbsenceResolutionCoordinatorOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly requestBotCycle:
    (
      sessionId:
        string,
    ) => void;

  readonly now?:
    () => number;

  readonly onError?:
    (
      error:
        unknown,

      context:
        AbsenceResolutionCoordinatorErrorContext,
    ) => void;
}

function createResolutionKey(
  sessionId:
    string,

  player:
    PlayerPosition,
): string {
  return [
    sessionId,
    player,
  ].join(
    "\u0000",
  );
}

export function createAbsenceResolutionCoordinator(
  options:
    CreateAbsenceResolutionCoordinatorOptions,
): AbsenceResolutionCoordinator {
  const pendingKeys =
    new Set<
      string
    >();

  const runningKeys =
    new Set<
      string
    >();

  const botTakeoverHandler =
    createBotTakeoverHandler({
      roomStore:
        options.roomStore,
    });

  const teamForfeitHandler =
    options.now ===
      undefined
      ? createTeamForfeitHandler({
          roomStore:
            options.roomStore,
        })
      : createTeamForfeitHandler({
          roomStore:
            options.roomStore,

          now:
            options.now,
        });

  let closed =
    false;

  async function execute(
    sessionId:
      string,

    player:
      PlayerPosition,
  ): Promise<void> {
    const resolution =
      options.roomStore
        .getAbsenceResolution(
          sessionId,
          player,
        );

    if (
      resolution ===
        undefined ||
      resolution.status !==
        "PENDING"
    ) {
      return;
    }

    if (
      resolution.action ===
      "MANUAL_ONLY"
    ) {
      return;
    }

    const result =
      await executePendingAbsenceResolution({
        roomStore:
          options.roomStore,

        sessionId,

        player,

        handlers: {
          executeBotTakeover:
            botTakeoverHandler,

          executeTeamForfeit:
            teamForfeitHandler,
        },
      });

    if (
      result.status ===
        "EXECUTED" &&
      result.resolution.status ===
        "RESOLVED_BY_BOT"
    ) {
      options.requestBotCycle(
        sessionId,
      );
    }
  }

  function request(
    sessionId:
      string,

    player:
      PlayerPosition,
  ): void {
    if (
      closed
    ) {
      return;
    }

    const key =
      createResolutionKey(
        sessionId,
        player,
      );

    if (
      pendingKeys.has(
        key,
      ) ||
      runningKeys.has(
        key,
      )
    ) {
      return;
    }

    pendingKeys.add(
      key,
    );

    queueMicrotask(
      () => {
        if (
          closed
        ) {
          pendingKeys.delete(
            key,
          );

          return;
        }

        if (
          !pendingKeys.delete(
            key,
          )
        ) {
          return;
        }

        if (
          runningKeys.has(
            key,
          )
        ) {
          return;
        }

        runningKeys.add(
          key,
        );

        void execute(
          sessionId,
          player,
        )
          .catch(
            (
              error:
                unknown,
            ) => {
              options.onError?.(
                error,

                Object.freeze({
                  sessionId,
                  player,
                }),
              );
            },
          )
          .finally(
            () => {
              runningKeys.delete(
                key,
              );
            },
          );
      },
    );
  }

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

      pendingKeys.clear();
    },
  });
}