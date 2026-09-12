import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createLiveMatchRoomCommandDocument,
  parseLiveMatchRoomCommandDocument,
  serializeLiveMatchRoomCommandDocument,
} from "../src/index.js";

function createPassDocument() {
  return createLiveMatchRoomCommandDocument(
    "ms1_abababababababababababababababab",
    5,
    {
      type: "PASS",
    },
  );
}

describe(
  "live match room command JSON",
  () => {
    it("serializes and parses a valid PASS command", () => {
      const document =
        createPassDocument();

      const parsed =
        parseLiveMatchRoomCommandDocument(
          serializeLiveMatchRoomCommandDocument(
            document,
          ),
        );

      expect(
        parsed,
      ).toEqual(
        document,
      );
    });

    it("serializes and parses TAKE", () => {
      const document =
        createLiveMatchRoomCommandDocument(
          "ms1_abababababababababababababababab",
          10,
          {
            type: "TAKE",
            suit: "DIAMONDS",
          },
        );

      expect(
        parseLiveMatchRoomCommandDocument(
          serializeLiveMatchRoomCommandDocument(
            document,
          ),
        ),
      ).toEqual(
        document,
      );
    });

    it("serializes and parses PLAY_CARD", () => {
      const document =
        createLiveMatchRoomCommandDocument(
          "ms1_abababababababababababababababab",
          11,
          {
            type: "PLAY_CARD",
            card: {
              suit: "HEARTS",
              rank: "NINE",
            },
          },
        );

      expect(
        parseLiveMatchRoomCommandDocument(
          serializeLiveMatchRoomCommandDocument(
            document,
          ),
        ),
      ).toEqual(
        document,
      );
    });

    it("rejects malformed JSON", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          "{ broken",
        ),
      ).toThrow(
        "Live room command JSON is invalid.",
      );
    });

    it("rejects non-object JSON", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          "[]",
        ),
      ).toThrow(
        "Live room command document must be an object.",
      );
    });

    it("rejects unsupported format versions", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),
            formatVersion: 999,
          }),
        ),
      ).toThrow(
        "Unsupported live room command format version.",
      );
    });

    it("rejects unsupported engine versions", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),
            engineVersion:
              "999.0.0",
          }),
        ),
      ).toThrow(
        "Unsupported live room command engine version.",
      );
    });

    it("rejects invalid session IDs", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),
            sessionId:
              "invalid",
          }),
        ),
      ).toThrow(
        "Live room command session ID is invalid.",
      );
    });

    it("rejects negative revisions", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),
            expectedRevision: -1,
          }),
        ),
      ).toThrow(
        "Live room command expected revision is invalid.",
      );
    });

    it("rejects fractional revisions", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),
            expectedRevision: 1.5,
          }),
        ),
      ).toThrow(
        "Live room command expected revision is invalid.",
      );
    });

    it("rejects unsafe integer revisions", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),
            expectedRevision:
              Number.MAX_SAFE_INTEGER +
              1,
          }),
        ),
      ).toThrow(
        "Live room command expected revision is invalid.",
      );
    });

    it("rejects unknown command types", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),

            command: {
              type: "CHEAT",
            },
          }),
        ),
      ).toThrow();
    });

    it("rejects invalid TAKE suits", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),

            command: {
              type: "TAKE",
              suit: "INVALID",
            },
          }),
        ),
      ).toThrow();
    });

    it("rejects invalid PLAY_CARD cards", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),

            command: {
              type: "PLAY_CARD",

              card: {
                suit: "SPADES",
                rank: "INVALID",
              },
            },
          }),
        ),
      ).toThrow();
    });

    it("rejects unexpected top-level properties", () => {
      expect(() =>
        parseLiveMatchRoomCommandDocument(
          JSON.stringify({
            ...createPassDocument(),

            player:
              "PLAYER_0",
          }),
        ),
      ).toThrow(
        "Live room command document structure is invalid.",
      );
    });

    it("does not expose or require a player property", () => {
      const parsed =
        parseLiveMatchRoomCommandDocument(
          serializeLiveMatchRoomCommandDocument(
            createPassDocument(),
          ),
        );

      expect(
        "player" in parsed,
      ).toBe(false);
    });

    it("does not expose or require a participant ID", () => {
      const parsed =
        parseLiveMatchRoomCommandDocument(
          serializeLiveMatchRoomCommandDocument(
            createPassDocument(),
          ),
        );

      expect(
        "participantId" in parsed,
      ).toBe(false);
    });

    it("returns an immutable parsed document", () => {
      const parsed =
        parseLiveMatchRoomCommandDocument(
          serializeLiveMatchRoomCommandDocument(
            createPassDocument(),
          ),
        );

      expect(
        Object.isFrozen(parsed),
      ).toBe(true);

      expect(
        Object.isFrozen(
          parsed.command,
        ),
      ).toBe(true);
    });
  },
);