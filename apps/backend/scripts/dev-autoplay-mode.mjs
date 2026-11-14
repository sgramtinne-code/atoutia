const sessionIdPattern = /^ms1_[0-9a-f]{32}$/;
const positions = Object.freeze(["PLAYER_0", "PLAYER_1", "PLAYER_2", "PLAYER_3"]);
const humanCounts = Object.freeze({ ALL_BOTS: 0, ANDROID_PLAYER_0: 1, ANDROID_PLAYERS_0_1: 2 });

export function autoplayPlayers(mode) {
  const count = humanCounts[mode];
  if (!Number.isInteger(count)) throw new Error("Unknown autoplay mode.");
  return Object.freeze({ humans: Object.freeze(positions.slice(0, count)), bots: Object.freeze(positions.slice(count)) });
}

export function parseAutoplayArguments(args) {
  if (args.length === 1 && args[0] === "--all-bots") return { mode: "ALL_BOTS", sessionId: null };
  const flags = { "--android-player-0": "ANDROID_PLAYER_0", "--android-players-0-1": "ANDROID_PLAYERS_0_1" };
  if (args.length === 2 && sessionIdPattern.test(args[0]) && Object.hasOwn(flags, args[1])) {
    return { mode: flags[args[1]], sessionId: args[0] };
  }
  throw new Error("Usage: dev-autoplay-room.mjs --all-bots | ms1_<32 hex> --android-player-0 | ms1_<32 hex> --android-players-0-1");
}

export function assertHumanRoom(room, mode) {
  const { humans, bots } = autoplayPlayers(mode);
  if (humans.length === 0 || room.phase !== "WAITING_FOR_PLAYERS" || room.occupiedSeats !== humans.length) {
    throw new Error("Create a fresh waiting room with exactly the required human players before adding bots.");
  }
  for (const player of humans) {
    if (room.seats?.[player] !== true) throw new Error(`${player} must already be occupied by an Android player.`);
  }
  for (const player of bots) {
    if (room.seats?.[player] !== false) throw new Error(`${player} must be free before adding bots.`);
  }
  if (humans.length === 2 && room.mode !== "PRIVATE") throw new Error("The two-account test requires a PRIVATE room.");
}
