import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LiveRoomAbsenceResolutionNotFoundError,
  LiveRoomStore,
} from "../src/liveRoomStore.js";

function createRoom():
  {
    readonly roomStore:
      LiveRoomStore;

    readonly sessionId:
      string;
  } {
  const roomStore =
    new LiveRoomStore();

  const room =
    roomStore.create({
      mode:
        "CASUAL",
    });

  return {
    roomStore,

    sessionId:
      room.managedRoom.room.session
        .sessionId,
  };
}

describe(
  "live room absence resolution state",
  () => {
    it(
      "starts without absence resolution state",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_0",
          ),
        ).toBeUndefined();

        expect(
          roomStore.listAbsenceResolutions(
            sessionId,
          ),
        ).toEqual([]);
      },
    );

    it(
      "stores a pending manual resolution",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const resolution =
          roomStore.markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_0",

            action:
              "MANUAL_ONLY",
          });

        expect(
          resolution,
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",

          status:
            "PENDING",
        });
      },
    );

    it(
      "stores a pending bot takeover",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        expect(
          roomStore.markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          }),
        ).toEqual({
          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",

          status:
            "PENDING",
        });
      },
    );

    it(
      "stores a pending team forfeit",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        expect(
          roomStore.markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_2",

            action:
              "TEAM_FORFEIT",
          }),
        ).toEqual({
          player:
            "PLAYER_2",

          action:
            "TEAM_FORFEIT",

          status:
            "PENDING",
        });
      },
    );

    it(
      "is idempotent when the same pending action is registered again",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const first =
          roomStore.markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        const second =
          roomStore.markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        expect(
          second,
        ).toBe(
          first,
        );

        expect(
          roomStore.listAbsenceResolutions(
            sessionId,
          ),
        ).toHaveLength(
          1,
        );
      },
    );

    it(
      "rejects a conflicting action for the same player",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",
        });

        expect(
          () =>
            roomStore.markAbsenceResolutionPending({
              sessionId,

              player:
                "PLAYER_1",

              action:
                "TEAM_FORFEIT",
            }),
        ).toThrow(
          "Live room absence resolution action conflict",
        );
      },
    );

    it(
      "clears a pending resolution idempotently",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",
        });

        expect(
          roomStore.clearAbsenceResolution({
            sessionId,

            player:
              "PLAYER_0",
          }),
        ).toBe(
          true,
        );

        expect(
          roomStore.clearAbsenceResolution({
            sessionId,

            player:
              "PLAYER_0",
          }),
        ).toBe(
          false,
        );

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_0",
          ),
        ).toBeUndefined();
      },
    );

    it(
      "resolves BOT_TAKEOVER as RESOLVED_BY_BOT",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",
        });

        expect(
          roomStore.resolveAbsenceResolution({
            sessionId,

            player:
              "PLAYER_1",

            status:
              "RESOLVED_BY_BOT",
          }),
        ).toEqual({
          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",

          status:
            "RESOLVED_BY_BOT",
        });
      },
    );

    it(
      "resolves TEAM_FORFEIT as RESOLVED_BY_FORFEIT",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_2",

          action:
            "TEAM_FORFEIT",
        });

        expect(
          roomStore.resolveAbsenceResolution({
            sessionId,

            player:
              "PLAYER_2",

            status:
              "RESOLVED_BY_FORFEIT",
          }),
        ).toEqual({
          player:
            "PLAYER_2",

          action:
            "TEAM_FORFEIT",

          status:
            "RESOLVED_BY_FORFEIT",
        });
      },
    );

    it(
      "resolves MANUAL_ONLY as RESOLVED_MANUALLY",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",
        });

        expect(
          roomStore.resolveAbsenceResolution({
            sessionId,

            player:
              "PLAYER_0",

            status:
              "RESOLVED_MANUALLY",
          }),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",

          status:
            "RESOLVED_MANUALLY",
        });
      },
    );

    it(
      "is idempotent when the same resolution is applied twice",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",
        });

        const first =
          roomStore.resolveAbsenceResolution({
            sessionId,

            player:
              "PLAYER_1",

            status:
              "RESOLVED_BY_BOT",
          });

        const second =
          roomStore.resolveAbsenceResolution({
            sessionId,

            player:
              "PLAYER_1",

            status:
              "RESOLVED_BY_BOT",
          });

        expect(
          second,
        ).toBe(
          first,
        );
      },
    );

    it(
      "rejects an incompatible resolution result",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",
        });

        expect(
          () =>
            roomStore.resolveAbsenceResolution({
              sessionId,

              player:
                "PLAYER_1",

              status:
                "RESOLVED_BY_FORFEIT",
            }),
        ).toThrow(
          "cannot resolve as RESOLVED_BY_FORFEIT",
        );
      },
    );

    it(
      "rejects resolving a player with no pending resolution",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        expect(
          () =>
            roomStore.resolveAbsenceResolution({
              sessionId,

              player:
                "PLAYER_3",

              status:
                "RESOLVED_BY_BOT",
            }),
        ).toThrow(
          LiveRoomAbsenceResolutionNotFoundError,
        );
      },
    );

    it(
      "does not allow a resolved state to be cleared",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",
        });

        roomStore.resolveAbsenceResolution({
          sessionId,

          player:
            "PLAYER_1",

          status:
            "RESOLVED_BY_BOT",
        });

        expect(
          () =>
            roomStore.clearAbsenceResolution({
              sessionId,

              player:
                "PLAYER_1",
            }),
        ).toThrow(
          "Resolved absence resolution cannot be cleared",
        );
      },
    );

    it(
      "keeps resolution metadata across game room mutations",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",
        });

        roomStore.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "participant-0",
        });

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",

          status:
            "PENDING",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          1,
        );
      },
    );

    it(
      "does not change game revision when resolution metadata changes",
      () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          0,
        );

        roomStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          0,
        );

        roomStore.resolveAbsenceResolution({
          sessionId,

          player:
            "PLAYER_1",

          status:
            "RESOLVED_BY_BOT",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          0,
        );
      },
    );
  },
);