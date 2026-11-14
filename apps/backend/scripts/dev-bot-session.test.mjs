import { expect, test, vi } from "vitest";
import { createDevelopmentBotSession } from "./dev-bot-session.mjs";

const accountId = "acc1_" + "a".repeat(32);
const document = (letter = "a", overrides = {}) => ({
  accessToken: "atk1_" + letter.repeat(43), refreshToken: "art1_" + letter.repeat(43),
  session: { accountId, sessionId: "as1_" + "b".repeat(32), expiresAtMs: 100000, revokedAtMs: null },
  ...overrides,
});
const invalid = { status: 401, body: { error: "AUTH_INVALID" } };
const ok = { status: 200, body: {} };

test("concurrent expired requests rotate once, accept the new pair and rotate again", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const refresh = vi.fn(async (token) => {
    await gate;
    return { status: 200, body: document(token === document().refreshToken ? "c" : "d") };
  });
  const session = createDevelopmentBotSession(document(), { accountId, refresh });
  const first = vi.fn(async (token) => token === document().accessToken ? invalid : ok);
  const requests = [session.request(first), session.request(first)];
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  release();
  expect(await Promise.all(requests)).toEqual([ok, ok]);
  expect(refresh).toHaveBeenNthCalledWith(1, document().refreshToken);
  expect(session.accessToken).toBe(document("c").accessToken);
  const next = vi.fn(async (token) => token === document("c").accessToken ? invalid : ok);
  expect(await session.request(next)).toEqual(ok);
  expect(refresh).toHaveBeenNthCalledWith(2, document("c").refreshToken);
  expect(next).toHaveBeenCalledTimes(2);
});

test.each([403, 409, 500])("HTTP %i never rotates or replays a command", async (status) => {
  const refresh = vi.fn();
  const session = createDevelopmentBotSession(document(), { accountId, refresh });
  const send = vi.fn(async () => ({ status, body: { error: "AUTH_INVALID" } }));
  expect((await session.request(send)).status).toBe(status);
  expect(send).toHaveBeenCalledTimes(1);
  expect(refresh).not.toHaveBeenCalled();
});

test("a lost command response is not replayed, and a second 401 is not retried", async () => {
  const refresh = vi.fn(async () => ({ status: 200, body: document("c") }));
  const session = createDevelopmentBotSession(document(), { accountId, refresh });
  const send = vi.fn(async () => { throw new Error("Connection lost"); });
  await expect(session.request(send)).rejects.toThrow("Connection lost");
  expect(send).toHaveBeenCalledTimes(1);
  expect(refresh).not.toHaveBeenCalled();
  const rejected = vi.fn(async () => invalid);
  expect(await session.request(rejected)).toEqual(invalid);
  expect(rejected).toHaveBeenCalledTimes(2);
  expect(refresh).toHaveBeenCalledTimes(1);
});

test.each(["lost", "rejected", "identity", "session", "malformed"])("failed refresh (%s) stops without reusing a one-use token or leaking credentials", async (failure) => {
  const refresh = vi.fn(async () => {
    if (failure === "lost") throw new Error(document().refreshToken);
    if (failure === "rejected") return { status: 401, body: document() };
    const body = document("c");
    if (failure === "identity") body.session.accountId = "another-account";
    if (failure === "session") body.session.sessionId = "as1_" + "e".repeat(32);
    if (failure === "malformed") body.refreshToken = "bad";
    return { status: 200, body };
  });
  const session = createDevelopmentBotSession(document(), { accountId, refresh });
  const send = vi.fn(async () => invalid);
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(session.request(send)).rejects.toThrow("Bot session renewal failed.");
    await expect(session.request(send)).rejects.not.toThrow(/atk1_|art1_/);
  }
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledTimes(1);
});

test("a malformed initial session is refused before any request", () => {
  const refresh = vi.fn();
  expect(() => createDevelopmentBotSession(document("a", { refreshToken: null }), { accountId, refresh })).toThrow("Invalid bot session response");
  expect(refresh).not.toHaveBeenCalled();
});
