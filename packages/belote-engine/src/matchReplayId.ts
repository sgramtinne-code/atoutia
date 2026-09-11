import {
  hashMatchReplayDocument,
} from "./matchReplayHash.js";
import type {
  MatchReplayDocument,
} from "./matchReplayFormat.js";

export const MATCH_REPLAY_ID_PREFIX = "rp1_";

const MATCH_REPLAY_ID_HASH_LENGTH = 32;

export async function createMatchReplayId(
  document: MatchReplayDocument,
): Promise<string> {
  const hash =
    await hashMatchReplayDocument(
      document,
    );

  return (
    MATCH_REPLAY_ID_PREFIX +
    hash.slice(
      0,
      MATCH_REPLAY_ID_HASH_LENGTH,
    )
  );
}

export function isMatchReplayId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^rp1_[0-9a-f]{32}$/.test(value)
  );
}