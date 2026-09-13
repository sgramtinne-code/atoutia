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

interface AdjudicationEnvelope {
  readonly protocolVersion:
    number;

  readonly type:
    "ADJUDICATION";

  readonly sessionId:
    string;

  readonly adjudication:
    Record<
      string,
      unknown
    >;
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
        1_000_000,

      heartbeatCheckIntervalMs:
        1_000_000,
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

function createStartedRankedRoom(
  roomStore:
    LiveRoomStore,

  prefix:
    string,
): string {
  const room =
    roomStore.create({
      mode:
        "RANKED",
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
      `${prefix}-0`,
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      `${prefix}-1`,
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      `${prefix}-2`,
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      `${prefix}-3`,
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

function waitForAdjudication(
  socket:
    WebSocket,
): Promise<AdjudicationEnvelope> {
  return new Promise<
    AdjudicationEnvelope
  >(
    (
      resolve,
      reject,
    ) => {
      const onMessage =
        (
          data:
            WebSocket.RawData,
        ): void => {
          try {
            const parsed =
              JSON.parse(
                data.toString(),
              ) as {
                readonly type?:
                  string;
              };

            if (
              parsed.type !==
              "ADJUDICATION"
            ) {
              return;
            }

            cleanup();

            resolve(
              parsed as
                AdjudicationEnvelope,
            );
          } catch (
            error:
              unknown
          ) {
            cleanup();

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
          cleanup();

          reject(
            error,
          );
        };

      const cleanup =
        (): void => {
          socket.off(
            "message",
            onMessage,
          );

          socket.off(
            "error",
            onError,
          );
        };

      socket.on(
        "message",
        onMessage,
      );

      socket.on(
        "error",
        onError,
      );
    },
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
  "realtime adjudication integration",
  () => {
    it(
      "sends the current ACTIVE adjudication on connection",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRankedRoom(
            running.roomStore,
            "initial",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "initial-0",
          );

        const adjudicationPromise =
          waitForAdjudication(
            socket,
          );

        await waitForOpen(
          socket,
        );

        const message =
          await adjudicationPromise;

        expect(
          message,
        ).toEqual({
          protocolVersion:
            1,

          type:
            "ADJUDICATION",

          sessionId,

          adjudication: {
            formatVersion:
              1,

            status:
              "ACTIVE",

            completion:
              null,

            completedAtMs:
              null,
          },
        });

        socket.close();
      },
    );

    it(
      "sends the current adjudication again on RESYNC",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRankedRoom(
            running.roomStore,
            "resync",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "resync-1",
          );

        const initialPromise =
          waitForAdjudication(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const resyncPromise =
          waitForAdjudication(
            socket,
          );

        sendResync(
          socket,
          5,
        );

        const message =
          await resyncPromise;

        expect(
          message.sessionId,
        ).toBe(
          sessionId,
        );

        expect(
          message.adjudication,
        ).toEqual({
          formatVersion:
            1,

          status:
            "ACTIVE",

          completion:
            null,

          completedAtMs:
            null,
        });

        socket.close();
      },
    );

    it(
      "broadcasts a completed FORFEIT adjudication to every connected participant in the room without changing revision",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRankedRoom(
            running.roomStore,
            "broadcast",
          );

        const socket0 =
          createSocket(
            running,
            sessionId,
            "broadcast-0",
          );

        const socket2 =
          createSocket(
            running,
            sessionId,
            "broadcast-2",
          );

        const initial0 =
          waitForAdjudication(
            socket0,
          );

        const initial2 =
          waitForAdjudication(
            socket2,
          );

        await Promise.all([
          waitForOpen(
            socket0,
          ),

          waitForOpen(
            socket2,
          ),
        ]);

        await Promise.all([
          initial0,
          initial2,
        ]);

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        const forfeit0 =
          waitForAdjudication(
            socket0,
          );

        const forfeit2 =
          waitForAdjudication(
            socket2,
          );

        running.roomStore
          .forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_1",

            completedAtMs:
              182_000,
          });

        const [
          message0,
          message2,
        ] =
          await Promise.all([
            forfeit0,
            forfeit2,
          ]);

        const expectedAdjudication = {
          formatVersion:
            1,

          status:
            "COMPLETED",

          completion:
            "FORFEIT",

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "PLAYER_1",

          losingTeam:
            "TEAM_1",

          winningTeam:
            "TEAM_0",

          completedAtMs:
            182_000,
        };

        expect(
          message0.adjudication,
        ).toEqual(
          expectedAdjudication,
        );

        expect(
          message2.adjudication,
        ).toEqual(
          expectedAdjudication,
        );

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        socket0.close();
        socket2.close();
      },
    );

    it(
      "does not broadcast a completed adjudication to another room",
      async () => {
        const running =
          await startServer();

        const targetSessionId =
          createStartedRankedRoom(
            running.roomStore,
            "target",
          );

        const otherSessionId =
          createStartedRankedRoom(
            running.roomStore,
            "other",
          );

        const targetSocket =
          createSocket(
            running,
            targetSessionId,
            "target-0",
          );

        const otherSocket =
          createSocket(
            running,
            otherSessionId,
            "other-0",
          );

        const targetInitial =
          waitForAdjudication(
            targetSocket,
          );

        const otherInitial =
          waitForAdjudication(
            otherSocket,
          );

        await Promise.all([
          waitForOpen(
            targetSocket,
          ),

          waitForOpen(
            otherSocket,
          ),
        ]);

        await Promise.all([
          targetInitial,
          otherInitial,
        ]);

        let otherCompletedReceived =
          false;

        const onOtherMessage =
          (
            data:
              WebSocket.RawData,
          ): void => {
            const parsed =
              JSON.parse(
                data.toString(),
              ) as {
                readonly type?:
                  string;

                readonly adjudication?: {
                  readonly status?:
                    string;
                };
              };

            if (
              parsed.type ===
                "ADJUDICATION" &&
              parsed.adjudication
                ?.status ===
                "COMPLETED"
            ) {
              otherCompletedReceived =
                true;
            }
          };

        otherSocket.on(
          "message",
          onOtherMessage,
        );

        const targetForfeit =
          waitForAdjudication(
            targetSocket,
          );

        running.roomStore
          .forfeitForPlayerAbsence({
            sessionId:
              targetSessionId,

            player:
              "PLAYER_0",

            completedAtMs:
              300_000,
          });

        const targetMessage =
          await targetForfeit;

        expect(
          targetMessage.sessionId,
        ).toBe(
          targetSessionId,
        );

        expect(
          targetMessage.adjudication
            .status,
        ).toBe(
          "COMPLETED",
        );

        await waitBriefly();

        expect(
          otherCompletedReceived,
        ).toBe(
          false,
        );

        expect(
          running.roomStore
            .getAdjudication(
              otherSessionId,
            ),
        ).toEqual({
          status:
            "ACTIVE",

          completion:
            null,

          completedAtMs:
            null,
        });

        otherSocket.off(
          "message",
          onOtherMessage,
        );

        targetSocket.close();
        otherSocket.close();
      },
    );

    it(
      "does not expose private engine state in realtime adjudication messages",
      async () => {
        const running =
          await startServer();

        const sessionId =
          createStartedRankedRoom(
            running.roomStore,
            "secure",
          );

        const socket =
          createSocket(
            running,
            sessionId,
            "secure-3",
          );

        const initialPromise =
          waitForAdjudication(
            socket,
          );

        await waitForOpen(
          socket,
        );

        await initialPromise;

        const forfeitPromise =
          waitForAdjudication(
            socket,
          );

        running.roomStore
          .forfeitForPlayerAbsence({
            sessionId,

            player:
              "PLAYER_3",

            completedAtMs:
              500_000,
          });

        const message =
          await forfeitPromise;

        const serialized =
          JSON.stringify(
            message,
          );

        expect(
          serialized,
        ).not.toContain(
          "baseSeed",
        );

        expect(
          serialized,
        ).not.toContain(
          "hands",
        );

        expect(
          serialized,
        ).not.toContain(
          "participantId",
        );

        socket.close();
      },
    );
  },
);