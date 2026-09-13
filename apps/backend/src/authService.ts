import {
  createAuthAccount,
  createAuthSession,
  hashAuthToken,
  isAuthSessionUsable,
  revokeAuthSession,
  type AuthAccount,
  type AuthenticatedAccount,
  type CreatedAuthSession,
} from "./auth.js";

import type {
  AuthRepository,
} from "./authRepository.js";

export interface AuthServiceOptions {
  readonly repository:
    AuthRepository;

  readonly now?:
    () => number;

  readonly sessionDurationMs?:
    number;
}

export class AuthService {
  readonly #repository:
    AuthRepository;

  readonly #now:
    () => number;

  readonly #sessionDurationMs:
    number | undefined;

  public constructor(
    options:
      AuthServiceOptions,
  ) {
    this.#repository =
      options.repository;

    this.#now =
      options.now ??
      Date.now;

    this.#sessionDurationMs =
      options.sessionDurationMs;
  }

  public createAccount():
    AuthAccount {
    const account =
      createAuthAccount({
        createdAtMs:
          this.#now(),
      });

    this.#repository.saveAccount(
      account,
    );

    return account;
  }

  public createSession(
    accountId:
      string,
  ): CreatedAuthSession {
    const account =
      this.#repository.getAccount(
        accountId,
      );

    if (
      account ===
      undefined ||
    account.status !==
      "ACTIVE"
    ) {
      throw new Error(
        "Auth account is not available.",
      );
    }

    const baseOptions = {
      accountId,

      createdAtMs:
        this.#now(),
    };

    const created =
      this.#sessionDurationMs ===
        undefined
        ? createAuthSession(
            baseOptions,
          )
        : createAuthSession({
            ...baseOptions,

            durationMs:
              this.#sessionDurationMs,
          });

    this.#repository.saveSession(
      created.session,
    );

    return created;
  }

  public authenticate(
    token:
      string,
  ):
    | AuthenticatedAccount
    | undefined {
    let tokenHash:
      string;

    try {
      tokenHash =
        hashAuthToken(
          token,
        );
    } catch {
      return undefined;
    }

    const session =
      this.#repository
        .findSessionByTokenHash(
          tokenHash,
        );

    if (
      session ===
        undefined ||
    !isAuthSessionUsable(
      session,
      this.#now(),
    )
    ) {
      return undefined;
    }

    const account =
      this.#repository.getAccount(
        session.accountId,
      );

    if (
      account ===
        undefined ||
    account.status !==
      "ACTIVE"
    ) {
      return undefined;
    }

    return Object.freeze({
      accountId:
        account.accountId,

      authSessionId:
        session.sessionId,
    });
  }

  public revokeSession(
    sessionId:
      string,
  ): boolean {
    const session =
      this.#repository.getSession(
        sessionId,
      );

    if (
      session ===
      undefined
    ) {
      return false;
    }

    const revoked =
      revokeAuthSession(
        session,
        this.#now(),
      );

    if (
      revoked !==
      session
    ) {
      this.#repository.saveSession(
        revoked,
      );
    }

    return true;
  }
}