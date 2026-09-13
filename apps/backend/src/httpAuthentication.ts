import type {
  IncomingMessage,
} from "node:http";

import type {
  AuthService,
} from "./authService.js";

import {
  createParticipantIdForAccount,
} from "./participantIdentity.js";

export interface AuthenticatedHttpParticipant {
  readonly accountId:
    string;

  readonly authSessionId:
    string;

  readonly participantId:
    string;
}

export type HttpAuthenticationResult =
  | {
      readonly status:
        "MISSING";
    }
  | {
      readonly status:
        "INVALID";
    }
  | {
      readonly status:
        "AUTHENTICATED";

      readonly identity:
        AuthenticatedHttpParticipant;
    };

function getBearerToken(
  request:
    IncomingMessage,
):
  | {
      readonly status:
        "MISSING";
    }
  | {
      readonly status:
        "INVALID";
    }
  | {
      readonly status:
        "VALID";

      readonly token:
        string;
    } {
  const authorization =
    request.headers.authorization;

  if (
    authorization ===
      undefined
  ) {
    return Object.freeze({
      status:
        "MISSING",
    });
  }

  if (
    Array.isArray(
      authorization,
    )
  ) {
    return Object.freeze({
      status:
        "INVALID",
    });
  }

  const match =
    /^Bearer ([^\s]+)$/.exec(
      authorization,
    );

  if (
    match ===
      null
  ) {
    return Object.freeze({
      status:
        "INVALID",
    });
  }

  const token =
    match[
      1
    ];

  if (
    token ===
      undefined ||
    token.length ===
      0
  ) {
    return Object.freeze({
      status:
        "INVALID",
    });
  }

  return Object.freeze({
    status:
      "VALID",

    token,
  });
}

export function authenticateHttpParticipant(
  request:
    IncomingMessage,

  authService:
    AuthService,
): HttpAuthenticationResult {
  const bearer =
    getBearerToken(
      request,
    );

  if (
    bearer.status ===
      "MISSING"
  ) {
    return Object.freeze({
      status:
        "MISSING",
    });
  }

  if (
    bearer.status ===
      "INVALID"
  ) {
    return Object.freeze({
      status:
        "INVALID",
    });
  }

  const authenticated =
    authService.authenticate(
      bearer.token,
    );

  if (
    authenticated ===
      undefined
  ) {
    return Object.freeze({
      status:
        "INVALID",
    });
  }

  return Object.freeze({
    status:
      "AUTHENTICATED",

    identity:
      Object.freeze({
        accountId:
          authenticated.accountId,

        authSessionId:
          authenticated.authSessionId,

        participantId:
          createParticipantIdForAccount(
            authenticated.accountId,
          ),
      }),
  });
}