export const MATCH_SESSION_ID_PREFIX =
  "ms1_";

const MATCH_SESSION_ID_BYTE_LENGTH = 16;

const MATCH_SESSION_ID_HEX_LENGTH =
  MATCH_SESSION_ID_BYTE_LENGTH * 2;

type MatchSessionBytes =
  Uint8Array<ArrayBuffer>;

export type MatchSessionRandomBytes =
  (
    bytes: MatchSessionBytes,
  ) => MatchSessionBytes;

function createEmptyRandomBytes():
  MatchSessionBytes {
  return new Uint8Array(
    new ArrayBuffer(
      MATCH_SESSION_ID_BYTE_LENGTH,
    ),
  );
}

function fillCryptographicRandomBytes(
  bytes: MatchSessionBytes,
): MatchSessionBytes {
  globalThis.crypto.getRandomValues(
    bytes,
  );

  return bytes;
}

function bytesToHex(
  bytes: Uint8Array<ArrayBufferLike>,
): string {
  return Array.from(
    bytes,
    (byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
  ).join("");
}

export function createMatchSessionId(
  randomBytes:
    MatchSessionRandomBytes =
      fillCryptographicRandomBytes,
): string {
  const bytes =
    createEmptyRandomBytes();

  const generatedBytes =
    randomBytes(bytes);

  if (
    generatedBytes.length !==
    MATCH_SESSION_ID_BYTE_LENGTH
  ) {
    throw new Error(
      `Match session random source must return exactly ${MATCH_SESSION_ID_BYTE_LENGTH} bytes`,
    );
  }

  return (
    MATCH_SESSION_ID_PREFIX +
    bytesToHex(generatedBytes)
  );
}

export function isMatchSessionId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    new RegExp(
      `^ms1_[0-9a-f]{${MATCH_SESSION_ID_HEX_LENGTH}}$`,
    ).test(value)
  );
}