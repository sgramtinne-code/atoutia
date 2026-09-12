import {
  randomInt,
} from "node:crypto";

import {
  claimRevisionedLiveMatchRoomSeat,
  createRevisionedLiveMatchRoom,
  releaseRevisionedLiveMatchRoomSeat,
  startRevisionedLiveMatchRoom,
  type PlayerPosition,
  type RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

export interface LiveRoomSeatSummary {
  readonly PLAYER_0: boolean;
  readonly PLAYER_1: boolean;
  readonly PLAYER_2: boolean;
  readonly PLAYER_3: boolean;
}

export interface LiveRoomSummary {
  readonly sessionId: string;
  readonly revision: number;
  readonly phase:
    RevisionedLiveMatchRoom["managedRoom"]["phase"];
  readonly occupiedSeats: number;
  readonly seats: LiveRoomSeatSummary;
}

export interface ClaimLiveRoomSeatOptions {
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface ReleaseLiveRoomSeatOptions {
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly player: PlayerPosition;
  readonly participantId: string;
}

export interface StartLiveRoomOptions {
  readonly sessionId: string;
  readonly expectedRevision: number;
}

export class LiveRoomNotFoundError
  extends Error {
  public constructor(
    sessionId: string,
  ) {
    super(
      `Live room not found: ${sessionId}`,
    );

    this.name =
      "LiveRoomNotFoundError";
  }
}

export class LiveRoomStore {
  readonly #rooms =
    new Map<
      string,
      RevisionedLiveMatchRoom
    >();

  public create():
    RevisionedLiveMatchRoom {
    const baseSeed =
      randomInt(
        0,
        0x7fffffff,
      );

    const room =
      createRevisionedLiveMatchRoom({
        baseSeed,
      });

    const sessionId =
      room.managedRoom.room.session
        .sessionId;

    this.#rooms.set(
      sessionId,
      room,
    );

    return room;
  }

  public get(
    sessionId: string,
  ):
    | RevisionedLiveMatchRoom
    | undefined {
    return this.#rooms.get(
      sessionId,
    );
  }

  public claimSeat(
    options:
      ClaimLiveRoomSeatOptions,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const nextRoom =
      claimRevisionedLiveMatchRoomSeat({
        room,
        expectedRevision:
          options.expectedRevision,
        player:
          options.player,
        participantId:
          options.participantId,
      });

    this.#rooms.set(
      options.sessionId,
      nextRoom,
    );

    return nextRoom;
  }

  public releaseSeat(
    options:
      ReleaseLiveRoomSeatOptions,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const nextRoom =
      releaseRevisionedLiveMatchRoomSeat({
        room,
        expectedRevision:
          options.expectedRevision,
        player:
          options.player,
        participantId:
          options.participantId,
      });

    this.#rooms.set(
      options.sessionId,
      nextRoom,
    );

    return nextRoom;
  }

  public start(
    options:
      StartLiveRoomOptions,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#requireRoom(
        options.sessionId,
      );

    const nextRoom =
      startRevisionedLiveMatchRoom({
        room,
        expectedRevision:
          options.expectedRevision,
      });

    this.#rooms.set(
      options.sessionId,
      nextRoom,
    );

    return nextRoom;
  }

  public count(): number {
    return this.#rooms.size;
  }

  #requireRoom(
    sessionId: string,
  ): RevisionedLiveMatchRoom {
    const room =
      this.#rooms.get(
        sessionId,
      );

    if (room === undefined) {
      throw new LiveRoomNotFoundError(
        sessionId,
      );
    }

    return room;
  }
}

export function createLiveRoomSummary(
  room: RevisionedLiveMatchRoom,
): LiveRoomSummary {
  const assignments =
    room.managedRoom.room.seats
      .assignments;

  const occupiedSeats =
    Object.values(
      assignments,
    ).filter(
      (
        participantId,
      ) =>
        participantId !== null,
    ).length;

  return Object.freeze({
    sessionId:
      room.managedRoom.room.session
        .sessionId,

    revision:
      room.revision,

    phase:
      room.managedRoom.phase,

    occupiedSeats,

    seats:
      Object.freeze({
        PLAYER_0:
          assignments.PLAYER_0 !==
          null,

        PLAYER_1:
          assignments.PLAYER_1 !==
          null,

        PLAYER_2:
          assignments.PLAYER_2 !==
          null,

        PLAYER_3:
          assignments.PLAYER_3 !==
          null,
      }),
  });
}