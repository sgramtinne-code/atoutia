import type {
  AuthAccount,
  AuthSession,
} from "./auth.js";

import type {
  AuthIdentity,
  AuthIdentityProvider,
} from "./authIdentity.js";

export interface AuthRepository {
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

  close():
    void;
}