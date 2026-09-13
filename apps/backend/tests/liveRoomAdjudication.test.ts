import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createActiveLiveRoomAdjudication,
  createNormalLiveRoomAdjudication,
  createPlayerAbsenceForfeitAdjudication,
  getLiveRoomPlayerTeam,
  getOpposingLiveRoomTeam,
} from "../src/liveRoomAdjudication.js";

describe(
  "live room adjudication",
  () => {
    it(
      "creates an ACTIVE adjudication",
      () => {
        expect(
          createActiveLiveRoomAdjudication(),
        ).toEqual({
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
      "maps PLAYER_0 and PLAYER_2 to TEAM_0",
      () => {
        expect(
          getLiveRoomPlayerTeam(
            "PLAYER_0",
          ),
        ).toBe(
          "TEAM_0",
        );

        expect(
          getLiveRoomPlayerTeam(
            "PLAYER_2",
          ),
        ).toBe(
          "TEAM_0",
        );
      },
    );

    it(
      "maps PLAYER_1 and PLAYER_3 to TEAM_1",
      () => {
        expect(
          getLiveRoomPlayerTeam(
            "PLAYER_1",
          ),
        ).toBe(
          "TEAM_1",
        );

        expect(
          getLiveRoomPlayerTeam(
            "PLAYER_3",
          ),
        ).toBe(
          "TEAM_1",
        );
      },
    );

    it(
      "returns the opposing team",
      () => {
        expect(
          getOpposingLiveRoomTeam(
            "TEAM_0",
          ),
        ).toBe(
          "TEAM_1",
        );

        expect(
          getOpposingLiveRoomTeam(
            "TEAM_1",
          ),
        ).toBe(
          "TEAM_0",
        );
      },
    );

    it(
      "creates a normal completion without inventing a score",
      () => {
        expect(
          createNormalLiveRoomAdjudication({
            completedAtMs:
              123_456,
          }),
        ).toEqual({
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
      "creates a PLAYER_0 absence forfeit with TEAM_0 losing",
      () => {
        expect(
          createPlayerAbsenceForfeitAdjudication({
            forfeitingPlayer:
              "PLAYER_0",

            completedAtMs:
              500_000,
          }),
        ).toEqual({
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
      "creates a PLAYER_3 absence forfeit with TEAM_1 losing",
      () => {
        expect(
          createPlayerAbsenceForfeitAdjudication({
            forfeitingPlayer:
              "PLAYER_3",

            completedAtMs:
              750_000,
          }),
        ).toEqual({
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
      "rejects invalid completion timestamps",
      () => {
        expect(
          () =>
            createPlayerAbsenceForfeitAdjudication({
              forfeitingPlayer:
                "PLAYER_1",

              completedAtMs:
                -1,
            }),
        ).toThrow(
          "completedAtMs must be a non-negative safe integer.",
        );

        expect(
          () =>
            createNormalLiveRoomAdjudication({
              completedAtMs:
                Number.NaN,
            }),
        ).toThrow(
          "completedAtMs must be a non-negative safe integer.",
        );
      },
    );
  },
);