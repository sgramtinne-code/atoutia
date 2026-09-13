import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEFAULT_DATABASE_PATH,
  DEFAULT_HOST,
  DEFAULT_PORT,
  loadBackendConfig,
} from "../src/config.js";

describe(
  "backend config",
  () => {
    it(
      "uses default configuration",
      () => {
        const config =
          loadBackendConfig(
            {},
          );

        expect(
          config,
        ).toEqual({
          host:
            DEFAULT_HOST,

          port:
            DEFAULT_PORT,

          databasePath:
            DEFAULT_DATABASE_PATH,

          googleClientId:
            undefined,
        });
      },
    );

    it(
      "uses the configured host",
      () => {
        expect(
          loadBackendConfig({
            HOST:
              "0.0.0.0",
          }).host,
        ).toBe(
          "0.0.0.0",
        );
      },
    );

    it(
      "uses the configured port",
      () => {
        expect(
          loadBackendConfig({
            PORT:
              "4567",
          }).port,
        ).toBe(
          4567,
        );
      },
    );

    it(
      "rejects an invalid port",
      () => {
        for (
          const value
          of [
            "0",
            "65536",
            "1.5",
            "not-a-port",
          ]
        ) {
          expect(
            () =>
              loadBackendConfig({
                PORT:
                  value,
              }),
          ).toThrow(
            "PORT must be an integer between 1 and 65535.",
          );
        }
      },
    );

    it(
      "uses a configured database path",
      () => {
        const config =
          loadBackendConfig({
            ATOUTIA_DATABASE_PATH:
              "/tmp/atoutia/custom.sqlite",
          });

        expect(
          config.databasePath,
        ).toBe(
          "/tmp/atoutia/custom.sqlite",
        );
      },
    );

    it(
      "trims the configured database path",
      () => {
        const config =
          loadBackendConfig({
            ATOUTIA_DATABASE_PATH:
              "  /tmp/atoutia.sqlite  ",
          });

        expect(
          config.databasePath,
        ).toBe(
          "/tmp/atoutia.sqlite",
        );
      },
    );

    it(
      "rejects an empty database path",
      () => {
        expect(
          () =>
            loadBackendConfig({
              ATOUTIA_DATABASE_PATH:
                "   ",
            }),
        ).toThrow(
          "ATOUTIA_DATABASE_PATH must not be empty.",
        );
      },
    );

    it(
      "leaves Google authentication unconfigured by default",
      () => {
        expect(
          loadBackendConfig(
            {},
          ).googleClientId,
        ).toBeUndefined();
      },
    );

    it(
      "uses a configured Google client ID",
      () => {
        const config =
          loadBackendConfig({
            ATOUTIA_GOOGLE_CLIENT_ID:
              "atoutia-client.apps.googleusercontent.com",
          });

        expect(
          config.googleClientId,
        ).toBe(
          "atoutia-client.apps.googleusercontent.com",
        );
      },
    );

    it(
      "trims the configured Google client ID",
      () => {
        const config =
          loadBackendConfig({
            ATOUTIA_GOOGLE_CLIENT_ID:
              "  atoutia-client.apps.googleusercontent.com  ",
          });

        expect(
          config.googleClientId,
        ).toBe(
          "atoutia-client.apps.googleusercontent.com",
        );
      },
    );

    it(
      "rejects an empty Google client ID",
      () => {
        expect(
          () =>
            loadBackendConfig({
              ATOUTIA_GOOGLE_CLIENT_ID:
                "   ",
            }),
        ).toThrow(
          "ATOUTIA_GOOGLE_CLIENT_ID must be a non-empty value of at most 512 characters.",
        );
      },
    );

    it(
      "rejects an excessively large Google client ID",
      () => {
        expect(
          () =>
            loadBackendConfig({
              ATOUTIA_GOOGLE_CLIENT_ID:
                "a".repeat(
                  513,
                ),
            }),
        ).toThrow(
          "ATOUTIA_GOOGLE_CLIENT_ID must be a non-empty value of at most 512 characters.",
        );
      },
    );

    it(
      "returns a frozen configuration",
      () => {
        expect(
          Object.isFrozen(
            loadBackendConfig(
              {},
            ),
          ),
        ).toBe(
          true,
        );
      },
    );
  },
);