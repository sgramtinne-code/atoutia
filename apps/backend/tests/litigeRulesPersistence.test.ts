import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURRENT_MATCH_RULES_VERSION, PLAYER_POSITIONS, MATCH_REPLAY_FORMAT_VERSION,
  createLiveMatchRoomCommandDocument, replayMatchDocument,
  type MatchReplayDocument,
} from "@atoutia/belote-engine";
import { LiveRoomStore } from "../src/liveRoomStore.js";
import { SQLiteLiveRoomRepository } from "../src/sqliteLiveRoomRepository.js";
import { createLiveRoomPersistenceDocument } from "../src/liveRoomPersistenceDocument.js";
import { createActiveLiveRoomAdjudication } from "../src/liveRoomAdjudication.js";

const fixture = JSON.parse(readFileSync(new URL("../../../packages/belote-engine/tests/fixtures/litige-legacy-replay.json", import.meta.url), "utf8")) as { replay: MatchReplayDocument };

describe("litige rules survive SQLite restart", () => {
  it.each([false, true])("resumes the decisive card with current rules=%s", (current) => {
    const directory = mkdtempSync(join(tmpdir(), "atoutia-litige-rules-"));
    const repositories: SQLiteLiveRoomRepository[] = [];
    try {
      const databasePath = join(directory, "synthetic.sqlite");
      const initial = new SQLiteLiveRoomRepository({ databasePath });
      repositories.push(initial);
      const store = new LiveRoomStore({ repository: initial, activityNow: () => 1000 });
      let room = store.create({ mode: "PRIVATE" });
      const sessionId = room.managedRoom.room.session.sessionId;
      for (const player of PLAYER_POSITIONS) {
        room = store.claimSeat({ sessionId, expectedRevision: room.revision, player, participantId: "rules-test-" + player });
      }
      room = store.start({ sessionId, expectedRevision: room.revision });
      const before = replayMatchDocument({
        ...fixture.replay, history: fixture.replay.history.slice(0, -1),
        ...(current ? { formatVersion: MATCH_REPLAY_FORMAT_VERSION, rulesVersion: CURRENT_MATCH_RULES_VERSION } : {}),
      });
      const persistedRoom = {
        ...room, revision: room.revision + before.history.length,
        managedRoom: {
          ...room.managedRoom,
          room: { ...room.managedRoom.room, session: { ...room.managedRoom.room.session, state: before } },
        },
      };
      initial.save(createLiveRoomPersistenceDocument({
        room: persistedRoom, mode: "PRIVATE", adjudication: createActiveLiveRoomAdjudication(),
        absenceResolutions: [], seatControls: PLAYER_POSITIONS.map((player) => ({ player, controller: "HUMAN" })),
        createdAtMs: 1000, lastActivityAtMs: 1000,
      }));
      initial.close();
      const restarted = new SQLiteLiveRoomRepository({ databasePath });
      repositories.push(restarted);
      const restoredStore = new LiveRoomStore({ repository: restarted, activityNow: () => 2000 });
      const restored = restoredStore.get(sessionId)!;
      expect(restored.managedRoom.room.session.state.rulesVersion).toBe(current ? CURRENT_MATCH_RULES_VERSION : undefined);
      const last = fixture.replay.history.at(-1)!;
      if (last.type !== "CARD_PLAY") throw new Error("Expected decisive card fixture.");
      const result = restoredStore.applyCommand({
        sessionId, participantId: "rules-test-" + last.player,
        document: createLiveMatchRoomCommandDocument(sessionId, restored.revision, { type: "PLAY_CARD", card: last.card }),
      });
      const state = result.room.managedRoom.room.session.state;
      expect(state.score.scores).toEqual(current ? { TEAM_0: 666, TEAM_1: 832 } : { TEAM_0: 585, TEAM_1: 913 });
      expect(state.rulesVersion).toBe(current ? CURRENT_MATCH_RULES_VERSION : undefined);
      expect(restarted.get(sessionId)!.room.managedRoom.room.session.state.score.scores).toEqual(state.score.scores);
    } finally {
      for (const repository of repositories) repository.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
