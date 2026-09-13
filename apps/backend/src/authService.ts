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

import {
  createAuthIdentity,
  createAuthIdentitySubjectHash,
  type AuthIdentity,
  type AuthIdentityProvider,
} from "./authIdentity.js";

import type {
  AuthRepository,
  AuthRepositoryTransaction,
} from "./authRepository.js";

export interface AuthServiceOptions {
  readonly repository:
    AuthRepository;

  readonly now?:
    () => number;

  readonly sessionDurationMs?:
    number;

  readonly externalIdentityVerifiers?:
    Readonly<
      Partial<
        Record<
          AuthIdentityProvider,
          ExternalIdentityVerifier
        >
      >
    >;
}

export interface VerifiedExternalIdentity {
  readonly provider:
    AuthIdentityProvider;

  readonly providerSubject:
    string;
}

export interface ExternalIdentityVerifier {
  verify(
    proof:
      string,
  ): Promise<
    | VerifiedExternalIdentity
    | undefined
  >;
}

export interface ExternalIdentitySessionResult {
  readonly account:
    AuthAccount;

  readonly identity:
    AuthIdentity;

  readonly createdSession:
    CreatedAuthSession;

  readonly accountCreated:
    boolean;
}

export class AuthService {
  readonly #repository:
    AuthRepository;

  readonly #now:
    () => number;

  readonly #sessionDurationMs:
    number | undefined;

  readonly #externalIdentityVerifiers:
    Readonly<
      Partial<
        Record<
          AuthIdentityProvider,
          ExternalIdentityVerifier
        >
      >
    >;

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

    this.#externalIdentityVerifiers =
      options.externalIdentityVerifiers ===
        undefined
        ? Object.freeze({})
        : Object.freeze({
            ...options.externalIdentityVerifiers,
          });
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

    return this.#createAndSaveSession(
      account,
      this.#repository,
    );
  }

  public isExternalIdentityProviderConfigured(
    provider:
      AuthIdentityProvider,
  ): boolean {
    return (
      this.#externalIdentityVerifiers[
        provider
      ] !==
      undefined
    );
  }

  public async createSessionForExternalIdentityProof(
    provider:
      AuthIdentityProvider,

    proof:
      string,
  ): Promise<
    | ExternalIdentitySessionResult
    | undefined
  > {
    const verifier =
      this.#externalIdentityVerifiers[
        provider
      ];

    if (
      verifier ===
        undefined
    ) {
      throw new Error(
        "External authentication provider is not configured.",
      );
    }

    const verifiedIdentity =
      await verifier.verify(
        proof,
      );

    if (
      verifiedIdentity ===
        undefined
    ) {
      return undefined;
    }

    if (
      verifiedIdentity.provider !==
        provider
    ) {
      throw new Error(
        "External authentication verifier returned an unexpected provider.",
      );
    }

    return this
      .createSessionForVerifiedExternalIdentity(
        verifiedIdentity,
      );
  }

  public createSessionForVerifiedExternalIdentity(
    verifiedIdentity:
      VerifiedExternalIdentity,
  ): ExternalIdentitySessionResult {
    const subjectHash =
      createAuthIdentitySubjectHash(
        verifiedIdentity.provider,
        verifiedIdentity.providerSubject,
      );

    return this.#repository.transaction(
      (
        repository,
      ) => {
        const existingIdentity =
          repository
            .findIdentityByProviderAndSubjectHash(
              verifiedIdentity.provider,
              subjectHash,
            );

        if (
          existingIdentity !==
            undefined
        ) {
          const account =
            repository.getAccount(
              existingIdentity.accountId,
            );

          if (
            account ===
              undefined ||
            account.status !==
              "ACTIVE"
          ) {
            throw new Error(
              "External authentication identity account is not available.",
            );
          }

          const createdSession =
            this.#createAndSaveSession(
              account,
              repository,
            );

          return Object.freeze({
            account,

            identity:
              existingIdentity,

            createdSession,

            accountCreated:
              false,
          });
        }

        const createdAtMs =
          this.#now();

        const account =
          createAuthAccount({
            createdAtMs,
          });

        const identity =
          createAuthIdentity({
            accountId:
              account.accountId,

            provider:
              verifiedIdentity.provider,

            providerSubject:
              verifiedIdentity.providerSubject,

            createdAtMs,
          });

        repository.saveAccount(
          account,
        );

        repository.saveIdentity(
          identity,
        );

        const createdSession =
          this.#createAndSaveSession(
            account,
            repository,
          );

        return Object.freeze({
          account,

          identity,

          createdSession,

          accountCreated:
            true,
        });
      },
    );
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

  #createAndSaveSession(
    account:
      AuthAccount,

    repository:
      AuthRepositoryTransaction,
  ): CreatedAuthSession {
    if (
      account.status !==
        "ACTIVE"
    ) {
      throw new Error(
        "Auth account is not available.",
      );
    }

    const baseOptions = {
      accountId:
        account.accountId,

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

    repository.saveSession(
      created.session,
    );

    return created;
  }
}