import { describe, expect, it } from "vitest";

import {
  createCard,
  getTrickWinner,
  type PlayedCard,
} from "../src/index.js";

describe("trick winner", () => {
  it("returns the only played card when the trick contains one card", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_2",
        card: createCard("CLUBS", "SEVEN"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_2");
    expect(winner.card).toEqual(createCard("CLUBS", "SEVEN"));
    expect(winner.playIndex).toBe(0);
  });

  it("uses the first card to determine the led suit", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("SPADES", "KING"),
      },
      {
        player: "PLAYER_1",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_2",
        card: createCard("SPADES", "TEN"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_2");
  });

  it("selects the strongest card of the led suit when no trump is played", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("SPADES", "KING"),
      },
      {
        player: "PLAYER_1",
        card: createCard("SPADES", "ACE"),
      },
      {
        player: "PLAYER_2",
        card: createCard("SPADES", "TEN"),
      },
      {
        player: "PLAYER_3",
        card: createCard("SPADES", "QUEEN"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_1");
    expect(winner.card.rank).toBe("ACE");
  });

  it("ignores a stronger off-suit card when it is not trump", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "SEVEN"),
      },
      {
        player: "PLAYER_1",
        card: createCard("SPADES", "ACE"),
      },
      {
        player: "PLAYER_2",
        card: createCard("DIAMONDS", "ACE"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_0");
  });

  it("lets a trump beat the strongest card of the led suit", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("SPADES", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("HEARTS", "SEVEN"),
      },
      {
        player: "PLAYER_2",
        card: createCard("SPADES", "TEN"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_1");
    expect(winner.card).toEqual(createCard("HEARTS", "SEVEN"));
  });

  it("uses trump ranking between multiple trump cards", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("HEARTS", "ACE"),
      },
      {
        player: "PLAYER_2",
        card: createCard("HEARTS", "NINE"),
      },
      {
        player: "PLAYER_3",
        card: createCard("HEARTS", "JACK"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_3");
    expect(winner.card.rank).toBe("JACK");
  });

  it("keeps the first strongest card when later cards cannot beat it", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "ACE"),
      },
      {
        player: "PLAYER_1",
        card: createCard("CLUBS", "KING"),
      },
      {
        player: "PLAYER_2",
        card: createCard("DIAMONDS", "ACE"),
      },
      {
        player: "PLAYER_3",
        card: createCard("SPADES", "ACE"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_0");
    expect(winner.playIndex).toBe(0);
  });

  it("works when the led suit is itself trump", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_1",
        card: createCard("HEARTS", "ACE"),
      },
      {
        player: "PLAYER_2",
        card: createCard("HEARTS", "NINE"),
      },
      {
        player: "PLAYER_3",
        card: createCard("HEARTS", "TEN"),
      },
      {
        player: "PLAYER_0",
        card: createCard("HEARTS", "JACK"),
      },
    ];

    const winner = getTrickWinner(plays, "HEARTS");

    expect(winner.player).toBe("PLAYER_0");
    expect(winner.card.rank).toBe("JACK");
  });

  it("rejects an empty trick", () => {
    expect(() => getTrickWinner([], "HEARTS")).toThrow(
      "A trick must contain at least one played card.",
    );
  });

  it("rejects more than four played cards", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "SEVEN"),
      },
      {
        player: "PLAYER_1",
        card: createCard("CLUBS", "EIGHT"),
      },
      {
        player: "PLAYER_2",
        card: createCard("CLUBS", "NINE"),
      },
      {
        player: "PLAYER_3",
        card: createCard("CLUBS", "TEN"),
      },
      {
        player: "PLAYER_0",
        card: createCard("CLUBS", "JACK"),
      },
    ];

    expect(() => getTrickWinner(plays, "HEARTS")).toThrow(
      "A trick cannot contain more than four played cards.",
    );
  });

  it("rejects a player playing twice in the same trick", () => {
    const plays: readonly PlayedCard[] = [
      {
        player: "PLAYER_0",
        card: createCard("SPADES", "SEVEN"),
      },
      {
        player: "PLAYER_1",
        card: createCard("SPADES", "EIGHT"),
      },
      {
        player: "PLAYER_0",
        card: createCard("SPADES", "ACE"),
      },
    ];

    expect(() => getTrickWinner(plays, "HEARTS")).toThrow(
      "A player cannot play more than once in the same trick.",
    );
  });

  it("returns an immutable winner result", () => {
    const winner = getTrickWinner(
      [
        {
          player: "PLAYER_0",
          card: createCard("SPADES", "ACE"),
        },
      ],
      "HEARTS",
    );

    expect(Object.isFrozen(winner)).toBe(true);
  });
});