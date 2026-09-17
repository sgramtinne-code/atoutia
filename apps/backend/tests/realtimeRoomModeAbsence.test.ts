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

type MatchMode =
  "PRIVATE"
  | "CASUAL"
  | "RANKED";

const runningServers:
  RunningServer[] = [];

async function startServer(
  now:
    () => number =
      Date.now,
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

function createRoomWithObserverAndTarget(
  roomStore:
    LiveRoomStore,

  mode:
    MatchMode,
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

    participantId:
      "observer",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      "target",
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

function waitForPresenceMatching(
  socket:
    WebSocket,

  predicate:
    (
      value:
        PresenceEnvelope,
    ) => boolean,
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

  player:
    string,
): AbsenceState | undefined {
  return message.absences.find(
    (
      absence,
    ) =>
      absence.player ===
        player,
  );
}

function getPlayerConnectionState(
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
          createSocket(
            running,
            sessionId,
            "private-participant",
          );

        const presencePromise =
          waitForPresenceMatching(
            socket,
            (
              message,
            ) =>
              getPlayerAbsence(
                message,
                "PLAYER_0",
              )?.mode ===
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
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          status:
            "NOT_ABSENT",

          mode:
            "PRIVATE",

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
          createSocket(
            running,
            sessionId,
            "casual-participant",
          );

        const presencePromise =
          waitForPresenceMatching(
            socket,
            (
              message,
            ) =>
              getPlayerAbsence(
                message,
                "PLAYER_0",
              )?.mode ===
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
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

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
          createSocket(
            running,
            sessionId,
            "ranked-participant",
          );

        const presencePromise =
          waitForPresenceMatching(
            socket,
            (
              message,
            ) =>
              getPlayerAbsence(
                message,
                "PLAYER_0",
              )?.mode ===
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
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          status:
            "NOT_ABSENT",

          mode:
            "RANKED",

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
      "keeps a PRIVATE absence waiting indefinitely after reconnect grace expires",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createRoomWithObserverAndTarget(
            running.roomStore,
            "PRIVATE",
          );

        const observer =
          createSocket(
            running,
            sessionId,
            "observer",
          );

        await waitForOpen(
          observer,
        );

        const target =
          createSocket(
            running,
            sessionId,
            "target",
          );

        await waitForOpen(
          target,
        );

        const waitingPromise =
          waitForPresenceMatching(
            observer,
            (
              message,
            ) =>
              getPlayerConnectionState(
                message,
                "PLAYER_1",
              )?.state ===
                "ABSENT" &&
              getPlayerAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "WAITING",
          );

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await targetClosePromise;

        currentTime =
          2_000;

        const waiting =
          await waitingPromise;

        expect(
          getPlayerAbsence(
            waiting,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          status:
            "WAITING",

          mode:
            "PRIVATE",

          absentSinceMs:
            2_000,

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
          2,
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
      "makes a CASUAL absence eligible after the default resolution delay",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createRoomWithObserverAndTarget(
            running.roomStore,
            "CASUAL",
          );

        const observer =
          createSocket(
            running,
            sessionId,
            "observer",
          );

        await waitForOpen(
          observer,
        );

        const target =
          createSocket(
            running,
            sessionId,
            "target",
          );

        await waitForOpen(
          target,
        );

        const waitingPromise =
          waitForPresenceMatching(
            observer,
            (
              message,
            ) =>
              getPlayerConnectionState(
                message,
                "PLAYER_1",
              )?.state ===
                "ABSENT" &&
              getPlayerAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "WAITING",
          );

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await targetClosePromise;

        currentTime =
          2_000;

        const waiting =
          await waitingPromise;

        expect(
          getPlayerAbsence(
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
            182_000,

          remainingMs:
            180_000,
        });

        const eligiblePromise =
          waitForPresenceMatching(
            observer,
            (
              message,
            ) =>
              getPlayerAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "ELIGIBLE",
          );

        currentTime =
          182_000;

        const eligible =
          await eligiblePromise;

        expect(
          getPlayerAbsence(
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
            182_000,

          remainingMs:
            0,
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          2,
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
      "makes a RANKED absence eligible after the default resolution delay",
      async () => {
        let currentTime =
          1_000;

        const running =
          await startServer(
            () =>
              currentTime,
          );

        const sessionId =
          createRoomWithObserverAndTarget(
            running.roomStore,
            "RANKED",
          );

        const observer =
          createSocket(
            running,
            sessionId,
            "observer",
          );

        await waitForOpen(
          observer,
        );

        const target =
          createSocket(
            running,
            sessionId,
            "target",
          );

        await waitForOpen(
          target,
        );

        const waitingPromise =
          waitForPresenceMatching(
            observer,
            (
              message,
            ) =>
              getPlayerConnectionState(
                message,
                "PLAYER_1",
              )?.state ===
                "ABSENT" &&
              getPlayerAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "WAITING",
          );

        const targetClosePromise =
          waitForClose(
            target,
          );

        target.close();

        await targetClosePromise;

        currentTime =
          2_000;

        const waiting =
          await waitingPromise;

        expect(
          getPlayerAbsence(
            waiting,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          status:
            "WAITING",

          mode:
            "RANKED",

          absentSinceMs:
            2_000,

          eligibleAtMs:
            182_000,

          remainingMs:
            180_000,
        });

        const eligiblePromise =
          waitForPresenceMatching(
            observer,
            (
              message,
            ) =>
              getPlayerAbsence(
                message,
                "PLAYER_1",
              )?.status ===
                "ELIGIBLE",
          );

        currentTime =
          182_000;

        const eligible =
          await eligiblePromise;

        expect(
          getPlayerAbsence(
            eligible,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          status:
            "ELIGIBLE",

          mode:
            "RANKED",

          absentSinceMs:
            2_000,

          eligibleAtMs:
            182_000,

          remainingMs:
            0,
        });

        expect(
          running.roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          2,
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