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
  verifyMatchReplayIntegrity,
} from "../src/index.js";

describe("match replay integrity", () => {
  it("creates an integrity document with a SHA-256 hash", async () => {
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

    expect(
      document.sha256,
    ).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("verifies an untouched replay", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 2000,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    await expect(
      verifyMatchReplayIntegrity(
        document,
      ),
    ).resolves.toBe(true);
  });

  it("rejects an invalid hash format", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 3000,
        }),
      );

    const document =
      Object.freeze({
        replay,
        sha256: "invalid",
      });

    await expect(
      verifyMatchReplayIntegrity(
        document,
      ),
    ).resolves.toBe(false);
  });

  it("detects a modified base seed", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 4000,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const tampered =
      Object.freeze({
        ...document,
        replay: Object.freeze({
          ...document.replay,
          baseSeed: 4001,
        }),
      });

    await expect(
      verifyMatchReplayIntegrity(
        tampered,
      ),
    ).resolves.toBe(false);
  });

  it("detects a modified target score", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 5000,
          targetScore: 1000,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const tampered =
      Object.freeze({
        ...document,
        replay: Object.freeze({
          ...document.replay,
          targetScore: 500,
        }),
      });

    await expect(
      verifyMatchReplayIntegrity(
        tampered,
      ),
    ).resolves.toBe(false);
  });

  it("detects a modified first dealer", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 6000,
          firstDealer: "PLAYER_0",
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const tampered =
      Object.freeze({
        ...document,
        replay: Object.freeze({
          ...document.replay,
          firstDealer: "PLAYER_1",
        }),
      });

    await expect(
      verifyMatchReplayIntegrity(
        tampered,
      ),
    ).resolves.toBe(false);
  });

  it("detects modified history", async () => {
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

    const replay =
      createMatchReplayDocument(
        state,
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    const tampered =
      Object.freeze({
        ...document,
        replay: Object.freeze({
          ...document.replay,
          history: Object.freeze([]),
        }),
      });

    await expect(
      verifyMatchReplayIntegrity(
        tampered,
      ),
    ).resolves.toBe(false);
  });

  it("returns an immutable integrity document", async () => {
    const replay =
      createMatchReplayDocument(
        createMatchMachine({
          baseSeed: 8000,
        }),
      );

    const document =
      await createMatchReplayIntegrityDocument(
        replay,
      );

    expect(
      Object.isFrozen(document),
    ).toBe(true);

    expect(
      Object.isFrozen(document.replay),
    ).toBe(true);
  });
});