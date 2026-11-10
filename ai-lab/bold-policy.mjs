import { getPlayerTeam, getTrickWinner } from "../packages/belote-engine/dist/index.js";
import { chooseStyledOfflineBot } from "../packages/offline-game/dist/botPolicies.js";
import { chooseOfflineBot } from "../packages/offline-game/dist/index.js";
import { playMatch, styles } from "./pilot.mjs";
import { predict } from "./policy.mjs";

export const boldStyle = styles.indexOf("BOLD");

export function boldTableAction(snapshot, seat, boldSeat) {
  return seat === boldSeat ? chooseStyledOfflineBot(snapshot, "bold-v1") : chooseOfflineBot(snapshot);
}

export function winningCardsWhenClosing(snapshot) {
  const { currentTrick, trumpSuit } = snapshot.match.public;
  const { actions } = snapshot;
  const plays = currentTrick?.plays;
  if (actions.mode !== "PLAY_CARD" || plays?.length !== 3) return [];
  const player = actions.player;
  const leadingPlayer = getTrickWinner(plays, trumpSuit).player;
  if (getPlayerTeam(leadingPlayer) === getPlayerTeam(player)) return [];
  return actions.legalCards.filter(
    (card) => getTrickWinner([...plays, { player, card }], trumpSuit).player === player,
  );
}

export function playBoldPolicy(index, modelSeat, policy, adjustDecision) {
  return playMatch(index, (snapshot, seat, history) => {
    const { actions } = snapshot;
    if (seat !== modelSeat || !policy || actions.mode !== "PLAY_CARD") {
      return boldTableAction(snapshot, seat, modelSeat);
    }
    if (actions.legalCards.length === 1) return { type: "PLAY_CARD", card: actions.legalCards[0] };
    const command = predict(snapshot, seat, policy.weights, history, boldStyle);
    return adjustDecision ? adjustDecision(snapshot, history, command) : command;
  }, undefined, policy?.source.historyMode === "on");
}
