import {
  describe,
  expect,
  it,
} from "vitest";

import {
  REALTIME_PROTOCOL_VERSION,
  createRealtimeErrorMessage,
  createRealtimeSnapshotMessage,
  parseRealtimeClientMessage,
  serializeRealtimeServerMessage,
} from "../src/realtimeProtocol.js";

const SESSION_ID =
  "ms1_0123456789abcdef0123456789abcdef";

describe(
  "realtime protocol",
  () => {
    it(
      "uses protocol version 1",
      () => {
        expect(
          REALTIME_PROTOCOL_VERSION,
        ).toBe(1);
      },
    );

    it(
      "parses a valid PASS command",
      () => {
        const message =
          parseRealtimeClientMessage(
            JSON.stringify({
              protocolVersion: 1,

              type:
                "COMMAND",

              document: {
                formatVersion: 1,
                engineVersion:
                  "0.1.0",
                sessionId:
                  SESSION_ID,
                expectedRevision:
                  5,
                command: {
                  type:
                    "PASS",
                },
              },
            }),
          );

        expect(
          message,
        ).toEqual({
          protocolVersion: 1,

          type:
            "COMMAND",

          document: {
            formatVersion: 1,
            engineVersion:
              "0.1.0",
            sessionId:
              SESSION_ID,
            expectedRevision:
              5,
            command: {
              type:
                "PASS",
            },
          },
        });
      },
    );

    it(
      "rejects invalid JSON",
      () => {
        expect(
          () =>
            parseRealtimeClientMessage(
              "{",
            ),
        ).toThrow();
      },
    );

    it(
      "rejects an unsupported protocol version",
      () => {
        expect(
          () =>
            parseRealtimeClientMessage(
              JSON.stringify({
                protocolVersion:
                  2,

                type:
                  "COMMAND",

                document: {
                  formatVersion:
                    1,
                  engineVersion:
                    "0.1.0",
                  sessionId:
                    SESSION_ID,
                  expectedRevision:
                    5,
                  command: {
                    type:
                      "PASS",
                  },
                },
              }),
            ),
        ).toThrow();
      },
    );

    it(
      "rejects an unsupported message type",
      () => {
        expect(
          () =>
            parseRealtimeClientMessage(
              JSON.stringify({
                protocolVersion:
                  1,

                type:
                  "HELLO",

                document: {},
              }),
            ),
        ).toThrow();
      },
    );

    it(
      "rejects extra fields",
      () => {
        expect(
          () =>
            parseRealtimeClientMessage(
              JSON.stringify({
                protocolVersion:
                  1,

                type:
                  "COMMAND",

                document: {
                  formatVersion:
                    1,
                  engineVersion:
                    "0.1.0",
                  sessionId:
                    SESSION_ID,
                  expectedRevision:
                    5,
                  command: {
                    type:
                      "PASS",
                  },
                },

                unexpected:
                  true,
              }),
            ),
        ).toThrow();
      },
    );

    it(
      "creates a versioned error message",
      () => {
        expect(
          createRealtimeErrorMessage(
            "REVISION_MISMATCH",
          ),
        ).toEqual({
          protocolVersion:
            1,

          type:
            "ERROR",

          code:
            "REVISION_MISMATCH",
        });
      },
    );

    it(
      "creates and serializes a snapshot envelope",
      () => {
        const snapshot = {
          formatVersion: 1,
          engineVersion:
            "0.1.0",
          sessionId:
            SESSION_ID,
          revision: 5,
          phase:
            "IN_PROGRESS",
          player:
            "PLAYER_0",
          seats: [
            {
              player:
                "PLAYER_0",
              occupied:
                true,
            },
            {
              player:
                "PLAYER_1",
              occupied:
                true,
            },
            {
              player:
                "PLAYER_2",
              occupied:
                true,
            },
            {
              player:
                "PLAYER_3",
              occupied:
                true,
            },
          ],
          game: {
            match: {
              public: {
                dealNumber:
                  1,
                dealer:
                  "PLAYER_0",
                phase:
                  "BIDDING",
                score: {
                  targetScore:
                    1000,
                  scores: {
                    TEAM_0:
                      0,
                    TEAM_1:
                      0,
                  },
                  completed:
                    false,
                  winner:
                    null,
                },
                biddingPlayer:
                  "PLAYER_1",
                taker:
                  null,
                trumpSuit:
                  null,
                turnUpCard: {
                  suit:
                    "HEARTS",
                  rank:
                    "ACE",
                },
                currentTrick:
                  null,
              },
              player:
                "PLAYER_0",
              hand: [],
              legalCards: [],
            },
            actions: {
              player:
                "PLAYER_0",
              mode:
                "WAIT",
              biddingActions: [],
              legalCards: [],
            },
          },
        } as const;

        const message =
          createRealtimeSnapshotMessage(
            snapshot,
          );

        expect(
          message.protocolVersion,
        ).toBe(1);

        expect(
          message.type,
        ).toBe(
          "SNAPSHOT",
        );

        expect(
          message.snapshot,
        ).toBe(
          snapshot,
        );

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