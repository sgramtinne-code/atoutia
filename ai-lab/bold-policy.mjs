import { chooseStyledOfflineBot } from "../packages/offline-game/dist/botPolicies.js";
import { chooseOfflineBot } from "../packages/offline-game/dist/index.js";
import { playMatch, styles } from "./pilot.mjs";
import { predict } from "./policy.mjs";

export const boldStyle = styles.indexOf("BOLD");

export function boldTableAction(snapshot, seat, boldSeat) {
  return seat === boldSeat ? chooseStyledOfflineBot(snapshot, "bold-v1") : chooseOfflineBot(snapshot);
}

export function playBoldPolicy(index, modelSeat, policy) {
  return playMatch(index, (snapshot, seat, history) => {
    const { actions } = snapshot;
    if (seat !== modelSeat || !policy || actions.mode !== "PLAY_CARD") {
      return boldTableAction(snapshot, seat, modelSeat);
    }
    if (actions.legalCards.length === 1) return { type: "PLAY_CARD", card: actions.legalCards[0] };
    return predict(snapshot, seat, policy.weights, history, boldStyle);
  }, undefined, policy?.source.historyMode === "on");
}
