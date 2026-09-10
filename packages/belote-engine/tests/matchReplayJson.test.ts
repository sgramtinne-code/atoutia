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

    const json =
      serializeMatchReplayDocument(
        document,
      );

    const parsed =
      parseMatchReplayDocument(json);

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
      formatVersion: 999,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 1000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Unsupported match replay format version.",
    );
  });

  it("rejects an unsupported engine version", () => {
    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion: "999.0.0",
      baseSeed: 1000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Unsupported Belote engine version.",
    );
  });

  it("rejects an invalid base seed", () => {
    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 1.5,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
      history: [],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay base seed must be an integer.",
    );
  });

  it("rejects an invalid first dealer", () => {
    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 1000,
      firstDealer: "PLAYER_9",
      targetScore: 1000,
      history: [],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay first dealer is invalid.",
    );
  });

  it("rejects an invalid target score", () => {
    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 1000,
      firstDealer: "PLAYER_0",
      targetScore: 0,
      history: [],
    });

    expect(() =>
      parseMatchReplayDocument(json),
    ).toThrow(
      "Replay target score must be a positive integer.",
    );
  });

  it("rejects a non-array history", () => {
    const json = JSON.stringify({
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 1000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
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
      formatVersion:
        MATCH_REPLAY_FORMAT_VERSION,
      engineVersion:
        BELOTE_ENGINE_VERSION,
      baseSeed: 1000,
      firstDealer: "PLAYER_0",
      targetScore: 1000,
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