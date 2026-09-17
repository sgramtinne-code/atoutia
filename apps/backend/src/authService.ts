import {
  createAuthAccount,
  createAuthSession,
  hashAuthToken,
  isAuthRefreshCredentialUsable,
  isAuthSessionUsable,
  revokeAuthSession,
  rotateAuthSession,
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
  AuthConsumedRefreshToken,
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

  readonly refreshSessionDurationMs?:
    number;

  readonly bootstrapAuthenticationEnabled?:
    boolean;

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

  readonly #refreshSessionDurationMs:
    number | undefined;

  readonly #bootstrapAuthenticationEnabled:
    boolean;

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

    this.#refreshSessionDurationMs =
      options.refreshSessionDurationMs;

    this.#bootstrapAuthenticationEnabled =
      options
        .bootstrapAuthenticationEnabled ??
      false;

    this.#externalIdentityVerifiers =
      options.externalIdentityVerifiers ===
        undefined
        ? Object.freeze({})
        : Object.freeze({
            ...options.externalIdentityVerifiers,
          });
  }

  public isBootstrapAuthenticationEnabled():
    boolean {
    return this
      .#bootstrapAuthenticationEnabled;
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
    return this.#repository.transaction(
      (
        repository,
      ) => {
        const account =
          repository.getAccount(
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
          repository,
        );
      },
    );
  }

  public refreshSession(
    refreshToken:
      string,
  ):
    | CreatedAuthSession
    | undefined {
    let refreshTokenHash:
      string;

    try {
      refreshTokenHash =
        hashAuthToken(
          refreshToken,
        );
    } catch {
      return undefined;
    }

    return this.#repository.transaction(
      (
        repository,
      ) => {
        const refreshCredential =
          repository
            .findRefreshCredentialByTokenHash(
              refreshTokenHash,
            );

        if (
          refreshCredential ===
            undefined
        ) {
          const consumedRefreshToken =
            repository
              .findConsumedRefreshTokenByTokenHash(
                refreshTokenHash,
              );

          if (
            consumedRefreshToken ===
              undefined
          ) {
            return undefined;
          }

          const replayedSession =
            repository.getSession(
              consumedRefreshToken.sessionId,
            );

          if (
            replayedSession ===
              undefined
          ) {
            return undefined;
          }

          const now =
            this.#now();

          if (
            now <
              consumedRefreshToken.consumedAtMs ||
            now >=
              consumedRefreshToken.expiresAtMs
          ) {
            return undefined;
          }

          const revoked =
            revokeAuthSession(
              replayedSession,
              now,
            );

          if (
            revoked !==
              replayedSession
          ) {
            repository.saveSession(
              revoked,
            );
          }

          return undefined;
        }

        const session =
          repository.getSession(
            refreshCredential.sessionId,
          );

        if (
          session ===
            undefined
        ) {
          return undefined;
        }

        const now =
          this.#now();

        if (
          !isAuthRefreshCredentialUsable(
            session,
            refreshCredential,
            now,
          )
        ) {
          return undefined;
        }

        const account =
          repository.getAccount(
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

        const rotateOptions = {
          session,
          refreshCredential,
          refreshedAtMs:
            now,
        };

        const rotated =
          this.#sessionDurationMs ===
            undefined
            ? rotateAuthSession(
                rotateOptions,
              )
            : rotateAuthSession({
                ...rotateOptions,

                durationMs:
                  this.#sessionDurationMs,
              });

        const consumedRefreshToken:
          AuthConsumedRefreshToken =
            Object.freeze({
              sessionId:
                refreshCredential.sessionId,

              tokenHash:
                refreshCredential.tokenHash,

              consumedAtMs:
                now,

              expiresAtMs:
                refreshCredential.expiresAtMs,
            });

        repository.saveSession(
          rotated.session,
        );

        repository.saveConsumedRefreshToken(
          consumedRefreshToken,
        );

        repository.saveRefreshCredential(
          rotated.refreshCredential,
        );

        return rotated;
      },
    );
  }

  public revokeSessionByRefreshToken(
    refreshToken:
      string,
  ): boolean {
    let refreshTokenHash:
      string;

    try {
      refreshTokenHash =
        hashAuthToken(
          refreshToken,
        );
    } catch {
      return false;
    }

    return this.#repository.transaction(
      (
        repository,
      ) => {
        const currentCredential =
          repository
            .findRefreshCredentialByTokenHash(
              refreshTokenHash,
            );

        const consumedCredential =
          currentCredential ===
            undefined
            ? repository
                .findConsumedRefreshTokenByTokenHash(
                  refreshTokenHash,
                )
            : undefined;

        const sessionId =
          currentCredential?.sessionId ??
          consumedCredential?.sessionId;

        if (
          sessionId ===
            undefined
        ) {
          return false;
        }

        const session =
          repository.getSession(
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
          repository.saveSession(
            revoked,
          );
        }

        return true;
      },
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

    const durationOptions =
      this.#sessionDurationMs ===
        undefined
        ? {}
        : {
            durationMs:
              this.#sessionDurationMs,
          };

    const refreshDurationOptions =
      this.#refreshSessionDurationMs ===
        undefined
        ? {}
        : {
            refreshDurationMs:
              this.#refreshSessionDurationMs,
          };

    const created =
      createAuthSession({
        ...baseOptions,
        ...durationOptions,
        ...refreshDurationOptions,
      });

    repository.saveSession(
      created.session,
    );

    repository.saveRefreshCredential(
      created.refreshCredential,
    );

    return created;
  }
}