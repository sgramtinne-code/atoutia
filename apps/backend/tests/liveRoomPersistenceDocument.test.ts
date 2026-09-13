import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  LIVE_ROOM_PERSISTENCE_FORMAT_VERSION,
  createLiveRoomPersistenceDocument,
  parseLiveRoomPersistenceDocument,
  serializeLiveRoomPersistenceDocument,
} from "../src/liveRoomPersistenceDocument.js";

function createDocument() {
  const store =
    new LiveRoomStore();

  const room =
    store.create({
      mode:
        "RANKED",
    });

  const sessionId =
    room.managedRoom.room.session
      .sessionId;

  return createLiveRoomPersistenceDocument({
    room,

    mode:
      store.requireMode(
        sessionId,
      ),

    adjudication:
      store.getAdjudication(
        sessionId,
      ),

    absenceResolutions:
      store.listAbsenceResolutions(
        sessionId,
      ),

    seatControls:
      store.listSeatControls(
        sessionId,
      ),
  });
}

describe(
  "live room persistence document",
  () => {
    it(
      "uses format version 1",
      () => {
        expect(
          LIVE_ROOM_PERSISTENCE_FORMAT_VERSION,
        ).toBe(
          1,
        );
      },
    );

    it(
      "creates a complete room persistence document",
      () => {
        const document =
          createDocument();

        expect(
          document.formatVersion,
        ).toBe(
          1,
        );

        expect(
          document.sessionId,
        ).toBe(
          document.room.managedRoom.room
            .session.sessionId,
        );

        expect(
          document.mode,
        ).toBe(
          "RANKED",
        );

        expect(
          document.adjudication,
        ).toEqual({
          status:
            "ACTIVE",

          completion:
            null,

          completedAtMs:
            null,
        });

        expect(
          document.absenceResolutions,
        ).toEqual(
          [],
        );

        expect(
          document.seatControls,
        ).toEqual([
          {
            player:
              "PLAYER_0",

            controller:
              "HUMAN",
          },

          {
            player:
              "PLAYER_1",

            controller:
              "HUMAN",
          },

          {
            player:
              "PLAYER_2",

            controller:
              "HUMAN",
          },

          {
            player:
              "PLAYER_3",

            controller:
              "HUMAN",
          },
        ]);
      },
    );

    it(
      "serializes and parses a document",
      () => {
        const document =
          createDocument();

        const parsed =
          parseLiveRoomPersistenceDocument(
            serializeLiveRoomPersistenceDocument(
              document,
            ),
          );

        expect(
          parsed,
        ).toEqual(
          document,
        );
      },
    );

    it(
      "rejects invalid JSON",
      () => {
        expect(
          () =>
            parseLiveRoomPersistenceDocument(
              "{",
            ),
        ).toThrow(
          "Invalid persisted live room JSON.",
        );
      },
    );

    it(
      "rejects an unsupported format version",
      () => {
        const document =
          createDocument();

        const raw =
          JSON.parse(
            serializeLiveRoomPersistenceDocument(
              document,
            ),
          ) as Record<
            string,
            unknown
          >;

        raw.formatVersion =
          2;

        expect(
          () =>
            parseLiveRoomPersistenceDocument(
              JSON.stringify(
                raw,
              ),
            ),
        ).toThrow(
          "Unsupported persisted live room format version.",
        );
      },
    );

    it(
      "rejects a session identifier mismatch",
      () => {
        const document =
          createDocument();

        const raw =
          JSON.parse(
            serializeLiveRoomPersistenceDocument(
              document,
            ),
          ) as Record<
            string,
            unknown
          >;

        raw.sessionId =
          "ms1_00000000000000000000000000000000";

        expect(
          () =>
            parseLiveRoomPersistenceDocument(
              JSON.stringify(
                raw,
              ),
            ),
        ).toThrow(
          "Persisted live room session mismatch:",
        );
      },
    );

    it(
      "returns frozen document arrays",
      () => {
        const document =
          createDocument();

        expect(
          Object.isFrozen(
            document,
          ),
        ).toBe(
          true,
        );

        expect(
          Object.isFrozen(
            document.absenceResolutions,
          ),
        ).toBe(
          true,
        );

        expect(
          Object.isFrozen(
            document.seatControls,
          ),
        ).toBe(
          true,
        );
      },
    );
  },
);