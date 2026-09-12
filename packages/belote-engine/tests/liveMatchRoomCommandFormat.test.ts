import {
  describe,
  expect,
  it,
} from "vitest";

import {
  BELOTE_ENGINE_VERSION,
  LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION,
  createLiveMatchRoomCommandDocument,
} from "../src/index.js";

describe(
  "live match room command format",
  () => {
    it("uses version one", () => {
      expect(
        LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION,
      ).toBe(1);
    });

    it("creates a PASS command document", () => {
      const document =
        createLiveMatchRoomCommandDocument(
          "ms1_abababababababababababababababab",
          5,
          {
            type: "PASS",
          },
        );

      expect(
        document,
      ).toEqual({
        formatVersion: 1,
        engineVersion:
          BELOTE_ENGINE_VERSION,
        sessionId:
          "ms1_abababababababababababababababab",
        expectedRevision: 5,
        command: {
          type: "PASS",
        },
      });
    });

    it("creates a TAKE command document", () => {
      const document =
        createLiveMatchRoomCommandDocument(
          "ms1_abababababababababababababababab",
          7,
          {
            type: "TAKE",
            suit: "HEARTS",
          },
        );

      expect(
        document.command,
      ).toEqual({
        type: "TAKE",
        suit: "HEARTS",
      });
    });

    it("creates a PLAY_CARD command document", () => {
      const document =
        createLiveMatchRoomCommandDocument(
          "ms1_abababababababababababababababab",
          9,
          {
            type: "PLAY_CARD",
            card: {
              suit: "SPADES",
              rank: "ACE",
            },
          },
        );

      expect(
        document.command,
      ).toEqual({
        type: "PLAY_CARD",
        card: {
          suit: "SPADES",
          rank: "ACE",
        },
      });
    });

    it("returns immutable document and command structures", () => {
      const document =
        createLiveMatchRoomCommandDocument(
          "ms1_abababababababababababababababab",
          0,
          {
            type: "PLAY_CARD",
            card: {
              suit: "CLUBS",
              rank: "JACK",
            },
          },
        );

      expect(
        Object.isFrozen(document),
      ).toBe(true);

      expect(
        Object.isFrozen(
          document.command,
        ),
      ).toBe(true);

      if (
        document.command.type ===
        "PLAY_CARD"
      ) {
        expect(
          Object.isFrozen(
            document.command.card,
          ),
        ).toBe(true);
      }
    });
  },
);