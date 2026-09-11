import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchBiddingAction,
  createMatchMachine,
  createPlayerClientSnapshotDocument,
  parsePlayerClientSnapshotDocument,
  serializePlayerClientSnapshotDocument,
  type MatchMachineState,
} from "../src/index.js";

function startPlaying(
  state: MatchMachineState,
): MatchMachineState {
  return applyMatchBiddingAction(
    state,
    {
      type: "TAKE",

      player:
        state.currentDeal.bidding
          .currentPlayer,

      suit:
        state.currentDeal.initialDeal
          .turnUpCard.suit,
    },
  );
}

describe("player client snapshot JSON", () => {
  it("serializes a snapshot document", () => {
    const document =
      createPlayerClientSnapshotDocument(
        createMatchMachine({
          baseSeed: 1000,
        }),
        "PLAYER_1",
      );

    const json =
      serializePlayerClientSnapshotDocument(
        document,
      );

    expect(
      JSON.parse(json),
    ).toEqual(document);
  });

  it("parses a valid snapshot document", () => {
    const document =
      createPlayerClientSnapshotDocument(
        createMatchMachine({
          baseSeed: 2000,
        }),
        "PLAYER_2",
      );

    const parsed =
      parsePlayerClientSnapshotDocument(
        serializePlayerClientSnapshotDocument(
          document,
        ),
      );

    expect(parsed).toEqual(
      document,
    );
  });

  it("preserves a playing snapshot", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 3000,
        }),
      );

    const player =
      state.currentDeal.trickSequence
        ?.currentTrick.currentPlayer;

    if (player === undefined) {
      throw new Error(
        "Missing current player.",
      );
    }

    const document =
      createPlayerClientSnapshotDocument(
        state,
        player,
      );

    const parsed =
      parsePlayerClientSnapshotDocument(
        serializePlayerClientSnapshotDocument(
          document,
        ),
      );

    expect(parsed).toEqual(
      document,
    );
  });

  it("rejects invalid JSON", () => {
    expect(() =>
      parsePlayerClientSnapshotDocument(
        "{invalid",
      ),
    ).toThrow(
      "Client snapshot JSON is invalid.",
    );
  });

  it("rejects an unsupported format version", () => {
    const document =
      createPlayerClientSnapshotDocument(
        createMatchMachine({
          baseSeed: 4000,
        }),
        "PLAYER_1",
      );

    const json =
      JSON.stringify({
        ...document,
        formatVersion: 999,
      });

    expect(() =>
      parsePlayerClientSnapshotDocument(
        json,
      ),
    ).toThrow(
      "Unsupported client snapshot format version.",
    );
  });

  it("rejects an unsupported engine version", () => {
    const document =
      createPlayerClientSnapshotDocument(
        createMatchMachine({
          baseSeed: 5000,
        }),
        "PLAYER_1",
      );

    const json =
      JSON.stringify({
        ...document,
        engineVersion: "999.0.0",
      });

    expect(() =>
      parsePlayerClientSnapshotDocument(
        json,
      ),
    ).toThrow(
      "Unsupported client snapshot engine version.",
    );
  });

  it("rejects an invalid player", () => {
    const document =
      createPlayerClientSnapshotDocument(
        createMatchMachine({
          baseSeed: 6000,
        }),
        "PLAYER_1",
      );

    const json =
      JSON.stringify({
        ...document,
        snapshot: {
          ...document.snapshot,
          match: {
            ...document.snapshot.match,
            player: "PLAYER_9",
          },
        },
      });

    expect(() =>
      parsePlayerClientSnapshotDocument(
        json,
      ),
    ).toThrow(
      "Client snapshot player is invalid.",
    );
  });

  it("rejects invalid cards", () => {
    const state =
      startPlaying(
        createMatchMachine({
          baseSeed: 7000,
        }),
      );

    const document =
      createPlayerClientSnapshotDocument(
        state,
        "PLAYER_1",
      );

    const json =
      JSON.stringify({
        ...document,
        snapshot: {
          ...document.snapshot,
          match: {
            ...document.snapshot.match,
            hand: [
              {
                suit: "STARS",
                rank: "ACE",
              },
            ],
          },
        },
      });

    expect(() =>
      parsePlayerClientSnapshotDocument(
        json,
      ),
    ).toThrow(
      "Client snapshot card suit is invalid.",
    );
  });

  it("rejects a player mismatch between match and actions", () => {
    const document =
      createPlayerClientSnapshotDocument(
        createMatchMachine({
          baseSeed: 8000,
        }),
        "PLAYER_1",
      );

    const json =
      JSON.stringify({
        ...document,
        snapshot: {
          ...document.snapshot,
          actions: {
            ...document.snapshot.actions,
            player: "PLAYER_2",
          },
        },
      });

    expect(() =>
      parsePlayerClientSnapshotDocument(
        json,
      ),
    ).toThrow(
      "Client snapshot player mismatch.",
    );
  });

  it("returns immutable parsed structures", () => {
    const document =
      createPlayerClientSnapshotDocument(
        createMatchMachine({
          baseSeed: 9000,
        }),
        "PLAYER_1",
      );

    const parsed =
      parsePlayerClientSnapshotDocument(
        serializePlayerClientSnapshotDocument(
          document,
        ),
      );

    expect(
      Object.isFrozen(parsed),
    ).toBe(true);

    expect(
      Object.isFrozen(
        parsed.snapshot,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        parsed.snapshot.match,
      ),
    ).toBe(true);

    expect(
      Object.isFrozen(
        parsed.snapshot.actions,
      ),
    ).toBe(true);
  });
});