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
} from "../src/liveRoomPersistenceDocument.js";

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
    it(
      "refuses to delete an active persisted room",
      async () => {
        const databasePath =
          await createDatabasePath();

        const repository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const store =
          new LiveRoomStore({
            repository,
          });

        const room =
          store.create({
            mode:
              "CASUAL",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        expect(
          () =>
            store.deleteCompleted(
              sessionId,
            ),
        ).toThrow(
          `Cannot delete active live room: ${sessionId}`,
        );

        expect(
          store.count(),
        ).toBe(
          1,
        );

        expect(
          store.get(
            sessionId,
          ),
        ).toBeDefined();

        expect(
          repository.get(
            sessionId,
          ),
        ).toBeDefined();

        repository.close();
      },
    );

    it(
      "deletes a completed room from memory and persistence",
      async () => {
        const databasePath =
          await createDatabasePath();

        const repository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const store =
          new LiveRoomStore({
            repository,
          });

        const room =
          store.create({
            mode:
              "RANKED",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        claimAllSeats(
          store,
          sessionId,
          "completed",
        );

        store.start({
          sessionId,

          expectedRevision:
            4,
        });

        store.forfeitForPlayerAbsence({
          sessionId,

          player:
            "PLAYER_0",

          completedAtMs:
            777_000,
        });

        expect(
          store.getAdjudication(
            sessionId,
          ).status,
        ).toBe(
          "COMPLETED",
        );

        expect(
          store.count(),
        ).toBe(
          1,
        );

        expect(
          repository.get(
            sessionId,
          ),
        ).toBeDefined();

        expect(
          store.deleteCompleted(
            sessionId,
          ),
        ).toBe(
          true,
        );

        expect(
          store.count(),
        ).toBe(
          0,
        );

        expect(
          store.get(
            sessionId,
          ),
        ).toBeUndefined();

        expect(
          repository.get(
            sessionId,
          ),
        ).toBeUndefined();

        expect(
          repository.listSessionIds(),
        ).not.toContain(
          sessionId,
        );

        expect(
          store.deleteCompleted(
            sessionId,
          ),
        ).toBe(
          false,
        );

        repository.close();
      },
    );

    it(
      "persists creation activity timestamps",
      async () => {
        const databasePath =
          await createDatabasePath();

        const repository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const nowMs =
          100_000;

        const store =
          new LiveRoomStore({
            repository,

            activityNow:
              () =>
                nowMs,
          });

        const room =
          store.create({
            mode:
              "PRIVATE",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        expect(
          store.getActivityTimestamps(
            sessionId,
          ),
        ).toEqual({
          createdAtMs:
            nowMs,

          lastActivityAtMs:
            nowMs,
        });

        expect(
          repository.get(
            sessionId,
          ),
        ).toMatchObject({
          createdAtMs:
            nowMs,

          lastActivityAtMs:
            nowMs,
        });

        repository.close();
      },
    );

    it(
      "updates last activity timestamp after a room mutation",
      async () => {
        const databasePath =
          await createDatabasePath();

        const repository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        let nowMs =
          200_000;

        const store =
          new LiveRoomStore({
            repository,

            activityNow:
              () =>
                nowMs,
          });

        const room =
          store.create({
            mode:
              "PRIVATE",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        nowMs =
          205_000;

        store.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "activity-player-0",
        });

        expect(
          store.getActivityTimestamps(
            sessionId,
          ),
        ).toEqual({
          createdAtMs:
            200_000,

          lastActivityAtMs:
            205_000,
        });

        expect(
          repository.get(
            sessionId,
          ),
        ).toMatchObject({
          createdAtMs:
            200_000,

          lastActivityAtMs:
            205_000,
        });

        repository.close();
      },
    );

    it(
      "preserves creation timestamp across multiple mutations",
      async () => {
        const databasePath =
          await createDatabasePath();

        const repository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        let nowMs =
          300_000;

        const store =
          new LiveRoomStore({
            repository,

            activityNow:
              () =>
                nowMs,
          });

        const room =
          store.create({
            mode:
              "PRIVATE",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        nowMs =
          310_000;

        store.claimSeat({
          sessionId,

          expectedRevision:
            0,

          player:
            "PLAYER_0",

          participantId:
            "persistent-created-at-player",
        });

        nowMs =
          320_000;

        store.releaseSeat({
          sessionId,

          expectedRevision:
            1,

          player:
            "PLAYER_0",

          participantId:
            "persistent-created-at-player",
        });

        expect(
          store.getActivityTimestamps(
            sessionId,
          ),
        ).toEqual({
          createdAtMs:
            300_000,

          lastActivityAtMs:
            320_000,
        });

        expect(
          repository.get(
            sessionId,
          ),
        ).toMatchObject({
          createdAtMs:
            300_000,

          lastActivityAtMs:
            320_000,
        });

        repository.close();
      },
    );

    it(
      "migrates legacy null activity timestamps without expiring the room",
      async () => {
        const databasePath =
          await createDatabasePath();

        const repository =
          new SQLiteLiveRoomRepository({
            databasePath,
          });

        const sourceStore =
          new LiveRoomStore({
            activityNow:
              () =>
                400_000,
          });

        const room =
          sourceStore.create({
            mode:
              "PRIVATE",
          });

        const sessionId =
          room.managedRoom.room.session
            .sessionId;

        repository.save(
          createLiveRoomPersistenceDocument({
            room,

            mode:
              sourceStore.requireMode(
                sessionId,
              ),

            adjudication:
              sourceStore.getAdjudication(
                sessionId,
              ),

            absenceResolutions:
              sourceStore.listAbsenceResolutions(
                sessionId,
              ),

            seatControls:
              sourceStore.listSeatControls(
                sessionId,
              ),

            createdAtMs:
              null,

            lastActivityAtMs:
              null,
          }),
        );

        const migrationNowMs =
          500_000;

        const migratedStore =
          new LiveRoomStore({
            repository,

            activityNow:
              () =>
                migrationNowMs,
          });

        expect(
          migratedStore.count(),
        ).toBe(
          1,
        );

        expect(
          migratedStore.get(
            sessionId,
          ),
        ).toBeDefined();

        expect(
          migratedStore.getActivityTimestamps(
            sessionId,
          ),
        ).toEqual({
          createdAtMs:
            migrationNowMs,

          lastActivityAtMs:
            migrationNowMs,
        });

        expect(
          repository.get(
            sessionId,
          ),
        ).toMatchObject({
          createdAtMs:
            migrationNowMs,

          lastActivityAtMs:
            migrationNowMs,
        });

        repository.close();
      },
    );

  },
);
