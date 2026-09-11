import {
  parseMatchReplayDocument,
  serializeMatchReplayDocument,
} from "./matchReplayJson.js";
import {
  verifyMatchReplayIntegrity,
  type MatchReplayIntegrityDocument,
} from "./matchReplayIntegrity.js";
import {
  replayMatchDocument,
} from "./matchReplay.js";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function serializeMatchReplayIntegrityDocument(
  document: MatchReplayIntegrityDocument,
): string {
  return JSON.stringify({
    replay: JSON.parse(
      serializeMatchReplayDocument(
        document.replay,
      ),
    ),
    sha256: document.sha256,
  });
}

export async function parseAndVerifyMatchReplayIntegrityJson(
  json: string,
): Promise<MatchReplayIntegrityDocument> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(
      "Replay integrity JSON is invalid.",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "Replay integrity document must be an object.",
    );
  }

  if (!isRecord(parsed.replay)) {
    throw new Error(
      "Replay integrity document must contain a replay.",
    );
  }

  if (
    typeof parsed.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(
      parsed.sha256,
    )
  ) {
    throw new Error(
      "Replay integrity SHA-256 is invalid.",
    );
  }

  const replay =
    parseMatchReplayDocument(
      JSON.stringify(parsed.replay),
    );

  replayMatchDocument(replay);

  const document =
    Object.freeze({
      replay,
      sha256: parsed.sha256,
    });

  const valid =
    await verifyMatchReplayIntegrity(
      document,
    );

  if (!valid) {
    throw new Error(
      "Replay integrity verification failed.",
    );
  }

  return document;
}