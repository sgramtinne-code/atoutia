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

export const DEFAULT_AUTH_BOOTSTRAP_ENABLED =
  false;

export interface BackendConfig {
  readonly host:
    string;

  readonly port:
    number;

  readonly databasePath:
    string;

  readonly googleClientId:
    string | undefined;

  readonly authBootstrapEnabled:
    boolean;
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

function parseGoogleClientId(
  value:
    string | undefined,
):
  | string
  | undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  if (
    trimmed.length ===
      0 ||
    trimmed !==
      value.trim() ||
    trimmed.length >
      512
  ) {
    throw new Error(
      "ATOUTIA_GOOGLE_CLIENT_ID must be a non-empty value of at most 512 characters.",
    );
  }

  return trimmed;
}

function parseBoolean(
  name:
    string,

  value:
    string | undefined,

  defaultValue:
    boolean,
): boolean {
  if (
    value ===
      undefined
  ) {
    return defaultValue;
  }

  if (
    value ===
      "true"
  ) {
    return true;
  }

  if (
    value ===
      "false"
  ) {
    return false;
  }

  throw new Error(
    `${name} must be either "true" or "false".`,
  );
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

    googleClientId:
      parseGoogleClientId(
        environment
          .ATOUTIA_GOOGLE_CLIENT_ID,
      ),

    authBootstrapEnabled:
      parseBoolean(
        "ATOUTIA_AUTH_BOOTSTRAP_ENABLED",
        environment
          .ATOUTIA_AUTH_BOOTSTRAP_ENABLED,
        DEFAULT_AUTH_BOOTSTRAP_ENABLED,
      ),
  });
}