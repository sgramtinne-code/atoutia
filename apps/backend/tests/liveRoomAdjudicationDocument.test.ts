import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createActiveLiveRoomAdjudication,
  createNormalLiveRoomAdjudication,
  createPlayerAbsenceForfeitAdjudication,
} from "../src/liveRoomAdjudication.js";

import {
  LIVE_ROOM_ADJUDICATION_FORMAT_VERSION,
  createLiveRoomAdjudicationDocument,
} from "../src/liveRoomAdjudicationDocument.js";

describe(
  "live room adjudication document",
  () => {
    it(
      "uses public format version 1",
      () => {
        expect(
          LIVE_ROOM_ADJUDICATION_FORMAT_VERSION,
        ).toBe(
          1,
        );
      },
    );

    it(
      "creates an ACTIVE public document",
      () => {
        expect(
          createLiveRoomAdjudicationDocument(
            createActiveLiveRoomAdjudication(),
          ),
        ).toEqual({
          formatVersion:
            1,

          status:
            "ACTIVE",

          completion:
            null,

          completedAtMs:
            null,
        });
      },
    );

    it(
      "creates a NORMAL completed public document",
      () => {
        expect(
          createLiveRoomAdjudicationDocument(
            createNormalLiveRoomAdjudication({
              completedAtMs:
                123_456,
            }),
          ),
        ).toEqual({
          formatVersion:
            1,

          status:
            "COMPLETED",

          completion:
            "NORMAL",

          completedAtMs:
            123_456,
        });
      },
    );

    it(
      "creates a PLAYER_0 absence FORFEIT public document",
      () => {
        expect(
          createLiveRoomAdjudicationDocument(
            createPlayerAbsenceForfeitAdjudication({
              forfeitingPlayer:
                "PLAYER_0",

              completedAtMs:
                500_000,
            }),
          ),
        ).toEqual({
          formatVersion:
            1,

          status:
            "COMPLETED",

          completion:
            "FORFEIT",

          reason:
            "PLAYER_ABSENCE",

          forfeitingPlayer:
            "PLAYER_0",

          losingTeam:
            "TEAM_0",

          winningTeam:
            "TEAM_1",

          completedAtMs:
            500_000,
        });
      },
    );

    it(
      "creates a PLAYER_3 absence FORFEIT public document",
      () => {
        expect(
          createLiveRoomAdjudicationDocument(
            createPlayerAbsenceForfeitAdjudication({
              forfeitingPlayer:
                "PLAYER_3",

              completedAtMs:
                750_000,
            }),
          ),
        ).toEqual({
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
            750_000,
        });
      },
    );

    it(
      "returns frozen documents",
      () => {
        const document =
          createLiveRoomAdjudicationDocument(
            createActiveLiveRoomAdjudication(),
          );

        expect(
          Object.isFrozen(
            document,
          ),
        ).toBe(
          true,
        );
      },
    );
  },
);