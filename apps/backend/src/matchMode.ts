export const MATCH_MODES =
  [
    "PRIVATE",
    "CASUAL",
    "RANKED",
  ] as const;

export type MatchMode =
  typeof MATCH_MODES[number];

export function isMatchMode(
  value: unknown,
): value is MatchMode {
  return (
    typeof value === "string" &&
    (
      MATCH_MODES as
        readonly string[]
    ).includes(value)
  );
}