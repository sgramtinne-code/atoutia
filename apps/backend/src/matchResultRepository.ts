import type {
  MatchResult,
} from "./matchResult.js";

export interface MatchResultRepository {
  save(
    result:
      MatchResult,
  ): void;

  get(
    sessionId:
      string,
  ):
    | MatchResult
    | undefined;

  listLatestByParticipant(
    participantId:
      string,

    limit:
      number,
  ):
    readonly MatchResult[];

  close():
    void;
}
