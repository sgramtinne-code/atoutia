import { OfflineGame } from "./index.js";
import { isOfflineBotPolicy } from "./botPolicies.js";

let game: OfflineGame | null = null;

/** Local data-only RPC. The bundle has no network or native-object bridge. */
export function request(json: string): string {
  const input = JSON.parse(json) as Record<string, unknown>;
  if (!input || Array.isArray(input)) throw new Error("Invalid offline request.");
  switch (input.method) {
    case "start":
      if (typeof input.seed !== "number") throw new Error("Missing offline seed.");
      if (input.botPolicy !== undefined && !isOfflineBotPolicy(input.botPolicy)) throw new Error("Unsupported offline bot policy.");
      game = OfflineGame.start(input.seed, input.botPolicy);
      break;
    case "restore":
      if (typeof input.save !== "string") throw new Error("Missing offline save.");
      game = OfflineGame.restore(input.save);
      break;
    case "human":
      if (!game || typeof input.revision !== "number") throw new Error("Missing offline match.");
      game.human(input.command, input.revision);
      break;
    case "bot":
      if (!game || typeof input.revision !== "number") throw new Error("Missing offline match.");
      game.stepBot(input.revision);
      break;
    case "snapshot":
      break;
    default:
      throw new Error("Unknown offline method.");
  }
  if (!game) throw new Error("Offline match has not started.");
  return JSON.stringify(game.frame());
}
