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
  BELOTE_ENGINE_VERSION,
} from "@atoutia/belote-engine";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";
import {
  createBackendServer,
} from "../src/server.js";

const servers:
  ReturnType<
    typeof createBackendServer
  >[] = [];

afterEach(
  async () => {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>(
            (
              resolve,
              reject,
            ) => {
              if (
                !server.listening
              ) {
                resolve();

                return;
              }

              server.close(
                (error) => {
                  if (
                    error !==
                    undefined
                  ) {
                    reject(error);

                    return;
                  }

                  resolve();
                },
              );
            },
          ),
      ),
    );

    servers.length = 0;
  },
);

async function startServer(
  roomStore =
    new LiveRoomStore(),
) {
  const server =
    createBackendServer({
      roomStore,
    });

  servers.push(
    server,
  );

  await new Promise<void>(
    (resolve) => {
      server.listen(
        0,
        "127.0.0.1",
        resolve,
      );
    },
  );

  const address =
    server.address();

  if (
    address === null ||
    typeof address === "string"
  ) {
    throw new Error(
      "Test server has no TCP address.",
    );
  }

  const {
    port,
  } =
    address as AddressInfo;

  return {
    roomStore,

    baseUrl:
      `http://127.0.0.1:${port}`,
  };
}

describe(
  "backend HTTP server",
  () => {
    it("returns health information", async () => {
      const {
        baseUrl,
      } =
        await startServer();

      const response =
        await fetch(
          `${baseUrl}/health`,
        );

      expect(
        response.status,
      ).toBe(200);

      expect(
        await response.json(),
      ).toEqual({
        status: "ok",
        service:
          "@atoutia/backend",
        engineVersion:
          BELOTE_ENGINE_VERSION,
        liveRooms: 0,
      });
    });

    it("creates a live room", async () => {
      const {
        baseUrl,
        roomStore,
      } =
        await startServer();

      const response =
        await fetch(
          `${baseUrl}/api/v1/rooms`,
          {
            method: "POST",
          },
        );

      expect(
        response.status,
      ).toBe(201);

      const body =
        await response.json() as {
          sessionId: string;
          revision: number;
          phase: string;
          occupiedSeats: number;
        };

      expect(
        body.sessionId.startsWith(
          "ms1_",
        ),
      ).toBe(true);

      expect(
        body.revision,
      ).toBe(0);

      expect(
        body.phase,
      ).toBe(
        "WAITING_FOR_PLAYERS",
      );

      expect(
        body.occupiedSeats,
      ).toBe(0);

      expect(
        roomStore.count(),
      ).toBe(1);
    });

    it("retrieves an existing room", async () => {
      const {
        baseUrl,
      } =
        await startServer();

      const created =
        await fetch(
          `${baseUrl}/api/v1/rooms`,
          {
            method: "POST",
          },
        );

      const room =
        await created.json() as {
          sessionId: string;
        };

      const response =
        await fetch(
          `${baseUrl}/api/v1/rooms/${room.sessionId}`,
        );

      expect(
        response.status,
      ).toBe(200);

      const body =
        await response.json() as {
          sessionId: string;
          revision: number;
        };

      expect(
        body.sessionId,
      ).toBe(
        room.sessionId,
      );

      expect(
        body.revision,
      ).toBe(0);
    });

    it("rejects invalid session IDs", async () => {
      const {
        baseUrl,
      } =
        await startServer();

      const response =
        await fetch(
          `${baseUrl}/api/v1/rooms/not-valid`,
        );

      expect(
        response.status,
      ).toBe(400);

      expect(
        await response.json(),
      ).toEqual({
        error:
          "INVALID_SESSION_ID",
      });
    });

    it("returns 404 for unknown routes", async () => {
      const {
        baseUrl,
      } =
        await startServer();

      const response =
        await fetch(
          `${baseUrl}/unknown`,
        );

      expect(
        response.status,
      ).toBe(404);
    });
  },
);