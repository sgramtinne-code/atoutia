import {
  PLAYER_POSITIONS,
  createPlayerAvailableActions,
  type PlayerCommand,
  type PlayerPosition,
} from "@atoutia/belote-engine";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  LiveRoomCompletedError,
  LiveRoomStore,
} from "../src/liveRoomStore.js";

interface StartedBotRoom {
  readonly roomStore:
    LiveRoomStore;

  readonly sessionId:
    string;
}

function createStartedBotRoom(
  now:
    () => number,
): StartedBotRoom {
  const roomStore =
    new LiveRoomStore({
      now,
    });

  const room =
    roomStore.create({
      mode:
        "CASUAL",
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
      "participant-0",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      "participant-1",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      "participant-2",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      "participant-3",
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

describe(
  "live room normal adjudication",
  () => {
    it(
      "automatically completes adjudication as NORMAL when the engine match finishes",
      () => {
        const now =
          vi.fn(
            () =>
              987_654,
          );

        const {
          roomStore,
          sessionId,
        } =
          createStartedBotRoom(
            now,
          );

        const adjudicationListener =
          vi.fn();

        roomStore.subscribeAdjudication(
          adjudicationListener,
        );

        let finalRevisionBefore =
          -1;

        let finalRevisionAfter =
          -1;

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
          const roomBefore =
            roomStore.get(
              sessionId,
            );

          if (
            roomBefore ===
            undefined
          ) {
            throw new Error(
              "Expected live room.",
            );
          }

          if (
            roomBefore.managedRoom.phase ===
            "FINISHED"
          ) {
            break;
          }

          const {
            player,
            command,
          } =
            findActivePlayerCommand(
              roomStore,
              sessionId,
            );

          const revisionBefore =
            roomBefore.revision;

          const result =
            roomStore.applyBotCommand({
              sessionId,

              expectedRevision:
                revisionBefore,

              player,

              command,
            });

          if (
            result.room.managedRoom.phase ===
            "FINISHED"
          ) {
            finalRevisionBefore =
              revisionBefore;

            finalRevisionAfter =
              result.room.revision;

            break;
          }
        }

        const finalRoom =
          roomStore.get(
            sessionId,
          );

        if (
          finalRoom ===
          undefined
        ) {
          throw new Error(
            "Expected final live room.",
          );
        }

        expect(
          finalRoom.managedRoom.phase,
        ).toBe(
          "FINISHED",
        );

        expect(
          finalRoom.managedRoom.room.session
            .state.score.completed,
        ).toBe(
          true,
        );

        expect(
          finalRevisionBefore,
        ).toBeGreaterThanOrEqual(
          5,
        );

        expect(
          finalRevisionAfter,
        ).toBe(
          finalRevisionBefore +
            1,
        );

        expect(
          finalRoom.revision,
        ).toBe(
          finalRevisionAfter,
        );

        expect(
          roomStore.getAdjudication(
            sessionId,
          ),
        ).toEqual({
          status:
            "COMPLETED",

          completion:
            "NORMAL",

          completedAtMs:
            987_654,
        });

        expect(
          now,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          adjudicationListener,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          adjudicationListener,
        ).toHaveBeenCalledWith({
          sessionId,

          adjudication: {
            status:
              "COMPLETED",

            completion:
              "NORMAL",

            completedAtMs:
              987_654,
          },
        });
      },
    );

    it(
      "rejects further BOT commands after normal adjudication completes",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedBotRoom(
            () =>
              123_456,
          );

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
            break;
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

        const finalRoom =
          roomStore.get(
            sessionId,
          );

        if (
          finalRoom ===
          undefined
        ) {
          throw new Error(
            "Expected final live room.",
          );
        }

        expect(
          finalRoom.managedRoom.phase,
        ).toBe(
          "FINISHED",
        );

        expect(
          roomStore.getAdjudication(
            sessionId,
          ).completion,
        ).toBe(
          "NORMAL",
        );

        const revision =
          finalRoom.revision;

        const unusedCommand =
          null as unknown as
            PlayerCommand;

        expect(
          () =>
            roomStore.applyBotCommand({
              sessionId,

              expectedRevision:
                revision,

              player:
                "PLAYER_0",

              command:
                unusedCommand,
            }),
        ).toThrow(
          LiveRoomCompletedError,
        );

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          revision,
        );
      },
    );
  },
);