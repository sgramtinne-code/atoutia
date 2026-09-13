import type {
  LiveRoomPersistenceDocument,
} from "./liveRoomPersistenceDocument.js";

export interface LiveRoomRepository {
  save(
    document:
      LiveRoomPersistenceDocument,
  ): void;

  get(
    sessionId:
      string,
  ):
    | LiveRoomPersistenceDocument
    | undefined;

  delete(
    sessionId:
      string,
  ): boolean;

  listSessionIds():
    readonly string[];

  close():
    void;
}