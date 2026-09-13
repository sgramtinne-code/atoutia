import {
  createHash,
} from "node:crypto";

export const PARTICIPANT_ID_PREFIX =
  "pid1_";

const PARTICIPANT_ID_DOMAIN =
  "atoutia-participant-v1";

export function createParticipantIdForAccount(
  accountId:
    string,
): string {
  if (
    accountId.trim().length ===
      0 ||
    accountId !==
      accountId.trim()
  ) {
    throw new Error(
      "Account identifier is invalid.",
    );
  }

  const digest =
    createHash(
      "sha256",
    )
      .update(
        PARTICIPANT_ID_DOMAIN,
        "utf8",
      )
      .update(
        "\0",
        "utf8",
      )
      .update(
        accountId,
        "utf8",
      )
      .digest(
        "hex",
      );

  return (
    PARTICIPANT_ID_PREFIX +
    digest
  );
}

export function isParticipantIdentity(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    /^pid1_[0-9a-f]{64}$/.test(
      value,
    )
  );
}