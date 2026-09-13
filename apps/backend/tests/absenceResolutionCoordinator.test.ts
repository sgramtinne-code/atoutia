import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createAbsenceResolutionCoordinator,
} from "../src/absenceResolutionCoordinator.js";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

interface StartedRoom {
  readonly roomStore:
    LiveRoomStore;

  readonly sessionId:
    string;
}

function createStartedRoom():
  StartedRoom {
  const roomStore =
    new LiveRoomStore();

  const room =
    roomStore.create({
      mode:
        "CASUAL",
    });

  const sessionId =
    room.managedRoom.room.session
      .sessionId;

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      0,

    player:
      "PLAYER_0",

    participantId:
      "participant-0",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      "participant-1",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      "participant-2",
  });

  roomStore.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      "participant-3",
  });

  roomStore.start({
    sessionId,

    expectedRevision:
      4,
  });

  return Object.freeze({
    roomStore,
    sessionId,
  });
}

async function flushMicrotasks():
  Promise<void> {
  for (
    let index =
      0;
    index <
      8;
    index +=
      1
  ) {
    await Promise.resolve();
  }
}

describe(
  "absence resolution coordinator",
  () => {
    it(
      "executes a pending BOT takeover and requests a BOT cycle",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        const requestBotCycle =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
          });

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        await flushMicrotasks();

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          controller:
            "BOT",
        });

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          action:
            "BOT_TAKEOVER",

          status:
            "RESOLVED_BY_BOT",
        });

        expect(
          roomStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        expect(
          requestBotCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          requestBotCycle,
        ).toHaveBeenCalledWith(
          sessionId,
        );

        coordinator.close();
      },
    );

    it(
      "does nothing when there is no pending resolution",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        const requestBotCycle =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
          });

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        await flushMicrotasks();

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ).controller,
        ).toBe(
          "HUMAN",
        );

        expect(
          requestBotCycle,
        ).not.toHaveBeenCalled();

        coordinator.close();
      },
    );

    it(
      "leaves MANUAL_ONLY pending without automatic execution",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "MANUAL_ONLY",
          });

        const requestBotCycle =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
          });

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        await flushMicrotasks();

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          action:
            "MANUAL_ONLY",

          status:
            "PENDING",
        });

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ).controller,
        ).toBe(
          "HUMAN",
        );

        expect(
          requestBotCycle,
        ).not.toHaveBeenCalled();

        coordinator.close();
      },
    );

    it(
      "leaves TEAM_FORFEIT pending until ranked adjudication exists",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "TEAM_FORFEIT",
          });

        const requestBotCycle =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
          });

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        await flushMicrotasks();

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_1",
          ),
        ).toEqual({
          player:
            "PLAYER_1",

          action:
            "TEAM_FORFEIT",

          status:
            "PENDING",
        });

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ).controller,
        ).toBe(
          "HUMAN",
        );

        expect(
          requestBotCycle,
        ).not.toHaveBeenCalled();

        coordinator.close();
      },
    );

    it(
      "coalesces repeated requests for the same player",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        const requestBotCycle =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
          });

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        await flushMicrotasks();

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_1",
          )?.status,
        ).toBe(
          "RESOLVED_BY_BOT",
        );

        expect(
          requestBotCycle,
        ).toHaveBeenCalledTimes(
          1,
        );

        coordinator.close();
      },
    );

    it(
      "keeps BOT takeover pending and does not schedule a BOT cycle when takeover fails",
      async () => {
        const roomStore =
          new LiveRoomStore();

        const room =
          roomStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_0",

            action:
              "BOT_TAKEOVER",
          });

        const requestBotCycle =
          vi.fn();

        const onError =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
            onError,
          });

        coordinator.request(
          sessionId,
          "PLAYER_0",
        );

        await flushMicrotasks();

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "BOT_TAKEOVER",

          status:
            "PENDING",
        });

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          controller:
            "HUMAN",
        });

        expect(
          requestBotCycle,
        ).not.toHaveBeenCalled();

        expect(
          onError,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          onError.mock.calls[0]?.[1],
        ).toEqual({
          sessionId,

          player:
            "PLAYER_0",
        });

        coordinator.close();
      },
    );

    it(
      "cancels a pending request when closed",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        const requestBotCycle =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
          });

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        coordinator.close();

        await flushMicrotasks();

        expect(
          roomStore.getAbsenceResolution(
            sessionId,
            "PLAYER_1",
          )?.status,
        ).toBe(
          "PENDING",
        );

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ).controller,
        ).toBe(
          "HUMAN",
        );

        expect(
          requestBotCycle,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "keeps different players independent",
      async () => {
        const {
          roomStore,
          sessionId,
        } =
          createStartedRoom();

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_1",

            action:
              "BOT_TAKEOVER",
          });

        roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              "PLAYER_2",

            action:
              "BOT_TAKEOVER",
          });

        const requestBotCycle =
          vi.fn();

        const coordinator =
          createAbsenceResolutionCoordinator({
            roomStore,
            requestBotCycle,
          });

        coordinator.request(
          sessionId,
          "PLAYER_1",
        );

        coordinator.request(
          sessionId,
          "PLAYER_2",
        );

        await flushMicrotasks();

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_1",
          ).controller,
        ).toBe(
          "BOT",
        );

        expect(
          roomStore.getSeatControl(
            sessionId,
            "PLAYER_2",
          ).controller,
        ).toBe(
          "BOT",
        );

        expect(
          requestBotCycle,
        ).toHaveBeenCalledTimes(
          2,
        );

        coordinator.close();
      },
    );
  },
);