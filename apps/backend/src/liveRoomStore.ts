import {
  randomInt,
} from "node:crypto";

import {
  createRevisionedLiveMatchRoom,
  type RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

export interface LiveRoomSummary {
  readonly sessionId: string;
  readonly revision: number;
  readonly phase:
    RevisionedLiveMatchRoom[
      "managedRoom"
    ]["phase"];
  readonly occupiedSeats: number;
}

export class LiveRoomStore {
  readonly #rooms =
    new Map<
      string,
      RevisionedLiveMatchRoom
    >();

  create(): RevisionedLiveMatchRoom {
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
      room.managedRoom.room
        .session.sessionId;

    this.#rooms.set(
      sessionId,
      room,
    );

    return room;
  }

  get(
    sessionId: string,
  ):
    | RevisionedLiveMatchRoom
    | undefined {
    return this.#rooms.get(
      sessionId,
    );
  }

  set(
    room: RevisionedLiveMatchRoom,
  ): void {
    const sessionId =
      room.managedRoom.room
        .session.sessionId;

    this.#rooms.set(
      sessionId,
      room,
    );
  }

  count(): number {
    return this.#rooms.size;
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
      (participantId) =>
        participantId !== null,
    ).length;

  return Object.freeze({
    sessionId:
      room.managedRoom.room
        .session.sessionId,

    revision:
      room.revision,

    phase:
      room.managedRoom.phase,

    occupiedSeats,
  });
}