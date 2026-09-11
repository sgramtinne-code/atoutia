import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchBiddingAction,
  createMatchMachine,
  createMatchReplayDocument,
  createMatchReplayIntegrityDocument,
  parseAndVerifyMatchReplayIntegrityJson,
  serializeMatchReplayIntegrityDocument,
} from "../src/index.js";

describe("match replay integrity JSON", () => {
  it("serializes an integrity document", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 1000,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const json =
      serializeMatchReplayIntegrityDocument(
        document,
      );

    expect(typeof json).toBe("string");

    const parsed =
      JSON.parse(json) as {
        replay: unknown;
        sha256: string;
      };

    expect(parsed.replay).toEqual(
      replay,
    );

    expect(parsed.sha256).toBe(
      document.sha256,
    );
  });

  it("parses and verifies a valid integrity document", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 2000,
          firstDealer: "PLAYER_2",
          targetScore: 500,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const parsed =
      await parseAndVerifyMatchReplayIntegrityJson(
        serializeMatchReplayIntegrityDocument(
          document,
        ),
      );

    expect(parsed).toEqual(
      document,
    );
  });

  it("preserves history through the integrity JSON round trip", async () => {
    let state =
      createMatchMachine({
        baseSeed: 3000,
      });

    state =
      applyMatchBiddingAction(
        state,
        {
          type: "PASS",
          player:
            state.currentDeal.bidding
              .currentPlayer,
        },
      );

    const replay =
      createMatchReplayDocument(
        state,
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const parsed =
      await parseAndVerifyMatchReplayIntegrityJson(
        serializeMatchReplayIntegrityDocument(
          document,
        ),
      );

    expect(
      parsed.replay.history,
    ).toEqual(
      replay.history,
    );
  });

  it("rejects invalid JSON", async () => {
    await expect(
      parseAndVerifyMatchReplayIntegrityJson(
        "{invalid",
      ),
    ).rejects.toThrow(
      "Replay integrity JSON is invalid.",
    );
  });

  it("rejects a non-object integrity document", async () => {
    await expect(
      parseAndVerifyMatchReplayIntegrityJson(
        JSON.stringify([]),
      ),
    ).rejects.toThrow(
      "Replay integrity document must be an object.",
    );
  });

  it("rejects a missing replay", async () => {
    await expect(
      parseAndVerifyMatchReplayIntegrityJson(
        JSON.stringify({
          sha256:
            "0".repeat(64),
        }),
      ),
    ).rejects.toThrow(
      "Replay integrity document must contain a replay.",
    );
  });

  it("rejects an invalid SHA-256 format", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 4000,
        }),
      );

    await expect(
      parseAndVerifyMatchReplayIntegrityJson(
        JSON.stringify({
          replay,
          sha256: "invalid",
        }),
      ),
    ).rejects.toThrow(
      "Replay integrity SHA-256 is invalid.",
    );
  });

  it("rejects a modified replay", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 5000,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const tampered =
      JSON.stringify({
        replay: {
          ...document.replay,
          targetScore: 500,
        },
        sha256: document.sha256,
      });

    await expect(
      parseAndVerifyMatchReplayIntegrityJson(
        tampered,
      ),
    ).rejects.toThrow(
      "Replay integrity verification failed.",
    );
  });

  it("rejects a semantically impossible replay", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 6000,
        }),
      );

    const impossibleReplay = {
      ...replay,
      history: [
        {
          index: 0,
          type: "BIDDING_ACTION",
          dealNumber: 1,
          action: {
            type: "PASS",
            player: "PLAYER_0",
          },
        },
      ],
    };

    const document =
      await createMatchReplayIntegrityDocument(
        impossibleReplay as typeof replay,
      );

    const json =
      serializeMatchReplayIntegrityDocument(
        document,
      );

    await expect(
      parseAndVerifyMatchReplayIntegrityJson(
        json,
      ),
    ).rejects.toThrow();
  });

  it("returns immutable parsed structures", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 7000,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const parsed =
      await parseAndVerifyMatchReplayIntegrityJson(
        serializeMatchReplayIntegrityDocument(
          document,
        ),
      );

    expect(
      Object.isFrozen(parsed),
    ).toBe(true);

    expect(
      Object.isFrozen(parsed.replay),
    ).toBe(true);

    expect(
      Object.isFrozen(
        parsed.replay.history,
      ),
    ).toBe(true);
  });
});