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

function waitForOpen(
  socket:
    WebSocket,
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
  socket:
    WebSocket,
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
            error:
              unknown
          ) {
            reject(
              error,
            );
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
  socket:
    WebSocket,
): Promise<{
  readonly code:
    number;

  readonly reason:
    string;
}> {
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

  sessionId:
    string,

  participantId:
    string,
): WebSocket {
  return new WebSocket(
    `${running.wsUrl}?sessionId=${sessionId}&participantId=${participantId}`,
  );
}

function sendCommand(
  socket:
    WebSocket,

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

function sendResync(
  socket:
    WebSocket,

  knownRevision:
    number,
): void {
  socket.send(
    JSON.stringify({
      protocolVersion:
        1,

      type:
        "RESYNC",

      knownRevision,
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
        ).toBe(
          1,
        );

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
        ).toBe(
          5,
        );

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
        ).toBe(
          6,
        );

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
      "rejects a human COMMAND when the participant seat is BOT-controlled",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        running.roomStore
          .transferSeatControlToBot({
            sessionId,

            player:
              "PLAYER_1",
          });

        expect(
          running.roomStore
            .getSeatControl(
              sessionId,
              "PLAYER_1",
            ),
        ).toEqual({
          player:
            "PLAYER_1",

          controller:
            "BOT",
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
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

        const initial =
          await initialPromise;

        expect(
          initial.type,
        ).toBe(
          "SNAPSHOT",
        );

        expect(
          initial.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          initial.snapshot.revision,
        ).toBe(
          5,
        );

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

        const error =
          await errorPromise;

        expect(
          error,
        ).toEqual({
          protocolVersion:
            1,

          type:
            "ERROR",

          code:
            "COMMAND_REJECTED",
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        const resyncPromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        sendResync(
          socket,
          5,
        );

        const resync =
          await resyncPromise;

        expect(
          resync.type,
        ).toBe(
          "SNAPSHOT",
        );

        expect(
          resync.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          resync.snapshot.revision,
        ).toBe(
          5,
        );

        expect(
          socket.readyState,
        ).toBe(
          WebSocket.OPEN,
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
        ).toBe(
          6,
        );

        expect(
          update2.snapshot.revision,
        ).toBe(
          6,
        );

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
        ).toBe(
          5,
        );

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
        ).toBe(
          5,
        );

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

        const close =
          await closePromise;

        expect(
          close.code,
        ).toBe(
          1008,
        );
      },
    );

    it(
      "resynchronizes explicitly with the current authoritative snapshot",
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

        const resyncPromise =
          waitForMessage<SnapshotEnvelope>(
            socket,
          );

        sendResync(
          socket,
          2,
        );

        const resync =
          await resyncPromise;

        expect(
          resync.type,
        ).toBe(
          "SNAPSHOT",
        );

        expect(
          resync.snapshot.revision,
        ).toBe(
          5,
        );

        expect(
          resync.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          resync.snapshot.game.match
            .public.biddingPlayer,
        ).toBe(
          "PLAYER_1",
        );

        socket.close();
      },
    );

    it(
      "reconnects with the latest authoritative snapshot after missing updates",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const firstSocket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        const initialPromise =
          waitForMessage<SnapshotEnvelope>(
            firstSocket,
          );

        await waitForOpen(
          firstSocket,
        );

        const initial =
          await initialPromise;

        expect(
          initial.snapshot.revision,
        ).toBe(
          5,
        );

        const closePromise =
          waitForClose(
            firstSocket,
          );

        firstSocket.close();

        await closePromise;

        running.roomStore.applyCommand({
          sessionId,

          participantId:
            "participant-1",

          document: {
            formatVersion:
              1,

            engineVersion:
              "0.1.0",

            sessionId,

            expectedRevision:
              5,

            command: {
              type:
                "PASS",
            },
          },
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          6,
        );

        const secondSocket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        const reconnectPromise =
          waitForMessage<SnapshotEnvelope>(
            secondSocket,
          );

        await waitForOpen(
          secondSocket,
        );

        const reconnect =
          await reconnectPromise;

        expect(
          reconnect.snapshot.revision,
        ).toBe(
          6,
        );

        expect(
          reconnect.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          reconnect.snapshot.game.match
            .public.biddingPlayer,
        ).toBe(
          "PLAYER_2",
        );

        expect(
          reconnect.snapshot.game.actions
            .mode,
        ).toBe(
          "WAIT",
        );

        secondSocket.close();
      },
    );

    it(
      "replaces an older simultaneous connection for the same participant",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRoom(
            running.roomStore,
          );

        const oldSocket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        const oldInitialPromise =
          waitForMessage<SnapshotEnvelope>(
            oldSocket,
          );

        await waitForOpen(
          oldSocket,
        );

        await oldInitialPromise;

        const oldClosePromise =
          waitForClose(
            oldSocket,
          );

        const newSocket =
          createSocket(
            running,
            sessionId,
            "participant-1",
          );

        const newInitialPromise =
          waitForMessage<SnapshotEnvelope>(
            newSocket,
          );

        await waitForOpen(
          newSocket,
        );

        const [
          oldClose,
          newInitial,
        ] =
          await Promise.all([
            oldClosePromise,
            newInitialPromise,
          ]);

        expect(
          oldClose.code,
        ).toBe(
          4001,
        );

        expect(
          oldClose.reason,
        ).toBe(
          "Connection replaced by a newer connection",
        );

        expect(
          newInitial.snapshot.revision,
        ).toBe(
          5,
        );

        expect(
          newInitial.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        const updatePromise =
          waitForMessage<SnapshotEnvelope>(
            newSocket,
          );

        sendCommand(
          newSocket,
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
          update.snapshot.revision,
        ).toBe(
          6,
        );

        expect(
          update.snapshot.game.actions
            .mode,
        ).toBe(
          "WAIT",
        );

        newSocket.close();
      },
    );
  },
);