import { describe, expect, it } from "vitest";

import {
  applyDealMachineBiddingAction,
  createDealMachine,
  nextPlayer,
  type DealMachineState,
} from "../src/index.js";

function takeFirstRound(
  state: DealMachineState,
): DealMachineState {
  return applyDealMachineBiddingAction(
    state,
    {
      type: "TAKE",
      player: state.bidding.currentPlayer,
      suit: state.initialDeal.turnUpCard.suit,
    },
  );
}

function pass(
  state: DealMachineState,
): DealMachineState {
  return applyDealMachineBiddingAction(
    state,
    {
      type: "PASS",
      player: state.bidding.currentPlayer,
    },
  );
}

describe("deal machine playing initialization", () => {
  it("creates the playing state immediately after a take", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = takeFirstRound(initial);

    expect(result.phase).toBe("PLAYING");
    expect(result.completedDeal).not.toBeNull();
    expect(result.belote).not.toBeNull();
    expect(result.trickSequence).not.toBeNull();
  });

  it("creates Belote state with the selected trump suit", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = takeFirstRound(initial);

    expect(result.trumpSuit).not.toBeNull();

    expect(result.belote?.trumpSuit).toBe(
      result.trumpSuit,
    );
  });

  it("uses the completed hands for the trick sequence", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = takeFirstRound(initial);

    expect(result.completedDeal).not.toBeNull();
    expect(result.trickSequence).not.toBeNull();

    expect(
      result.trickSequence?.hands,
    ).toEqual(
      result.completedDeal?.hands,
    );
  });

  it("starts the first trick with the player after the dealer", () => {
    const dealers = [
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3",
    ] as const;

    for (const dealer of dealers) {
      const initial = createDealMachine({
        seed: 12345,
        dealer,
      });

      const result = takeFirstRound(initial);

      expect(
        result.trickSequence?.currentTrick.leader,
      ).toBe(
        nextPlayer(dealer),
      );

      expect(
        result.trickSequence?.currentTrick.currentPlayer,
      ).toBe(
        nextPlayer(dealer),
      );
    }
  });

  it("starts with no completed tricks", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_2",
    });

    const result = takeFirstRound(initial);

    expect(
      result.trickSequence?.completedTricks,
    ).toHaveLength(0);

    expect(
      result.trickSequence?.currentTrick.plays,
    ).toHaveLength(0);

    expect(
      result.trickSequence?.currentTrick.completed,
    ).toBe(false);
  });

  it("preserves all eight cards in every playing hand", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_1",
    });

    const result = takeFirstRound(initial);

    expect(
      result.trickSequence?.hands.PLAYER_0,
    ).toHaveLength(8);

    expect(
      result.trickSequence?.hands.PLAYER_1,
    ).toHaveLength(8);

    expect(
      result.trickSequence?.hands.PLAYER_2,
    ).toHaveLength(8);

    expect(
      result.trickSequence?.hands.PLAYER_3,
    ).toHaveLength(8);
  });

  it("keeps playing state absent while bidding continues", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = pass(initial);

    expect(result.phase).toBe("BIDDING");
    expect(result.completedDeal).toBeNull();
    expect(result.belote).toBeNull();
    expect(result.trickSequence).toBeNull();
  });

  it("does not create playing state when everybody passes", () => {
    let state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    for (let index = 0; index < 8; index += 1) {
      state = pass(state);
    }

    expect(state.phase).toBe("FINISHED");

    expect(state.completedDeal).toBeNull();
    expect(state.taker).toBeNull();
    expect(state.trumpSuit).toBeNull();

    expect(state.belote).toBeNull();
    expect(state.trickSequence).toBeNull();
  });

  it("returns immutable initialized playing state objects", () => {
    const initial = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    const result = takeFirstRound(initial);

    expect(Object.isFrozen(result)).toBe(true);

    expect(
      Object.isFrozen(result.completedDeal),
    ).toBe(true);

    expect(
      Object.isFrozen(result.belote),
    ).toBe(true);

    expect(
      Object.isFrozen(result.trickSequence),
    ).toBe(true);

    expect(
      Object.isFrozen(
        result.trickSequence?.currentTrick,
      ),
    ).toBe(true);
  });
});