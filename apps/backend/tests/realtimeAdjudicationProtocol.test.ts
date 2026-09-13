import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createActiveLiveRoomAdjudication,
  createPlayerAbsenceForfeitAdjudication,
} from "../src/liveRoomAdjudication.js";

import {
  createLiveRoomAdjudicationDocument,
} from "../src/liveRoomAdjudicationDocument.js";

import {
  createRealtimeAdjudicationMessage,
  serializeRealtimeServerMessage,
} from "../src/realtimeProtocol.js";

describe(
  "realtime adjudication protocol",
  () => {
    it(
      "creates an ACTIVE adjudication message",
      () => {
        const adjudication =
          createLiveRoomAdjudicationDocument(
            createActiveLiveRoomAdjudication(),
          );

        expect(
          createRealtimeAdjudicationMessage(
            "ms1_00000000000000000000000000000000",
            adjudication,
          ),
        ).toEqual({
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
      "creates a completed FORFEIT adjudication message",
      () => {
        const adjudication =
          createLiveRoomAdjudicationDocument(
            createPlayerAbsenceForfeitAdjudication({
              forfeitingPlayer:
                "PLAYER_1",

              completedAtMs:
                182_000,
            }),
          );

        expect(
          createRealtimeAdjudicationMessage(
            "ms1_11111111111111111111111111111111",
            adjudication,
          ),
        ).toEqual({
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
              "PLAYER_1",

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
      "serializes an adjudication message as JSON",
      () => {
        const adjudication =
          createLiveRoomAdjudicationDocument(
            createActiveLiveRoomAdjudication(),
          );

        const message =
          createRealtimeAdjudicationMessage(
            "ms1_22222222222222222222222222222222",
            adjudication,
          );

        expect(
          JSON.parse(
            serializeRealtimeServerMessage(
              message,
            ),
          ),
        ).toEqual({
          protocolVersion:
            1,

          type:
            "ADJUDICATION",

          sessionId:
            "ms1_22222222222222222222222222222222",

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
      "returns a frozen outer message",
      () => {
        const adjudication =
          createLiveRoomAdjudicationDocument(
            createActiveLiveRoomAdjudication(),
          );

        const message =
          createRealtimeAdjudicationMessage(
            "ms1_33333333333333333333333333333333",
            adjudication,
          );

        expect(
          Object.isFrozen(
            message,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "contains no private engine state",
      () => {
        const adjudication =
          createLiveRoomAdjudicationDocument(
            createPlayerAbsenceForfeitAdjudication({
              forfeitingPlayer:
                "PLAYER_2",

              completedAtMs:
                500_000,
            }),
          );

        const serialized =
          serializeRealtimeServerMessage(
            createRealtimeAdjudicationMessage(
              "ms1_44444444444444444444444444444444",
              adjudication,
            ),
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