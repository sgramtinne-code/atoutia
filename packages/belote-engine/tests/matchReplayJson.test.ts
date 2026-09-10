import { describe, expect, it } from "vitest";

import {
  BELOTE_ENGINE_VERSION,
  MATCH_REPLAY_FORMAT_VERSION,
  applyMatchBiddingAction,
  createMatchMachine,
  createMatchReplayDocument,
  parseMatchReplayDocument,
  serializeMatchReplayDocument,
} from "../src/index.js";

function createBaseReplay() {
  return {
    formatVersion:
      MATCH_REPLAY_FORMAT_VERSION,
    engineVersion:
      BELOTE_ENGINE_VERSION,
    baseSeed: 1000,
    firstDealer: "PLAYER_0",
    targetScore: 1000,
    history: [],
  };
}

describe("match replay JSON", () => {
  it("serializes a replay document to JSON", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
    });

    const document =
      createMatchReplayDocument(state);

    const json =
      serializeMatchReplayDocument(
        document,
      );

    expect(typeof json).toBe("string");

    expect(
      JSON.parse(json),
    ).toEqual(document);
  });

  it("parses a valid replay document", () => {
    const state = createMatchMachine({
      baseSeed: 2000,
      firstDealer: "PLAYER_2",
      targetScore: 500,
    });

    const document =
      createMatchReplayDocument(state);

    const parsed =
      parseMatchReplayDocument(
        serializeMatchReplayDocument(
          document,
        ),
      );

    expect(parsed).toEqual(document);
  });

  it("preserves history during JSON round trip", () => {
    let state = createMatchMachine({
      baseSeed: 3000,
    });

    state = applyMatchBiddingAction(
      state,
      {
        type: "PASS",
        player:
          state.currentDeal.bidding
            .currentPlayer,
      },
    );

    const document =
      createMatchReplayDocument(state);

    const parsed =
      parseMatchReplayDocument(
        serializeMatchReplayDocument(
          document,
        ),
      );

    expect(parsed.history).toEqual(
      state.history,
    );
  });

  it("rejects invalid JSON", () => {
    expect(() =>
      parseMatchReplayDocument(
        "{invalid-json",
      ),
    ).toThrow(
      "Replay JSON is invalid.",
    );
  });

  it("rejects a non-object document", () => {
    expect(() =>
      parseMatchReplayDocument(
        JSON.stringify([]),
      ),
    ).toThrow(
      "Replay document must be an object.",
    );
  });

  it("rejects an unsupported format version", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      formatVersion: 999,
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Unsupported match replay format version.",
    );
  });

  it("rejects an unsupported engine version", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      engineVersion: "999.0.0",
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Unsupported Belote engine version.",
    );
  });

  it("rejects an invalid base seed", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      baseSeed: 1.5,
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay base seed must be an integer.",
    );
  });

  it("rejects an invalid first dealer", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      firstDealer: "PLAYER_9",
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay first dealer is invalid.",
    );
  });

  it("rejects an invalid target score", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      targetScore: 0,
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay target score must be a positive integer.",
    );
  });

  it("rejects a non-array history", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: {},
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay history must be an array.",
    );
  });

  it("rejects broken history indexes", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 3,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "PASS",
            player: "PLAYER_1",
          },
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay history indexes must be continuous and start at zero.",
    );
  });

  it("rejects invalid history event types", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "UNKNOWN",
          dealNumber: 1,
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay history event type is invalid.",
    );
  });

  it("rejects invalid bidding players", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "PASS",
            player: "PLAYER_9",
          },
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay bidding action player is invalid.",
    );
  });

  it("rejects PASS actions containing a suit", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "PASS",
            player: "PLAYER_1",
            suit: "HEARTS",
          },
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay PASS action must not contain a suit.",
    );
  });

  it("rejects TAKE actions without a valid suit", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "TAKE",
            player: "PLAYER_1",
            suit: "STARS",
          },
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay TAKE action suit is invalid.",
    );
  });

  it("rejects invalid card players", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "CARD_PLAY",
          dealNumber: 1,
          player: "PLAYER_9",
          card: {
            suit: "HEARTS",
            rank: "ACE",
          },
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay card play player is invalid.",
    );
  });

  it("rejects invalid card suits", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "CARD_PLAY",
          dealNumber: 1,
          player: "PLAYER_1",
          card: {
            suit: "STARS",
            rank: "ACE",
          },
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay card suit is invalid.",
    );
  });

  it("rejects invalid card ranks", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "CARD_PLAY",
          dealNumber: 1,
          player: "PLAYER_1",
          card: {
            suit: "HEARTS",
            rank: "JOKER",
          },
        },
      ],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay card rank is invalid.",
    );
  });

  it("rebuilds parsed bidding actions immutably", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "PASS",
            player: "PLAYER_1",
          },
        },
      ],
    });

    const parsed =
      parseMatchReplayDocument(json);

    const event = parsed.history[0];

    expect(
      Object.isFrozen(event),
    ).toBe(true);

    if (
      event?.type ===
      "BIDDING_ACTION"
    ) {
      expect(
        Object.isFrozen(event.action),
      ).toBe(true);
    }
  });

  it("rebuilds parsed cards immutably", () => {
    const json = JSON.stringify({
      ...createBaseReplay(),
      history: [
        {
          index: 0,
          type: "CARD_PLAY",
          dealNumber: 1,
          player: "PLAYER_1",
          card: {
            suit: "HEARTS",
            rank: "ACE",
          },
        },
      ],
    });

    const parsed =
      parseMatchReplayDocument(json);

    const event = parsed.history[0];

    if (
      event?.type !==
      "CARD_PLAY"
    ) {
      throw new Error(
        "Missing card play event.",
      );
    }

    expect(
      Object.isFrozen(event),
    ).toBe(true);

    expect(
      Object.isFrozen(event.card),
    ).toBe(true);
  });

  it("returns an immutable parsed document", () => {
    const state = createMatchMachine({
      baseSeed: 4000,
    });

    const document =
      createMatchReplayDocument(state);

    const parsed =
      parseMatchReplayDocument(
        serializeMatchReplayDocument(
          document,
        ),
      );

    expect(Object.isFrozen(parsed)).toBe(
      true,
    );

    expect(
      Object.isFrozen(parsed.history),
    ).toBe(true);
  });
});