import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createLiveRoomSummary,
  LiveRoomStore,
} from "../src/liveRoomStore.js";

describe(
  "live room store",
  () => {
    it("starts empty", () => {
      const store =
        new LiveRoomStore();

      expect(
        store.count(),
      ).toBe(0);
    });

    it("creates and stores a room", () => {
      const store =
        new LiveRoomStore();

      const room =
        store.create();

      const sessionId =
        room.managedRoom.room
          .session.sessionId;

      expect(
        store.count(),
      ).toBe(1);

      expect(
        store.get(
          sessionId,
        ),
      ).toBe(room);
    });

    it("creates a safe initial room summary", () => {
      const store =
        new LiveRoomStore();

      const room =
        store.create();

      const summary =
        createLiveRoomSummary(
          room,
        );

      expect(
        summary.phase,
      ).toBe(
        "WAITING_FOR_PLAYERS",
      );

      expect(
        summary.revision,
      ).toBe(0);

      expect(
        summary.occupiedSeats,
      ).toBe(0);

      expect(
        "baseSeed" in summary,
      ).toBe(false);
    });
  },
);