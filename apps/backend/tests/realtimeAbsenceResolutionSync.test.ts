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
} from "vitest";

import {
  WebSocket,
} from "ws";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createRealtimeServer,
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
}

const runningServers:
  RunningServer[] = [];

async function startServer(
  now:
    () => number,
): Promise<RunningServer> {
  const roomStore =
    new LiveRoomStore();

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
  "realtime absence resolution synchronization",
  () => {
    it(
      "stores PRIVATE MANUAL_ONLY as pending after reconnect grace expires even without an observer",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
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

          "PRIVATE absence resolution synchronization",
        );

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
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );
      },
    );

    it(
      "stores CASUAL BOT_TAKEOVER as pending when the absence becomes eligible",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
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
              )?.action ===
              "BOT_TAKEOVER",

          "CASUAL absence resolution synchronization",
        );

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
      "stores RANKED TEAM_FORFEIT as pending when the absence becomes eligible",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
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

          "RANKED absence resolution synchronization",
        );

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
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );
      },
    );

    it(
      "clears an unresolved pending resolution when the participant reconnects",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "PRIVATE",
            "participant",
          );

        const firstSocket =
          createSocket(
            running,
            sessionId,
            "participant",
          );

        await waitForOpen(
          firstSocket,
        );

        await closeSocket(
          firstSocket,
        );

        currentTime =
          2_000;

        await waitForCondition(
          () =>
            running.roomStore
              .getAbsenceResolution(
                sessionId,
                "PLAYER_0",
              )?.status ===
              "PENDING",

          "pending absence resolution",
        );

        const reconnectedSocket =
          createSocket(
            running,
            sessionId,
            "participant",
          );

        await waitForOpen(
          reconnectedSocket,
        );

        await waitForCondition(
          () =>
            running.roomStore
              .getAbsenceResolution(
                sessionId,
                "PLAYER_0",
              ) ===
              undefined,

          "pending absence resolution cleanup",
        );

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );

        await closeSocket(
          reconnectedSocket,
        );
      },
    );

    it(
      "keeps an already resolved state when the participant reconnects",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "PRIVATE",
            "participant",
          );

        const firstSocket =
          createSocket(
            running,
            sessionId,
            "participant",
          );

        await waitForOpen(
          firstSocket,
        );

        await closeSocket(
          firstSocket,
        );

        currentTime =
          2_000;

        await waitForCondition(
          () =>
            running.roomStore
              .getAbsenceResolution(
                sessionId,
                "PLAYER_0",
              )?.status ===
              "PENDING",

          "pending manual absence resolution",
        );

        running.roomStore
          .resolveAbsenceResolution({
            sessionId,

            player:
              "PLAYER_0",

            status:
              "RESOLVED_MANUALLY",
          });

        const reconnectedSocket =
          createSocket(
            running,
            sessionId,
            "participant",
          );

        await waitForOpen(
          reconnectedSocket,
        );

        await new Promise<void>(
          (
            resolve,
          ) => {
            setTimeout(
              resolve,
              20,
            );
          },
        );

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
            "RESOLVED_MANUALLY",
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );

        await closeSocket(
          reconnectedSocket,
        );
      },
    );
  },
);