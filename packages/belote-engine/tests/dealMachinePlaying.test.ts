import { describe, expect, it } from "vitest";

import {
  applyDealMachineBiddingAction,
  applyDealMachineCardPlay,
  cardKey,
  createDealMachine,
  createDeck,
  getLegalCards,
  type DealMachineState,
} from "../src/index.js";

function startPlaying(
  seed = 12345,
): DealMachineState {
  const initial = createDealMachine({
    seed,
    dealer: "PLAYER_0",
  });

  return applyDealMachineBiddingAction(
    initial,
    {
      type: "TAKE",
      player: initial.bidding.currentPlayer,
      suit: initial.initialDeal.turnUpCard.suit,
    },
  );
}

function playFirstLegalCard(
  state: DealMachineState,
) {
  if (
    state.trickSequence === null ||
    state.trumpSuit === null
  ) {
    throw new Error(
      "Playing state is required.",
    );
  }

  const player =
    state.trickSequence.currentTrick.currentPlayer;

  const hand =
    state.trickSequence.hands[player];

  const legalCards = getLegalCards(
    hand,
    player,
    state.trickSequence.currentTrick.plays,
    state.trumpSuit,
  );

  const card = legalCards[0];

  if (card === undefined) {
    throw new Error(
      "No legal card available.",
    );
  }

  return applyDealMachineCardPlay(
    state,
    player,
    card,
  );
}

function countCards(
  state: DealMachineState,
): number {
  if (state.trickSequence === null) {
    return 0;
  }

  return (
    state.trickSequence.hands.PLAYER_0.length +
    state.trickSequence.hands.PLAYER_1.length +
    state.trickSequence.hands.PLAYER_2.length +
    state.trickSequence.hands.PLAYER_3.length
  );
}

describe("deal machine playing", () => {
  it("plays a legal card through the machine", () => {
    const initial = startPlaying();

    const result = playFirstLegalCard(initial);

    expect(result.state.phase).toBe("PLAYING");

    expect(
      result.state.trickSequence?.currentTrick.plays,
    ).toHaveLength(1);

    expect(countCards(result.state)).toBe(31);
  });

  it("does not mutate the previous machine state", () => {
    const initial = startPlaying();

    const result = playFirstLegalCard(initial);

    expect(
      initial.trickSequence?.currentTrick.plays,
    ).toHaveLength(0);

    expect(countCards(initial)).toBe(32);

    expect(
      result.state.trickSequence?.currentTrick.plays,
    ).toHaveLength(1);

    expect(countCards(result.state)).toBe(31);
  });

  it("rejects playing a card during bidding", () => {
    const state = createDealMachine({
      seed: 12345,
      dealer: "PLAYER_0",
    });

    expect(() =>
      applyDealMachineCardPlay(
        state,
        "PLAYER_1",
        createDeck()[0]!,
      ),
    ).toThrow(
      "Cards can only be played during the playing phase.",
    );
  });

  it("rejects a card that is not in the current player's hand", () => {
    const state = startPlaying();

    if (state.trickSequence === null) {
      throw new Error(
        "Missing trick sequence.",
      );
    }

    const player =
      state.trickSequence.currentTrick.currentPlayer;

    const handKeys = new Set(
      state.trickSequence.hands[player].map(
        cardKey,
      ),
    );

    const foreignCard = createDeck().find(
      (card) =>
        !handKeys.has(cardKey(card)),
    );

    if (foreignCard === undefined) {
      throw new Error(
        "Unable to find a foreign card.",
      );
    }

    expect(() =>
      applyDealMachineCardPlay(
        state,
        player,
        foreignCard,
      ),
    ).toThrow();
  });

  it("rejects playing out of turn", () => {
    const state = startPlaying();

    if (state.trickSequence === null) {
      throw new Error(
        "Missing trick sequence.",
      );
    }

    const currentPlayer =
      state.trickSequence.currentTrick.currentPlayer;

    const wrongPlayer =
      currentPlayer === "PLAYER_0"
        ? "PLAYER_1"
        : "PLAYER_0";

    const wrongCard =
      state.trickSequence.hands[
        wrongPlayer
      ][0];

    if (wrongCard === undefined) {
      throw new Error(
        "Missing test card.",
      );
    }

    expect(() =>
      applyDealMachineCardPlay(
        state,
        wrongPlayer,
        wrongCard,
      ),
    ).toThrow();
  });

  it("automatically starts the next trick after four cards", () => {
    let state = startPlaying();

    for (let index = 0; index < 4; index += 1) {
      state =
        playFirstLegalCard(state).state;
    }

    expect(
      state.trickSequence?.completedTricks,
    ).toHaveLength(1);

    expect(
      state.trickSequence?.currentTrick.plays,
    ).toHaveLength(0);

    expect(
      state.trickSequence?.currentTrick.completed,
    ).toBe(false);

    expect(countCards(state)).toBe(28);
  });

  it("makes the trick winner lead the following trick", () => {
    let state = startPlaying();

    for (let index = 0; index < 4; index += 1) {
      state =
        playFirstLegalCard(state).state;
    }

    const completed =
      state.trickSequence?.completedTricks[0];

    if (
      completed === undefined ||
      state.trickSequence === null
    ) {
      throw new Error(
        "Missing completed trick.",
      );
    }

    expect(
      state.trickSequence.currentTrick.leader,
    ).toBe(completed.winner.player);

    expect(
      state.trickSequence.currentTrick.currentPlayer,
    ).toBe(completed.winner.player);
  });

  it("plays a complete deal of eight tricks", () => {
    let state = startPlaying();

    for (let index = 0; index < 32; index += 1) {
      state =
        playFirstLegalCard(state).state;
    }

    expect(state.phase).toBe("FINISHED");

    expect(
      state.trickSequence?.completedTricks,
    ).toHaveLength(8);

    expect(countCards(state)).toBe(0);
  });

  it("rejects another card after all eight tricks", () => {
    let state = startPlaying();

    for (let index = 0; index < 32; index += 1) {
      state =
        playFirstLegalCard(state).state;
    }

    expect(state.phase).toBe("FINISHED");

    expect(() =>
      applyDealMachineCardPlay(
        state,
        "PLAYER_0",
        createDeck()[0]!,
      ),
    ).toThrow(
      "Cards can only be played during the playing phase.",
    );
  });

  it("propagates Belote events through the machine", () => {
    let state: DealMachineState | null = null;

    for (
      let seed = 1;
      seed <= 5000;
      seed += 1
    ) {
      const candidate = startPlaying(seed);

      if (
        candidate.belote?.eligiblePlayer ===
        candidate.trickSequence?.currentTrick.currentPlayer
      ) {
        state = candidate;
        break;
      }
    }

    if (
      state === null ||
      state.belote === null ||
      state.trickSequence === null ||
      state.belote.eligiblePlayer === null
    ) {
      throw new Error(
        "Unable to find deterministic Belote test deal.",
      );
    }

    const player =
      state.belote.eligiblePlayer;

    const honor = state.trickSequence.hands[
      player
    ].find(
      (card) =>
        card.suit === state?.trumpSuit &&
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
      applyDealMachineCardPlay(
        state,
        player,
        honor,
      );

    expect(result.beloteEvent).not.toBeNull();
    expect(
      result.beloteEvent?.type,
    ).toBe("BELOTE");

    expect(
      result.state.belote?.completed,
    ).toBe(false);
  });

  it("returns immutable play results", () => {
    const initial = startPlaying();

    const result = playFirstLegalCard(initial);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.state)).toBe(true);

    expect(
      Object.isFrozen(
        result.state.trickSequence,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(result.state.belote),
    ).toBe(true);
  });
});