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

interface ConnectionState {
  readonly player:
    string;

  readonly state:
    "CONNECTED"
    | "RECONNECTING"
    | "ABSENT";

  readonly disconnectedAtMs:
    number | null;

  readonly graceDeadlineAtMs:
    number | null;
}

interface PresenceEnvelope {
  readonly type:
    "PRESENCE";

  readonly connectionStates:
    readonly ConnectionState[];
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

async function startServer(
  now:
    () => number,
  heartbeatTimeoutMs:
    number = 100_000,
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

      heartbeatTimeoutMs,

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
    address === null ||
    typeof address ===
      "string"
  ) {
    throw new Error(
      "Expected TCP server address.",
    );
  }

  const port =
    (address as AddressInfo).port;

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
            error !== undefined
          ) {
            reject(error);

            return;
          }

          resolve();
        },
      );
    },
  );
}

function createStartedRoom(
  roomStore:
    LiveRoomStore,
): string {
  const room =
    roomStore.create();

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

  return sessionId;
}

function createSocket(
  running:
    RunningServer,
  sessionId: string,
  participantId: string,
): WebSocket {
  return new WebSocket(
    `${running.wsUrl}?sessionId=${sessionId}&participantId=${participantId}`,
  );
}

function waitForOpen(
  socket: WebSocket,
): Promise<void> {
  return new Promise(
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
  socket: WebSocket,
): Promise<void> {
  return new Promise(
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

function waitForMessageMatching<T>(
  socket: WebSocket,
  predicate:
    (
      value: T,
    ) => boolean,
): Promise<T> {
  return new Promise<T>(
    (
      resolve,
      reject,
    ) => {
      const onMessage =
        (
          data: RawData,
        ): void => {
          try {
            const value =
              JSON.parse(
                data.toString(),
              ) as T;

            if (
              !predicate(
                value,
              )
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
            error: unknown
          ) {
            socket.off(
              "message",
              onMessage,
            );

            socket.off(
              "error",
              onError,
            );

            reject(error);
          }
        };

      const onError =
        (
          error: Error,
        ): void => {
          socket.off(
            "message",
            onMessage,
          );

          reject(error);
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

function getState(
  message:
    PresenceEnvelope,
  player:
    string,
): ConnectionState | undefined {
  return message
    .connectionStates
    .find(
      (
        state,
      ) =>
        state.player ===
        player,
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
  "realtime reconnect grace",
  () => {
    it(
      "marks a disconnected player as RECONNECTING without changing the game revision",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const observer =
          createSocket(
            running,
            sessionId,
            "participant-2",
          );

        await waitForOpen(
          observer,
        );

        const target =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        await waitForOpen(
          target,
        );

        const reconnectingPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) => {
              if (
                message.type !==
                "PRESENCE"
              ) {
                return false;
              }

              return (
                getState(
                  message,
                  "PLAYER_1",
                )?.state ===
                "RECONNECTING"
              );
            },
          );

        const closePromise =
          waitForClose(
            target,
          );

        target.close();

        const presence =
          await reconnectingPromise;

        await closePromise;

        expect(
          getState(
            presence,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          state:
            "RECONNECTING",

          disconnectedAtMs:
            1_000,

          graceDeadlineAtMs:
            2_000,
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        const observerClosePromise =
          waitForClose(
            observer,
          );

        observer.close();

        await observerClosePromise;
      },
    );

    it(
      "marks a player as ABSENT when the reconnect grace expires",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const observer =
          createSocket(
            running,
            sessionId,
            "participant-2",
          );

        await waitForOpen(
          observer,
        );

        const target =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        await waitForOpen(
          target,
        );

        const reconnectingPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getState(
                message,
                "PLAYER_1",
              )?.state ===
                "RECONNECTING",
          );

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await reconnectingPromise;
        await targetClosePromise;

        const absentPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getState(
                message,
                "PLAYER_1",
              )?.state ===
                "ABSENT",
          );

        currentTime =
          2_000;

        const absentPresence =
          await absentPromise;

        expect(
          getState(
            absentPresence,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          state:
            "ABSENT",

          disconnectedAtMs:
            1_000,

          graceDeadlineAtMs:
            2_000,
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        const observerClosePromise =
          waitForClose(
            observer,
          );

        observer.close();

        await observerClosePromise;
      },
    );

    it(
      "returns a player to CONNECTED when reconnecting during the grace period",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const observer =
          createSocket(
            running,
            sessionId,
            "participant-2",
          );

        await waitForOpen(
          observer,
        );

        const target =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        await waitForOpen(
          target,
        );

        const reconnectingPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getState(
                message,
                "PLAYER_1",
              )?.state ===
                "RECONNECTING",
          );

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await reconnectingPromise;
        await targetClosePromise;

        currentTime =
          1_500;

        const connectedPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getState(
                message,
                "PLAYER_1",
              )?.state ===
                "CONNECTED",
          );

        const reconnected =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        await waitForOpen(
          reconnected,
        );

        const connectedPresence =
          await connectedPromise;

        expect(
          getState(
            connectedPresence,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          state:
            "CONNECTED",

          disconnectedAtMs:
            null,

          graceDeadlineAtMs:
            null,
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        const reconnectedClosePromise =
          waitForClose(
            reconnected,
          );

        const observerClosePromise =
          waitForClose(
            observer,
          );

        reconnected.close();
        observer.close();

        await Promise.all([
          reconnectedClosePromise,
          observerClosePromise,
        ]);
      },
    );

    it(
      "enters RECONNECTING after a heartbeat timeout instead of becoming immediately ABSENT",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
            1_000,
          );

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const target =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        await waitForOpen(
          target,
        );

        currentTime =
          1_500;

        const observer =
          createSocket(
            running,
            sessionId,
            "participant-2",
          );

        await waitForOpen(
          observer,
        );

        const reconnectingPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getState(
                message,
                "PLAYER_1",
              )?.state ===
                "RECONNECTING",
          );

        currentTime =
          2_000;

        const reconnectingPresence =
          await reconnectingPromise;

        expect(
          getState(
            reconnectingPresence,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          state:
            "RECONNECTING",

          disconnectedAtMs:
            2_000,

          graceDeadlineAtMs:
            3_000,
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        expect(
          observer.readyState,
        ).toBe(
          WebSocket.OPEN,
        );

        const observerClosePromise =
          waitForClose(
            observer,
          );

        observer.close();

        await observerClosePromise;
      },
    );
  },
);