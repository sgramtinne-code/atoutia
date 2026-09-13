import type {
  AuthAccount,
  AuthSession,
} from "./auth.js";

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

  close():
    void;
}