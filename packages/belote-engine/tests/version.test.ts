import { describe, expect, it } from "vitest";

import { BELOTE_ENGINE_VERSION } from "../src/index.js";

describe("belote-engine", () => {
  it("expose sa version", () => {
    expect(BELOTE_ENGINE_VERSION).toBe("0.1.0");
  });
});