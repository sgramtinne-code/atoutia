export const PLAYER_POSITIONS = [
  "PLAYER_0",
  "PLAYER_1",
  "PLAYER_2",
  "PLAYER_3",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export function nextPlayer(position: PlayerPosition): PlayerPosition {
  const index = PLAYER_POSITIONS.indexOf(position);

  return PLAYER_POSITIONS[(index + 1) % PLAYER_POSITIONS.length]!;
}

export function getPlayOrderAfter(
  position: PlayerPosition,
): readonly PlayerPosition[] {
  const order: PlayerPosition[] = [];
  let current = nextPlayer(position);

  for (let index = 0; index < PLAYER_POSITIONS.length; index += 1) {
    order.push(current);
    current = nextPlayer(current);
  }

  return Object.freeze(order);
}