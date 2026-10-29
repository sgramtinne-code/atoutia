import {
  getCardPoints, getCardStrength, getPlayerTeam, getTrickWinner,
  type Card, type PlayerClientSnapshot, type PlayerCommand, type PlayerPosition,
} from "@atoutia/belote-engine";

export const OFFLINE_BOT_POLICIES = ["starter-v1", "varied-v1", "careful-v1", "bold-v1"] as const;
export type OfflineBotPolicy = typeof OFFLINE_BOT_POLICIES[number];
type Style = "CAREFUL" | "TEAM" | "BOLD";

export function isOfflineBotPolicy(value: unknown): value is OfflineBotPolicy {
  return typeof value === "string" && OFFLINE_BOT_POLICIES.some((policy) => policy === value);
}

function styleFor(policy: Exclude<OfflineBotPolicy, "starter-v1">, player: Exclude<PlayerPosition, "PLAYER_0">): Style {
  if (policy === "careful-v1") return "CAREFUL";
  if (policy === "bold-v1") return "BOLD";
  return player === "PLAYER_1" ? "CAREFUL" : player === "PLAYER_2" ? "TEAM" : "BOLD";
}

/** Stateless heuristics: only a player's private hand, public trick and engine-authorized actions. */
export function chooseStyledOfflineBot(snapshot: PlayerClientSnapshot, policy: Exclude<OfflineBotPolicy, "starter-v1">): PlayerCommand | null {
  const { actions, match } = snapshot;
  if (actions.player === "PLAYER_0") return null;
  const style = styleFor(policy, actions.player);
  if (actions.mode === "BID") {
    const threshold = style === "CAREFUL" ? 46 : style === "TEAM" ? 35 : 22;
    const candidates = actions.biddingActions.filter((action) => action.type === "TAKE").map((action) => ({
      action,
      strength: match.hand.filter((card) => card.suit === action.suit)
        .reduce((total, card) => total + 6 + getCardPoints(card, action.suit), 0),
    })).sort((a, b) => b.strength - a.strength);
    const best = candidates[0];
    if (best && best.strength >= threshold) return { type: "TAKE", suit: best.action.suit };
    return actions.biddingActions.some((action) => action.type === "PASS") ? { type: "PASS" } : null;
  }
  const trump = match.public.trumpSuit;
  if (actions.mode !== "PLAY_CARD" || trump === null || actions.legalCards.length === 0) return null;
  const cards = [...actions.legalCards];
  const plays = match.public.currentTrick?.plays ?? [];
  const player = actions.player;
  const points = (card: Card) => getCardPoints(card, trump);
  // Reserve trumps before comparing point/strength costs. Ties keep the authorized hand order.
  const cost = (card: Card) => (card.suit === trump ? 100 : 0) + points(card) * 8 + getCardStrength(card, trump);
  const cheapest = (options: readonly Card[]) => [...options].sort((a, b) => cost(a) - cost(b))[0];
  const winning = cards.filter((card) => getTrickWinner([...plays, { player, card }], trump).player === player);
  const winner = plays.length ? getTrickWinner(plays, trump).player : null;
  const partnerWinning = winner !== null && getPlayerTeam(winner) === getPlayerTeam(player);
  let chosen: Card | undefined;
  if (style === "BOLD") {
    const attack = (card: Card) => (card.suit === trump ? 100 : 0) + getCardStrength(card, trump) * 12 + points(card);
    chosen = winning.length ? [...winning].sort((a, b) => attack(b) - attack(a))[0] : cheapest(cards);
  } else if (style === "TEAM" && partnerWinning) {
    const gifts = cards.filter((card) => card.suit !== trump && !winning.includes(card));
    chosen = gifts.sort((a, b) => points(b) - points(a))[0] ?? cheapest(cards);
  } else if (!partnerWinning && winning.length && (style === "TEAM" || plays.length === 3)) {
    chosen = cheapest(winning);
  } else chosen = cheapest(cards);
  return chosen ? { type: "PLAY_CARD", card: chosen } : null;
}
