import {
  PLAYER_POSITIONS,
  type PlayerPosition,
  type RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

import type {
  LiveRoomAbsenceResolution,
} from "./liveRoomAbsenceResolution.js";

import type {
  LiveRoomAdjudication,
} from "./liveRoomAdjudication.js";

import type {
  LiveRoomSeatControl,
} from "./liveRoomSeatControl.js";

import type {
  MatchMode,
} from "./matchMode.js";

export const LIVE_ROOM_PERSISTENCE_FORMAT_VERSION =
  1;

export interface LiveRoomPersistenceDocument {
  readonly formatVersion:
    1;

  readonly sessionId:
    string;

  readonly room:
    RevisionedLiveMatchRoom;

  readonly mode:
    MatchMode;

  readonly adjudication:
    LiveRoomAdjudication;

  readonly absenceResolutions:
    readonly LiveRoomAbsenceResolution[];

  readonly seatControls:
    readonly LiveRoomSeatControl[];
}

export interface CreateLiveRoomPersistenceDocumentOptions {
  readonly room:
    RevisionedLiveMatchRoom;

  readonly mode:
    MatchMode;

  readonly adjudication:
    LiveRoomAdjudication;

  readonly absenceResolutions:
    readonly LiveRoomAbsenceResolution[];

  readonly seatControls:
    readonly LiveRoomSeatControl[];
}

function assertValidSessionId(
  document:
    LiveRoomPersistenceDocument,
): void {
  const roomSessionId =
    document.room.managedRoom.room.session
      .sessionId;

  if (
    document.sessionId !==
    roomSessionId
  ) {
    throw new Error(
      `Persisted live room session mismatch: ${document.sessionId} !== ${roomSessionId}`,
    );
  }
}

function assertValidSeatControls(
  controls:
    readonly LiveRoomSeatControl[],
): void {
  if (
    controls.length !==
    PLAYER_POSITIONS.length
  ) {
    throw new Error(
      "Persisted live room must contain exactly four seat controls.",
    );
  }

  const players =
    new Set<
      PlayerPosition
    >();

  for (
    const control
    of controls
  ) {
    if (
      !PLAYER_POSITIONS.includes(
        control.player,
      )
    ) {
      throw new Error(
        `Invalid persisted seat control player: ${control.player}`,
      );
    }

    if (
      players.has(
        control.player,
      )
    ) {
      throw new Error(
        `Duplicate persisted seat control for ${control.player}`,
      );
    }

    players.add(
      control.player,
    );
  }
}

function freezeDocument(
  document:
    LiveRoomPersistenceDocument,
): LiveRoomPersistenceDocument {
  return Object.freeze({
    ...document,

    absenceResolutions:
      Object.freeze(
        [
          ...document.absenceResolutions,
        ],
      ),

    seatControls:
      Object.freeze(
        [
          ...document.seatControls,
        ],
      ),
  });
}

export function createLiveRoomPersistenceDocument(
  options:
    CreateLiveRoomPersistenceDocumentOptions,
): LiveRoomPersistenceDocument {
  const sessionId =
    options.room.managedRoom.room.session
      .sessionId;

  const document:
    LiveRoomPersistenceDocument = {
      formatVersion:
        LIVE_ROOM_PERSISTENCE_FORMAT_VERSION,

      sessionId,

      room:
        options.room,

      mode:
        options.mode,

      adjudication:
        options.adjudication,

      absenceResolutions:
        options.absenceResolutions,

      seatControls:
        options.seatControls,
  };

  assertValidSessionId(
    document,
  );

  assertValidSeatControls(
    document.seatControls,
  );

  return freezeDocument(
    document,
  );
}

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function isMatchMode(
  value:
    unknown,
): value is MatchMode {
  return (
    value ===
      "PRIVATE" ||
    value ===
      "CASUAL" ||
    value ===
      "RANKED"
  );
}

function isPlayerPosition(
  value:
    unknown,
): value is PlayerPosition {
  return (
    typeof value ===
      "string" &&
    (
      PLAYER_POSITIONS as
        readonly string[]
    ).includes(
      value,
    )
  );
}

function parseSeatControl(
  value:
    unknown,
): LiveRoomSeatControl {
  if (
    !isRecord(
      value,
    ) ||
    !isPlayerPosition(
      value.player,
    ) ||
    (
      value.controller !==
        "HUMAN" &&
      value.controller !==
        "BOT"
    )
  ) {
    throw new Error(
      "Invalid persisted live room seat control.",
    );
  }

  return Object.freeze({
    player:
      value.player,

    controller:
      value.controller,
  });
}

export function parseLiveRoomPersistenceDocument(
  text:
    string,
): LiveRoomPersistenceDocument {
  let value:
    unknown;

  try {
    value =
      JSON.parse(
        text,
      ) as unknown;
  } catch {
    throw new Error(
      "Invalid persisted live room JSON.",
    );
  }

  if (
    !isRecord(
      value,
    )
  ) {
    throw new Error(
      "Persisted live room document must be an object.",
    );
  }

  if (
    value.formatVersion !==
      LIVE_ROOM_PERSISTENCE_FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported persisted live room format version.",
    );
  }

  if (
    typeof value.sessionId !==
      "string" ||
    value.sessionId.length ===
      0
  ) {
    throw new Error(
      "Persisted live room sessionId is invalid.",
    );
  }

  if (
    !isMatchMode(
      value.mode,
    )
  ) {
    throw new Error(
      "Persisted live room mode is invalid.",
    );
  }

  if (
    !isRecord(
      value.room,
    ) ||
    !isRecord(
      value.adjudication,
    ) ||
    !Array.isArray(
      value.absenceResolutions,
    ) ||
    !Array.isArray(
      value.seatControls,
    )
  ) {
    throw new Error(
      "Persisted live room document structure is invalid.",
    );
  }

  const room =
    value.room as unknown as
      RevisionedLiveMatchRoom;

  const adjudication =
    value.adjudication as unknown as
      LiveRoomAdjudication;

  const absenceResolutions =
    value.absenceResolutions as unknown as
      readonly LiveRoomAbsenceResolution[];

  const seatControls =
    value.seatControls.map(
      parseSeatControl,
    );

  const document:
    LiveRoomPersistenceDocument = {
      formatVersion:
        LIVE_ROOM_PERSISTENCE_FORMAT_VERSION,

      sessionId:
        value.sessionId,

      room,

      mode:
        value.mode,

      adjudication,

      absenceResolutions,

      seatControls,
  };

  assertValidSessionId(
    document,
  );

  assertValidSeatControls(
    document.seatControls,
  );

  return freezeDocument(
    document,
  );
}

export function serializeLiveRoomPersistenceDocument(
  document:
    LiveRoomPersistenceDocument,
): string {
  return JSON.stringify(
    document,
  );
}