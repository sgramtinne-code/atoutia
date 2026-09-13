import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  PlayerAvailableActions,
} from "@atoutia/belote-engine";

import {
  chooseBotCommand,
} from "../src/botStrategy.js";

function createActions(
  overrides:
    Partial<PlayerAvailableActions>,
): PlayerAvailableActions {
  return Object.freeze({
    player:
      overrides.player ??
      "PLAYER_0",

    mode:
      overrides.mode ??
      "WAIT",

    biddingActions:
      overrides.biddingActions ??
      Object.freeze([]),

    legalCards:
      overrides.legalCards ??
      Object.freeze([]),
  });
}

describe(
  "BOT strategy",
  () => {
    it(
      "returns no command while waiting",
      () => {
        const command =
          chooseBotCommand(
            createActions({
              mode:
                "WAIT",
            }),
          );

        expect(
          command,
        ).toBeNull();
      },
    );

    it(
      "returns no command when the match is finished",
      () => {
        const command =
          chooseBotCommand(
            createActions({
              mode:
                "MATCH_FINISHED",
            }),
          );

        expect(
          command,
        ).toBeNull();
      },
    );

    it(
      "chooses PASS during bidding when PASS is legal",
      () => {
        const command =
          chooseBotCommand(
            createActions({
              player:
                "PLAYER_1",

              mode:
                "BID",

              biddingActions:
                Object.freeze([
                  Object.freeze({
                    type:
                      "PASS",

                    player:
                      "PLAYER_1",
                  }),

                  Object.freeze({
                    type:
                      "TAKE",

                    player:
                      "PLAYER_1",

                    suit:
                      "HEARTS",
                  }),
                ]),
            }),
          );

        expect(
          command,
        ).toEqual({
          type:
            "PASS",
        });
      },
    );

    it(
      "prefers PASS even when TAKE actions appear first",
      () => {
        const command =
          chooseBotCommand(
            createActions({
              player:
                "PLAYER_2",

              mode:
                "BID",

              biddingActions:
                Object.freeze([
                  Object.freeze({
                    type:
                      "TAKE",

                    player:
                      "PLAYER_2",

                    suit:
                      "CLUBS",
                  }),

                  Object.freeze({
                    type:
                      "PASS",

                    player:
                      "PLAYER_2",
                  }),

                  Object.freeze({
                    type:
                      "TAKE",

                    player:
                      "PLAYER_2",

                    suit:
                      "SPADES",
                  }),
                ]),
            }),
          );

        expect(
          command,
        ).toEqual({
          type:
            "PASS",
        });
      },
    );

    it(
      "returns no bidding command when PASS is not available",
      () => {
        const command =
          chooseBotCommand(
            createActions({
              player:
                "PLAYER_3",

              mode:
                "BID",

              biddingActions:
                Object.freeze([
                  Object.freeze({
                    type:
                      "TAKE",

                    player:
                      "PLAYER_3",

                    suit:
                      "DIAMONDS",
                  }),
                ]),
            }),
          );

        expect(
          command,
        ).toBeNull();
      },
    );

    it(
      "plays the first legal card",
      () => {
        const command =
          chooseBotCommand(
            createActions({
              player:
                "PLAYER_0",

              mode:
                "PLAY_CARD",

              legalCards:
                Object.freeze([
                  Object.freeze({
                    suit:
                      "SPADES",

                    rank:
                      "NINE",
                  }),

                  Object.freeze({
                    suit:
                      "HEARTS",

                    rank:
                      "ACE",
                  }),
                ]),
            }),
          );

        expect(
          command,
        ).toEqual({
          type:
            "PLAY_CARD",

          card: {
            suit:
              "SPADES",

            rank:
              "NINE",
          },
        });
      },
    );

    it(
      "returns no command when PLAY_CARD has no legal card",
      () => {
        const command =
          chooseBotCommand(
            createActions({
              mode:
                "PLAY_CARD",

              legalCards:
                Object.freeze([]),
            }),
          );

        expect(
          command,
        ).toBeNull();
      },
    );

    it(
      "does not mutate the available actions",
      () => {
        const firstCard =
          Object.freeze({
            suit:
              "CLUBS" as const,

            rank:
              "JACK" as const,
          });

        const actions =
          createActions({
            mode:
              "PLAY_CARD",

            legalCards:
              Object.freeze([
                firstCard,
              ]),
          });

        const command =
          chooseBotCommand(
            actions,
          );

        expect(
          actions.legalCards[0],
        ).toBe(
          firstCard,
        );

        expect(
          command,
        ).toEqual({
          type:
            "PLAY_CARD",

          card: {
            suit:
              "CLUBS",

            rank:
              "JACK",
          },
        });
      },
    );
  },
);