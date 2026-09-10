import { describe, expect, it } from "vitest";

import {
  MATCH_REPLAY_FORMAT_VERSION,
  BELOTE_ENGINE_VERSION,
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  createMatchReplayDocument,
  getLegalCards,
  serializeMatchReplayDocument,
  validateAndReplayMatchReplayJson,
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

function playFirstLegalCard(
  state: MatchMachineState,
): MatchMachineState {
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

  return applyMatchCardPlay(
    state,
    player,
    card,
  ).state;
}

describe("match replay semantic validation", () => {
  it("validates and replays an empty match", () => {
    const original = createMatchMachine({
      baseSeed: 1000,
    });

    const document =
      createMatchReplayDocument(original);

    const result =
      validateAndReplayMatchReplayJson(
        serializeMatchReplayDocument(
          document,
        ),
      );

    expect(result.document).toEqual(
      document,
    );

    expect(result.state).toEqual(
      original,
    );
  });

  it("validates and replays bidding actions", () => {
    let original = createMatchMachine({
      baseSeed: 2000,
    });

    original = applyMatchBiddingAction(
      original,
      {
        type: "PASS",
        player:
          original.currentDeal.bidding
            .currentPlayer,
      },
    );

    original = applyMatchBiddingAction(
      original,
      {
        type: "PASS",
        player:
          original.currentDeal.bidding
            .currentPlayer,
      },
    );

    const document =
      createMatchReplayDocument(original);

    const result =
      validateAndReplayMatchReplayJson(
        serializeMatchReplayDocument(
          document,
        ),
      );

    expect(result.state).toEqual(
      original,
    );
  });

  it("validates and replays card plays", () => {
    let original = takeFirstRound(
      createMatchMachine({
        baseSeed: 3000,
      }),
    );

    for (let index = 0; index < 8; index += 1) {
      original =
        playFirstLegalCard(original);
    }

    const document =
      createMatchReplayDocument(original);

    const result =
      validateAndReplayMatchReplayJson(
        serializeMatchReplayDocument(
          document,
        ),
      );

    expect(result.state).toEqual(
      original,
    );
  });

  it("rejects a bidding action from the wrong player", () => {
    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 1000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "PASS",
            player: "PLAYER_0",
          },
        },
      ],
    });

    expect(() =>
      validateAndReplayMatchReplayJson(
        json,
      ),
    ).toThrow();
  });

  it("rejects an illegal first-round trump choice", () => {
    const state = createMatchMachine({
      baseSeed: 4000,
    });

    const turnUpSuit =
      state.currentDeal.initialDeal
        .turnUpCard.suit;

    const invalidSuit = (
      [
        "CLUBS",
        "DIAMONDS",
        "HEARTS",
        "SPADES",
      ] as const
    ).find(
      (suit) => suit !== turnUpSuit,
    );

    if (invalidSuit === undefined) {
      throw new Error(
        "Unable to find invalid test suit.",
      );
    }

    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 4000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "TAKE",
            player:
              state.currentDeal.bidding
                .currentPlayer,
            suit: invalidSuit,
          },
        },
      ],
    });

    expect(() =>
      validateAndReplayMatchReplayJson(
        json,
      ),
    ).toThrow();
  });

  it("rejects card play before bidding is completed", () => {
    const state = createMatchMachine({
      baseSeed: 5000,
    });

    const card =
      state.currentDeal.shuffledDeck[0];

    if (card === undefined) {
      throw new Error(
        "Missing test card.",
      );
    }

    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 5000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [
        {
          index: 0,
          type: "CARD_PLAY",
          dealNumber: 1,
          player: "PLAYER_1",
          card,
        },
      ],
    });

    expect(() =>
      validateAndReplayMatchReplayJson(
        json,
      ),
    ).toThrow(
      "Cards can only be played during the playing phase.",
    );
  });

  it("rejects an event attached to the wrong deal", () => {
    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 6000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 2,
          action: {
            type: "PASS",
            player: "PLAYER_1",
          },
        },
      ],
    });

    expect(() =>
      validateAndReplayMatchReplayJson(
        json,
      ),
    ).toThrow(
      "Match history deal number does not match the current replay deal.",
    );
  });

  it("rejects a card not owned by the current player", () => {
    const playing = takeFirstRound(
      createMatchMachine({
        baseSeed: 7000,
      }),
    );

    const sequence =
      playing.currentDeal.trickSequence;

    if (sequence === null) {
      throw new Error(
        "Missing trick sequence.",
      );
    }

    const player =
      sequence.currentTrick.currentPlayer;

    const ownedKeys = new Set(
      sequence.hands[player].map(
        (card) =>
          `${card.suit}:${card.rank}`,
      ),
    );

    const foreignCard =
      playing.currentDeal.shuffledDeck.find(
        (card) =>
          !ownedKeys.has(
            `${card.suit}:${card.rank}`,
          ),
      );

    if (foreignCard === undefined) {
      throw new Error(
        "Unable to find foreign test card.",
      );
    }

    const takeEvent =
      playing.history[0];

    if (
      takeEvent === undefined ||
      takeEvent.type !==
        "BIDDING_ACTION"
    ) {
      throw new Error(
        "Missing take history event.",
      );
    }

    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 7000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [
        takeEvent,
        {
          index: 1,
          type: "CARD_PLAY",
          dealNumber: 1,
          player,
          card: foreignCard,
        },
      ],
    });

    expect(() =>
      validateAndReplayMatchReplayJson(
        json,
      ),
    ).toThrow();
  });

  it("returns immutable validation results", () => {
    const state = createMatchMachine({
      baseSeed: 8000,
    });

    const document =
      createMatchReplayDocument(state);

    const result =
      validateAndReplayMatchReplayJson(
        serializeMatchReplayDocument(
          document,
        ),
      );

    expect(
      Object.isFrozen(result),
    ).toBe(true);

    expect(
      Object.isFrozen(result.document),
    ).toBe(true);

    expect(
      Object.isFrozen(result.state),
    ).toBe(true);
  });
});