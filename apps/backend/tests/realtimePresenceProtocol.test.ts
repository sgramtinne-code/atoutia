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
      "creates a versioned PRESENCE message with connection and absence states",
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
                  1200,
              },
            ],

            [
              {
                player:
                  "PLAYER_0",

                state:
                  "CONNECTED",

                disconnectedAtMs:
                  null,

                graceDeadlineAtMs:
                  null,
              },
              {
                player:
                  "PLAYER_1",

                state:
                  "ABSENT",

                disconnectedAtMs:
                  1300,

                graceDeadlineAtMs:
                  121300,
              },
            ],

            [
              {
                player:
                  "PLAYER_0",

                status:
                  "NOT_ABSENT",

                mode:
                  "CASUAL",

                absentSinceMs:
                  null,

                eligibleAtMs:
                  null,

                remainingMs:
                  null,
              },
              {
                player:
                  "PLAYER_1",

                status:
                  "WAITING",

                mode:
                  "CASUAL",

                absentSinceMs:
                  121300,

                eligibleAtMs:
                  301300,

                remainingMs:
                  180000,
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
                1200,
            },
          ],

          connectionStates: [
            {
              player:
                "PLAYER_0",

              state:
                "CONNECTED",

              disconnectedAtMs:
                null,

              graceDeadlineAtMs:
                null,
            },
            {
              player:
                "PLAYER_1",

              state:
                "ABSENT",

              disconnectedAtMs:
                1300,

              graceDeadlineAtMs:
                121300,
            },
          ],

          absences: [
            {
              player:
                "PLAYER_0",

              status:
                "NOT_ABSENT",

              mode:
                "CASUAL",

              absentSinceMs:
                null,

              eligibleAtMs:
                null,

              remainingMs:
                null,
            },
            {
              player:
                "PLAYER_1",

              status:
                "WAITING",

              mode:
                "CASUAL",

              absentSinceMs:
                121300,

              eligibleAtMs:
                301300,

              remainingMs:
                180000,
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