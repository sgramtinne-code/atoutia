import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  LiveRoomStore,
} from "../src/liveRoomStore.js";

import {
  createLiveRoomPersistenceDocument,
  type LiveRoomPersistenceDocument,
} from "../src/liveRoomPersistenceDocument.js";

import {
  SQLiteLiveRoomRepository,
} from "../src/sqliteLiveRoomRepository.js";

const temporaryDirectories:
  string[] = [];

async function createTemporaryDatabasePath():
  Promise<string> {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "atoutia-live-room-",
      ),
    );

  temporaryDirectories.push(
    directory,
  );

  return join(
    directory,
    "atoutia.sqlite",
  );
}

function createDocument(
  mode:
    "PRIVATE" |
    "CASUAL" |
    "RANKED" =
      "CASUAL",
): LiveRoomPersistenceDocument {
  const store =
    new LiveRoomStore();

  const room =
    store.create({
      mode,
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

afterEach(
  async () => {
    const directories =
      temporaryDirectories.splice(
        0,
      );

    for (
      const directory
      of directories
    ) {
      await rm(
        directory,
        {
          recursive:
            true,

          force:
            true,
        },
      );
    }
  },
);

describe(
  "SQLiteLiveRoomRepository",
  () => {
    it(
      "stores and retrieves a room document",
      () => {
        const repository =
          new SQLiteLiveRoomRepository({
            databasePath:
              ":memory:",
          });

        const document =
          createDocument(
            "RANKED",
          );

        repository.save(
          document,
        );

        expect(
          repository.get(
            document.sessionId,
          ),
        ).toEqual(
          document,
        );

        repository.close();
      },
    );

    it(
      "returns undefined for an unknown room",
      () => {
        const repository =
          new SQLiteLiveRoomRepository({
            databasePath:
              ":memory:",
          });

        expect(
          repository.get(
            "ms1_00000000000000000000000000000000",
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "replaces an existing room document",
      () => {
        const repository =
          new SQLiteLiveRoomRepository({
            databasePath:
              ":memory:",
          });

        const store =
          new LiveRoomStore();

        const room =
          store.create({
            mode:
              "PRIVATE",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        const first =
          createLiveRoomPersistenceDocument({
            room,

            mode:
              "PRIVATE",

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

        repository.save(
          first,
        );

        const claimedRoom =
          store.claimSeat({
            sessionId,

            expectedRevision:
              0,

            player:
              "PLAYER_0",

            participantId:
              "participant-0",
          });

        const second =
          createLiveRoomPersistenceDocument({
            room:
              claimedRoom,

            mode:
              "PRIVATE",

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

        repository.save(
          second,
        );

        const loaded =
          repository.get(
            sessionId,
          );

        expect(
          loaded?.room.revision,
        ).toBe(
          1,
        );

        expect(
          loaded,
        ).toEqual(
          second,
        );

        repository.close();
      },
    );

    it(
      "lists stored session identifiers in stable order",
      () => {
        const repository =
          new SQLiteLiveRoomRepository({
            databasePath:
              ":memory:",
          });

        const first =
          createDocument();

        const second =
          createDocument();

        repository.save(
          second,
        );

        repository.save(
          first,
        );

        expect(
          repository.listSessionIds(),
        ).toEqual(
          [
            first.sessionId,
            second.sessionId,
          ].sort(),
        );

        repository.close();
      },
    );

    it(
      "deletes a stored room",
      () => {
        const repository =
          new SQLiteLiveRoomRepository({
            databasePath:
              ":memory:",
          });

        const document =
          createDocument();

        repository.save(
          document,
        );

        expect(
          repository.delete(
            document.sessionId,
          ),
        ).toBe(
          true,
        );

        expect(
          repository.get(
            document.sessionId,
          ),
        ).toBeUndefined();

        expect(
          repository.delete(
            document.sessionId,
          ),
        ).toBe(
          false,
        );

        repository.close();
      },
    );

    it(
      "survives repository close and reopen",
      async () => {
        const databasePath =
          await createTemporaryDatabasePath();

        const document =
          createDocument(
            "RANKED",
          );

        const firstRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        firstRepository.save(
          document,
        );

        firstRepository.close();

        const secondRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        expect(
          secondRepository.get(
            document.sessionId,
          ),
        ).toEqual(
          document,
        );

        expect(
          secondRepository.listSessionIds(),
        ).toEqual([
          document.sessionId,
        ]);

        secondRepository.close();
      },
    );

    it(
      "rejects operations after close",
      () => {
        const repository =
          new SQLiteLiveRoomRepository({
            databasePath:
              ":memory:",
          });

        repository.close();

        expect(
          () =>
            repository.listSessionIds(),
        ).toThrow(
          "SQLite live room repository is closed.",
        );
      },
    );
  },
);