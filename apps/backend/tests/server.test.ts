import type {
  AddressInfo,
} from "node:net";

import type {
  Server,
} from "node:http";

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
  Server[] = [];

async function startServer(
  roomStore =
    new LiveRoomStore(),
): Promise<{
  readonly server: Server;
  readonly roomStore:
    LiveRoomStore;
  readonly baseUrl: string;
}> {
  const server =
    createBackendServer({
      roomStore,
    });

  servers.push(server);

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
        () => resolve(),
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
      "Expected TCP server address",
    );
  }

  const {
    port,
  } = address as AddressInfo;

  return {
    server,
    roomStore,
    baseUrl:
      `http://127.0.0.1:${port}`,
  };
}

async function closeServer(
  server: Server,
): Promise<void> {
  if (!server.listening) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      server.close(
        (
          error,
        ) => {
          if (
            error !== undefined
          ) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    },
  );
}

async function createRoom(
  baseUrl: string,
): Promise<{
  readonly sessionId: string;
  readonly revision: number;
}> {
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

  return await response.json() as {
    readonly sessionId: string;
    readonly revision: number;
  };
}

afterEach(
  async () => {
    await Promise.all(
      servers.splice(0).map(
        closeServer,
      ),
    );
  },
);

describe(
  "backend server",
  () => {
    it(
      "returns health status",
      async () => {
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
      },
    );

    it(
      "creates a room",
      async () => {
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
            readonly sessionId: string;
            readonly revision: number;
            readonly phase: string;
            readonly occupiedSeats:
              number;
            readonly seats:
              Record<
                string,
                boolean
              >;
          };

        expect(
          body.sessionId,
        ).toMatch(
          /^ms1_[0-9a-f]{32}$/,
        );

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
          body.seats,
        ).toEqual({
          PLAYER_0: false,
          PLAYER_1: false,
          PLAYER_2: false,
          PLAYER_3: false,
        });

        expect(
          roomStore.count(),
        ).toBe(1);
      },
    );

    it(
      "retrieves an existing room",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const created =
          await createRoom(
            baseUrl,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${created.sessionId}`,
          );

        expect(
          response.status,
        ).toBe(200);

        const body =
          await response.json() as {
            readonly sessionId:
              string;
            readonly revision:
              number;
          };

        expect(
          body.sessionId,
        ).toBe(
          created.sessionId,
        );

        expect(
          body.revision,
        ).toBe(0);
      },
    );

    it(
      "claims and releases a seat",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const room =
          await createRoom(
            baseUrl,
          );

        const claimResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/seats`,
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  participantId:
                    "participant-a",

                  player:
                    "PLAYER_0",

                  expectedRevision:
                    0,
                }),
            },
          );

        expect(
          claimResponse.status,
        ).toBe(200);

        const claimed =
          await claimResponse.json() as {
            readonly revision:
              number;
            readonly occupiedSeats:
              number;
            readonly seats:
              Record<
                string,
                boolean
              >;
          };

        expect(
          claimed.revision,
        ).toBe(1);

        expect(
          claimed.occupiedSeats,
        ).toBe(1);

        expect(
          claimed.seats.PLAYER_0,
        ).toBe(true);

        const releaseResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/seats`,
            {
              method:
                "DELETE",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  participantId:
                    "participant-a",

                  player:
                    "PLAYER_0",

                  expectedRevision:
                    1,
                }),
            },
          );

        expect(
          releaseResponse.status,
        ).toBe(200);

        const released =
          await releaseResponse.json() as {
            readonly revision:
              number;
            readonly occupiedSeats:
              number;
            readonly seats:
              Record<
                string,
                boolean
              >;
          };

        expect(
          released.revision,
        ).toBe(2);

        expect(
          released.occupiedSeats,
        ).toBe(0);

        expect(
          released.seats.PLAYER_0,
        ).toBe(false);
      },
    );

    it(
      "rejects a stale revision",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const room =
          await createRoom(
            baseUrl,
          );

        const firstResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/seats`,
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  participantId:
                    "participant-a",

                  player:
                    "PLAYER_0",

                  expectedRevision:
                    0,
                }),
            },
          );

        expect(
          firstResponse.status,
        ).toBe(200);

        const staleResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/seats`,
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  participantId:
                    "participant-b",

                  player:
                    "PLAYER_1",

                  expectedRevision:
                    0,
                }),
            },
          );

        expect(
          staleResponse.status,
        ).toBe(409);

        expect(
          await staleResponse.json(),
        ).toEqual({
          error:
            "REVISION_MISMATCH",
        });
      },
    );

    it(
      "becomes ready with four seats and starts",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const room =
          await createRoom(
            baseUrl,
          );

        const players = [
          "PLAYER_0",
          "PLAYER_1",
          "PLAYER_2",
          "PLAYER_3",
        ] as const;

        for (
          let index = 0;
          index <
          players.length;
          index += 1
        ) {
          const response =
            await fetch(
              `${baseUrl}/api/v1/rooms/${room.sessionId}/seats`,
              {
                method:
                  "POST",

                headers: {
                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    participantId:
                      `participant-${index}`,

                    player:
                      players[index],

                    expectedRevision:
                      index,
                  }),
              },
            );

          expect(
            response.status,
          ).toBe(200);
        }

        const readyResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}`,
          );

        const ready =
          await readyResponse.json() as {
            readonly revision:
              number;
            readonly phase:
              string;
            readonly occupiedSeats:
              number;
          };

        expect(
          ready.revision,
        ).toBe(4);

        expect(
          ready.phase,
        ).toBe("READY");

        expect(
          ready.occupiedSeats,
        ).toBe(4);

        const startResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/start`,
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  expectedRevision:
                    4,
                }),
            },
          );

        expect(
          startResponse.status,
        ).toBe(200);

        const started =
          await startResponse.json() as {
            readonly revision:
              number;
            readonly phase:
              string;
          };

        expect(
          started.revision,
        ).toBe(5);

        expect(
          started.phase,
        ).toBe(
          "IN_PROGRESS",
        );
      },
    );

    it(
      "rejects invalid JSON",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const room =
          await createRoom(
            baseUrl,
          );

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/${room.sessionId}/seats`,
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body: "{",
            },
          );

        expect(
          response.status,
        ).toBe(400);

        expect(
          await response.json(),
        ).toEqual({
          error: "INVALID_JSON",
        });
      },
    );

    it(
      "rejects an invalid session id",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await fetch(
            `${baseUrl}/api/v1/rooms/invalid`,
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
      },
    );

    it(
      "returns not found for an unknown route",
      async () => {
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

        expect(
          await response.json(),
        ).toEqual({
          error: "NOT_FOUND",
        });
      },
    );
  },
);