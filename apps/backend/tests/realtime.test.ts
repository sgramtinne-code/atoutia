import type {
  AddressInfo,
} from "node:net";

import type {
  Server,
} from "node:http";

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
  readonly server: Server;
  readonly realtime:
    RealtimeServer;
  readonly roomStore:
    LiveRoomStore;
  readonly baseUrl: string;
  readonly wsUrl: string;
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
        () => resolve(),
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
      "Expected TCP server address",
    );
  }

  const {
    port,
  } =
    address as AddressInfo;

  const result:
    RunningServer = {
      server,
      realtime,
      roomStore,

      baseUrl:
        `http://127.0.0.1:${port}`,

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
        () => resolve(),
      );

      socket.once(
        "error",
        reject,
      );
    },
  );
}

function waitForMessage(
  socket: WebSocket,
): Promise<unknown> {
  return new Promise(
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
            resolve(
              JSON.parse(
                data.toString(),
              ),
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
        ) => resolve(
          code,
        ),
      );

      socket.once(
        "error",
        reject,
      );
    },
  );
}

afterEach(
  async () => {
    const servers =
      runningServers.splice(0);

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
      "sends the initial secure snapshot to a seated participant",
      async () => {
        const running =
          await startServer();

        const room =
          running.roomStore.create();

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        running.roomStore
          .claimSeat({
            sessionId,
            expectedRevision: 0,
            player: "PLAYER_0",
            participantId:
              "participant-0",
          });

        const socket =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=participant-0`,
          );

        const messagePromise =
          waitForMessage(
            socket,
          );

        await waitForOpen(
          socket,
        );

        const message =
          await messagePromise as {
            readonly sessionId:
              string;
            readonly revision:
              number;
            readonly player:
              string;
          };

        expect(
          message.sessionId,
        ).toBe(sessionId);

        expect(
          message.revision,
        ).toBe(1);

        expect(
          message.player,
        ).toBe("PLAYER_0");

        socket.close();
      },
    );

    it(
      "pushes a fresh participant-specific snapshot after a room mutation",
      async () => {
        const running =
          await startServer();

        const room =
          running.roomStore.create();

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        running.roomStore
          .claimSeat({
            sessionId,
            expectedRevision: 0,
            player: "PLAYER_0",
            participantId:
              "participant-0",
          });

        const socket =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=participant-0`,
          );

        const initialPromise =
          waitForMessage(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const updatePromise =
          waitForMessage(
            socket,
          );

        running.roomStore
          .claimSeat({
            sessionId,
            expectedRevision: 1,
            player: "PLAYER_1",
            participantId:
              "participant-1",
          });

        const update =
          await updatePromise as {
            readonly revision:
              number;

            readonly player:
              string;

            readonly seats:
              readonly {
                readonly player:
                  string;

                readonly occupied:
                  boolean;
              }[];
          };

        expect(
          update.revision,
        ).toBe(2);

        expect(
          update.player,
        ).toBe("PLAYER_0");

        expect(
          update.seats,
        ).toContainEqual({
          player: "PLAYER_1",
          occupied: true,
        });

        socket.close();
      },
    );

    it(
      "sends different secure snapshots to different participants",
      async () => {
        const running =
          await startServer();

        const room =
          running.roomStore.create();

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        running.roomStore
          .claimSeat({
            sessionId,
            expectedRevision: 0,
            player: "PLAYER_0",
            participantId:
              "participant-0",
          });

        running.roomStore
          .claimSeat({
            sessionId,
            expectedRevision: 1,
            player: "PLAYER_1",
            participantId:
              "participant-1",
          });

        const socket0 =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=participant-0`,
          );

        const socket1 =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=participant-1`,
          );

        const message0Promise =
          waitForMessage(
            socket0,
          );

        const message1Promise =
          waitForMessage(
            socket1,
          );

        await Promise.all([
          waitForOpen(
            socket0,
          ),

          waitForOpen(
            socket1,
          ),
        ]);

        const [
          message0,
          message1,
        ] =
          await Promise.all([
            message0Promise,
            message1Promise,
          ]) as [
            {
              readonly player:
                string;
            },
            {
              readonly player:
                string;
            },
          ];

        expect(
          message0.player,
        ).toBe("PLAYER_0");

        expect(
          message1.player,
        ).toBe("PLAYER_1");

        socket0.close();
        socket1.close();
      },
    );

    it(
      "rejects an unseated participant",
      async () => {
        const running =
          await startServer();

        const room =
          running.roomStore.create();

        const sessionId =
          room.managedRoom.room
            .session.sessionId;

        const socket =
          new WebSocket(
            `${running.wsUrl}?sessionId=${sessionId}&participantId=unknown`,
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