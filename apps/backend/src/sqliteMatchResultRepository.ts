import {
  DatabaseSync,
} from "node:sqlite";

import type {
  MatchResult,
} from "./matchResult.js";

import {
  parseMatchResultDocument,
  serializeMatchResultDocument,
} from "./matchResultDocument.js";

import type {
  MatchResultRepository,
} from "./matchResultRepository.js";

interface MatchResultRow {
  readonly document_json:
    string;
}

export interface SQLiteMatchResultRepositoryOptions {
  readonly databasePath:
    string;
}

function assertValidParticipantId(
  participantId:
    string,
): void {
  if (
    participantId.trim().length ===
      0 ||
    participantId !==
      participantId.trim() ||
    participantId.length >
      128
  ) {
    throw new Error(
      "Match result participant identifier is invalid.",
    );
  }
}

function assertValidLimit(
  limit:
    number,
): void {
  if (
    !Number.isSafeInteger(
      limit,
    ) ||
    limit <=
      0
  ) {
    throw new Error(
      "Match result query limit must be a positive safe integer.",
    );
  }
}

export class SQLiteMatchResultRepository
  implements MatchResultRepository {
  readonly #database:
    DatabaseSync;

  #closed =
    false;

  public constructor(
    options:
      SQLiteMatchResultRepositoryOptions,
  ) {
    this.#database =
      new DatabaseSync(
        options.databasePath,
      );

    this.#database.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS match_results (
        session_id TEXT PRIMARY KEY NOT NULL,
        completed_at_ms INTEGER NOT NULL,
        document_json TEXT NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS match_results_completed_at_idx
      ON match_results(
        completed_at_ms DESC,
        session_id DESC
      );

      CREATE TABLE IF NOT EXISTS match_result_participants (
        session_id TEXT NOT NULL,
        player TEXT NOT NULL
          CHECK (
            player IN (
              'PLAYER_0',
              'PLAYER_1',
              'PLAYER_2',
              'PLAYER_3'
            )
          ),
        participant_id TEXT NOT NULL,
        PRIMARY KEY (
          session_id,
          player
        ),
        UNIQUE (
          session_id,
          participant_id
        ),
        FOREIGN KEY (
          session_id
        )
          REFERENCES match_results(
            session_id
          )
          ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX IF NOT EXISTS match_result_participants_participant_idx
      ON match_result_participants(
        participant_id,
        session_id
      );
    `);
  }

  public save(
    result:
      MatchResult,
  ): void {
    this.#assertOpen();

    const canonicalResult =
      parseMatchResultDocument(
        serializeMatchResultDocument(
          result,
        ),
      );

    const documentJson =
      serializeMatchResultDocument(
        canonicalResult,
      );

    this.#database.exec(
      "BEGIN IMMEDIATE;",
    );

    try {
      const existingStatement =
        this.#database.prepare(`
          SELECT document_json
          FROM match_results
          WHERE session_id = ?
        `);

      const existingRow =
        existingStatement.get(
          canonicalResult.sessionId,
        ) as unknown as
          | MatchResultRow
          | undefined;

      if (
        existingRow !==
          undefined
      ) {
        const existingResult =
          parseMatchResultDocument(
            existingRow.document_json,
          );

        const existingDocumentJson =
          serializeMatchResultDocument(
            existingResult,
          );

        if (
          existingDocumentJson !==
            documentJson
        ) {
          throw new Error(
            `Match result already exists with different content: ${canonicalResult.sessionId}`,
          );
        }

        this.#database.exec(
          "COMMIT;",
        );

        return;
      }

      const resultStatement =
        this.#database.prepare(`
          INSERT INTO match_results (
            session_id,
            completed_at_ms,
            document_json
          )
          VALUES (?, ?, ?)
        `);

      resultStatement.run(
        canonicalResult.sessionId,
        canonicalResult.completedAtMs,
        documentJson,
      );

      const participantStatement =
        this.#database.prepare(`
          INSERT INTO match_result_participants (
            session_id,
            player,
            participant_id
          )
          VALUES (?, ?, ?)
        `);

      const participants =
        [
          [
            "PLAYER_0",
            canonicalResult
              .participants
              .PLAYER_0,
          ],

          [
            "PLAYER_1",
            canonicalResult
              .participants
              .PLAYER_1,
          ],

          [
            "PLAYER_2",
            canonicalResult
              .participants
              .PLAYER_2,
          ],

          [
            "PLAYER_3",
            canonicalResult
              .participants
              .PLAYER_3,
          ],
        ] as const;

      for (
        const [
          player,
          participantId,
        ]
        of participants
      ) {
        participantStatement.run(
          canonicalResult.sessionId,
          player,
          participantId,
        );
      }

      this.#database.exec(
        "COMMIT;",
      );
    } catch (
      error
    ) {
      try {
        this.#database.exec(
          "ROLLBACK;",
        );
      } catch {
        // Preserve the original persistence error.
      }

      throw error;
    }
  }

  public get(
    sessionId:
      string,
  ):
    | MatchResult
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT document_json
        FROM match_results
        WHERE session_id = ?
      `);

    const row =
      statement.get(
        sessionId,
      ) as unknown as
        | MatchResultRow
        | undefined;

    if (
      row ===
        undefined
    ) {
      return undefined;
    }

    return parseMatchResultDocument(
      row.document_json,
    );
  }

  public listLatestByParticipant(
    participantId:
      string,

    limit:
      number,
  ):
    readonly MatchResult[] {
    this.#assertOpen();

    assertValidParticipantId(
      participantId,
    );

    assertValidLimit(
      limit,
    );

    const statement =
      this.#database.prepare(`
        SELECT
          result.document_json
        FROM match_result_participants
          AS participant
        INNER JOIN match_results
          AS result
          ON result.session_id =
            participant.session_id
        WHERE participant.participant_id = ?
        ORDER BY
          result.completed_at_ms DESC,
          result.session_id DESC
        LIMIT ?
      `);

    const rows =
      statement.all(
        participantId,
        limit,
      ) as unknown as
        readonly MatchResultRow[];

    return Object.freeze(
      rows.map(
        (
          row,
        ) =>
          parseMatchResultDocument(
            row.document_json,
          ),
      ),
    );
  }

  public close():
    void {
    if (
      this.#closed
    ) {
      return;
    }

    this.#database.close();

    this.#closed =
      true;
  }

  #assertOpen():
    void {
    if (
      this.#closed
    ) {
      throw new Error(
        "SQLite match result repository is closed.",
      );
    }
  }
}
