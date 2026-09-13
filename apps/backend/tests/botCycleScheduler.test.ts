import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createBotCycleScheduler,
} from "../src/botCycleScheduler.js";

import type {
  BotCycleExecutionResult,
} from "../src/botCycleExecutor.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

function createCycleResult(
  sessionId:
    string,

  roomStore:
    LiveRoomStore,
): BotCycleExecutionResult {
  const room =
    roomStore.get(
      sessionId,
    );

  if (
    room ===
    undefined
  ) {
    throw new Error(
      `Missing room ${sessionId}`,
    );
  }

  return Object.freeze({
    status:
      room.managedRoom.phase ===
      "IN_PROGRESS"
        ? "NO_BOT_ACTION"
        : "ROOM_NOT_IN_PROGRESS",

    commandsApplied:
      0,

    initialRevision:
      room.revision,

    finalRevision:
      room.revision,

    lastPlayer:
      null,
  });
}

async function flushMicrotasks():
  Promise<void> {
  await Promise.resolve();
}

describe(
  "BOT cycle scheduler",
  () => {
    it(
      "schedules one cycle after a room mutation",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ) =>
              createCycleResult(
                options.sessionId,
                options.roomStore,
              ),
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
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

        expect(
          executeCycle,
        ).not.toHaveBeenCalled();

        await flushMicrotasks();

        expect(
          executeCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          executeCycle,
        ).toHaveBeenCalledWith({
          roomStore,
          sessionId,
        });

        scheduler.close();
      },
    );

    it(
      "coalesces multiple synchronous mutations for the same session",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ) =>
              createCycleResult(
                options.sessionId,
                options.roomStore,
              ),
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
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

        expect(
          executeCycle,
        ).not.toHaveBeenCalled();

        await flushMicrotasks();

        expect(
          executeCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        scheduler.close();
      },
    );

    it(
      "ignores mutations produced while the same session cycle is running",
      async () => {
        const roomStore =
          new LiveRoomStore();

        let sessionId =
          "";

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ): BotCycleExecutionResult => {
              const room =
                options.roomStore.get(
                  options.sessionId,
                );

              if (
                room ===
                undefined
              ) {
                throw new Error(
                  "Room missing during scheduler test.",
                );
              }

              if (
                room.revision ===
                1
              ) {
                options.roomStore
                  .claimSeat({
                    sessionId:
                      options.sessionId,

                    expectedRevision:
                      1,

                    player:
                      "PLAYER_1",

                    participantId:
                      "participant-1",
                  });
              }

              return createCycleResult(
                options.sessionId,
                options.roomStore,
              );
            },
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
          });

        const room =
          roomStore.create({
            mode:
              "CASUAL",
          });

        sessionId =
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

        await flushMicrotasks();
        await flushMicrotasks();

        expect(
          executeCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          2,
        );

        scheduler.close();
      },
    );

    it(
      "keeps different sessions independent",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executedSessionIds:
          string[] =
            [];

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ) => {
              executedSessionIds.push(
                options.sessionId,
              );

              return createCycleResult(
                options.sessionId,
                options.roomStore,
              );
            },
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
          });

        const firstRoom =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const secondRoom =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const firstSessionId =
          firstRoom.managedRoom.room
            .session.sessionId;

        const secondSessionId =
          secondRoom.managedRoom.room
            .session.sessionId;

        roomStore.claimSeat({
          sessionId:
            firstSessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "participant-a",
        });

        roomStore.claimSeat({
          sessionId:
            secondSessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "participant-b",
        });

        await flushMicrotasks();

        expect(
          executeCycle,
        ).toHaveBeenCalledTimes(
          2,
        );

        expect(
          new Set(
            executedSessionIds,
          ),
        ).toEqual(
          new Set([
            firstSessionId,
            secondSessionId,
          ]),
        );

        scheduler.close();
      },
    );

    it(
      "allows an explicit request without a room mutation",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ) =>
              createCycleResult(
                options.sessionId,
                options.roomStore,
              ),
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
          });

        const room =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        scheduler.request(
          sessionId,
        );

        expect(
          executeCycle,
        ).not.toHaveBeenCalled();

        await flushMicrotasks();

        expect(
          executeCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          executeCycle,
        ).toHaveBeenCalledWith({
          roomStore,
          sessionId,
        });

        scheduler.close();
      },
    );

    it(
      "coalesces repeated explicit requests for the same session",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ) =>
              createCycleResult(
                options.sessionId,
                options.roomStore,
              ),
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
          });

        const room =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        scheduler.request(
          sessionId,
        );

        scheduler.request(
          sessionId,
        );

        scheduler.request(
          sessionId,
        );

        await flushMicrotasks();

        expect(
          executeCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        scheduler.close();
      },
    );

    it(
      "does not automatically reschedule after COMMAND_LIMIT_REACHED",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ): BotCycleExecutionResult => {
              const room =
                options.roomStore.get(
                  options.sessionId,
                );

              if (
                room ===
                undefined
              ) {
                throw new Error(
                  "Room missing during scheduler test.",
                );
              }

              return Object.freeze({
                status:
                  "COMMAND_LIMIT_REACHED",

                commandsApplied:
                  32,

                initialRevision:
                  room.revision,

                finalRevision:
                  room.revision +
                  32,

                lastPlayer:
                  "PLAYER_0",
              });
            },
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
          });

        const room =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        scheduler.request(
          sessionId,
        );

        await flushMicrotasks();
        await flushMicrotasks();

        expect(
          executeCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        scheduler.close();
      },
    );

    it(
      "cancels pending execution when closed",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ) =>
              createCycleResult(
                options.sessionId,
                options.roomStore,
              ),
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
          });

        const room =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        scheduler.request(
          sessionId,
        );

        scheduler.close();

        await flushMicrotasks();

        expect(
          executeCycle,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "unsubscribes from future room mutations when closed",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const executeCycle =
          vi.fn(
            (
              options: {
                readonly roomStore:
                  LiveRoomStore;

                readonly sessionId:
                  string;
              },
            ) =>
              createCycleResult(
                options.sessionId,
                options.roomStore,
              ),
          );

        const scheduler =
          createBotCycleScheduler({
            roomStore,
            executeCycle,
          });

        scheduler.close();

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

        await flushMicrotasks();

        expect(
          executeCycle,
        ).not.toHaveBeenCalled();
      },
    );
  },
);