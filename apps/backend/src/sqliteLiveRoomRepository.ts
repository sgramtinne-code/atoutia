import {
  DatabaseSync,
} from "node:sqlite";

import {
  parseLiveRoomPersistenceDocument,
  serializeLiveRoomPersistenceDocument,
  type LiveRoomPersistenceDocument,
} from "./liveRoomPersistenceDocument.js";

import type {
  LiveRoomRepository,
} from "./liveRoomRepository.js";

interface PersistedLiveRoomRow {
  readonly document_json:
    string;
}

interface PersistedSessionIdRow {
  readonly session_id:
    string;
}

export interface SQLiteLiveRoomRepositoryOptions {
  readonly databasePath:
    string;
}

export class SQLiteLiveRoomRepository
  implements LiveRoomRepository {
  readonly #database:
    DatabaseSync;

  #closed =
    false;

  public constructor(
    options:
      SQLiteLiveRoomRepositoryOptions,
  ) {
    this.#database =
      new DatabaseSync(
        options.databasePath,
      );

    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS live_rooms (
        session_id TEXT PRIMARY KEY NOT NULL,
        document_json TEXT NOT NULL
      ) STRICT
    `);
  }

  public save(
    document:
      LiveRoomPersistenceDocument,
  ): void {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        INSERT INTO live_rooms (
          session_id,
          document_json
        )
        VALUES (?, ?)
        ON CONFLICT(session_id)
        DO UPDATE SET
          document_json = excluded.document_json
      `);

    statement.run(
      document.sessionId,
      serializeLiveRoomPersistenceDocument(
        document,
      ),
    );
  }

  public get(
    sessionId:
      string,
  ):
    | LiveRoomPersistenceDocument
    | undefined {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT document_json
        FROM live_rooms
        WHERE session_id = ?
      `);

    const row =
      statement.get(
        sessionId,
      ) as unknown as
        | PersistedLiveRoomRow
        | undefined;

    if (
      row ===
      undefined
    ) {
      return undefined;
    }

    return parseLiveRoomPersistenceDocument(
      row.document_json,
    );
  }

  public delete(
    sessionId:
      string,
  ): boolean {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        DELETE FROM live_rooms
        WHERE session_id = ?
      `);

    const result =
      statement.run(
        sessionId,
      );

    return result.changes >
      0;
  }

  public listSessionIds():
    readonly string[] {
    this.#assertOpen();

    const statement =
      this.#database.prepare(`
        SELECT session_id
        FROM live_rooms
        ORDER BY session_id ASC
      `);

    const rows =
      statement.all() as unknown as
        readonly PersistedSessionIdRow[];

    return Object.freeze(
      rows.map(
        (
          row,
        ) =>
          row.session_id,
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
        "SQLite live room repository is closed.",
      );
    }
  }
}