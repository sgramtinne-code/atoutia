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

interface SnapshotEnvelope {
  readonly protocolVersion:
    number;

  readonly type:
    "SNAPSHOT";

  readonly snapshot: {
    readonly sessionId:
      string;

    readonly revision:
      number;

    readonly player:
      string;

    readonly game: {
      readonly match: {
        readonly public: {
          readonly biddingPlayer:
            string | null;
        };
      };

      readonly actions: {
        readonly mode:
          string;
      };
    };
  };
}

interface ErrorEnvelope {
  readonly protocolVersion:
    number;

  readonly type:
    "ERROR";

  readonly code:
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
    typeof address === "string"
  ) {
    throw new Error(
      "Expected TCP server address.",
    );
  }

  const port =
    (address as AddressInfo).port;

  const result:
    RunningServer = {
      server,

      realtime,

      roomStore,

      wsUrl:
        `ws://127.0.0.1:${port}/ws`,
    };

  runningServers.push(
    result,
  );

  return result;
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

function waitForMessage<T>(
  socket: WebSocket,
): Promise<T> {
  return new Promise<T>(
    (
      resolve,
      reject,
    ) => {
      socket.once(
        "message",
        (
          data,
        ) => {
          try {
            const parsed =
              JSON.parse(
                data.toString(),
              ) as T;

            resolve(
              parsed,
            );
          } catch (
            error: unknown
          ) {
            reject(error);
          }
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
): Promise<number> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      socket.once(
        "close",
        (
          code,
        ) => {
          resolve(
            code,
          );
        },
      );

      socket.once(
        "error",
        reject,
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

function sendCommand(
  socket: WebSocket,
  options: {
    readonly sessionId:
      string;

    readonly expectedRevision:
      number;

    readonly command:
      Readonly<
        Record<
          string,
          unknown
        >
      >;
  },
): void {
  socket.send(
    JSON.stringify({
      protocolVersion:
        1,

      type:
        "COMMAND",

      document: {
        formatVersion:
          1,

        engineVersion:
          "0.1.0",

        sessionId:
          options.sessionId,

        expectedRevision:
          options.expectedRevision,

        command:
          options.command,
      },
    }),
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
  "realtime server",
  () => {
    it(
      "sends a versioned initial secure snapshot",
      async () => {
        const running =
          await startServer();

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

        const messagePromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        await waitForOpen(
          socket,
        );

        const message =
          await messagePromise;

        expect(
          message.protocolVersion,
        ).toBe(1);

        expect(
          message.type,
        ).toBe(
          "SNAPSHOT",
        );

        expect(
          message.snapshot.sessionId,
        ).toBe(
          sessionId,
        );

        expect(
          message.snapshot.revision,
        ).toBe(5);

        expect(
          message.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        socket.close();
      },
    );

    it(
      "applies a PASS command received by WebSocket",
      async () => {
        const running =
          await startServer();

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

        const initialPromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const updatePromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        sendCommand(
          socket,
          {
            sessionId,
            expectedRevision:
              5,

            command: {
              type:
                "PASS",
            },
          },
        );

        const update =
          await updatePromise;

        expect(
          update.type,
        ).toBe(
          "SNAPSHOT",
        );

        expect(
          update.snapshot.revision,
        ).toBe(6);

        expect(
          update.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          update.snapshot.game.match
            .public.biddingPlayer,
        ).toBe(
          "PLAYER_2",
        );

        expect(
          update.snapshot.game.actions
            .mode,
        ).toBe(
          "WAIT",
        );

        socket.close();
      },
    );

    it(
      "broadcasts participant-specific snapshots after a WebSocket command",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const socket1 =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        const socket2 =
          createSocket(
            running,
            sessionId,
            "participant-2",
          );

        const initial1 =
          waitForMessage<SnapshotEnvelope>(
            socket1,
          );

        const initial2 =
          waitForMessage<SnapshotEnvelope>(
            socket2,
          );

        await Promise.all([
          waitForOpen(
            socket1,
          ),
          waitForOpen(
            socket2,
          ),
        ]);

        await Promise.all([
          initial1,
          initial2,
        ]);

        const update1Promise =
          waitForMessage<SnapshotEnvelope>(
            socket1,
          );

        const update2Promise =
          waitForMessage<SnapshotEnvelope>(
            socket2,
          );

        sendCommand(
          socket1,
          {
            sessionId,
            expectedRevision:
              5,

            command: {
              type:
                "PASS",
            },
          },
        );

        const [
          update1,
          update2,
        ] =
          await Promise.all([
            update1Promise,
            update2Promise,
          ]);

        expect(
          update1.snapshot.revision,
        ).toBe(6);

        expect(
          update2.snapshot.revision,
        ).toBe(6);

        expect(
          update1.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          update2.snapshot.player,
        ).toBe(
          "PLAYER_2",
        );

        expect(
          update1.snapshot.game.actions
            .mode,
        ).toBe(
          "WAIT",
        );

        expect(
          update2.snapshot.game.actions
            .mode,
        ).toBe(
          "BID",
        );

        socket1.close();
        socket2.close();
      },
    );

    it(
      "returns INVALID_MESSAGE for invalid JSON",
      async () => {
        const running =
          await startServer();

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

        const initialPromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const errorPromise =
          waitForMessage<ErrorEnvelope>(
            socket,
          );

        socket.send(
          "{",
        );

        const message =
          await errorPromise;

        expect(
          message,
        ).toEqual({
          protocolVersion:
            1,

          type:
            "ERROR",

          code:
            "INVALID_MESSAGE",
        });

        socket.close();
      },
    );

    it(
      "returns SESSION_MISMATCH for another room identifier",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const otherRoom =
          running.roomStore
            .create();

        const otherSessionId =
          otherRoom.managedRoom.room
            .session.sessionId;

        const socket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        const initialPromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const errorPromise =
          waitForMessage<ErrorEnvelope>(
            socket,
          );

        sendCommand(
          socket,
          {
            sessionId:
              otherSessionId,

            expectedRevision:
              5,

            command: {
              type:
                "PASS",
            },
          },
        );

        const message =
          await errorPromise;

        expect(
          message.code,
        ).toBe(
          "SESSION_MISMATCH",
        );

        socket.close();
      },
    );

    it(
      "returns REVISION_MISMATCH for a stale command",
      async () => {
        const running =
          await startServer();

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

        const initialPromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const errorPromise =
          waitForMessage<ErrorEnvelope>(
            socket,
          );

        sendCommand(
          socket,
          {
            sessionId,
            expectedRevision:
              4,

            command: {
              type:
                "PASS",
            },
          },
        );

        const message =
          await errorPromise;

        expect(
          message.code,
        ).toBe(
          "REVISION_MISMATCH",
        );

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(5);

        socket.close();
      },
    );

    it(
      "returns COMMAND_REJECTED when the participant is not the active player",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "participant-0",
          );

        const initialPromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const errorPromise =
          waitForMessage<ErrorEnvelope>(
            socket,
          );

        sendCommand(
          socket,
          {
            sessionId,
            expectedRevision:
              5,

            command: {
              type:
                "PASS",
            },
          },
        );

        const message =
          await errorPromise;

        expect(
          message.code,
        ).toBe(
          "COMMAND_REJECTED",
        );

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(5);

        socket.close();
      },
    );

    it(
      "rejects an unseated participant",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "intruder",
          );

        const closePromise =
          waitForClose(
            socket,
          );

        await waitForOpen(
          socket,
        );

        const code =
          await closePromise;

        expect(
          code,
        ).toBe(1008);
      },
    );
  },
);