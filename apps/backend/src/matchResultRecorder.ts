import type {
  RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

import {
  LiveRoomNotFoundError,
  type LiveRoomStore,
} from "./liveRoomStore.js";

import type {
  LiveRoomAdjudication,
} from "./liveRoomAdjudication.js";

import {
  createForfeitMatchResult,
  createNormalMatchResult,
  type MatchResult,
  type MatchResultParticipants,
} from "./matchResult.js";

import type {
  MatchResultRepository,
} from "./matchResultRepository.js";

export interface MatchResultRecorderErrorContext {
  readonly sessionId:
    string;
}

export interface CreateMatchResultRecorderOptions {
  readonly roomStore:
    LiveRoomStore;

  readonly repository:
    MatchResultRepository;

  readonly onError?:
    (
      error:
        unknown,

      context:
        MatchResultRecorderErrorContext,
    ) => void;
}

export interface MatchResultRecorder {
  reconcile(
    sessionIds:
      readonly string[],
  ): void;

  close():
    void;
}

function createParticipants(
  room:
    RevisionedLiveMatchRoom,
): MatchResultParticipants {
  const assignments =
    room.managedRoom.room.seats
      .assignments;

  if (
    assignments.PLAYER_0 ===
      null ||
    assignments.PLAYER_1 ===
      null ||
    assignments.PLAYER_2 ===
      null ||
    assignments.PLAYER_3 ===
      null
  ) {
    throw new Error(
      `Cannot record completed match without four participants: ${room.managedRoom.room.session.sessionId}`,
    );
  }

  return Object.freeze({
    PLAYER_0:
      assignments.PLAYER_0,

    PLAYER_1:
      assignments.PLAYER_1,

    PLAYER_2:
      assignments.PLAYER_2,

    PLAYER_3:
      assignments.PLAYER_3,
  });
}

function createResult(
  roomStore:
    LiveRoomStore,

  sessionId:
    string,

  adjudication:
    LiveRoomAdjudication,
): MatchResult | undefined {
  if (
    adjudication.status !==
      "COMPLETED"
  ) {
    return undefined;
  }

  const room =
    roomStore.get(
      sessionId,
    );

  if (
    room ===
      undefined
  ) {
    throw new LiveRoomNotFoundError(
      sessionId,
    );
  }

  const participants =
    createParticipants(
      room,
    );

  const mode =
    roomStore.requireMode(
      sessionId,
    );

  if (
    adjudication.completion ===
      "FORFEIT"
  ) {
    return createForfeitMatchResult({
      sessionId,

      mode,

      participants,

      completedAtMs:
        adjudication.completedAtMs,

      forfeitingPlayer:
        adjudication.forfeitingPlayer,

      losingTeam:
        adjudication.losingTeam,

      winningTeam:
        adjudication.winningTeam,
    });
  }

  const score =
    room.managedRoom.room.session.state
      .score;

  if (
    !score.completed ||
    score.winner ===
      null
  ) {
    throw new Error(
      `Normal completed adjudication has no completed engine score: ${sessionId}`,
    );
  }

  return createNormalMatchResult({
    sessionId,

    mode,

    participants,

    completedAtMs:
      adjudication.completedAtMs,

    winningTeam:
      score.winner,

    score: {
      targetScore:
        score.targetScore,

      TEAM_0:
        score.scores.TEAM_0,

      TEAM_1:
        score.scores.TEAM_1,
    },
  });
}

export function createMatchResultRecorder(
  options:
    CreateMatchResultRecorderOptions,
): MatchResultRecorder {
  const recordedSessionIds =
    new Set<
      string
    >();

  let closed =
    false;

  function record(
    sessionId:
      string,
  ): void {
    if (
      closed ||
      recordedSessionIds.has(
        sessionId,
      )
    ) {
      return;
    }

    const existing =
      options.repository.get(
        sessionId,
      );

    if (
      existing !==
        undefined
    ) {
      recordedSessionIds.add(
        sessionId,
      );

      return;
    }

    const adjudication =
      options.roomStore
        .getAdjudication(
          sessionId,
        );

    const result =
      createResult(
        options.roomStore,
        sessionId,
        adjudication,
      );

    if (
      result ===
        undefined
    ) {
      return;
    }

    options.repository.save(
      result,
    );

    recordedSessionIds.add(
      sessionId,
    );
  }

  function safelyRecord(
    sessionId:
      string,
  ): void {
    try {
      record(
        sessionId,
      );
    } catch (
      error:
        unknown
    ) {
      options.onError?.(
        error,

        Object.freeze({
          sessionId,
        }),
      );
    }
  }

  const unsubscribe =
    options.roomStore
      .subscribeAdjudication(
        (
          event,
        ) => {
          if (
            event.adjudication.status !==
              "COMPLETED"
          ) {
            return;
          }

          safelyRecord(
            event.sessionId,
          );
        },
      );

  return Object.freeze({
    reconcile(
      sessionIds:
        readonly string[],
    ): void {
      if (
        closed
      ) {
        return;
      }

      for (
        const sessionId
        of sessionIds
      ) {
        safelyRecord(
          sessionId,
        );
      }
    },

    close():
      void {
      if (
        closed
      ) {
        return;
      }

      closed =
        true;

      recordedSessionIds.clear();

      unsubscribe();
    },
  });
}
