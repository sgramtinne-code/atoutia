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
  type RawData,
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

interface AbsenceState {
  readonly player:
    string;

  readonly status:
    "NOT_ABSENT"
    | "WAITING"
    | "ELIGIBLE";

  readonly mode:
    "PRIVATE"
    | "CASUAL"
    | "RANKED";
}

interface PresenceEnvelope {
  readonly type:
    "PRESENCE";

  readonly absences:
    readonly AbsenceState[];
}

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

async function startServer():
  Promise<RunningServer> {
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

      heartbeatTimeoutMs:
        100_000,

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
    "PRIVATE"
    | "CASUAL"
    | "RANKED",

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

function waitForPresenceMode(
  socket:
    WebSocket,

  expectedMode:
    "PRIVATE"
    | "CASUAL"
    | "RANKED",
): Promise<PresenceEnvelope> {
  return new Promise<
    PresenceEnvelope
  >(
    (
      resolve,
      reject,
    ) => {
      const onMessage =
        (
          data:
            RawData,
        ): void => {
          try {
            const value =
              JSON.parse(
                data.toString(),
              ) as PresenceEnvelope;

            if (
              value.type !==
              "PRESENCE"
            ) {
              return;
            }

            const player =
              value.absences.find(
                (
                  absence,
                ) =>
                  absence.player ===
                  "PLAYER_0",
              );

            if (
              player?.mode !==
              expectedMode
            ) {
              return;
            }

            socket.off(
              "message",
              onMessage,
            );

            socket.off(
              "error",
              onError,
            );

            resolve(
              value,
            );
          } catch (
            error:
              unknown
          ) {
            socket.off(
              "message",
              onMessage,
            );

            socket.off(
              "error",
              onError,
            );

            reject(
              error,
            );
          }
        };

      const onError =
        (
          error:
            Error,
        ): void => {
          socket.off(
            "message",
            onMessage,
          );

          reject(
            error,
          );
        };

      socket.on(
        "message",
        onMessage,
      );

      socket.once(
        "error",
        onError,
      );
    },
  );
}

function getPlayerAbsence(
  message:
    PresenceEnvelope,
): AbsenceState | undefined {
  return message.absences.find(
    (
      absence,
    ) =>
      absence.player ===
      "PLAYER_0",
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
  "realtime room mode absence policy",
  () => {
    it(
      "uses PRIVATE policy for a PRIVATE room",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "PRIVATE",
            "private-participant",
          );

        const socket =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=private-participant`,
          );

        const presencePromise =
          waitForPresenceMode(
            socket,
            "PRIVATE",
          );

        await waitForOpen(
          socket,
        );

        const presence =
          await presencePromise;

        expect(
          getPlayerAbsence(
            presence,
          ),
        ).toMatchObject({
          player:
            "PLAYER_0",

          status:
            "NOT_ABSENT",

          mode:
            "PRIVATE",
        });

        const closePromise =
          waitForClose(
            socket,
          );

        socket.close();

        await closePromise;
      },
    );

    it(
      "uses CASUAL policy for a CASUAL room",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "CASUAL",
            "casual-participant",
          );

        const socket =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=casual-participant`,
          );

        const presencePromise =
          waitForPresenceMode(
            socket,
            "CASUAL",
          );

        await waitForOpen(
          socket,
        );

        const presence =
          await presencePromise;

        expect(
          getPlayerAbsence(
            presence,
          ),
        ).toMatchObject({
          player:
            "PLAYER_0",

          status:
            "NOT_ABSENT",

          mode:
            "CASUAL",
        });

        const closePromise =
          waitForClose(
            socket,
          );

        socket.close();

        await closePromise;
      },
    );

    it(
      "uses RANKED policy for a RANKED room",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createRoomWithParticipant(
            running.roomStore,
            "RANKED",
            "ranked-participant",
          );

        const socket =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=ranked-participant`,
          );

        const presencePromise =
          waitForPresenceMode(
            socket,
            "RANKED",
          );

        await waitForOpen(
          socket,
        );

        const presence =
          await presencePromise;

        expect(
          getPlayerAbsence(
            presence,
          ),
        ).toMatchObject({
          player:
            "PLAYER_0",

          status:
            "NOT_ABSENT",

          mode:
            "RANKED",
        });

        const closePromise =
          waitForClose(
            socket,
          );

        socket.close();

        await closePromise;
      },
    );
  },
);