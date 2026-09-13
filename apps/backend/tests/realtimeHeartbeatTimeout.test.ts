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
  HEARTBEAT_TIMEOUT_CLOSE_CODE,
  HEARTBEAT_TIMEOUT_CLOSE_REASON,
  createRealtimeServer,
  type RealtimeServer,
} from "../src/realtime.js";

import {
  createBackendServer,
} from "../src/server.js";

interface PresencePlayer {
  readonly player:
    string;

  readonly connected:
    boolean;

  readonly lastSeenAtMs:
    number | null;
}

interface PresenceEnvelope {
  readonly protocolVersion:
    number;

  readonly type:
    "PRESENCE";

  readonly sessionId:
    string;

  readonly players:
    readonly PresencePlayer[];
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

interface CloseDetails {
  readonly code:
    number;

  readonly reason:
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
        1_000,

      heartbeatCheckIntervalMs:
        5,
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
): Promise<CloseDetails> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      socket.once(
        "close",
        (
          code,
          reason,
        ) => {
          resolve({
            code,

            reason:
              reason.toString(),
          });
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

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        milliseconds,
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
  "realtime heartbeat timeout",
  () => {
    it(
      "keeps a connection open before the timeout threshold",
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

        const socket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        await waitForOpen(
          socket,
        );

        currentTime =
          1_999;

        await sleep(
          30,
        );

        expect(
          socket.readyState,
        ).toBe(
          WebSocket.OPEN,
        );

        const closePromise =
          waitForClose(
            socket,
          );

        socket.close();

        await closePromise;
      },
    );

    it(
      "closes a silent connection when the heartbeat deadline is reached",
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

        const socket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        await waitForOpen(
          socket,
        );

        const closePromise =
          waitForClose(
            socket,
          );

        currentTime =
          2_000;

        const closed =
          await closePromise;

        expect(
          closed,
        ).toEqual({
          code:
            HEARTBEAT_TIMEOUT_CLOSE_CODE,

          reason:
            HEARTBEAT_TIMEOUT_CLOSE_REASON,
        });
      },
    );

    it(
      "refreshes the heartbeat deadline after a HEARTBEAT message",
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

        const socket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        const initialPresencePromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            socket,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              message.players.some(
                (
                  player,
                ) =>
                  player.player ===
                    "PLAYER_1" &&
                  player.connected &&
                  player.lastSeenAtMs ===
                    1_000,
              ),
          );

        await waitForOpen(
          socket,
        );

        await initialPresencePromise;

        currentTime =
          1_900;

        const heartbeatPresencePromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            socket,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              message.players.some(
                (
                  player,
                ) =>
                  player.player ===
                    "PLAYER_1" &&
                  player.connected &&
                  player.lastSeenAtMs ===
                    1_900,
              ),
          );

        socket.send(
          JSON.stringify({
            protocolVersion:
              1,

            type:
              "HEARTBEAT",
          }),
        );

        await heartbeatPresencePromise;

        currentTime =
          2_899;

        await sleep(
          30,
        );

        expect(
          socket.readyState,
        ).toBe(
          WebSocket.OPEN,
        );

        const closePromise =
          waitForClose(
            socket,
          );

        currentTime =
          2_900;

        const closed =
          await closePromise;

        expect(
          closed.code,
        ).toBe(
          HEARTBEAT_TIMEOUT_CLOSE_CODE,
        );

        expect(
          closed.reason,
        ).toBe(
          HEARTBEAT_TIMEOUT_CLOSE_REASON,
        );
      },
    );

    it(
      "broadcasts disconnection after timeout and accepts a reconnect",
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

        const targetConnectedPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              message.players.some(
                (
                  player,
                ) =>
                  player.player ===
                    "PLAYER_1" &&
                  player.connected &&
                  player.lastSeenAtMs ===
                    1_000,
              ),
          );

        await waitForOpen(
          observer,
        );

        await targetConnectedPromise;

        const disconnectedPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              message.players.some(
                (
                  player,
                ) =>
                  player.player ===
                    "PLAYER_1" &&
                  !player.connected &&
                  player.lastSeenAtMs ===
                    1_000,
              ),
          );

        const targetClosePromise =
          waitForClose(
            target,
          );

        currentTime =
          2_000;

        const disconnected =
          await disconnectedPromise;

        const targetClosed =
          await targetClosePromise;

        expect(
          disconnected.players,
        ).toContainEqual({
          player:
            "PLAYER_1",

          connected:
            false,

          lastSeenAtMs:
            1_000,
        });

        expect(
          targetClosed,
        ).toEqual({
          code:
            HEARTBEAT_TIMEOUT_CLOSE_CODE,

          reason:
            HEARTBEAT_TIMEOUT_CLOSE_REASON,
        });

        currentTime =
          2_100;

        const reconnectedPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              message.players.some(
                (
                  player,
                ) =>
                  player.player ===
                    "PLAYER_1" &&
                  player.connected &&
                  player.lastSeenAtMs ===
                    2_100,
              ),
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

        const reconnectedPresence =
          await reconnectedPromise;

        expect(
          reconnectedPresence.players,
        ).toContainEqual({
          player:
            "PLAYER_1",

          connected:
            true,

          lastSeenAtMs:
            2_100,
        });

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
  },
);