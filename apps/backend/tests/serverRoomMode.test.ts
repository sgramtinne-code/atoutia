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
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createBackendServer,
} from "../src/server.js";

const servers:
  Server[] = [];

async function startServer():
  Promise<{
    readonly server:
      Server;

    readonly roomStore:
      LiveRoomStore;

    readonly baseUrl:
      string;
  }> {
  const roomStore =
    new LiveRoomStore();

  const server =
    createBackendServer({
      roomStore,
    });

  servers.push(
    server,
  );

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
    throw new Error(
      "Expected TCP server address.",
    );
  }

  const port =
    (
      address as
        AddressInfo
    ).port;

  return {
    server,

    roomStore,

    baseUrl:
      `http://127.0.0.1:${port}`,
  };
}

async function closeServer(
  server:
    Server,
): Promise<void> {
  if (
    !server.listening
  ) {
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
            error !==
            undefined
          ) {
            reject(
              error,
            );

            return;
          }

          resolve();
        },
      );
    },
  );
}

async function createRoom(
  baseUrl:
    string,

  body?:
    unknown,
): Promise<Response> {
  return fetch(
    `${baseUrl}/api/v1/rooms`,

    body ===
    undefined
      ? {
          method:
            "POST",
        }
      : {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify(
              body,
            ),
        },
  );
}

afterEach(
  async () => {
    await Promise.all(
      servers
        .splice(
          0,
        )
        .map(
          closeServer,
        ),
    );
  },
);

describe(
  "room match mode HTTP API",
  () => {
    it(
      "creates a CASUAL room when the POST body is absent",
      async () => {
        const {
          baseUrl,
          roomStore,
        } =
          await startServer();

        const response =
          await createRoom(
            baseUrl,
          );

        expect(
          response.status,
        ).toBe(
          201,
        );

        const body =
          await response.json() as {
            readonly sessionId:
              string;

            readonly mode:
              string;
          };

        expect(
          body.mode,
        ).toBe(
          "CASUAL",
        );

        expect(
          roomStore.requireMode(
            body.sessionId,
          ),
        ).toBe(
          "CASUAL",
        );
      },
    );

    it(
      "creates a CASUAL room from an empty object",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await createRoom(
            baseUrl,
            {},
          );

        expect(
          response.status,
        ).toBe(
          201,
        );

        expect(
          await response.json(),
        ).toMatchObject({
          mode:
            "CASUAL",
        });
      },
    );

    it(
      "creates a PRIVATE room",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await createRoom(
            baseUrl,
            {
              mode:
                "PRIVATE",
            },
          );

        expect(
          response.status,
        ).toBe(
          201,
        );

        expect(
          await response.json(),
        ).toMatchObject({
          mode:
            "PRIVATE",
        });
      },
    );

    it(
      "creates an explicit CASUAL room",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await createRoom(
            baseUrl,
            {
              mode:
                "CASUAL",
            },
          );

        expect(
          response.status,
        ).toBe(
          201,
        );

        expect(
          await response.json(),
        ).toMatchObject({
          mode:
            "CASUAL",
        });
      },
    );

    it(
      "creates a RANKED room",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await createRoom(
            baseUrl,
            {
              mode:
                "RANKED",
            },
          );

        expect(
          response.status,
        ).toBe(
          201,
        );

        expect(
          await response.json(),
        ).toMatchObject({
          mode:
            "RANKED",
        });
      },
    );

    it(
      "preserves the room mode in GET and seat summaries",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const createResponse =
          await createRoom(
            baseUrl,
            {
              mode:
                "PRIVATE",
            },
          );

        expect(
          createResponse.status,
        ).toBe(
          201,
        );

        const created =
          await createResponse.json() as {
            readonly sessionId:
              string;
          };

        const claimResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${created.sessionId}/seats`,
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
                    "participant-0",

                  player:
                    "PLAYER_0",

                  expectedRevision:
                    0,
                }),
            },
          );

        expect(
          claimResponse.status,
        ).toBe(
          200,
        );

        expect(
          await claimResponse.json(),
        ).toMatchObject({
          mode:
            "PRIVATE",

          revision:
            1,
        });

        const getResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${created.sessionId}`,
          );

        expect(
          getResponse.status,
        ).toBe(
          200,
        );

        expect(
          await getResponse.json(),
        ).toMatchObject({
          mode:
            "PRIVATE",

          revision:
            1,
        });
      },
    );

    it(
      "preserves RANKED mode when the room starts",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const createResponse =
          await createRoom(
            baseUrl,
            {
              mode:
                "RANKED",
            },
          );

        expect(
          createResponse.status,
        ).toBe(
          201,
        );

        const created =
          await createResponse.json() as {
            readonly sessionId:
              string;
          };

        const players = [
          "PLAYER_0",
          "PLAYER_1",
          "PLAYER_2",
          "PLAYER_3",
        ] as const;

        for (
          let index =
            0;

          index <
          players.length;

          index +=
            1
        ) {
          const response =
            await fetch(
              `${baseUrl}/api/v1/rooms/${created.sessionId}/seats`,
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
                      players[
                        index
                      ],

                    expectedRevision:
                      index,
                  }),
              },
            );

          expect(
            response.status,
          ).toBe(
            200,
          );
        }

        const startResponse =
          await fetch(
            `${baseUrl}/api/v1/rooms/${created.sessionId}/start`,
            {
              method:
                "POST",

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
        ).toBe(
          200,
        );

        expect(
          await startResponse.json(),
        ).toMatchObject({
          mode:
            "RANKED",

          revision:
            5,

          phase:
            "IN_PROGRESS",
        });
      },
    );

    it(
      "rejects an invalid room mode",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await createRoom(
            baseUrl,
            {
              mode:
                "INVALID",
            },
          );

        expect(
          response.status,
        ).toBe(
          400,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "INVALID_REQUEST",
        });
      },
    );

    it(
      "rejects extra fields in the room creation body",
      async () => {
        const {
          baseUrl,
        } =
          await startServer();

        const response =
          await createRoom(
            baseUrl,
            {
              mode:
                "CASUAL",

              unexpected:
                true,
            },
          );

        expect(
          response.status,
        ).toBe(
          400,
        );

        expect(
          await response.json(),
        ).toEqual({
          error:
            "INVALID_REQUEST",
        });
      },
    );
  },
);