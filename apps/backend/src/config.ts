export const DEFAULT_HOST =
  "127.0.0.1";

export const DEFAULT_PORT =
  3000;

export interface BackendConfig {
  readonly host: string;
  readonly port: number;
}

function parsePort(
  value: string | undefined,
): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port =
    Number(value);

  if (
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      "PORT must be an integer between 1 and 65535.",
    );
  }

  return port;
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
  });
}