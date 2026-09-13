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

const config =
  loadBackendConfig();

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
  },
);

let shuttingDown =
  false;

async function shutdown(
  signal: string,
): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `Received ${signal}, shutting down.`,
  );

  try {
    await realtime.close();
  } catch (
    error: unknown
  ) {
    console.error(error);
    process.exitCode = 1;
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
            error !== undefined
          ) {
            console.error(error);
            process.exitCode = 1;
          }

          resolve();
        },
      );
    },
  );
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