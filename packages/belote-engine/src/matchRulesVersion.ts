export const LEGACY_MATCH_RULES_VERSION = "CLASSIC_LEGACY_LITIGE_TAKER";
export const CURRENT_MATCH_RULES_VERSION = "CLASSIC_LITIGE_WINNER";

export type MatchRulesVersion =
  | typeof LEGACY_MATCH_RULES_VERSION
  | typeof CURRENT_MATCH_RULES_VERSION;

// Missing metadata belongs to pre-versioning persisted matches/replays.
export function resolveMatchRulesVersion(value: unknown): MatchRulesVersion {
  if (value === undefined) return LEGACY_MATCH_RULES_VERSION;
  if (value === LEGACY_MATCH_RULES_VERSION || value === CURRENT_MATCH_RULES_VERSION) return value;
  throw new Error("Unsupported match rules version.");
}
