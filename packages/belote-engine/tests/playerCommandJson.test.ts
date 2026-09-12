import {
  describe,
  expect,
  it,
} from "vitest";

import {
  BELOTE_ENGINE_VERSION,
  PLAYER_COMMAND_FORMAT_VERSION,
  createPlayerCommandDocument,
  parsePlayerCommandDocument,
  serializePlayerCommandDocument,
} from "../src/index.js";

describe("player command JSON", () => {
  it("creates a PASS command document", () => {
    const document =
      createPlayerCommandDocument(
        "PLAYER_1",
        {
          type: "PASS",
        },
      );

    expect(
      document.formatVersion,
    ).toBe(
      PLAYER_COMMAND_FORMAT_VERSION,
    );

    expect(
      document.engineVersion,
    ).toBe(
      BELOTE_ENGINE_VERSION,
    );

    expect(
      document.player,
    ).toBe("PLAYER_1");

    expect(
      document.command,
    ).toEqual({
      type: "PASS",
    });
  });

  it("round trips a TAKE command", () => {
    const document =
      createPlayerCommandDocument(
        "PLAYER_2",
        {
          type: "TAKE",
          suit: "HEARTS",
        },
      );

    const parsed =
      parsePlayerCommandDocument(
        serializePlayerCommandDocument(
          document,
        ),
      );

    expect(parsed).toEqual(
      document,
    );
  });

  it("round trips a PLAY_CARD command", () => {
    const document =
      createPlayerCommandDocument(
        "PLAYER_3",
        {
          type: "PLAY_CARD",
          card: {
            suit: "SPADES",
            rank: "JACK",
          },
        },
      );

    const parsed =
      parsePlayerCommandDocument(
        serializePlayerCommandDocument(
          document,
        ),
      );

    expect(parsed).toEqual(
      document,
    );
  });

  it("rejects invalid JSON", () => {
    expect(() =>
      parsePlayerCommandDocument(
        "{invalid",
      ),
    ).toThrow(
      "Player command JSON is invalid.",
    );
  });

  it("rejects an unsupported format version", () => {
    const json =
      JSON.stringify({
        formatVersion: 999,
        engineVersion:
          BELOTE_ENGINE_VERSION,
        player: "PLAYER_1",
        command: {
          type: "PASS",
        },
      });

    expect(() =>
      parsePlayerCommandDocument(
        json,
      ),
    ).toThrow(
      "Unsupported player command format version.",
    );
  });

  it("rejects an unsupported engine version", () => {
    const json =
      JSON.stringify({
        formatVersion:
          PLAYER_COMMAND_FORMAT_VERSION,
        engineVersion:
          "999.0.0",
        player: "PLAYER_1",
        command: {
          type: "PASS",
        },
      });

    expect(() =>
      parsePlayerCommandDocument(
        json,
      ),
    ).toThrow(
      "Unsupported player command engine version.",
    );
  });

  it("rejects an invalid player", () => {
    const json =
      JSON.stringify({
        formatVersion:
          PLAYER_COMMAND_FORMAT_VERSION,
        engineVersion:
          BELOTE_ENGINE_VERSION,
        player: "PLAYER_9",
        command: {
          type: "PASS",
        },
      });

    expect(() =>
      parsePlayerCommandDocument(
        json,
      ),
    ).toThrow(
      "Player command player is invalid.",
    );
  });

  it("rejects an invalid command type", () => {
    const json =
      JSON.stringify({
        formatVersion:
          PLAYER_COMMAND_FORMAT_VERSION,
        engineVersion:
          BELOTE_ENGINE_VERSION,
        player: "PLAYER_1",
        command: {
          type: "CHEAT",
        },
      });

    expect(() =>
      parsePlayerCommandDocument(
        json,
      ),
    ).toThrow(
      "Player command type is invalid.",
    );
  });

  it("rejects an invalid TAKE suit", () => {
    const json =
      JSON.stringify({
        formatVersion:
          PLAYER_COMMAND_FORMAT_VERSION,
        engineVersion:
          BELOTE_ENGINE_VERSION,
        player: "PLAYER_1",
        command: {
          type: "TAKE",
          suit: "STARS",
        },
      });

    expect(() =>
      parsePlayerCommandDocument(
        json,
      ),
    ).toThrow(
      "Player command TAKE suit is invalid.",
    );
  });

  it("rejects an invalid PLAY_CARD card", () => {
    const json =
      JSON.stringify({
        formatVersion:
          PLAYER_COMMAND_FORMAT_VERSION,
        engineVersion:
          BELOTE_ENGINE_VERSION,
        player: "PLAYER_1",
        command: {
          type: "PLAY_CARD",
          card: {
            suit: "HEARTS",
            rank: "JOKER",
          },
        },
      });

    expect(() =>
      parsePlayerCommandDocument(
        json,
      ),
    ).toThrow(
      "Player command card rank is invalid.",
    );
  });

  it("returns immutable parsed structures", () => {
    const document =
      createPlayerCommandDocument(
        "PLAYER_1",
        {
          type: "PLAY_CARD",
          card: {
            suit: "CLUBS",
            rank: "ACE",
          },
        },
      );

    const parsed =
      parsePlayerCommandDocument(
        serializePlayerCommandDocument(
          document,
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

    if (
      parsed.command.type ===
      "PLAY_CARD"
    ) {
      expect(
        Object.isFrozen(
          parsed.command.card,
        ),
      ).toBe(true);
    }
  });
});