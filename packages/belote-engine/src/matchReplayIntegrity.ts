import {
  hashMatchReplayDocument,
} from "./matchReplayHash.js";
import type {
  MatchReplayDocument,
} from "./matchReplayFormat.js";

export interface MatchReplayIntegrityDocument {
  readonly replay: MatchReplayDocument;
  readonly sha256: string;
}

export async function createMatchReplayIntegrityDocument(
  replay: MatchReplayDocument,
): Promise<MatchReplayIntegrityDocument> {
  const sha256 =
    await hashMatchReplayDocument(
      replay,
    );

  return Object.freeze({
    replay,
    sha256,
  });
}

export async function verifyMatchReplayIntegrity(
  document: MatchReplayIntegrityDocument,
): Promise<boolean> {
  if (
    !/^[0-9a-f]{64}$/.test(
      document.sha256,
    )
  ) {
    return false;
  }

  const actualHash =
    await hashMatchReplayDocument(
      document.replay,
    );

  return actualHash === document.sha256;
}