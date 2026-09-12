import {
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "./players.js";

export interface LiveMatchSeats {
  readonly assignments: Readonly<
    Record<
      PlayerPosition,
      string | null
    >
  >;
}

export interface ClaimLiveMatchSeatOptions {
  readonly seats: LiveMatchSeats;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface ReleaseLiveMatchSeatOptions {
  readonly seats: LiveMatchSeats;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

function assertValidParticipantId(
  participantId: string,
): void {
  if (
    participantId.trim().length === 0
  ) {
    throw new Error(
      "Participant ID must not be empty",
    );
  }
}

function createFrozenAssignments(
  assignments: Record<
    PlayerPosition,
    string | null
  >,
): Readonly<
  Record<
    PlayerPosition,
    string | null
  >
> {
  return Object.freeze(
    assignments,
  );
}

function createLiveMatchSeatsFromAssignments(
  assignments: Record<
    PlayerPosition,
    string | null
  >,
): LiveMatchSeats {
  return Object.freeze({
    assignments:
      createFrozenAssignments(
        assignments,
      ),
  });
}

export function createEmptyLiveMatchSeats():
  LiveMatchSeats {
  return createLiveMatchSeatsFromAssignments({
    PLAYER_0: null,
    PLAYER_1: null,
    PLAYER_2: null,
    PLAYER_3: null,
  });
}

export function getLiveMatchSeatParticipant(
  seats: LiveMatchSeats,
  player: PlayerPosition,
): string | null {
  return seats.assignments[player];
}

export function getLiveMatchSeatForParticipant(
  seats: LiveMatchSeats,
  participantId: string,
): PlayerPosition | null {
  assertValidParticipantId(
    participantId,
  );

  for (
    const player of
    PLAYER_POSITIONS
  ) {
    if (
      seats.assignments[player] ===
      participantId
    ) {
      return player;
    }
  }

  return null;
}

export function isLiveMatchSeatOccupied(
  seats: LiveMatchSeats,
  player: PlayerPosition,
): boolean {
  return (
    seats.assignments[player] !==
    null
  );
}

export function areAllLiveMatchSeatsOccupied(
  seats: LiveMatchSeats,
): boolean {
  return PLAYER_POSITIONS.every(
    (player) =>
      isLiveMatchSeatOccupied(
        seats,
        player,
      ),
  );
}

export function claimLiveMatchSeat(
  options: ClaimLiveMatchSeatOptions,
): LiveMatchSeats {
  const {
    seats,
    player,
    participantId,
  } = options;

  assertValidParticipantId(
    participantId,
  );

  const existingPlayer =
    getLiveMatchSeatForParticipant(
      seats,
      participantId,
    );

  if (
    existingPlayer !== null
  ) {
    if (
      existingPlayer === player
    ) {
      return seats;
    }

    throw new Error(
      `Participant ${participantId} already occupies ${existingPlayer}`,
    );
  }

  const currentParticipant =
    seats.assignments[player];

  if (
    currentParticipant !== null
  ) {
    throw new Error(
      `Match seat ${player} is already occupied`,
    );
  }

  return createLiveMatchSeatsFromAssignments({
    ...seats.assignments,
    [player]: participantId,
  });
}

export function releaseLiveMatchSeat(
  options: ReleaseLiveMatchSeatOptions,
): LiveMatchSeats {
  const {
    seats,
    player,
    participantId,
  } = options;

  assertValidParticipantId(
    participantId,
  );

  const currentParticipant =
    seats.assignments[player];

  if (
    currentParticipant === null
  ) {
    throw new Error(
      `Match seat ${player} is not occupied`,
    );
  }

  if (
    currentParticipant !==
    participantId
  ) {
    throw new Error(
      `Participant ${participantId} does not occupy ${player}`,
    );
  }

  return createLiveMatchSeatsFromAssignments({
    ...seats.assignments,
    [player]: null,
  });
}