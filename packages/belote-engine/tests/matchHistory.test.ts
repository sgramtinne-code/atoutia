import { describe, expect, it } from "vitest";

import {
  appendBiddingHistoryEvent,
  appendCardPlayHistoryEvent,
  createCard,
  createMatchHistory,
} from "../src/index.js";

describe("match history", () => {
  it("creates an empty immutable history", () => {
    const history = createMatchHistory();

    expect(history).toHaveLength(0);
    expect(Object.isFrozen(history)).toBe(true);
  });

  it("appends a bidding action", () => {
    const history =
      appendBiddingHistoryEvent(
        createMatchHistory(),
        1,
        {
          type: "PASS",
          player: "PLAYER_1",
        },
      );

    expect(history).toHaveLength(1);

    expect(history[0]).toEqual({
      index: 0,
      type: "BIDDING_ACTION",
      dealNumber: 1,
      action: {
        type: "PASS",
        player: "PLAYER_1",
      },
    });
  });

  it("appends a card play", () => {
    const card = createCard(
      "HEARTS",
      "ACE",
    );

    const history =
      appendCardPlayHistoryEvent(
        createMatchHistory(),
        2,
        "PLAYER_3",
        card,
      );

    expect(history[0]).toEqual({
      index: 0,
      type: "CARD_PLAY",
      dealNumber: 2,
      player: "PLAYER_3",
      card,
    });
  });

  it("increments history indexes deterministically", () => {
    let history = createMatchHistory();

    history =
      appendBiddingHistoryEvent(
        history,
        1,
        {
          type: "PASS",
          player: "PLAYER_1",
        },
      );

    history =
      appendBiddingHistoryEvent(
        history,
        1,
        {
          type: "PASS",
          player: "PLAYER_2",
        },
      );

    history =
      appendCardPlayHistoryEvent(
        history,
        1,
        "PLAYER_3",
        createCard(
          "CLUBS",
          "SEVEN",
        ),
      );

    expect(
      history.map(
        (event) => event.index,
      ),
    ).toEqual([0, 1, 2]);
  });

  it("preserves the previous history instance", () => {
    const initial =
      createMatchHistory();

    const next =
      appendBiddingHistoryEvent(
        initial,
        1,
        {
          type: "PASS",
          player: "PLAYER_1",
        },
      );

    expect(initial).toHaveLength(0);
    expect(next).toHaveLength(1);
  });

  it("returns immutable events and history", () => {
    const history =
      appendBiddingHistoryEvent(
        createMatchHistory(),
        1,
        {
          type: "PASS",
          player: "PLAYER_1",
        },
      );

    expect(Object.isFrozen(history)).toBe(true);
    expect(
      Object.isFrozen(history[0]),
    ).toBe(true);

    if (
      history[0]?.type ===
      "BIDDING_ACTION"
    ) {
      expect(
        Object.isFrozen(
          history[0].action,
        ),
      ).toBe(true);
    }
  });
});