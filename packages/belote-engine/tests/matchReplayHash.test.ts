import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applyMatchBiddingAction,
  createCanonicalMatchReplayJson,
  createMatchMachine,
  createMatchReplayDocument,
  hashMatchReplayDocument,
  parseMatchReplayDocument,
  serializeMatchReplayDocument,
} from "../src/index.js";

describe("match replay hash", () => {
  it("creates deterministic canonical JSON", () => {
    const state = createMatchMachine({
      baseSeed: 1000,
      firstDealer: "PLAYER_2",
      targetScore: 500,
    });

    const document =
      createMatchReplayDocument(state);

    const first =
      createCanonicalMatchReplayJson(
        document,
      );

    const second =
      createCanonicalMatchReplayJson(
        document,
      );

    expect(first).toBe(second);
  });

  it("creates a 64-character SHA-256 hexadecimal hash", async () => {
    const document =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 1000,
        }),
      );

    const hash =
      await hashMatchReplayDocument(
        document,
      );

    expect(hash).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("creates the same hash for the same replay", async () => {
    const document =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 2000,
        }),
      );

    const first =
      await hashMatchReplayDocument(
        document,
      );

    const second =
      await hashMatchReplayDocument(
        document,
      );

    expect(first).toBe(second);
  });

  it("preserves the hash through a JSON round trip", async () => {
    let state = createMatchMachine({
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

    const original =
      createMatchReplayDocument(state);

    const parsed =
      parseMatchReplayDocument(
        serializeMatchReplayDocument(
          original,
        ),
      );

    const originalHash =
      await hashMatchReplayDocument(
        original,
      );

    const parsedHash =
      await hashMatchReplayDocument(
        parsed,
      );

    expect(parsedHash).toBe(
      originalHash,
    );
  });

  it("changes the hash when the base seed changes", async () => {
    const first =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 4000,
        }),
      );

    const second =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 4001,
        }),
      );

    expect(
      await hashMatchReplayDocument(
        first,
      ),
    ).not.toBe(
      await hashMatchReplayDocument(
        second,
      ),
    );
  });

  it("changes the hash when match configuration changes", async () => {
    const first =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 5000,
          firstDealer: "PLAYER_0",
          targetScore: 1000,
        }),
      );

    const second =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 5000,
          firstDealer: "PLAYER_1",
          targetScore: 500,
        }),
      );

    expect(
      await hashMatchReplayDocument(
        first,
      ),
    ).not.toBe(
      await hashMatchReplayDocument(
        second,
      ),
    );
  });

  it("changes the hash when history changes", async () => {
    const initial =
      createMatchMachine({
        baseSeed: 6000,
      });

    const before =
      createMatchReplayDocument(
        initial,
      );

    const afterAction =
      applyMatchBiddingAction(
        initial,
        {
          type: "PASS",
          player:
            initial.currentDeal.bidding
              .currentPlayer,
        },
      );

    const after =
      createMatchReplayDocument(
        afterAction,
      );

    expect(
      await hashMatchReplayDocument(
        before,
      ),
    ).not.toBe(
      await hashMatchReplayDocument(
        after,
      ),
    );
  });

  it("canonicalizes bidding actions explicitly", () => {
    let state = createMatchMachine({
      baseSeed: 7000,
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

    const document =
      createMatchReplayDocument(state);

    const canonical =
      createCanonicalMatchReplayJson(
        document,
      );

    const parsed =
      JSON.parse(canonical) as {
        history: unknown[];
      };

    expect(parsed.history).toEqual([
      {
        index: 0,
        type: "BIDDING_ACTION",
        dealNumber: 1,
        action: {
          type: "PASS",
          player: "PLAYER_1",
        },
      },
    ]);
  });
});