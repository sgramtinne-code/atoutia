import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  createPublicMatchSnapshot,
  getLegalCards,
  type MatchMachineState,
} from "../src/index.js";

function startPlaying(
  state: MatchMachineState,
): MatchMachineState {
  return applyMatchBiddingAction(
    state,
    {
      type: "TAKE",

      player:
        state.currentDeal.bidding
          .currentPlayer,

      suit:
        state.currentDeal.initialDeal
          .turnUpCard.suit,
    },
  );
}

describe("public match snapshot", () => {
  it("creates the initial public match state", () => {
    const state =
      createMatchMachine({
        baseSeed: 1000,
      });

    const snapshot =
      createPublicMatchSnapshot(
        state,
      );

    expect(snapshot.dealNumber).toBe(1);

    expect(snapshot.dealer).toBe(
      "PLAYER_0",
    );

    expect(snapshot.phase).toBe(
      "BIDDING",
    );

    expect(
      snapshot.biddingPlayer,
    ).toBe("PLAYER_1");

    expect(snapshot.taker).toBeNull();

    expect(
      snapshot.trumpSuit,
    ).toBeNull();

    expect(
      snapshot.currentTrick,
    ).toBeNull();
  });

  it("exposes the public score", () => {
    const state =
      createMatchMachine({
        baseSeed: 2000,
        targetScore: 500,
      });

    const snapshot =
      createPublicMatchSnapshot(
        state,
      );

    expect(
      snapshot.score.targetScore,
    ).toBe(500);

    expect(snapshot.score.scores).toEqual({
      TEAM_0: 0,
      TEAM_1: 0,
    });

    expect(
      snapshot.score.completed,
    ).toBe(false);

    expect(
      snapshot.score.winner,
    ).toBeNull();
  });

  it("exposes the public turn-up card", () => {
    const state =
      createMatchMachine({
        baseSeed: 3000,
      });

    const snapshot =
      createPublicMatchSnapshot(
        state,
      );

    expect(
      snapshot.turnUpCard,
    ).toEqual(
      state.currentDeal.initialDeal
        .turnUpCard,
    );
  });

  it("does not expose deterministic seeds", () => {
    const snapshot =
      createPublicMatchSnapshot(
        createMatchMachine({
          baseSeed: 4000,
        }),
      );

    expect(
      "baseSeed" in snapshot,
    ).toBe(false);

    expect(
      "seed" in snapshot,
    ).toBe(false);
  });

  it("does not expose the shuffled deck", () => {
    const snapshot =
      createPublicMatchSnapshot(
        createMatchMachine({
          baseSeed: 5000,
        }),
      );

    expect(
      "shuffledDeck" in snapshot,
    ).toBe(false);
  });

  it("does not expose player hands", () => {
    const snapshot =
      createPublicMatchSnapshot(
        createMatchMachine({
          baseSeed: 6000,
        }),
      );

    expect(
      "hands" in snapshot,
    ).toBe(false);

    expect(
      JSON.stringify(snapshot),
    ).not.toContain('"hands"');
  });

  it("exposes taker and trump after bidding", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 7000,
        }),
      );

    const snapshot =
      createPublicMatchSnapshot(
        state,
      );

    expect(snapshot.phase).toBe(
      "PLAYING",
    );

    expect(snapshot.taker).toBe(
      state.currentDeal.taker,
    );

    expect(snapshot.trumpSuit).toBe(
      state.currentDeal.trumpSuit,
    );

    expect(
      snapshot.biddingPlayer,
    ).toBeNull();
  });

  it("exposes the current player during card play", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 8000,
        }),
      );

    const snapshot =
      createPublicMatchSnapshot(
        state,
      );

    expect(
      snapshot.currentTrick
        ?.currentPlayer,
    ).toBe(
      state.currentDeal.trickSequence
        ?.currentTrick.currentPlayer,
    );
  });

  it("exposes cards already played in the current trick", () => {
    let state =
      startPlaying(
        createMatchMachine({
          baseSeed: 9000,
        }),
      );

    const sequence =
      state.currentDeal.trickSequence;

    const trumpSuit =
      state.currentDeal.trumpSuit;

    if (
      sequence === null ||
      trumpSuit === null
    ) {
      throw new Error(
        "Playing state is required.",
      );
    }

    const player =
      sequence.currentTrick.currentPlayer;

    const card =
      getLegalCards(
        sequence.hands[player],
        player,
        sequence.currentTrick.plays,
        trumpSuit,
      )[0];

    if (card === undefined) {
      throw new Error(
        "No legal test card.",
      );
    }

    state =
      applyMatchCardPlay(
        state,
        player,
        card,
      ).state;

    const snapshot =
      createPublicMatchSnapshot(
        state,
      );

    expect(
      snapshot.currentTrick?.plays,
    ).toHaveLength(1);

    expect(
      snapshot.currentTrick
        ?.plays[0],
    ).toEqual({
      player,
      card,
    });
  });

  it("returns immutable public structures", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 10000,
        }),
      );

    const snapshot =
      createPublicMatchSnapshot(
        state,
      );

    expect(
      Object.isFrozen(snapshot),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.score,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.score.scores,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.turnUpCard,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.currentTrick,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        snapshot.currentTrick?.plays,
      ),
    ).toBe(true);
  });
});