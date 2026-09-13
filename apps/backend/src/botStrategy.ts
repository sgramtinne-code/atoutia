import type {
  PlayerAvailableActions,
  PlayerCommand,
} from "@atoutia/belote-engine";

export type BotStrategyCommand =
  PlayerCommand | null;

function chooseBiddingCommand(
  actions:
    PlayerAvailableActions,
): BotStrategyCommand {
  const passAction =
    actions.biddingActions.find(
      (
        action,
      ) =>
        action.type ===
        "PASS",
    );

  if (
    passAction ===
    undefined
  ) {
    return null;
  }

  return Object.freeze({
    type:
      "PASS",
  });
}

function choosePlayCardCommand(
  actions:
    PlayerAvailableActions,
): BotStrategyCommand {
  const card =
    actions.legalCards[0];

  if (
    card ===
    undefined
  ) {
    return null;
  }

  return Object.freeze({
    type:
      "PLAY_CARD",

    card:
      Object.freeze({
        suit:
          card.suit,

        rank:
          card.rank,
      }),
  });
}

export function chooseBotCommand(
  actions:
    PlayerAvailableActions,
): BotStrategyCommand {
  switch (
    actions.mode
  ) {
    case "BID":
      return chooseBiddingCommand(
        actions,
      );

    case "PLAY_CARD":
      return choosePlayCardCommand(
        actions,
      );

    case "WAIT":
    case "MATCH_FINISHED":
      return null;
  }
}