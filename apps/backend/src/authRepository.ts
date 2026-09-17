import type {
  AuthAccount,
  AuthRefreshCredential,
  AuthSession,
} from "./auth.js";

import type {
  AuthIdentity,
  AuthIdentityProvider,
} from "./authIdentity.js";

export interface AuthConsumedRefreshToken {
  readonly sessionId:
    string;

  readonly tokenHash:
    string;

  readonly consumedAtMs:
    number;

  readonly expiresAtMs:
    number;
}

export interface AuthRepositoryTransaction {
  saveAccount(
    account:
      AuthAccount,
  ): void;

  getAccount(
    accountId:
      string,
  ):
    | AuthAccount
    | undefined;

  saveSession(
    session:
      AuthSession,
  ): void;

  getSession(
    sessionId:
      string,
  ):
    | AuthSession
    | undefined;

  findSessionByTokenHash(
    tokenHash:
      string,
  ):
    | AuthSession
    | undefined;

  saveRefreshCredential(
    credential:
      AuthRefreshCredential,
  ): void;

  getRefreshCredential(
    sessionId:
      string,
  ):
    | AuthRefreshCredential
    | undefined;

  findRefreshCredentialByTokenHash(
    tokenHash:
      string,
  ):
    | AuthRefreshCredential
    | undefined;

  saveConsumedRefreshToken(
    consumedRefreshToken:
      AuthConsumedRefreshToken,
  ): void;

  findConsumedRefreshTokenByTokenHash(
    tokenHash:
      string,
  ):
    | AuthConsumedRefreshToken
    | undefined;

  saveIdentity(
    identity:
      AuthIdentity,
  ): void;

  getIdentity(
    identityId:
      string,
  ):
    | AuthIdentity
    | undefined;

  findIdentityByProviderAndSubjectHash(
    provider:
      AuthIdentityProvider,

    subjectHash:
      string,
  ):
    | AuthIdentity
    | undefined;
}

export interface AuthRepository
  extends AuthRepositoryTransaction {
  transaction<T>(
    operation:
      (
        repository:
          AuthRepositoryTransaction,
      ) => T,
  ): T;

  close():
    void;
}