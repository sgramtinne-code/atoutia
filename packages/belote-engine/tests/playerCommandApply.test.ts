import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyPlayerCommandDocument,
  createMatchMachine,
  createPlayerCommandDocument,
  getLegalCards,
} from "../src/index.js";

describe("player command application", () => {
  it("applies a PASS command", () => {
    const state =
      createMatchMachine({
        baseSeed: 1000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const document =
      createPlayerCommandDocument(
        player,
        {
          type: "PASS",
        },
      );

    const next =
      applyPlayerCommandDocument(
        state,
        document,
      );

    expect(
      next.currentDeal.bidding
        .currentPlayer,
    ).not.toBe(player);
  });

  it("applies a TAKE command", () => {
    const state =
      createMatchMachine({
        baseSeed: 2000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const suit =
      state.currentDeal.initialDeal
        .turnUpCard.suit;

    const document =
      createPlayerCommandDocument(
        player,
        {
          type: "TAKE",
          suit,
        },
      );

    const next =
      applyPlayerCommandDocument(
        state,
        document,
      );

    expect(
      next.currentDeal.phase,
    ).toBe("PLAYING");

    expect(
      next.currentDeal.taker,
    ).toBe(player);

    expect(
      next.currentDeal.trumpSuit,
    ).toBe(suit);
  });

  it("applies a PLAY_CARD command", () => {
    let state =
      createMatchMachine({
        baseSeed: 3000,
      });

    const bidder =
      state.currentDeal.bidding
        .currentPlayer;

    state =
      applyPlayerCommandDocument(
        state,
        createPlayerCommandDocument(
          bidder,
          {
            type: "TAKE",
            suit:
              state.currentDeal.initialDeal
                .turnUpCard.suit,
          },
        ),
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
        "No legal card available.",
      );
    }

    const next =
      applyPlayerCommandDocument(
        state,
        createPlayerCommandDocument(
          player,
          {
            type: "PLAY_CARD",
            card,
          },
        ),
      );

    expect(
      next.currentDeal.trickSequence
        ?.currentTrick.plays,
    ).toHaveLength(1);
  });

  it("rejects PASS from the wrong player", () => {
    const state =
      createMatchMachine({
        baseSeed: 4000,
      });

    const currentPlayer =
      state.currentDeal.bidding
        .currentPlayer;

    const wrongPlayer =
      (
        [
          "PLAYER_0",
          "PLAYER_1",
          "PLAYER_2",
          "PLAYER_3",
        ] as const
      ).find(
        (player) =>
          player !== currentPlayer,
      );

    if (wrongPlayer === undefined) {
      throw new Error(
        "Missing alternate player.",
      );
    }

    const document =
      createPlayerCommandDocument(
        wrongPlayer,
        {
          type: "PASS",
        },
      );

    expect(() =>
      applyPlayerCommandDocument(
        state,
        document,
      ),
    ).toThrow();
  });

  it("rejects an illegal TAKE suit", () => {
    const state =
      createMatchMachine({
        baseSeed: 5000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const turnUpSuit =
      state.currentDeal.initialDeal
        .turnUpCard.suit;

    const illegalSuit =
      (
        [
          "CLUBS",
          "DIAMONDS",
          "HEARTS",
          "SPADES",
        ] as const
      ).find(
        (suit) =>
          suit !== turnUpSuit,
      );

    if (illegalSuit === undefined) {
      throw new Error(
        "Missing illegal test suit.",
      );
    }

    const document =
      createPlayerCommandDocument(
        player,
        {
          type: "TAKE",
          suit: illegalSuit,
        },
      );

    expect(() =>
      applyPlayerCommandDocument(
        state,
        document,
      ),
    ).toThrow();
  });

  it("rejects PLAY_CARD before bidding is finished", () => {
    const state =
      createMatchMachine({
        baseSeed: 6000,
      });

    const card =
      state.currentDeal.shuffledDeck[0];

    if (card === undefined) {
      throw new Error(
        "Missing test card.",
      );
    }

    const document =
      createPlayerCommandDocument(
        "PLAYER_1",
        {
          type: "PLAY_CARD",
          card,
        },
      );

    expect(() =>
      applyPlayerCommandDocument(
        state,
        document,
      ),
    ).toThrow(
      "Cards can only be played during the playing phase.",
    );
  });

  it("keeps deterministic history when applying commands", () => {
    const state =
      createMatchMachine({
        baseSeed: 7000,
      });

    const player =
      state.currentDeal.bidding
        .currentPlayer;

    const next =
      applyPlayerCommandDocument(
        state,
        createPlayerCommandDocument(
          player,
          {
            type: "PASS",
          },
        ),
      );

    expect(
      next.history,
    ).toHaveLength(1);

    expect(
      next.history[0],
    ).toEqual({
      index: 0,
      type: "BIDDING_ACTION",
      dealNumber: 1,
      action: {
        type: "PASS",
        player,
      },
    });
  });
});