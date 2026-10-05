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
  createForfeitMatchResult,
  createNormalMatchResult,
  type MatchResult,
  type MatchResultParticipants,
} from "../src/matchResult.js";

import {
  SQLiteMatchResultRepository,
} from "../src/sqliteMatchResultRepository.js";

const temporaryDirectories:
  string[] = [];

const SESSION_0 =
  "ms1_00000000000000000000000000000000";

const SESSION_1 =
  "ms1_00000000000000000000000000000001";

const SESSION_2 =
  "ms1_00000000000000000000000000000002";

const SESSION_3 =
  "ms1_00000000000000000000000000000003";

const PARTICIPANTS =
  Object.freeze({
    PLAYER_0:
      "participant-0",

    PLAYER_1:
      "participant-1",

    PLAYER_2:
      "participant-2",

    PLAYER_3:
      "participant-3",
  });

async function createDatabasePath():
  Promise<string> {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "atoutia-match-result-",
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

function createNormalResult(
  options: {
    readonly sessionId:
      string;

    readonly completedAtMs:
      number;

    readonly participants?:
      MatchResultParticipants;

    readonly team0Score?:
      number;

    readonly team1Score?:
      number;
  },
): MatchResult {
  return createNormalMatchResult({
    sessionId:
      options.sessionId,

    mode:
      "RANKED",

    participants:
      options.participants ??
      PARTICIPANTS,

    completedAtMs:
      options.completedAtMs,

    winningTeam:
      "TEAM_0",

    score: {
      targetScore:
        1_000,

      TEAM_0:
        options.team0Score ??
        1_020,

      TEAM_1:
        options.team1Score ??
        850,
    },
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
  "SQLiteMatchResultRepository",
  () => {
    it(
      "stores and retrieves a normal match result",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const result =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              10_000,
          });

        repository.save(
          result,
        );

        expect(
          repository.get(
            result.sessionId,
          ),
        ).toEqual(
          result,
        );

        repository.close();
      },
    );

    it(
      "stores and retrieves a forfeit match result",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const result =
          createForfeitMatchResult({
            sessionId:
              SESSION_0,

            mode:
              "RANKED",

            participants:
              PARTICIPANTS,

            completedAtMs:
              20_000,

            forfeitingPlayer:
              "PLAYER_3",

            losingTeam:
              "TEAM_1",

            winningTeam:
              "TEAM_0",
          });

        repository.save(
          result,
        );

        expect(
          repository.get(
            result.sessionId,
          ),
        ).toEqual(
          result,
        );

        repository.close();
      },
    );

    it(
      "returns undefined for an unknown session",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        expect(
          repository.get(
            SESSION_0,
          ),
        ).toBeUndefined();

        repository.close();
      },
    );

    it(
      "allows saving the same immutable result more than once",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const result =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              30_000,
          });

        repository.save(
          result,
        );

        expect(
          () =>
            repository.save(
              result,
            ),
        ).not.toThrow();

        expect(
          repository.get(
            result.sessionId,
          ),
        ).toEqual(
          result,
        );

        repository.close();
      },
    );

    it(
      "rejects replacing an immutable result with different content",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const first =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              40_000,
          });

        const conflicting =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              41_000,
          });

        repository.save(
          first,
        );

        expect(
          () =>
            repository.save(
              conflicting,
            ),
        ).toThrow(
          `Match result already exists with different content: ${SESSION_0}`,
        );

        expect(
          repository.get(
            SESSION_0,
          ),
        ).toEqual(
          first,
        );

        repository.close();
      },
    );

    it(
      "indexes a result for all four participants",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const result =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              50_000,
          });

        repository.save(
          result,
        );

        for (
          const participantId
          of Object.values(
            PARTICIPANTS,
          )
        ) {
          expect(
            repository
              .listLatestByParticipant(
                participantId,
                10,
              ),
          ).toEqual([
            result,
          ]);
        }

        repository.close();
      },
    );

    it(
      "lists participant history from newest to oldest",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const oldest =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              10_000,
          });

        const newest =
          createNormalResult({
            sessionId:
              SESSION_2,

            completedAtMs:
              30_000,
          });

        const middle =
          createNormalResult({
            sessionId:
              SESSION_1,

            completedAtMs:
              20_000,
          });

        repository.save(
          oldest,
        );

        repository.save(
          newest,
        );

        repository.save(
          middle,
        );

        expect(
          repository
            .listLatestByParticipant(
              PARTICIPANTS.PLAYER_0,
              10,
            ),
        ).toEqual([
          newest,
          middle,
          oldest,
        ]);

        repository.close();
      },
    );

    it(
      "uses session identifier as a stable tie breaker",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const first =
          createNormalResult({
            sessionId:
              SESSION_1,

            completedAtMs:
              60_000,
          });

        const second =
          createNormalResult({
            sessionId:
              SESSION_2,

            completedAtMs:
              60_000,
          });

        repository.save(
          first,
        );

        repository.save(
          second,
        );

        expect(
          repository
            .listLatestByParticipant(
              PARTICIPANTS.PLAYER_0,
              10,
            ),
        ).toEqual([
          second,
          first,
        ]);

        repository.close();
      },
    );

    it(
      "limits participant history results",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const results =
          [
            createNormalResult({
              sessionId:
                SESSION_0,

              completedAtMs:
                10_000,
            }),

            createNormalResult({
              sessionId:
                SESSION_1,

              completedAtMs:
                20_000,
            }),

            createNormalResult({
              sessionId:
                SESSION_2,

              completedAtMs:
                30_000,
            }),
          ];

        for (
          const result
          of results
        ) {
          repository.save(
            result,
          );
        }

        expect(
          repository
            .listLatestByParticipant(
              PARTICIPANTS.PLAYER_0,
              2,
            ),
        ).toEqual([
          results[2],
          results[1],
        ]);

        repository.close();
      },
    );

    it(
      "returns an empty history for an unknown participant",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        repository.save(
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              70_000,
          }),
        );

        expect(
          repository
            .listLatestByParticipant(
              "participant-unknown",
              10,
            ),
        ).toEqual([]);

        repository.close();
      },
    );

    it(
      "keeps histories isolated between participants",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const sharedResult =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              80_000,
          });

        const alternateParticipants =
          Object.freeze({
            PLAYER_0:
              PARTICIPANTS.PLAYER_0,

            PLAYER_1:
              "other-participant-1",

            PLAYER_2:
              "other-participant-2",

            PLAYER_3:
              "other-participant-3",
          });

        const secondResult =
          createNormalResult({
            sessionId:
              SESSION_1,

            completedAtMs:
              90_000,

            participants:
              alternateParticipants,
          });

        repository.save(
          sharedResult,
        );

        repository.save(
          secondResult,
        );

        expect(
          repository
            .listLatestByParticipant(
              PARTICIPANTS.PLAYER_0,
              10,
            ),
        ).toEqual([
          secondResult,
          sharedResult,
        ]);

        expect(
          repository
            .listLatestByParticipant(
              PARTICIPANTS.PLAYER_1,
              10,
            ),
        ).toEqual([
          sharedResult,
        ]);

        expect(
          repository
            .listLatestByParticipant(
              "other-participant-1",
              10,
            ),
        ).toEqual([
          secondResult,
        ]);

        repository.close();
      },
    );

    it(
      "rejects invalid history query arguments",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        expect(
          () =>
            repository
              .listLatestByParticipant(
                " participant-0",
                10,
              ),
        ).toThrow(
          "Match result participant identifier is invalid.",
        );

        expect(
          () =>
            repository
              .listLatestByParticipant(
                PARTICIPANTS.PLAYER_0,
                0,
              ),
        ).toThrow(
          "Match result query limit must be a positive safe integer.",
        );

        repository.close();
      },
    );

    it(
      "survives repository close and reopen",
      async () => {
        const databasePath =
          await createDatabasePath();

        const firstResult =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              100_000,
          });

        const secondResult =
          createForfeitMatchResult({
            sessionId:
              SESSION_3,

            mode:
              "RANKED",

            participants:
              PARTICIPANTS,

            completedAtMs:
              110_000,

            forfeitingPlayer:
              "PLAYER_1",

            losingTeam:
              "TEAM_1",

            winningTeam:
              "TEAM_0",
          });

        const firstRepository =
          new SQLiteMatchResultRepository({
            databasePath,
          });

        firstRepository.save(
          firstResult,
        );

        firstRepository.save(
          secondResult,
        );

        firstRepository.close();

        const secondRepository =
          new SQLiteMatchResultRepository({
            databasePath,
          });

        expect(
          secondRepository.get(
            firstResult.sessionId,
          ),
        ).toEqual(
          firstResult,
        );

        expect(
          secondRepository.get(
            secondResult.sessionId,
          ),
        ).toEqual(
          secondResult,
        );

        expect(
          secondRepository
            .listLatestByParticipant(
              PARTICIPANTS.PLAYER_2,
              10,
            ),
        ).toEqual([
          secondResult,
          firstResult,
        ]);

        secondRepository.close();
      },
    );

    it(
      "rejects operations after close",
      () => {
        const repository =
          new SQLiteMatchResultRepository({
            databasePath:
              ":memory:",
          });

        const result =
          createNormalResult({
            sessionId:
              SESSION_0,

            completedAtMs:
              120_000,
          });

        repository.close();

        expect(
          () =>
            repository.save(
              result,
            ),
        ).toThrow(
          "SQLite match result repository is closed.",
        );

        expect(
          () =>
            repository.get(
              SESSION_0,
            ),
        ).toThrow(
          "SQLite match result repository is closed.",
        );

        expect(
          () =>
            repository
              .listLatestByParticipant(
                PARTICIPANTS.PLAYER_0,
                10,
              ),
        ).toThrow(
          "SQLite match result repository is closed.",
        );
      },
    );
  },
);
