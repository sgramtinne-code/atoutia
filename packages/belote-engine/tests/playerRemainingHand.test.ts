import { describe, expect, it } from "vitest";
import {
  PLAYER_POSITIONS,
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  createPlayerClientSnapshotDocument,
  createPlayerMatchSnapshot,
  parsePlayerClientSnapshotDocument,
  serializePlayerClientSnapshotDocument,
  type MatchMachineState,
} from "../src/index.js";

function startPlaying(targetScore = 1000): MatchMachineState {
  const state = createMatchMachine({ baseSeed: 4000, targetScore });
  return applyMatchBiddingAction(state, {
    type: "TAKE",
    player: state.currentDeal.bidding.currentPlayer!,
    suit: state.currentDeal.initialDeal.turnUpCard.suit,
  });
}

function playNext(state: MatchMachineState): MatchMachineState {
  const player = state.currentDeal.trickSequence!.currentTrick.currentPlayer;
  const card = createPlayerMatchSnapshot(state, player).legalCards[0]!;
  return applyMatchCardPlay(state, player, card).state;
}

describe("remaining cards in player snapshots", () => {
  it("removes the played card without changing the deal or an earlier snapshot", () => {
    const state = startPlaying();
    const player = state.currentDeal.trickSequence!.currentTrick.currentPlayer;
    const before = createPlayerMatchSnapshot(state, player);
    const played = before.legalCards[0]!;
    const next = applyMatchCardPlay(state, player, played).state;
    const after = createPlayerMatchSnapshot(next, player);

    expect(after.hand).toHaveLength(7);
    expect(after.hand).not.toContainEqual(played);
    expect(before.hand).toHaveLength(8);
    expect(before.hand).toContainEqual(played);
    expect(next.currentDeal.completedDeal).toBe(state.currentDeal.completedDeal);
    for (const position of PLAYER_POSITIONS) {
      const snapshot = createPlayerMatchSnapshot(next, position);
      expect(snapshot.hand).toEqual(next.currentDeal.trickSequence!.hands[position]);
      expect(next.currentDeal.completedDeal!.hands[position]).toHaveLength(8);
      expect(Object.isFrozen(snapshot.hand)).toBe(true);
      expect(snapshot.hand.every(Object.isFrozen)).toBe(true);
    }
  });

  it("tracks all hands and legal cards through every trick of a deal", () => {
    let state = startPlaying(1);
    for (let count = 0; count < 32; count++) {
      state = playNext(state);
      for (const player of PLAYER_POSITIONS) {
        const snapshot = createPlayerMatchSnapshot(state, player);
        expect(snapshot.hand).toEqual(state.currentDeal.trickSequence!.hands[player]);
        for (const card of snapshot.legalCards) expect(snapshot.hand).toContainEqual(card);
        expect(state.currentDeal.completedDeal!.hands[player]).toHaveLength(8);
      }
    }
    expect(state.score.completed).toBe(true);
  });

  it("ends with empty hands and no playable cards for every player", () => {
    let state = startPlaying(1);
    for (let count = 0; count < 32; count++) state = playNext(state);
    expect(state.currentDeal.phase).toBe("FINISHED");
    for (const player of PLAYER_POSITIONS) {
      const document = createPlayerClientSnapshotDocument(state, player);
      expect(document.snapshot.match.hand).toEqual([]);
      expect(document.snapshot.match.legalCards).toEqual([]);
      expect(document.snapshot.actions.mode).toBe("MATCH_FINISHED");
      expect(document.snapshot.actions.legalCards).toEqual([]);
    }
  });

  it("starts the next deal with its new five cards", () => {
    let state = startPlaying();
    for (let count = 0; count < 32; count++) state = playNext(state);
    expect(state.dealNumber).toBe(2);
    expect(state.currentDeal.phase).toBe("BIDDING");
    for (const player of PLAYER_POSITIONS) {
      const snapshot = createPlayerMatchSnapshot(state, player);
      expect(snapshot.hand).toEqual(state.currentDeal.initialDeal.hands[player]);
      expect(snapshot.hand).toHaveLength(5);
      expect(snapshot.legalCards).toEqual([]);
    }
  });

  it("round trips the reduced hand in the existing version 1 client document", () => {
    const state = startPlaying();
    const player = state.currentDeal.trickSequence!.currentTrick.currentPlayer;
    const played = createPlayerMatchSnapshot(state, player).legalCards[0]!;
    const next = applyMatchCardPlay(state, player, played).state;
    const document = createPlayerClientSnapshotDocument(next, player);
    const parsed = parsePlayerClientSnapshotDocument(serializePlayerClientSnapshotDocument(document));
    expect(parsed).toEqual(document);
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.snapshot.match.hand).toHaveLength(7);
    expect(parsed.snapshot.match.hand).not.toContainEqual(played);
    expect(parsed.snapshot.match.public.currentTrick!.plays).toContainEqual({ player, card: played });
  });
});
