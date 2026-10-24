import { PLAYER_POSITIONS } from "@atoutia/belote-engine";
import { LiveRoomStore } from "../../src/liveRoomStore.js";
import { createLiveRoomPersistenceDocument, type LiveRoomPersistenceDocument } from "../../src/liveRoomPersistenceDocument.js";
import type { MatchMode } from "../../src/matchMode.js";

export function diagnosticDocument(count = 0, mode: MatchMode = "PRIVATE", started = false): LiveRoomPersistenceDocument {
  const store = new LiveRoomStore({ activityNow: () => 1_000 });
  let room = store.create({ mode });
  const sessionId = room.managedRoom.room.session.sessionId;
  for (const player of PLAYER_POSITIONS.slice(0, count)) {
    room = store.claimSeat({ sessionId, expectedRevision: room.revision,
      player, participantId: `synthetic-${player}` });
  }
  if (started) room = store.start({ sessionId, expectedRevision: room.revision });
  return createLiveRoomPersistenceDocument({ room, mode,
    adjudication: store.getAdjudication(sessionId),
    absenceResolutions: store.listAbsenceResolutions(sessionId),
    seatControls: store.listSeatControls(sessionId), createdAtMs: 1_000, lastActivityAtMs: 1_000 });
}
