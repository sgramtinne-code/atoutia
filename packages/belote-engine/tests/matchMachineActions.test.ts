import { describe, expect, it } from "vitest";

import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  getLegalCards,
  type MatchMachineState,
} from "../src/index.js";

function takeFirstRound(
  state: MatchMachineState,
): MatchMachineState {
  return applyMatchBiddingAction(
    state,
    {
      type: "TAKE",
      player:
        state.currentDeal.bidding.currentPlayer,
      suit:
        state.currentDeal.initialDeal
          .turnUpCard.suit,
    },
  );
}

describe("match machine actions", () => {
  it("applies bidding through the match machine", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const result =
      applyMatchBiddingAction(
        initial,
        {
          type: "PASS",
          player:
            initial.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(
      result.currentDeal.bidding.passesInRound,
    ).toBe(1);

    expect(initial.currentDeal.phase).toBe(
      "BIDDING",
    );
  });

  it("moves current deal to playing after a take", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const result =
      takeFirstRound(initial);

    expect(
      result.currentDeal.phase,
    ).toBe("PLAYING");

    expect(
      result.currentDeal.taker,
    ).not.toBeNull();

    expect(
      result.currentDeal.trumpSuit,
    ).not.toBeNull();
  });

  it("plays a legal card through the match machine", () => {
    const playing = takeFirstRound(
      createMatchMachine({
        baseSeed: 1000,
      }),
    );

    const sequence =
      playing.currentDeal.trickSequence;

    const trumpSuit =
      playing.currentDeal.trumpSuit;

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

    const legalCards = getLegalCards(
      sequence.hands[player],
      player,
      sequence.currentTrick.plays,
      trumpSuit,
    );

    const card = legalCards[0];

    if (card === undefined) {
      throw new Error(
        "No legal card available.",
      );
    }

    const result =
      applyMatchCardPlay(
        playing,
        player,
        card,
      );

    expect(
      result.state.currentDeal
        .trickSequence?.currentTrick.plays,
    ).toHaveLength(1);

    expect(
      result.dealPlay.state,
    ).toBe(
      result.state.currentDeal,
    );
  });

  it("preserves Belote events returned by the deal machine", () => {
    let playing: MatchMachineState | null =
      null;

    for (
      let seed = 1;
      seed <= 5000;
      seed += 1
    ) {
      const candidate = takeFirstRound(
        createMatchMachine({
          baseSeed: seed,
        }),
      );

      if (
        candidate.currentDeal.belote
          ?.eligiblePlayer ===
        candidate.currentDeal.trickSequence
          ?.currentTrick.currentPlayer
      ) {
        playing = candidate;
        break;
      }
    }

    if (
      playing === null ||
      playing.currentDeal.belote === null ||
      playing.currentDeal.trickSequence ===
        null ||
      playing.currentDeal.trumpSuit === null ||
      playing.currentDeal.belote
        .eligiblePlayer === null
    ) {
      throw new Error(
        "Unable to find deterministic Belote test deal.",
      );
    }

    const player =
      playing.currentDeal.belote
        .eligiblePlayer;

    const honor =
      playing.currentDeal.trickSequence
        .hands[player]
        .find(
          (card) =>
            card.suit ===
              playing?.currentDeal
                .trumpSuit &&
            (
              card.rank === "KING" ||
              card.rank === "QUEEN"
            ),
        );

    if (honor === undefined) {
      throw new Error(
        "Missing Belote honor.",
      );
    }

    const result =
      applyMatchCardPlay(
        playing,
        player,
        honor,
      );

    expect(
      result.dealPlay.beloteEvent,
    ).not.toBeNull();

    expect(
      result.dealPlay.beloteEvent?.type,
    ).toBe("BELOTE");
  });

  it("does not mutate the previous match state", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const result =
      applyMatchBiddingAction(
        initial,
        {
          type: "PASS",
          player:
            initial.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(
      initial.currentDeal.bidding.passesInRound,
    ).toBe(0);

    expect(
      result.currentDeal.bidding.passesInRound,
    ).toBe(1);
  });

  it("keeps match score unchanged while the current deal is still active", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const playing =
      takeFirstRound(initial);

    expect(playing.score.scores).toEqual({
      TEAM_0: 0,
      TEAM_1: 0,
    });
  });

  it("returns immutable match action results", () => {
    const initial = createMatchMachine({
      baseSeed: 1000,
    });

    const biddingResult =
      applyMatchBiddingAction(
        initial,
        {
          type: "PASS",
          player:
            initial.currentDeal.bidding
              .currentPlayer,
        },
      );

    expect(
      Object.isFrozen(biddingResult),
    ).toBe(true);

    const playing =
      takeFirstRound(
        createMatchMachine({
          baseSeed: 2000,
        }),
      );

    const sequence =
      playing.currentDeal.trickSequence;

    const trumpSuit =
      playing.currentDeal.trumpSuit;

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

    const card = getLegalCards(
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

    const playResult =
      applyMatchCardPlay(
        playing,
        player,
        card,
      );

    expect(
      Object.isFrozen(playResult),
    ).toBe(true);

    expect(
      Object.isFrozen(playResult.state),
    ).toBe(true);
  });
});