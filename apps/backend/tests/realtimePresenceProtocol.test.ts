import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createRealtimePresenceMessage,
  parseRealtimeClientMessage,
  serializeRealtimeServerMessage,
} from "../src/realtimeProtocol.js";

describe(
  "realtime presence protocol",
  () => {
    it(
      "parses a valid HEARTBEAT message",
      () => {
        expect(
          parseRealtimeClientMessage(
            JSON.stringify({
              protocolVersion:
                1,

              type:
                "HEARTBEAT",
            }),
          ),
        ).toEqual({
          protocolVersion:
            1,

          type:
            "HEARTBEAT",
        });
      },
    );

    it(
      "rejects extra HEARTBEAT fields",
      () => {
        expect(
          () =>
            parseRealtimeClientMessage(
              JSON.stringify({
                protocolVersion:
                  1,

                type:
                  "HEARTBEAT",

                unexpected:
                  true,
              }),
            ),
        ).toThrow();
      },
    );

    it(
      "creates a versioned PRESENCE message",
      () => {
        const message =
          createRealtimePresenceMessage(
            "ms1_0123456789abcdef0123456789abcdef",
            [
              {
                player:
                  "PLAYER_0",

                connected:
                  true,

                lastSeenAtMs:
                  1234,
              },
              {
                player:
                  "PLAYER_1",

                connected:
                  false,

                lastSeenAtMs:
                  null,
              },
            ],
          );

        expect(
          message,
        ).toEqual({
          protocolVersion:
            1,

          type:
            "PRESENCE",

          sessionId:
            "ms1_0123456789abcdef0123456789abcdef",

          players: [
            {
              player:
                "PLAYER_0",

              connected:
                true,

              lastSeenAtMs:
                1234,
            },
            {
              player:
                "PLAYER_1",

              connected:
                false,

              lastSeenAtMs:
                null,
            },
          ],
        });

        expect(
          JSON.parse(
            serializeRealtimeServerMessage(
              message,
            ),
          ),
        ).toEqual(
          message,
        );
      },
    );
  },
);