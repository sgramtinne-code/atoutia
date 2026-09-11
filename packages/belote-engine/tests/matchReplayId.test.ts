import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MATCH_REPLAY_ID_PREFIX,
  applyMatchBiddingAction,
  createMatchMachine,
  createMatchReplayDocument,
  createMatchReplayId,
  isMatchReplayId,
} from "../src/index.js";

describe("match replay ID", () => {
  it("uses the versioned replay ID prefix", () => {
    expect(
      MATCH_REPLAY_ID_PREFIX,
    ).toBe("rp1_");
  });

  it("creates a valid replay ID", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 1000,
        }),
      );

    const replayId =
      await createMatchReplayId(
        replay,
      );

    expect(replayId).toMatch(
      /^rp1_[0-9a-f]{32}$/,
    );

    expect(
      isMatchReplayId(replayId),
    ).toBe(true);
  });

  it("creates the same ID for the same replay", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 2000,
        }),
      );

    const first =
      await createMatchReplayId(
        replay,
      );

    const second =
      await createMatchReplayId(
        replay,
      );

    expect(first).toBe(second);
  });

  it("changes the ID when replay history changes", async () => {
    const initial =
      createMatchMachine({
        baseSeed: 3000,
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
      await createMatchReplayId(
        before,
      ),
    ).not.toBe(
      await createMatchReplayId(
        after,
      ),
    );
  });

  it("changes the ID when replay configuration changes", async () => {
    const first =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 4000,
          targetScore: 1000,
        }),
      );

    const second =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 4000,
          targetScore: 500,
        }),
      );

    expect(
      await createMatchReplayId(
        first,
      ),
    ).not.toBe(
      await createMatchReplayId(
        second,
      ),
    );
  });

  it("rejects malformed replay IDs", () => {
    expect(
      isMatchReplayId(
        "rp1_invalid",
      ),
    ).toBe(false);

    expect(
      isMatchReplayId(
        "0123456789abcdef0123456789abcdef",
      ),
    ).toBe(false);

    expect(
      isMatchReplayId(
        "rp2_0123456789abcdef0123456789abcdef",
      ),
    ).toBe(false);

    expect(
      isMatchReplayId(null),
    ).toBe(false);
  });
});