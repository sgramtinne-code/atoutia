import { chooseStyledOfflineBot } from "../packages/offline-game/dist/botPolicies.js";
import { chooseOfflineBot } from "../packages/offline-game/dist/index.js";
import { styles } from "./pilot.mjs";

export const boldStyle = styles.indexOf("BOLD");

export function boldTableAction(snapshot, seat, boldSeat) {
  return seat === boldSeat ? chooseStyledOfflineBot(snapshot, "bold-v1") : chooseOfflineBot(snapshot);
}
