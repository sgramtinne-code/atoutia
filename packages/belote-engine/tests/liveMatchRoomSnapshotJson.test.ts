import {
  describe,
  expect,
  it,
} from "vitest";

import {
  claimRevisionedLiveMatchRoomSeat,
  createLiveMatchRoomSnapshotDocument,
  createRevisionedLiveMatchRoom,
  parseLiveMatchRoomSnapshotDocument,
  serializeLiveMatchRoomSnapshotDocument,
} from "../src/index.js";

function createSnapshot() {
  const initial =
    createRevisionedLiveMatchRoom({
      baseSeed: 1000,

      randomBytes:
        (bytes) => {
          bytes.fill(0xab);

          return bytes;
        },
    });

  const room =
    claimRevisionedLiveMatchRoomSeat({
      room:
        initial,

      expectedRevision:
        initial.revision,

      player:
        "PLAYER_0",

      participantId:
        "participant-a",
    });

  return createLiveMatchRoomSnapshotDocument(
    room,
    "participant-a",
  );
}

describe(
  "live match room snapshot JSON",
  () => {
    it("serializes and parses a valid snapshot", () => {
      const snapshot =
        createSnapshot();

      const json =
        serializeLiveMatchRoomSnapshotDocument(
          snapshot,
        );

      const parsed =
        parseLiveMatchRoomSnapshotDocument(
          json,
        );

      expect(
        parsed,
      ).toEqual(
        snapshot,
      );
    });

    it("returns immutable parsed structures", () => {
      const parsed =
        parseLiveMatchRoomSnapshotDocument(
          serializeLiveMatchRoomSnapshotDocument(
            createSnapshot(),
          ),
        );

      expect(
        Object.isFrozen(parsed),
      ).toBe(true);

      expect(
        Object.isFrozen(
          parsed.seats,
        ),
      ).toBe(true);

      expect(
        parsed.seats.every(
          (seat) =>
            Object.isFrozen(seat),
        ),
      ).toBe(true);
    });

    it("rejects malformed JSON", () => {
      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          "{ invalid",
        ),
      ).toThrow(
        "Live room snapshot JSON is invalid.",
      );
    });

    it("rejects non-object JSON", () => {
      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          "[]",
        ),
      ).toThrow(
        "Live room snapshot document must be an object.",
      );
    });

    it("rejects an unsupported format version", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            formatVersion: 999,
          }),
        ),
      ).toThrow(
        "Unsupported live room snapshot format version.",
      );
    });

    it("rejects an unsupported engine version", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            engineVersion:
              "999.0.0",
          }),
        ),
      ).toThrow(
        "Unsupported live room snapshot engine version.",
      );
    });

    it("rejects an invalid session ID", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            sessionId:
              "invalid",
          }),
        ),
      ).toThrow(
        "Live room snapshot session ID is invalid.",
      );
    });

    it("rejects invalid revisions", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            revision: -1,
          }),
        ),
      ).toThrow(
        "Live room snapshot revision is invalid.",
      );

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            revision: 1.5,
          }),
        ),
      ).toThrow(
        "Live room snapshot revision is invalid.",
      );
    });

    it("rejects an unknown room phase", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            phase: "BROKEN",
          }),
        ),
      ).toThrow(
        "Live room snapshot phase is invalid.",
      );
    });

    it("rejects an invalid player", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            player:
              "PLAYER_9",
          }),
        ),
      ).toThrow(
        "Live room snapshot player is invalid.",
      );
    });

    it("rejects an invalid seat count", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,

            seats:
              snapshot.seats.slice(
                0,
                3,
              ),
          }),
        ),
      ).toThrow(
        "Live room snapshot must contain exactly four seats.",
      );
    });

    it("rejects non-canonical seat order", () => {
      const snapshot =
        createSnapshot();

      const seats = [
        snapshot.seats[1],
        snapshot.seats[0],
        snapshot.seats[2],
        snapshot.seats[3],
      ];

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            seats,
          }),
        ),
      ).toThrow(
        "Live room snapshot seats are not in canonical player order.",
      );
    });

    it("rejects a requesting player whose seat is not occupied", () => {
      const snapshot =
        createSnapshot();

      const seats =
        snapshot.seats.map(
          (seat) =>
            seat.player ===
            "PLAYER_0"
              ? {
                  ...seat,
                  occupied: false,
                }
              : seat,
        );

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            seats,
          }),
        ),
      ).toThrow(
        "Live room snapshot player must occupy a seat.",
      );
    });

    it("rejects mismatched game and room players", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,

            game: {
              ...snapshot.game,

              match: {
                ...snapshot.game.match,
                player:
                  "PLAYER_1",
              },

              actions: {
                ...snapshot.game.actions,
                player:
                  "PLAYER_1",
              },
            },
          }),
        ),
      ).toThrow(
        "Live room snapshot player does not match game snapshot player.",
      );
    });

    it("rejects malformed nested game snapshots", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            game: {
              broken: true,
            },
          }),
        ),
      ).toThrow();
    });

    it("rejects unexpected top-level properties", () => {
      const snapshot =
        createSnapshot();

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            secret:
              "must-not-pass",
          }),
        ),
      ).toThrow(
        "Live room snapshot document structure is invalid.",
      );
    });

    it("rejects unexpected seat properties", () => {
      const snapshot =
        createSnapshot();

      const seats =
        snapshot.seats.map(
          (seat) =>
            seat.player ===
            "PLAYER_0"
              ? {
                  ...seat,
                  participantId:
                    "secret",
                }
              : seat,
        );

      expect(() =>
        parseLiveMatchRoomSnapshotDocument(
          JSON.stringify({
            ...snapshot,
            seats,
          }),
        ),
      ).toThrow(
        "Live room snapshot seat structure is invalid.",
      );
    });
  },
);