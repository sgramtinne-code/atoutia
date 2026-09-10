import { describe, expect, it } from "vitest";

import {
  advanceMatchToNextDeal,
  applyDealMachineBiddingAction,
  createMatchMachine,
  type MatchMachineState,
} from "../src/index.js";

function finishDealWithAllPasses(
  state: MatchMachineState,
): MatchMachineState {
  let currentDeal = state.currentDeal;

  for (let index = 0; index < 8; index += 1) {
    currentDeal =
      applyDealMachineBiddingAction(
        currentDeal,
        {
          type: "PASS",
          player:
            currentDeal.bidding.currentPlayer,
        },
      );
  }

  return Object.freeze({
    ...state,
    currentDeal,
  });
}

describe("match machine", () => {
  it("creates the first deal with default values", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    expect(state.dealNumber).toBe(1);
    expect(state.dealer).toBe("PLAYER_0");
    expect(state.score.targetScore).toBe(1000);
    expect(state.score.scores).toEqual({
      TEAM_0: 0,
      TEAM_1: 0,
    });

    expect(state.currentDeal.seed).toBe(1000);
    expect(state.currentDeal.dealer).toBe(
      "PLAYER_0",
    );
  });

  it("supports custom first dealer and target score", () => {
    const state = createMatchMachine({
      baseSeed: 5000,
      firstDealer: "PLAYER_2",
      targetScore: 500,
    });

    expect(state.dealer).toBe("PLAYER_2");
    expect(state.score.targetScore).toBe(500);
    expect(state.currentDeal.dealer).toBe(
      "PLAYER_2",
    );
  });

  it("starts with no pending litige", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    expect(state.litigeState).toEqual({
      pendingPoints: 0,
    });

    expect(
      state.currentDeal.litigeState,
    ).toEqual({
      pendingPoints: 0,
    });
  });

  it("rejects a non-integer base seed", () => {
    expect(() =>
      createMatchMachine({
        baseSeed: 1.5,
      }),
    ).toThrow(
      "Match machine base seed must be an integer.",
    );
  });

  it("rejects advancing while the current deal is active", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    expect(() =>
      advanceMatchToNextDeal(state),
    ).toThrow(
      "Current deal must be finished before starting the next deal.",
    );
  });

  it("advances to deal two after an all-pass deal", () => {
    const finished =
      finishDealWithAllPasses(
        createMatchMachine({
          baseSeed: 1000,
        }),
      );

    const next =
      advanceMatchToNextDeal(finished);

    expect(next.dealNumber).toBe(2);
    expect(next.currentDeal.phase).toBe(
      "BIDDING",
    );
  });

  it("rotates the dealer clockwise", () => {
    const finished =
      finishDealWithAllPasses(
        createMatchMachine({
          baseSeed: 1000,
          firstDealer: "PLAYER_2",
        }),
      );

    const next =
      advanceMatchToNextDeal(finished);

    expect(next.dealer).toBe("PLAYER_3");
    expect(next.currentDeal.dealer).toBe(
      "PLAYER_3",
    );
  });

  it("uses a deterministic new seed for every deal", () => {
    const deal1 =
      finishDealWithAllPasses(
        createMatchMachine({
          baseSeed: 1000,
        }),
      );

    const deal2 =
      advanceMatchToNextDeal(deal1);

    expect(deal2.currentDeal.seed).toBe(
      1001,
    );

    const deal2Finished =
      finishDealWithAllPasses(deal2);

    const deal3 =
      advanceMatchToNextDeal(
        deal2Finished,
      );

    expect(deal3.currentDeal.seed).toBe(
      1002,
    );
  });

  it("does not change the match score after an all-pass deal", () => {
    const finished =
      finishDealWithAllPasses(
        createMatchMachine({
          baseSeed: 1000,
        }),
      );

    const next =
      advanceMatchToNextDeal(finished);

    expect(next.score.scores).toEqual({
      TEAM_0: 0,
      TEAM_1: 0,
    });
  });

  it("preserves litige state across an all-pass deal", () => {
    const initial =
      createMatchMachine({
        baseSeed: 1000,
      });

    const custom: MatchMachineState =
      Object.freeze({
        ...initial,
        litigeState: Object.freeze({
          pendingPoints: 81,
        }),
        currentDeal: Object.freeze({
          ...initial.currentDeal,
          litigeState: Object.freeze({
            pendingPoints: 81,
          }),
        }),
      });

    const finished =
      finishDealWithAllPasses(custom);

    const next =
      advanceMatchToNextDeal(finished);

    expect(next.litigeState).toEqual({
      pendingPoints: 81,
    });

    expect(
      next.currentDeal.litigeState,
    ).toEqual({
      pendingPoints: 81,
    });
  });

  it("returns immutable match state", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.score)).toBe(
      true,
    );
    expect(
      Object.isFrozen(state.litigeState),
    ).toBe(true);
    expect(
      Object.isFrozen(state.currentDeal),
    ).toBe(true);
  });
});