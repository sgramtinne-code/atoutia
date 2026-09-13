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
  createAbsencePolicy,
} from "../src/absencePolicy.js";

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

  readonly absentSinceMs:
    number | null;

  readonly eligibleAtMs:
    number | null;

  readonly remainingMs:
    number | null;
}

interface ConnectionState {
  readonly player:
    string;

  readonly state:
    "CONNECTED"
    | "RECONNECTING"
    | "ABSENT";
}

interface PresenceEnvelope {
  readonly type:
    "PRESENCE";

  readonly connectionStates:
    readonly ConnectionState[];

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
        100_000,

      heartbeatCheckIntervalMs:
        5,

      reconnectGraceMs:
        1_000,

      absencePolicy:
        createAbsencePolicy({
          mode:
            "CASUAL",

          resolutionDelayMs:
            1_000,
        }),
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

function getAbsence(
  message:
    PresenceEnvelope,
  player:
    string,
): AbsenceState | undefined {
  return message
    .absences
    .find(
      (
        absence,
      ) =>
        absence.player ===
        player,
    );
}

function getConnectionState(
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
  "realtime absence policy",
  () => {
    it(
      "exposes NOT_ABSENT while a participant is connected",
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

        const presencePromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            socket,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "NOT_ABSENT",
          );

        await waitForOpen(
          socket,
        );

        const presence =
          await presencePromise;

        expect(
          getConnectionState(
            presence,
            "PLAYER_1",
          )?.state,
        ).toBe(
          "CONNECTED",
        );

        expect(
          getAbsence(
            presence,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          status:
            "NOT_ABSENT",

          mode:
            "CASUAL",

          absentSinceMs:
            null,

          eligibleAtMs:
            null,

          remainingMs:
            null,
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
      "exposes WAITING when reconnect grace has expired",
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

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await targetClosePromise;

        const waitingPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getConnectionState(
                message,
                "PLAYER_1",
              )?.state ===
                "ABSENT" &&
              getAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "WAITING",
          );

        currentTime =
          2_000;

        const waiting =
          await waitingPromise;

        expect(
          getAbsence(
            waiting,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          status:
            "WAITING",

          mode:
            "CASUAL",

          absentSinceMs:
            2_000,

          eligibleAtMs:
            3_000,

          remainingMs:
            1_000,
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
      "broadcasts ELIGIBLE automatically when the absence deadline is reached",
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

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await targetClosePromise;

        const waitingPromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "WAITING",
          );

        currentTime =
          2_000;

        await waitingPromise;

        const eligiblePromise =
          waitForMessageMatching<
            PresenceEnvelope
          >(
            observer,
            (
              message,
            ) =>
              message.type ===
                "PRESENCE" &&
              getAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "ELIGIBLE",
          );

        currentTime =
          3_000;

        const eligible =
          await eligiblePromise;

        expect(
          getAbsence(
            eligible,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          status:
            "ELIGIBLE",

          mode:
            "CASUAL",

          absentSinceMs:
            2_000,

          eligibleAtMs:
            3_000,

          remainingMs:
            0,
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
      "returns to NOT_ABSENT after reconnecting even after eligibility",
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

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await targetClosePromise;

        currentTime =
          2_000;

        await waitForMessageMatching<
          PresenceEnvelope
        >(
          observer,
          (
            message,
          ) =>
            message.type ===
              "PRESENCE" &&
            getAbsence(
              message,
              "PLAYER_1",
            )?.status ===
              "WAITING",
        );

        currentTime =
          3_000;

        await waitForMessageMatching<
          PresenceEnvelope
        >(
          observer,
          (
            message,
          ) =>
            message.type ===
              "PRESENCE" &&
            getAbsence(
              message,
              "PLAYER_1",
            )?.status ===
              "ELIGIBLE",
        );

        currentTime =
          3_100;

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
              getConnectionState(
                message,
                "PLAYER_1",
              )?.state ===
                "CONNECTED" &&
              getAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "NOT_ABSENT",
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

        const presence =
          await reconnectedPromise;

        expect(
          getAbsence(
            presence,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          status:
            "NOT_ABSENT",

          mode:
            "CASUAL",

          absentSinceMs:
            null,

          eligibleAtMs:
            null,

          remainingMs:
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
  },
);