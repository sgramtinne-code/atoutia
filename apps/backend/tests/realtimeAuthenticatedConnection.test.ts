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
  AuthService,
} from "../src/authService.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createParticipantIdForAccount,
} from "../src/participantIdentity.js";

import {
  createRealtimeServer,
  type RealtimeServer,
} from "../src/realtime.js";

import {
  createBackendServer,
} from "../src/server.js";

import {
  SQLiteAuthRepository,
} from "../src/sqliteAuthRepository.js";

interface RunningServer {
  readonly server:
    Server;

  readonly realtime:
    RealtimeServer;

  readonly repository:
    SQLiteAuthRepository;

  readonly authService:
    AuthService;

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

async function startServer(
  withAuthentication:
    boolean = true,
): Promise<RunningServer> {
  const repository =
    new SQLiteAuthRepository({
      databasePath:
        ":memory:",
    });

  const authService =
    new AuthService({
      repository,

      now:
        () =>
          600_000,

      sessionDurationMs:
        60_000,
    });

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

      ...(withAuthentication
        ? {
            authService,
          }
        : {}),
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
    repository.close();

    throw new Error(
      "Expected TCP server address.",
    );
  }

  const {
    port,
  } =
    address as
      AddressInfo;

  const running:
    RunningServer = {
      server,
      realtime,
      repository,
      authService,
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
    running.server.listening
  ) {
    await new Promise<void>(
      (
        resolve,
      ) => {
        running.server.close(
          () => {
            resolve();
          },
        );
      },
    );
  }

  running.repository.close();
}

function createStartedRoom(
  roomStore:
    LiveRoomStore,

  participantId:
    string,
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
    participantId,
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

  path:
    string,

  token?:
    string,
): WebSocket {
  return new WebSocket(
    `${running.wsUrl}${path}`,

    token ===
      undefined
      ? undefined
      : {
          headers: {
            authorization:
              `Bearer ${token}`,
          },
        },
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
          data:
            RawData,
        ) => {
          try {
            resolve(
              JSON.parse(
                data.toString(),
              ) as T,
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
  "authenticated realtime connection",
  () => {
    it(
      "requires bearer authentication when auth is enabled",
      async () => {
        const running =
          await startServer();

        const room =
          running.roomStore.create();

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const socket =
          createSocket(
            running,
            `?sessionId=${sessionId}`,
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
          close,
        ).toEqual({
          code:
            1008,

          reason:
            "WebSocket authentication required",
        });
      },
    );

    it(
      "rejects an invalid bearer token",
      async () => {
        const running =
          await startServer();

        const room =
          running.roomStore.create();

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const socket =
          createSocket(
            running,
            `?sessionId=${sessionId}`,
            "atk1_invalid",
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
          close,
        ).toEqual({
          code:
            1008,

          reason:
            "Invalid WebSocket authentication",
        });
      },
    );

    it(
      "rejects a client supplied participant identifier when auth is enabled",
      async () => {
        const running =
          await startServer();

        const account =
          running.authService
            .createAccount();

        const authSession =
          running.authService
            .createSession(
              account.accountId,
            );

        const room =
          running.roomStore.create();

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const socket =
          createSocket(
            running,
            `?sessionId=${sessionId}&participantId=client-controlled`,
            authSession.token,
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
          close,
        ).toEqual({
          code:
            1008,

          reason:
            "Invalid WebSocket connection parameters",
        });
      },
    );

    it(
      "connects with the participant identity derived from the authenticated account",
      async () => {
        const running =
          await startServer();

        const account =
          running.authService
            .createAccount();

        const authSession =
          running.authService
            .createSession(
              account.accountId,
            );

        const participantId =
          createParticipantIdForAccount(
            account.accountId,
          );

        const sessionId =
          createStartedRoom(
            running.roomStore,
            participantId,
          );

        const socket =
          createSocket(
            running,
            `?sessionId=${sessionId}`,
            authSession.token,
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
      "does not let another authenticated account impersonate a seated participant",
      async () => {
        const running =
          await startServer();

        const owner =
          running.authService
            .createAccount();

        const ownerParticipantId =
          createParticipantIdForAccount(
            owner.accountId,
          );

        const attacker =
          running.authService
            .createAccount();

        const attackerSession =
          running.authService
            .createSession(
              attacker.accountId,
            );

        const sessionId =
          createStartedRoom(
            running.roomStore,
            ownerParticipantId,
          );

        const socket =
          createSocket(
            running,
            `?sessionId=${sessionId}`,
            attackerSession.token,
          );

        const messagePromise =
          waitForMessage<ErrorEnvelope>(
            socket,
          );

        const closePromise =
          waitForClose(
            socket,
          );

        await waitForOpen(
          socket,
        );

        const message =
          await messagePromise;

        const close =
          await closePromise;

        expect(
          message,
        ).toEqual({
          protocolVersion:
            1,

          type:
            "ERROR",

          code:
            "PARTICIPANT_FORBIDDEN",
        });

        expect(
          close,
        ).toEqual({
          code:
            1008,

          reason:
            "Participant is not authorized for this room",
        });
      },
    );

    it(
      "keeps the legacy participant query parameter when auth is not configured",
      async () => {
        const running =
          await startServer(
            false,
          );

        const sessionId =
          createStartedRoom(
            running.roomStore,
            "legacy-participant",
          );

        const socket =
          createSocket(
            running,
            `?sessionId=${sessionId}&participantId=legacy-participant`,
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
          message.type,
        ).toBe(
          "SNAPSHOT",
        );

        expect(
          message.snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        socket.close();
      },
    );
  },
);