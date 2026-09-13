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
      "creates a versioned PRESENCE message with connection absence and resolution states",
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

          resolutions: [
            {
              player:
                "PLAYER_0",

              action:
                "NONE",

              automatic:
                false,
            },

            {
              player:
                "PLAYER_1",

              action:
                "NONE",

              automatic:
                false,
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

    it(
      "exposes MANUAL_ONLY for a waiting PRIVATE absence",
      () => {
        const message =
          createRealtimePresenceMessage(
            "ms1_0123456789abcdef0123456789abcdef",

            [],

            [],

            [
              {
                player:
                  "PLAYER_0",

                status:
                  "WAITING",

                mode:
                  "PRIVATE",

                absentSinceMs:
                  121000,

                eligibleAtMs:
                  null,

                remainingMs:
                  null,
              },
            ],
          );

        expect(
          message.resolutions,
        ).toEqual([
          {
            player:
              "PLAYER_0",

            action:
              "MANUAL_ONLY",

            automatic:
              false,
          },
        ]);
      },
    );

    it(
      "exposes BOT_TAKEOVER for an eligible CASUAL absence",
      () => {
        const message =
          createRealtimePresenceMessage(
            "ms1_0123456789abcdef0123456789abcdef",

            [],

            [],

            [
              {
                player:
                  "PLAYER_1",

                status:
                  "ELIGIBLE",

                mode:
                  "CASUAL",

                absentSinceMs:
                  121000,

                eligibleAtMs:
                  301000,

                remainingMs:
                  0,
              },
            ],
          );

        expect(
          message.resolutions,
        ).toEqual([
          {
            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",

            automatic:
              true,
          },
        ]);
      },
    );

    it(
      "exposes TEAM_FORFEIT for an eligible RANKED absence",
      () => {
        const message =
          createRealtimePresenceMessage(
            "ms1_0123456789abcdef0123456789abcdef",

            [],

            [],

            [
              {
                player:
                  "PLAYER_2",

                status:
                  "ELIGIBLE",

                mode:
                  "RANKED",

                absentSinceMs:
                  121000,

                eligibleAtMs:
                  301000,

                remainingMs:
                  0,
              },
            ],
          );

        expect(
          message.resolutions,
        ).toEqual([
          {
            player:
              "PLAYER_2",

            action:
              "TEAM_FORFEIT",

            automatic:
              true,
          },
        ]);
      },
    );
  },
);