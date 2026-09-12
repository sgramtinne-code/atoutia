import {
  loadBackendConfig,
} from "./config.js";
import {
  createBackendServer,
} from "./server.js";

const config =
  loadBackendConfig();

const server =
  createBackendServer();

server.listen(
  config.port,
  config.host,
  () => {
    console.log(
      `Atoutia backend listening on http://${config.host}:${config.port}`,
    );
  },
);

function shutdown(
  signal: string,
): void {
  console.log(
    `Received ${signal}, shutting down.`,
  );

  server.close(
    (error) => {
      if (
        error !== undefined
      ) {
        console.error(error);
        process.exitCode = 1;
      }
    },
  );
}

process.on(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT",
    ),
);

process.on(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM",
    ),
);