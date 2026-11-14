// Development CLI credentials stay in this closure, never on disk or in diagnostics.
function validateSession(value, accountId, sessionId) {
  if (!value || !/^atk1_[A-Za-z0-9_-]{43}$/.test(value.accessToken) ||
      !/^art1_[A-Za-z0-9_-]{43}$/.test(value.refreshToken) ||
      value.session?.accountId !== accountId ||
      !/^as1_[0-9a-f]{32}$/.test(value.session?.sessionId) ||
      (sessionId !== undefined && value.session.sessionId !== sessionId) ||
      !Number.isSafeInteger(value.session.expiresAtMs) ||
      value.session.revokedAtMs !== null) {
    throw new Error("Invalid bot session response; credentials were not accepted.");
  }
  return { accessToken: value.accessToken, refreshToken: value.refreshToken, sessionId: value.session.sessionId };
}

export function createDevelopmentBotSession(initialSession, { accountId, refresh }) {
  let current = validateSession(initialSession, accountId);
  let pending = null;
  let failure = null;

  async function renew(rejectedToken) {
    if (failure) throw failure;
    // Another request may already have rotated this exact rejected credential.
    if (current.accessToken !== rejectedToken) return;
    if (!pending) {
      pending = (async () => {
        try {
          const response = await refresh(current.refreshToken);
          if (response.status !== 200) throw new Error("Refresh rejected.");
          current = validateSession(response.body, accountId, current.sessionId);
        } catch {
          // A lost response can mean the one-use refresh token was consumed. Never
          // replay it, bootstrap a replacement identity, or echo a response/token.
          failure = new Error("Bot session renewal failed. No new identity was created. Start a new test room; keep Android data.");
          throw failure;
        }
      })();
    }
    try { await pending; } finally { pending = null; }
  }

  return Object.freeze({
    get accessToken() { return current.accessToken; },
    async request(sendWithToken) {
      if (failure) throw failure;
      if (pending) await pending;
      const token = current.accessToken;
      const response = await sendWithToken(token);
      if (response.status !== 401 || response.body?.error !== "AUTH_INVALID") return response;
      await renew(token);
      // Only an explicit authentication rejection is retried, once. A timeout,
      // revision conflict or permission refusal never replays a game command.
      return sendWithToken(current.accessToken);
    },
  });
}
