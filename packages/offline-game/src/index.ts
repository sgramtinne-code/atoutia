import {
  applyPlayerCommandDocument, createMatchMachine,
  createMatchReplayDocument, createPlayerClientSnapshotDocument,
  createPlayerClientSnapshot, getCardPoints, parsePlayerCommandDocument,
  replayMatchDocument, parseMatchReplayDocument, BELOTE_ENGINE_VERSION,
  type MatchMachineState, type PlayerClientSnapshot, type PlayerCommand,
  type PlayerPosition,
} from "@atoutia/belote-engine";
import { chooseStyledOfflineBot, isOfflineBotPolicy, type OfflineBotPolicy } from "./botPolicies.js";
export { OFFLINE_BOT_POLICIES, type OfflineBotPolicy } from "./botPolicies.js";

export const OFFLINE_SAVE_VERSION = 1;
export const OFFLINE_BOT_POLICY = "starter-v1";
export const HUMAN_PLAYER = "PLAYER_0";
const MAX_SAVE_LENGTH = 2 * 1024 * 1024;

/** A policy consumes only this player's authorized snapshot. Rules stay in the engine. */
export function chooseOfflineBot(snapshot: PlayerClientSnapshot): PlayerCommand | null {
  const { actions, match } = snapshot;
  if (actions.mode === "BID") {
    const threshold = actions.player === "PLAYER_1" ? 28 : actions.player === "PLAYER_3" ? 42 : 35;
    const takes = actions.biddingActions.filter((action) => action.type === "TAKE");
    const candidates = takes.map((action) => ({
      action,
      strength: match.hand.filter((card) => card.suit === action.suit)
        .reduce((total, card) => total + 6 + getCardPoints(card, action.suit), 0),
    })).sort((a, b) => b.strength - a.strength);
    const best = candidates[0];
    if (best && best.strength >= threshold) return { type: "TAKE", suit: best.action.suit };
    return { type: "PASS" };
  }
  if (actions.mode === "PLAY_CARD") {
    const trump = match.public.trumpSuit;
    const cards = [...actions.legalCards];
    if (trump !== null && actions.player !== "PLAYER_1") {
      cards.sort((a, b) => getCardPoints(a, trump) - getCardPoints(b, trump));
    }
    const card = cards[0];
    return card ? { type: "PLAY_CARD", card } : null;
  }
  return null;
}

export class OfflineGame {
  private constructor(private state: MatchMachineState, private readonly botPolicy: OfflineBotPolicy) {}

  static start(seed: number, botPolicy: OfflineBotPolicy = OFFLINE_BOT_POLICY): OfflineGame {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid offline seed.");
    if (!isOfflineBotPolicy(botPolicy)) throw new Error("Unsupported offline bot policy.");
    return new OfflineGame(createMatchMachine({ baseSeed: seed, firstDealer: "PLAYER_3", targetScore: 1000 }), botPolicy);
  }

  static restore(text: string): OfflineGame {
    if (text.length > MAX_SAVE_LENGTH) throw new Error("Offline save is too large.");
    const save = JSON.parse(text) as Record<string, unknown>;
    if (!save || Array.isArray(save) || save.formatVersion !== OFFLINE_SAVE_VERSION || !isOfflineBotPolicy(save.botPolicy)) {
      throw new Error("Unsupported offline save.");
    }
    const replay = parseMatchReplayDocument(JSON.stringify(save.replay));
    if (replay.targetScore !== 1000 || replay.history.length > 20000) throw new Error("Invalid offline match configuration.");
    return new OfflineGame(replayMatchDocument(replay), save.botPolicy);
  }

  private apply(player: PlayerPosition, command: unknown): void {
    const document = parsePlayerCommandDocument(JSON.stringify({
      formatVersion: 1, engineVersion: BELOTE_ENGINE_VERSION, player, command,
    }));
    this.state = applyPlayerCommandDocument(this.state, document);
  }

  private requireRevision(revision: number): void {
    if (revision !== this.state.history.length) throw new Error("Offline revision mismatch.");
  }

  human(command: unknown, expectedRevision: number): void {
    this.requireRevision(expectedRevision);
    this.apply(HUMAN_PLAYER, command);
  }

  stepBot(expectedRevision: number): void {
    this.requireRevision(expectedRevision);
    if (this.state.score.completed) return;
    const deal = this.state.currentDeal;
    const player = deal.phase === "BIDDING" ? deal.bidding.currentPlayer : deal.trickSequence?.currentTrick.currentPlayer;
    if (!player) throw new Error("Offline game has no current player.");
    if (player === HUMAN_PLAYER) return;
    const snapshot = createPlayerClientSnapshot(this.state, player);
    const command = this.botPolicy === OFFLINE_BOT_POLICY ? chooseOfflineBot(snapshot) : chooseStyledOfflineBot(snapshot, this.botPolicy);
    if (!command) throw new Error("Offline bot has no action.");
    this.apply(player, command);
  }

  frame() {
    return {
      revision: this.state.history.length,
      document: createPlayerClientSnapshotDocument(this.state, HUMAN_PLAYER),
      save: JSON.stringify({ formatVersion: OFFLINE_SAVE_VERSION, botPolicy: this.botPolicy, replay: createMatchReplayDocument(this.state) }),
    };
  }
}
