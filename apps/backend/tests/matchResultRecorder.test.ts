import {
  PLAYER_POSITIONS,
  createPlayerAvailableActions,
  type PlayerCommand,
  type PlayerPosition,
  type RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createMatchResultRecorder,
} from "../src/matchResultRecorder.js";

import type {
  MatchResult,
} from "../src/matchResult.js";

import type {
  MatchResultRepository,
} from "../src/matchResultRepository.js";

import type {
  MatchMode,
} from "../src/matchMode.js";

const PARTICIPANTS =
  Object.freeze({
    PLAYER_0:
      "participant-0",

    PLAYER_1:
      "participant-1",

    PLAYER_2:
      "participant-2",

    PLAYER_3:
      "participant-3",
  });

class InMemoryMatchResultRepository
  implements MatchResultRepository {
  public readonly results =
    new Map<
      string,
      MatchResult
    >();

  public saveCalls =
    0;

  public saveError:
    unknown =
      undefined;

  public save(
    result:
      MatchResult,
  ): void {
    this.saveCalls +=
      1;

    if (
      this.saveError !==
        undefined
    ) {
      throw this.saveError;
    }

    this.results.set(
      result.sessionId,
      result,
    );
  }

  public get(
    sessionId:
      string,
  ):
    | MatchResult
    | undefined {
    return this.results.get(
      sessionId,
    );
  }

  public listLatestByParticipant(
    participantId:
      string,

    limit:
      number,
  ):
    readonly MatchResult[] {
    return Object.freeze(
      [
        ...this.results.values(),
      ]
        .filter(
          (
            result,
          ) =>
            Object.values(
              result.participants,
            ).includes(
              participantId,
            ),
        )
        .sort(
          (
            left,
            right,
          ) => {
            if (
              left.completedAtMs !==
                right.completedAtMs
            ) {
              return (
                right.completedAtMs -
                left.completedAtMs
              );
            }

            return right.sessionId
              .localeCompare(
                left.sessionId,
              );
          },
        )
        .slice(
          0,
          limit,
        ),
    );
  }

  public close():
    void {
    // Nothing to close for the in-memory test repository.
  }
}

interface StartedRoom {
  readonly roomStore:
    LiveRoomStore;

  readonly sessionId:
    string;
}

function createStartedRoom(
  mode:
    MatchMode,

  now:
    () => number =
      () =>
        123_456,
): StartedRoom {
  const roomStore =
    new LiveRoomStore({
      now,
    });

  const room =
    roomStore.create({
      mode,
    });

  const sessionId =
    room.managedRoom.room.session
      .sessionId;

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      0,

    player:
      "PLAYER_0",

    participantId:
      PARTICIPANTS.PLAYER_0,
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      PARTICIPANTS.PLAYER_1,
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      PARTICIPANTS.PLAYER_2,
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      PARTICIPANTS.PLAYER_3,
  });

  roomStore.start({
    sessionId,

    expectedRevision:
      4,
  });

  for (
    const player
    of PLAYER_POSITIONS
  ) {
    roomStore.transferSeatControlToBot({
      sessionId,
      player,
    });
  }

  return Object.freeze({
    roomStore,
    sessionId,
  });
}

function createCommandForPlayer(
  roomStore:
    LiveRoomStore,

  sessionId:
    string,

  player:
    PlayerPosition,
): PlayerCommand | null {
  const room =
    roomStore.get(
      sessionId,
    );

  if (
    room ===
      undefined
  ) {
    throw new Error(
      "Expected live room.",
    );
  }

  const available =
    createPlayerAvailableActions(
      room.managedRoom.room.session
        .state,

      player,
    );

  if (
    available.mode ===
      "BID"
  ) {
    const take =
      available.biddingActions.find(
        (
          action,
        ) =>
          action.type ===
            "TAKE",
      );

    if (
      take !==
        undefined &&
      take.type ===
        "TAKE"
    ) {
      return Object.freeze({
        type:
          "TAKE",

        suit:
          take.suit,
      });
    }

    return Object.freeze({
      type:
        "PASS",
    });
  }

  if (
    available.mode ===
      "PLAY_CARD"
  ) {
    const card =
      available.legalCards[
        0
      ];

    if (
      card ===
        undefined
    ) {
      throw new Error(
        "Expected at least one legal card.",
      );
    }

    return Object.freeze({
      type:
        "PLAY_CARD",

      card,
    });
  }

  return null;
}

function findActivePlayerCommand(
  roomStore:
    LiveRoomStore,

  sessionId:
    string,
): {
  readonly player:
    PlayerPosition;

  readonly command:
    PlayerCommand;
} {
  for (
    const player
    of PLAYER_POSITIONS
  ) {
    const command =
      createCommandForPlayer(
        roomStore,
        sessionId,
        player,
      );

    if (
      command !==
        null
    ) {
      return Object.freeze({
        player,
        command,
      });
    }
  }

  throw new Error(
    "Expected an active player command.",
  );
}

function completeRoomNormally(
  roomStore:
    LiveRoomStore,

  sessionId:
    string,
): RevisionedLiveMatchRoom {
  const maxCommands =
    10_000;

  for (
    let commandIndex =
      0;

    commandIndex <
      maxCommands;

    commandIndex +=
      1
  ) {
    const room =
      roomStore.get(
        sessionId,
      );

    if (
      room ===
        undefined
    ) {
      throw new Error(
        "Expected live room.",
      );
    }

    if (
      room.managedRoom.phase ===
        "FINISHED"
    ) {
      return room;
    }

    const {
      player,
      command,
    } =
      findActivePlayerCommand(
        roomStore,
        sessionId,
      );

    roomStore.applyBotCommand({
      sessionId,

      expectedRevision:
        room.revision,

      player,

      command,
    });
  }

  throw new Error(
    "Expected match to finish within command limit.",
  );
}

describe(
  "match result recorder",
  () => {
    it(
      "records a normal completion with the authoritative final engine score",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom(
            "CASUAL",

            () =>
              987_654,
          );

        const repository =
          new InMemoryMatchResultRepository();

        const recorder =
          createMatchResultRecorder({
            roomStore,
            repository,
          });

        const finalRoom =
          completeRoomNormally(
            roomStore,
            sessionId,
          );

        const engineScore =
          finalRoom.managedRoom.room
            .session.state.score;

        if (
          engineScore.winner ===
            null
        ) {
          throw new Error(
            "Expected completed engine winner.",
          );
        }

        const stored =
          repository.results.get(
            sessionId,
          );

        expect(
          stored,
        ).toEqual({
          formatVersion:
            1,

          sessionId,

          mode:
            "CASUAL",

          participants:
            PARTICIPANTS,

          completedAtMs:
            987_654,

          completion:
            "NORMAL",

          winningTeam:
            engineScore.winner,

          losingTeam:
            engineScore.winner ===
              "TEAM_0"
              ? "TEAM_1"
              : "TEAM_0",

          score: {
            targetScore:
              engineScore.targetScore,

            TEAM_0:
              engineScore.scores
                .TEAM_0,

            TEAM_1:
              engineScore.scores
                .TEAM_1,
          },

          reason:
            null,

          forfeitingPlayer:
            null,
        });

        expect(
          repository.saveCalls,
        ).toBe(
          1,
        );

        recorder.close();
      },
    );

    it(
      "records a ranked player absence forfeit without a final score",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom(
            "RANKED",
          );

        const repository =
          new InMemoryMatchResultRepository();

        const recorder =
          createMatchResultRecorder({
            roomStore,
            repository,
          });

        roomStore.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_1",

          completedAtMs:
            500_000,
        });

        expect(
          repository.results.get(
            sessionId,
          ),
        ).toEqual({
          formatVersion:
            1,

          sessionId,

          mode:
            "RANKED",

          participants:
            PARTICIPANTS,

          completedAtMs:
            500_000,

          completion:
            "FORFEIT",

          winningTeam:
            "TEAM_0",

          losingTeam:
            "TEAM_1",

          score:
            null,

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "PLAYER_1",
        });

        expect(
          repository.saveCalls,
        ).toBe(
          1,
        );

        recorder.close();
      },
    );

    it(
      "reconciles an already completed room and does not duplicate it after recorder restart",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom(
            "RANKED",
          );

        roomStore.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_3",

          completedAtMs:
            600_000,
        });

        const repository =
          new InMemoryMatchResultRepository();

        const firstRecorder =
          createMatchResultRecorder({
            roomStore,
            repository,
          });

        expect(
          repository.results.size,
        ).toBe(
          0,
        );

        firstRecorder.reconcile([
          sessionId,
          sessionId,
        ]);

        expect(
          repository.results.has(
            sessionId,
          ),
        ).toBe(
          true,
        );

        expect(
          repository.saveCalls,
        ).toBe(
          1,
        );

        firstRecorder.close();

        const secondRecorder =
          createMatchResultRecorder({
            roomStore,
            repository,
          });

        secondRecorder.reconcile([
          sessionId,
        ]);

        expect(
          repository.saveCalls,
        ).toBe(
          1,
        );

        secondRecorder.close();
      },
    );

    it(
      "does nothing when reconciliation sees an active room",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom(
            "CASUAL",
          );

        const repository =
          new InMemoryMatchResultRepository();

        const recorder =
          createMatchResultRecorder({
            roomStore,
            repository,
          });

        recorder.reconcile([
          sessionId,
        ]);

        expect(
          repository.results.size,
        ).toBe(
          0,
        );

        expect(
          repository.saveCalls,
        ).toBe(
          0,
        );

        recorder.close();
      },
    );

    it(
      "isolates repository failures from authoritative completion and can retry later",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom(
            "RANKED",
          );

        const repository =
          new InMemoryMatchResultRepository();

        const persistenceError =
          new Error(
            "match result storage unavailable",
          );

        repository.saveError =
          persistenceError;

        const onError =
          vi.fn();

        const recorder =
          createMatchResultRecorder({
            roomStore,
            repository,
            onError,
          });

        expect(
          () =>
            roomStore
              .forfeitForPlayerAbsence({
                sessionId,

                player:
                  "PLAYER_0",

                completedAtMs:
                  700_000,
              }),
        ).not.toThrow();

        expect(
          roomStore.getAdjudication(
            sessionId,
          ),
        ).toEqual({
          status:
            "COMPLETED",

          completion:
            "FORFEIT",

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "PLAYER_0",

          losingTeam:
            "TEAM_0",

          winningTeam:
            "TEAM_1",

          completedAtMs:
            700_000,
        });

        expect(
          repository.results.size,
        ).toBe(
          0,
        );

        expect(
          repository.saveCalls,
        ).toBe(
          1,
        );

        expect(
          onError,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          onError,
        ).toHaveBeenCalledWith(
          persistenceError,
          {
            sessionId,
          },
        );

        repository.saveError =
          undefined;

        recorder.reconcile([
          sessionId,
        ]);

        expect(
          repository.results.has(
            sessionId,
          ),
        ).toBe(
          true,
        );

        expect(
          repository.saveCalls,
        ).toBe(
          2,
        );

        recorder.close();
      },
    );

    it(
      "stops listening and reconciling after close",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom(
            "RANKED",
          );

        const repository =
          new InMemoryMatchResultRepository();

        const recorder =
          createMatchResultRecorder({
            roomStore,
            repository,
          });

        recorder.close();

        roomStore.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_2",

          completedAtMs:
            800_000,
        });

        recorder.reconcile([
          sessionId,
        ]);

        expect(
          repository.results.size,
        ).toBe(
          0,
        );

        expect(
          repository.saveCalls,
        ).toBe(
          0,
        );
      },
    );
  },
);
