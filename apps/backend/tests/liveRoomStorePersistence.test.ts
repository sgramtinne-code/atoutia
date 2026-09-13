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
  SQLiteLiveRoomRepository,
} from "../src/sqliteLiveRoomRepository.js";

const temporaryDirectories:
  string[] = [];

async function createDatabasePath():
  Promise<string> {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "atoutia-store-persistence-",
      ),
    );

  temporaryDirectories.push(
    directory,
  );

  return join(
    directory,
    "live-rooms.sqlite",
  );
}

function claimAllSeats(
  store:
    LiveRoomStore,

  sessionId:
    string,

  prefix:
    string,
): void {
  store.claimSeat({
    sessionId,

    expectedRevision:
      0,

    player:
      "PLAYER_0",

    participantId:
      `${prefix}-0`,
  });

  store.claimSeat({
    sessionId,

    expectedRevision:
      1,

    player:
      "PLAYER_1",

    participantId:
      `${prefix}-1`,
  });

  store.claimSeat({
    sessionId,

    expectedRevision:
      2,

    player:
      "PLAYER_2",

    participantId:
      `${prefix}-2`,
  });

  store.claimSeat({
    sessionId,

    expectedRevision:
      3,

    player:
      "PLAYER_3",

    participantId:
      `${prefix}-3`,
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
  "LiveRoomStore persistence",
  () => {
    it(
      "persists a newly created room and hydrates it in a new store",
      async () => {
        const databasePath =
          await createDatabasePath();

        const firstRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const firstStore =
          new LiveRoomStore({
            repository:
              firstRepository,
          });

        const room =
          firstStore.create({
            mode:
              "RANKED",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        expect(
          firstRepository.get(
            sessionId,
          ),
        ).toBeDefined();

        firstRepository.close();

        const secondRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const secondStore =
          new LiveRoomStore({
            repository:
              secondRepository,
          });

        expect(
          secondStore.count(),
        ).toBe(
          1,
        );

        expect(
          secondStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          0,
        );

        expect(
          secondStore.requireMode(
            sessionId,
          ),
        ).toBe(
          "RANKED",
        );

        expect(
          secondStore.getAdjudication(
            sessionId,
          ),
        ).toEqual({
          status:
            "ACTIVE",

          completion:
            null,

          completedAtMs:
            null,
        });

        expect(
          secondStore.listSeatControls(
            sessionId,
          ),
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

        secondRepository.close();
      },
    );

    it(
      "persists authoritative room mutations and restores a usable engine room",
      async () => {
        const databasePath =
          await createDatabasePath();

        const firstRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const firstStore =
          new LiveRoomStore({
            repository:
              firstRepository,
          });

        const room =
          firstStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        claimAllSeats(
          firstStore,
          sessionId,
          "player",
        );

        firstStore.start({
          sessionId,

          expectedRevision:
            4,
        });

        firstStore.applyCommand({
          sessionId,

          participantId:
            "player-1",

          document: {
            formatVersion:
              1,

            engineVersion:
              "0.1.0",

            sessionId,

            expectedRevision:
              5,

            command: {
              type:
                "PASS",
            },
          },
        });

        expect(
          firstStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          6,
        );

        firstRepository.close();

        const secondRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const secondStore =
          new LiveRoomStore({
            repository:
              secondRepository,
          });

        expect(
          secondStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          6,
        );

        expect(
          secondStore.get(
            sessionId,
          )?.managedRoom.phase,
        ).toBe(
          "IN_PROGRESS",
        );

        const snapshot =
          secondStore.createParticipantSnapshot({
            sessionId,

            participantId:
              "player-1",
          });

        expect(
          snapshot.revision,
        ).toBe(
          6,
        );

        expect(
          snapshot.player,
        ).toBe(
          "PLAYER_1",
        );

        expect(
          snapshot.game.match.public
            .biddingPlayer,
        ).toBe(
          "PLAYER_2",
        );

        secondRepository.close();
      },
    );

    it(
      "persists seat control absence resolution and FORFEIT adjudication",
      async () => {
        const databasePath =
          await createDatabasePath();

        const firstRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const firstStore =
          new LiveRoomStore({
            repository:
              firstRepository,
          });

        const room =
          firstStore.create({
            mode:
              "RANKED",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        claimAllSeats(
          firstStore,
          sessionId,
          "ranked",
        );

        firstStore.start({
          sessionId,

          expectedRevision:
            4,
        });

        firstStore.transferSeatControlToBot({
          sessionId,

          player:
            "PLAYER_0",
        });

        firstStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_0",

          action:
            "TEAM_FORFEIT",
        });

        firstStore.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_0",

          completedAtMs:
            555_000,
        });

        expect(
          firstStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        firstRepository.close();

        const secondRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const secondStore =
          new LiveRoomStore({
            repository:
              secondRepository,
          });

        expect(
          secondStore.get(
            sessionId,
          )?.revision,
        ).toBe(
          5,
        );

        expect(
          secondStore.getSeatControl(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          controller:
            "BOT",
        });

        expect(
          secondStore.getAbsenceResolution(
            sessionId,
            "PLAYER_0",
          ),
        ).toEqual({
          player:
            "PLAYER_0",

          action:
            "TEAM_FORFEIT",

          status:
            "PENDING",
        });

        expect(
          secondStore.getAdjudication(
            sessionId,
          ),
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
            555_000,
        });

        secondRepository.close();
      },
    );

    it(
      "persists a resolved absence resolution",
      async () => {
        const databasePath =
          await createDatabasePath();

        const firstRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const firstStore =
          new LiveRoomStore({
            repository:
              firstRepository,
          });

        const room =
          firstStore.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        firstStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_2",

          action:
            "BOT_TAKEOVER",
        });

        firstStore.resolveAbsenceResolution({
          sessionId,

          player:
            "PLAYER_2",

          status:
            "RESOLVED_BY_BOT",
        });

        firstRepository.close();

        const secondRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const secondStore =
          new LiveRoomStore({
            repository:
              secondRepository,
          });

        expect(
          secondStore.getAbsenceResolution(
            sessionId,
            "PLAYER_2",
          ),
        ).toEqual({
          player:
            "PLAYER_2",

          action:
            "BOT_TAKEOVER",

          status:
            "RESOLVED_BY_BOT",
        });

        secondRepository.close();
      },
    );

    it(
      "persists clearing a pending absence resolution",
      async () => {
        const databasePath =
          await createDatabasePath();

        const firstRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const firstStore =
          new LiveRoomStore({
            repository:
              firstRepository,
          });

        const room =
          firstStore.create({
            mode:
              "PRIVATE",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        firstStore.markAbsenceResolutionPending({
          sessionId,

          player:
            "PLAYER_3",

          action:
            "MANUAL_ONLY",
        });

        expect(
          firstStore.clearAbsenceResolution({
            sessionId,

            player:
              "PLAYER_3",
          }),
        ).toBe(
          true,
        );

        firstRepository.close();

        const secondRepository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const secondStore =
          new LiveRoomStore({
            repository:
              secondRepository,
          });

        expect(
          secondStore.getAbsenceResolution(
            sessionId,
            "PLAYER_3",
          ),
        ).toBeUndefined();

        expect(
          secondStore.listAbsenceResolutions(
            sessionId,
          ),
        ).toEqual(
          [],
        );

        secondRepository.close();
      },
    );
  },
);