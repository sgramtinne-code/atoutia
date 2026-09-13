import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  executePendingAbsenceResolution,
  type AbsenceResolutionExecutionHandlers,
} from "../src/absenceResolutionExecutor.js";

import {
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

function createHandlers():
  {
    readonly handlers:
      AbsenceResolutionExecutionHandlers;

    readonly executeBotTakeover:
      ReturnType<
        typeof vi.fn
      >;

    readonly executeTeamForfeit:
      ReturnType<
        typeof vi.fn
      >;
  } {
  const executeBotTakeover =
    vi.fn();

  const executeTeamForfeit =
    vi.fn();

  return {
    executeBotTakeover,
    executeTeamForfeit,

    handlers: {
      executeBotTakeover,
      executeTeamForfeit,
    },
  };
}

describe(
  "absence resolution executor",
  () => {
    it(
      "returns NO_PENDING_RESOLUTION when nothing is stored",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const {
          handlers,
          executeBotTakeover,
          executeTeamForfeit,
        } =
          createHandlers();

        const result =
          await executePendingAbsenceResolution({
            roomStore,
            handlers,
            sessionId,

            player:
              "PLAYER_0",
          });

        expect(
          result,
        ).toEqual({
          status:
            "NO_PENDING_RESOLUTION",

          resolution:
            null,
        });

        expect(
          executeBotTakeover,
        ).not.toHaveBeenCalled();

        expect(
          executeTeamForfeit,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "keeps MANUAL_ONLY pending and requires manual action",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const {
          handlers,
          executeBotTakeover,
          executeTeamForfeit,
        } =
          createHandlers();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_0",

            action:
              "MANUAL_ONLY",
          });

        const result =
          await executePendingAbsenceResolution({
            roomStore,
            handlers,
            sessionId,

            player:
              "PLAYER_0",
          });

        expect(
          result.status,
        ).toBe(
          "MANUAL_ACTION_REQUIRED",
        );

        expect(
          result.resolution,
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "MANUAL_ONLY",

          status:
            "PENDING",
        });

        expect(
          executeBotTakeover,
        ).not.toHaveBeenCalled();

        expect(
          executeTeamForfeit,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "executes BOT_TAKEOVER and resolves it only after success",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const {
          handlers,
          executeBotTakeover,
          executeTeamForfeit,
        } =
          createHandlers();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        const result =
          await executePendingAbsenceResolution({
            roomStore,
            handlers,
            sessionId,

            player:
              "PLAYER_1",
          });

        expect(
          executeBotTakeover,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          executeBotTakeover,
        ).toHaveBeenCalledWith({
          sessionId,

          player:
            "PLAYER_1",
        });

        expect(
          executeTeamForfeit,
        ).not.toHaveBeenCalled();

        expect(
          result,
        ).toEqual({
          status:
            "EXECUTED",

          resolution: {
            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",

            status:
              "RESOLVED_BY_BOT",
          },
        });
      },
    );

    it(
      "executes TEAM_FORFEIT and resolves it only after success",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const {
          handlers,
          executeBotTakeover,
          executeTeamForfeit,
        } =
          createHandlers();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_2",

            action:
              "TEAM_FORFEIT",
          });

        const result =
          await executePendingAbsenceResolution({
            roomStore,
            handlers,
            sessionId,

            player:
              "PLAYER_2",
          });

        expect(
          executeTeamForfeit,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          executeTeamForfeit,
        ).toHaveBeenCalledWith({
          sessionId,

          player:
            "PLAYER_2",
        });

        expect(
          executeBotTakeover,
        ).not.toHaveBeenCalled();

        expect(
          result,
        ).toEqual({
          status:
            "EXECUTED",

          resolution: {
            player:
              "PLAYER_2",

            action:
              "TEAM_FORFEIT",

            status:
              "RESOLVED_BY_FORFEIT",
          },
        });
      },
    );

    it(
      "keeps BOT_TAKEOVER pending when execution fails",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const executeBotTakeover =
          vi.fn(
            () => {
              throw new Error(
                "Bot takeover failed.",
              );
            },
          );

        const handlers:
          AbsenceResolutionExecutionHandlers = {
            executeBotTakeover,

            executeTeamForfeit:
              vi.fn(),
          };

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        await expect(
          executePendingAbsenceResolution({
            roomStore,
            handlers,
            sessionId,

            player:
              "PLAYER_1",
          }),
        ).rejects.toThrow(
          "Bot takeover failed.",
        );

        expect(
          roomStore
            .getAbsenceResolution(
              sessionId,
              "PLAYER_1",
            ),
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
      "keeps TEAM_FORFEIT pending when execution fails",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const executeTeamForfeit =
          vi.fn(
            async () => {
              throw new Error(
                "Team forfeit failed.",
              );
            },
          );

        const handlers:
          AbsenceResolutionExecutionHandlers = {
            executeBotTakeover:
              vi.fn(),

            executeTeamForfeit,
          };

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_2",

            action:
              "TEAM_FORFEIT",
          });

        await expect(
          executePendingAbsenceResolution({
            roomStore,
            handlers,
            sessionId,

            player:
              "PLAYER_2",
          }),
        ).rejects.toThrow(
          "Team forfeit failed.",
        );

        expect(
          roomStore
            .getAbsenceResolution(
              sessionId,
              "PLAYER_2",
            ),
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
      "does not execute an already resolved BOT_TAKEOVER twice",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const {
          handlers,
          executeBotTakeover,
        } =
          createHandlers();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        await executePendingAbsenceResolution({
          roomStore,
          handlers,
          sessionId,

          player:
            "PLAYER_1",
        });

        const secondResult =
          await executePendingAbsenceResolution({
            roomStore,
            handlers,
            sessionId,

            player:
              "PLAYER_1",
          });

        expect(
          executeBotTakeover,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          secondResult.status,
        ).toBe(
          "ALREADY_RESOLVED",
        );

        expect(
          secondResult.resolution,
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
      "does not change the game revision",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createRoom();

        const {
          handlers,
        } =
          createHandlers();

        roomStore
          .markAbsenceResolutionPending({
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

        await executePendingAbsenceResolution({
          roomStore,
          handlers,
          sessionId,

          player:
            "PLAYER_1",
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