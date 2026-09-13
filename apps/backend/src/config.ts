import {
  fileURLToPath,
} from "node:url";

export const DEFAULT_HOST =
  "127.0.0.1";

export const DEFAULT_PORT =
  3000;

export const DEFAULT_DATABASE_PATH =
  fileURLToPath(
    new URL(
      "../data/atoutia.sqlite",
      import.meta.url,
    ),
  );

export interface BackendConfig {
  readonly host:
    string;

  readonly port:
    number;

  readonly databasePath:
    string;
}

function parsePort(
  value:
    string | undefined,
): number {
  if (
    value ===
    undefined
  ) {
    return DEFAULT_PORT;
  }

  const port =
    Number(
      value,
    );

  if (
    !Number.isSafeInteger(
      port,
    ) ||
    port <
      1 ||
    port >
      65535
  ) {
    throw new Error(
      "PORT must be an integer between 1 and 65535.",
    );
  }

  return port;
}

function parseDatabasePath(
  value:
    string | undefined,
): string {
  if (
    value ===
    undefined
  ) {
    return DEFAULT_DATABASE_PATH;
  }

  const trimmed =
    value.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "ATOUTIA_DATABASE_PATH must not be empty.",
    );
  }

  return trimmed;
}

export function loadBackendConfig(
  environment:
    NodeJS.ProcessEnv =
      process.env,
): BackendConfig {
  return Object.freeze({
    host:
      environment.HOST ??
      DEFAULT_HOST,

    port:
      parsePort(
        environment.PORT,
      ),

    databasePath:
      parseDatabasePath(
        environment
          .ATOUTIA_DATABASE_PATH,
      ),
  });
}