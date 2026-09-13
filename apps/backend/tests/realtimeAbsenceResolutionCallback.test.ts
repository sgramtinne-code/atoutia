import type {
  Server,
} from "node:http";

import type {
  AddressInfo,
} from "node:net";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  WebSocket,
} from "ws";

import {
  createAbsenceResolutionCoordinator,
  type AbsenceResolutionCoordinator,
} from "../src/absenceResolutionCoordinator.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createRealtimeServer,
  type RealtimeAbsenceResolutionPendingEvent,
  type RealtimeServer,
} from "../src/realtime.js";

import {
  createBackendServer,
} from "../src/server.js";

type MatchMode =
  "PRIVATE"
  | "CASUAL"
  | "RANKED";

interface RunningServer {
  readonly server:
    Server;

  readonly realtime:
    RealtimeServer;

  readonly roomStore:
    LiveRoomStore;

  readonly wsUrl:
    string;

  readonly coordinator:
    AbsenceResolutionCoordinator | null;
}

interface StartServerOptions {
  readonly onAbsenceResolutionPending?:
    (
      event:
        RealtimeAbsenceResolutionPendingEvent,
    ) => void;

  readonly useCoordinator?:
    boolean;

  readonly requestBotCycle?:
    (
      sessionId:
        string,
    ) => void;
}

const runningServers:
  RunningServer[] = [];

async function startServer(
  now:
    () => number,

  options?:
    StartServerOptions,
): Promise<RunningServer> {
  const roomStore =
    new LiveRoomStore();

  const coordinator =
    options?.useCoordinator ===
    true
      ? createAbsenceResolutionCoordinator({
          roomStore,

          requestBotCycle:
            options.requestBotCycle ??
            (() => {}),
        })
      : null;

  const fallbackOnAbsenceResolutionPending =
    (
      event:
        RealtimeAbsenceResolutionPendingEvent,
    ): void => {
      coordinator?.request(
        event.sessionId,
        event.player,
      );
    };

  const onAbsenceResolutionPending =
    options?.onAbsenceResolutionPending ??
    fallbackOnAbsenceResolutionPending;

  const server =
    createBackendServer({
      roomStore,
    });

  const realtime =
    createRealtimeServer({
      server,
      roomStore,
      now,

      heartbeatTimeoutMs:
        1_000_000,

      heartbeatCheckIntervalMs:
        5,

      reconnectGraceMs:
        1_000,

      onAbsenceResolutionPending,
    });

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      server.once(
        "error",
        reject,
      );

      server.listen(
        0,
        "127.0.0.1",
        () => {
          resolve();
        },
      );
    },
  );

  const address =
    server.address();

  if (
    address ===
      null ||
    typeof address ===
      "string"
  ) {
    throw new Error(
      "Expected TCP server address.",
    );
  }

  const port =
    (
      address as
        AddressInfo
    ).port;

  const running:
    RunningServer = {
      server,
      realtime,
      roomStore,
      coordinator,

      wsUrl:
        `ws://127.0.0.1:${port}/ws`,
    };

  runningServers.push(
    running,
  );

  return running;
}

async function stopServer(
  running:
    RunningServer,
): Promise<void> {
  running.coordinator?.close();

  await running.realtime.close();

  if (
    !running.server.listening
  ) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      running.server.close(
        (
          error,
        ) => {
          if (
            error !==
            undefined
          ) {
            reject(
              error,
            );

            return;
          }

          resolve();
        },
      );
    },
  );
}

function createRoomWithParticipant(
  roomStore:
    LiveRoomStore,

  mode:
    MatchMode,

  participantId:
    string,
): string {
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

    participantId,
  });

  return sessionId;
}

function createSocket(
  running:
    RunningServer,

  sessionId:
    string,

  participantId:
    string,
): WebSocket {
  return new WebSocket(
    `${running.wsUrl}?sessionId=${sessionId}&participantId=${participantId}`,
  );
}

function waitForOpen(
  socket:
    WebSocket,
): Promise<void> {
  return new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      socket.once(
        "open",
        () => {
          resolve();
        },
      );

      socket.once(
        "error",
        reject,
      );
    },
  );
}

function waitForClose(
  socket:
    WebSocket,
): Promise<void> {
  return new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      socket.once(
        "close",
        () => {
          resolve();
        },
      );

      socket.once(
        "error",
        reject,
      );
    },
  );
}

async function closeSocket(
  socket:
    WebSocket,
): Promise<void> {
  const closePromise =
    waitForClose(
      socket,
    );

  socket.close();

  await closePromise;
}

async function waitForCondition(
  predicate:
    () => boolean,

  description:
    string,
): Promise<void> {
  const deadline =
    Date.now() +
    1_000;

  while (
    !predicate()
  ) {
    if (
      Date.now() >=
      deadline
    ) {
      throw new Error(
        `Timed out waiting for ${description}.`,
      );
    }

    await new Promise<void>(
      (
        resolve,
      ) => {
        setTimeout(
          resolve,
          5,
        );
      },
    );
  }
}

async function waitBriefly():
  Promise<void> {
  await new Promise<void>(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        30,
      );
    },
  );
}

afterEach(
  async () => {
    const servers =
      runningServers.splice(
        0,
      );

    for (
      const running
      of servers
    ) {
      await stopServer(
        running,
      );
    }
  },
);

describe(
  "realtime absence resolution pending callback",
  () => {
    it(
      "notifies exactly once when a CASUAL BOT_TAKEOVER becomes pending",
      async () => {
        let currentTime =
          1_000;

        const events:
          RealtimeAbsenceResolutionPendingEvent[] =
            [];

        const running =
          await startServer(
            () =>
              currentTime,

            {
              onAbsenceResolutionPending:
                (
                  event,
                ) => {
                  events.push(
                    event,
                  );
                },
            },
          );

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "CASUAL",
            "casual-participant",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "casual-participant",
          );

        await waitForOpen(
          socket,
        );

        await closeSocket(
          socket,
        );

        currentTime =
          182_000;

        await waitForCondition(
          () =>
            events.length ===
            1,

          "CASUAL pending callback",
        );

        expect(
          events,
        ).toEqual([
          {
            sessionId,

            player:
              "PLAYER_0",
          },
        ]);

        expect(
          running.roomStore
            .getAbsenceResolution(
              sessionId,
              "PLAYER_0",
            ),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "BOT_TAKEOVER",

          status:
            "PENDING",
        });

        await waitBriefly();

        expect(
          events,
        ).toHaveLength(
          1,
        );
      },
    );

    it(
      "wires CASUAL pending resolution to automatic BOT takeover",
      async () => {
        let currentTime =
          1_000;

        const requestBotCycle =
          vi.fn();

        const running =
          await startServer(
            () =>
              currentTime,

            {
              useCoordinator:
                true,

              requestBotCycle,
            },
          );

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "CASUAL",
            "casual-participant",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "casual-participant",
          );

        await waitForOpen(
          socket,
        );

        await closeSocket(
          socket,
        );

        currentTime =
          182_000;

        await waitForCondition(
          () =>
            running.roomStore
              .getAbsenceResolution(
                sessionId,
                "PLAYER_0",
              )?.status ===
            "RESOLVED_BY_BOT",

          "CASUAL automatic BOT takeover",
        );

        expect(
          running.roomStore.getSeatControl(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          controller:
            "BOT",
        });

        expect(
          requestBotCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          requestBotCycle,
        ).toHaveBeenCalledWith(
          sessionId,
        );

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );
      },
    );

    it(
      "keeps PRIVATE MANUAL_ONLY pending when the coordinator is wired",
      async () => {
        let currentTime =
          1_000;

        const requestBotCycle =
          vi.fn();

        const running =
          await startServer(
            () =>
              currentTime,

            {
              useCoordinator:
                true,

              requestBotCycle,
            },
          );

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "PRIVATE",
            "private-participant",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "private-participant",
          );

        await waitForOpen(
          socket,
        );

        await closeSocket(
          socket,
        );

        currentTime =
          2_000;

        await waitForCondition(
          () =>
            running.roomStore
              .getAbsenceResolution(
                sessionId,
                "PLAYER_0",
              )?.action ===
            "MANUAL_ONLY",

          "PRIVATE pending manual resolution",
        );

        await waitBriefly();

        expect(
          running.roomStore
            .getAbsenceResolution(
              sessionId,
              "PLAYER_0",
            ),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",

          status:
            "PENDING",
        });

        expect(
          running.roomStore.getSeatControl(
            sessionId,
            "PLAYER_0",
          ).controller,
        ).toBe(
          "HUMAN",
        );

        expect(
          requestBotCycle,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "keeps RANKED TEAM_FORFEIT pending when the coordinator is wired",
      async () => {
        let currentTime =
          1_000;

        const requestBotCycle =
          vi.fn();

        const running =
          await startServer(
            () =>
              currentTime,

            {
              useCoordinator:
                true,

              requestBotCycle,
            },
          );

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "RANKED",
            "ranked-participant",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "ranked-participant",
          );

        await waitForOpen(
          socket,
        );

        await closeSocket(
          socket,
        );

        currentTime =
          182_000;

        await waitForCondition(
          () =>
            running.roomStore
              .getAbsenceResolution(
                sessionId,
                "PLAYER_0",
              )?.action ===
            "TEAM_FORFEIT",

          "RANKED pending forfeit resolution",
        );

        await waitBriefly();

        expect(
          running.roomStore
            .getAbsenceResolution(
              sessionId,
              "PLAYER_0",
            ),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "TEAM_FORFEIT",

          status:
            "PENDING",
        });

        expect(
          running.roomStore.getSeatControl(
            sessionId,
            "PLAYER_0",
          ).controller,
        ).toBe(
          "HUMAN",
        );

        expect(
          requestBotCycle,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "does not notify again while the same pending resolution remains stored",
      async () => {
        let currentTime =
          1_000;

        const onAbsenceResolutionPending =
          vi.fn();

        const running =
          await startServer(
            () =>
              currentTime,

            {
              onAbsenceResolutionPending,
            },
          );

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "CASUAL",
            "casual-participant",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "casual-participant",
          );

        await waitForOpen(
          socket,
        );

        await closeSocket(
          socket,
        );

        currentTime =
          182_000;

        await waitForCondition(
          () =>
            onAbsenceResolutionPending
              .mock.calls.length ===
            1,

          "first CASUAL pending callback",
        );

        currentTime =
          300_000;

        await waitBriefly();

        expect(
          onAbsenceResolutionPending,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );
  },
);