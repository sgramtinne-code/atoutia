import {
  mkdirSync,
} from "node:fs";

import {
  dirname,
} from "node:path";

import {
  createAbsenceResolutionCoordinator,
} from "./absenceResolutionCoordinator.js";

import {
  AuthService,
} from "./authService.js";

import {
  createBotCycleScheduler,
} from "./botCycleScheduler.js";

import {
  loadBackendConfig,
} from "./config.js";

import {
  LiveRoomStore,
} from "./liveRoomStore.js";

import {
  createRealtimeServer,
} from "./realtime.js";

import {
  createBackendServer,
} from "./server.js";

import {
  SQLiteAuthRepository,
} from "./sqliteAuthRepository.js";

import {
  SQLiteLiveRoomRepository,
} from "./sqliteLiveRoomRepository.js";

const config =
  loadBackendConfig();

mkdirSync(
  dirname(
    config.databasePath,
  ),
  {
    recursive:
      true,
  },
);

const roomRepository =
  new SQLiteLiveRoomRepository({
    databasePath:
      config.databasePath,
  });

const authRepository =
  new SQLiteAuthRepository({
    databasePath:
      config.databasePath,
  });

const authService =
  new AuthService({
    repository:
      authRepository,
  });

void authService;

const roomStore =
  new LiveRoomStore({
    repository:
      roomRepository,
  });

const botCycleScheduler =
  createBotCycleScheduler({
    roomStore,
  });

const absenceResolutionCoordinator =
  createAbsenceResolutionCoordinator({
    roomStore,

    requestBotCycle:
      (
        sessionId,
      ) => {
        botCycleScheduler.request(
          sessionId,
        );
      },

    onError:
      (
        error,
        context,
      ) => {
        console.error(
          `Automatic absence resolution failed for ${context.sessionId} / ${context.player}.`,
          error,
        );
      },
  });

const server =
  createBackendServer({
    roomStore,
  });

const realtime =
  createRealtimeServer({
    server,
    roomStore,

    onAbsenceResolutionPending:
      (
        event,
      ) => {
        absenceResolutionCoordinator
          .request(
            event.sessionId,
            event.player,
          );
      },
  });

server.listen(
  config.port,
  config.host,
  () => {
    console.log(
      `Atoutia backend listening on http://${config.host}:${config.port}`,
    );

    console.log(
      `Atoutia WebSocket listening on ws://${config.host}:${config.port}/ws`,
    );

    console.log(
      `Atoutia SQLite database: ${config.databasePath}`,
    );
  },
);

let shuttingDown =
  false;

async function shutdown(
  signal:
    string,
): Promise<void> {
  if (
    shuttingDown
  ) {
    return;
  }

  shuttingDown =
    true;

  console.log(
    `Received ${signal}, shutting down.`,
  );

  absenceResolutionCoordinator
    .close();

  botCycleScheduler.close();

  try {
    await realtime.close();
  } catch (
    error:
      unknown
  ) {
    console.error(
      error,
    );

    process.exitCode =
      1;
  }

  await new Promise<void>(
    (
      resolve,
    ) => {
      server.close(
        (
          error,
        ) => {
          if (
            error !==
              undefined
          ) {
            console.error(
              error,
            );

            process.exitCode =
              1;
          }

          resolve();
        },
      );
    },
  );

  try {
    authRepository.close();
  } catch (
    error:
      unknown
  ) {
    console.error(
      error,
    );

    process.exitCode =
      1;
  }

  try {
    roomRepository.close();
  } catch (
    error:
      unknown
  ) {
    console.error(
      error,
    );

    process.exitCode =
      1;
  }
}

process.on(
  "SIGINT",
  () => {
    void shutdown(
      "SIGINT",
    );
  },
);

process.on(
  "SIGTERM",
  () => {
    void shutdown(
      "SIGTERM",
    );
  },
);