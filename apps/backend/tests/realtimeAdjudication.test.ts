import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  WebSocket,
  WebSocketServer,
} from "ws";

import {
  createActiveLiveRoomAdjudication,
  createPlayerAbsenceForfeitAdjudication,
} from "../src/liveRoomAdjudication.js";

import {
  broadcastRealtimeAdjudication,
  sendRealtimeAdjudication,
  type RealtimeAdjudicationConnection,
} from "../src/realtimeAdjudication.js";

interface SocketPair {
  readonly server:
    WebSocketServer;

  readonly client:
    WebSocket;

  readonly serverSocket:
    WebSocket;
}

const socketPairs:
  SocketPair[] = [];

async function createSocketPair():
  Promise<SocketPair> {
  const server =
    new WebSocketServer({
      port:
        0,
    });

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      server.once(
        "listening",
        () => {
          resolve();
        },
      );

      server.once(
        "error",
        reject,
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
      "Expected WebSocket TCP address.",
    );
  }

  const serverSocketPromise =
    new Promise<WebSocket>(
      (
        resolve,
      ) => {
        server.once(
          "connection",
          (
            socket,
          ) => {
            resolve(
              socket,
            );
          },
        );
      },
    );

  const client =
    new WebSocket(
      `ws://127.0.0.1:${address.port}`,
    );

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      client.once(
        "open",
        () => {
          resolve();
        },
      );

      client.once(
        "error",
        reject,
      );
    },
  );

  const serverSocket =
    await serverSocketPromise;

  const pair:
    SocketPair = {
      server,
      client,
      serverSocket,
    };

  socketPairs.push(
    pair,
  );

  return pair;
}

function waitForClientMessage(
  client:
    WebSocket,
): Promise<
  Record<
    string,
    unknown
  >
> {
  return new Promise<
    Record<
      string,
      unknown
    >
  >(
    (
      resolve,
      reject,
    ) => {
      client.once(
        "message",
        (
          data,
        ) => {
          try {
            resolve(
              JSON.parse(
                data.toString(),
              ) as Record<
                string,
                unknown
              >,
            );
          } catch (
            error:
              unknown
          ) {
            reject(
              error,
            );
          }
        },
      );

      client.once(
        "error",
        reject,
      );
    },
  );
}

async function closeSocketPair(
  pair:
    SocketPair,
): Promise<void> {
  pair.client.terminate();

  pair.serverSocket.terminate();

  await new Promise<void>(
    (
      resolve,
    ) => {
      pair.server.close(
        () => {
          resolve();
        },
      );
    },
  );
}

afterEach(
  async () => {
    const pairs =
      socketPairs.splice(
        0,
      );

    for (
      const pair
      of pairs
    ) {
      await closeSocketPair(
        pair,
      );
    }
  },
);

describe(
  "realtime adjudication",
  () => {
    it(
      "sends the current ACTIVE adjudication to an open socket",
      async () => {
        const pair =
          await createSocketPair();

        const messagePromise =
          waitForClientMessage(
            pair.client,
          );

        expect(
          sendRealtimeAdjudication({
            socket:
              pair.serverSocket,

            sessionId:
              "ms1_00000000000000000000000000000000",

            adjudication:
              createActiveLiveRoomAdjudication(),
          }),
        ).toBe(
          true,
        );

        await expect(
          messagePromise,
        ).resolves.toEqual({
          protocolVersion:
            1,

          type:
            "ADJUDICATION",

          sessionId:
            "ms1_00000000000000000000000000000000",

          adjudication: {
            formatVersion:
              1,

            status:
              "ACTIVE",

            completion:
              null,

            completedAtMs:
              null,
          },
        });
      },
    );

    it(
      "sends a completed FORFEIT adjudication",
      async () => {
        const pair =
          await createSocketPair();

        const messagePromise =
          waitForClientMessage(
            pair.client,
          );

        expect(
          sendRealtimeAdjudication({
            socket:
              pair.serverSocket,

            sessionId:
              "ms1_11111111111111111111111111111111",

            adjudication:
              createPlayerAbsenceForfeitAdjudication({
                forfeitingPlayer:
                  "PLAYER_3",

                completedAtMs:
                  182_000,
              }),
          }),
        ).toBe(
          true,
        );

        await expect(
          messagePromise,
        ).resolves.toEqual({
          protocolVersion:
            1,

          type:
            "ADJUDICATION",

          sessionId:
            "ms1_11111111111111111111111111111111",

          adjudication: {
            formatVersion:
              1,

            status:
              "COMPLETED",

            completion:
              "FORFEIT",

            reason:
              "PLAYER_ABSENCE",

            forfeitingPlayer:
              "PLAYER_3",

            losingTeam:
              "TEAM_1",

            winningTeam:
              "TEAM_0",

            completedAtMs:
              182_000,
          },
        });
      },
    );

    it(
      "does not send to a closed socket",
      async () => {
        const pair =
          await createSocketPair();

        pair.serverSocket.terminate();

        await new Promise<void>(
          (
            resolve,
          ) => {
            setTimeout(
              resolve,
              5,
            );
          },
        );

        expect(
          sendRealtimeAdjudication({
            socket:
              pair.serverSocket,

            sessionId:
              "ms1_22222222222222222222222222222222",

            adjudication:
              createActiveLiveRoomAdjudication(),
          }),
        ).toBe(
          false,
        );
      },
    );

    it(
      "broadcasts only to sockets belonging to the target room",
      async () => {
        const targetPairA =
          await createSocketPair();

        const targetPairB =
          await createSocketPair();

        const otherPair =
          await createSocketPair();

        const targetMessageA =
          waitForClientMessage(
            targetPairA.client,
          );

        const targetMessageB =
          waitForClientMessage(
            targetPairB.client,
          );

        let otherMessageReceived =
          false;

        otherPair.client.once(
          "message",
          () => {
            otherMessageReceived =
              true;
          },
        );

        const connections:
          readonly RealtimeAdjudicationConnection[] =
            [
              {
                socket:
                  targetPairA.serverSocket,

                sessionId:
                  "ms1_33333333333333333333333333333333",
              },

              {
                socket:
                  targetPairB.serverSocket,

                sessionId:
                  "ms1_33333333333333333333333333333333",
              },

              {
                socket:
                  otherPair.serverSocket,

                sessionId:
                  "ms1_44444444444444444444444444444444",
              },
            ];

        const sent =
          broadcastRealtimeAdjudication({
            connections,

            sessionId:
              "ms1_33333333333333333333333333333333",

            adjudication:
              createPlayerAbsenceForfeitAdjudication({
                forfeitingPlayer:
                  "PLAYER_0",

                completedAtMs:
                  500_000,
              }),
          });

        expect(
          sent,
        ).toBe(
          2,
        );

        await expect(
          targetMessageA,
        ).resolves.toMatchObject({
          type:
            "ADJUDICATION",

          sessionId:
            "ms1_33333333333333333333333333333333",

          adjudication: {
            status:
              "COMPLETED",

            completion:
              "FORFEIT",

            forfeitingPlayer:
              "PLAYER_0",
          },
        });

        await expect(
          targetMessageB,
        ).resolves.toMatchObject({
          type:
            "ADJUDICATION",

          sessionId:
            "ms1_33333333333333333333333333333333",

          adjudication: {
            status:
              "COMPLETED",

            completion:
              "FORFEIT",

            forfeitingPlayer:
              "PLAYER_0",
          },
        });

        await new Promise<void>(
          (
            resolve,
          ) => {
            setTimeout(
              resolve,
              20,
            );
          },
        );

        expect(
          otherMessageReceived,
        ).toBe(
          false,
        );
      },
    );

    it(
      "contains no private engine state",
      async () => {
        const pair =
          await createSocketPair();

        const messagePromise =
          waitForClientMessage(
            pair.client,
          );

        sendRealtimeAdjudication({
          socket:
            pair.serverSocket,

          sessionId:
            "ms1_55555555555555555555555555555555",

          adjudication:
            createPlayerAbsenceForfeitAdjudication({
              forfeitingPlayer:
                "PLAYER_2",

              completedAtMs:
                750_000,
            }),
        });

        const message =
          await messagePromise;

        const serialized =
          JSON.stringify(
            message,
          );

        expect(
          serialized,
        ).not.toContain(
          "baseSeed",
        );

        expect(
          serialized,
        ).not.toContain(
          "hands",
        );

        expect(
          serialized,
        ).not.toContain(
          "participantId",
        );
      },
    );
  },
);