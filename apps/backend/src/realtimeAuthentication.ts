import type {
  IncomingMessage,
} from "node:http";

import {
  isMatchSessionId,
} from "@atoutia/belote-engine";

import type {
  AuthService,
} from "./authService.js";

import {
  authenticateHttpParticipant,
} from "./httpAuthentication.js";

export interface AuthenticatedRealtimeConnection {
  readonly sessionId:
    string;

  readonly accountId:
    string;

  readonly authSessionId:
    string;

  readonly participantId:
    string;
}

export type RealtimeAuthenticationResult =
  | {
      readonly status:
        "AUTH_REQUIRED";
    }
  | {
      readonly status:
        "AUTH_INVALID";
    }
  | {
      readonly status:
        "INVALID_CONNECTION_PARAMETERS";
    }
  | {
      readonly status:
        "AUTHENTICATED";

      readonly connection:
        AuthenticatedRealtimeConnection;
    };

export function authenticateRealtimeConnection(
  request:
    IncomingMessage,

  authService:
    AuthService,
): RealtimeAuthenticationResult {
  const url =
    new URL(
      request.url ??
        "/",

      "http://localhost",
    );

  const sessionId =
    url.searchParams.get(
      "sessionId",
    );

  if (
    sessionId ===
      null ||
    !isMatchSessionId(
      sessionId,
    )
  ) {
    return Object.freeze({
      status:
        "INVALID_CONNECTION_PARAMETERS",
    });
  }

  if (
    url.searchParams.has(
      "participantId",
    )
  ) {
    return Object.freeze({
      status:
        "INVALID_CONNECTION_PARAMETERS",
    });
  }

  const authentication =
    authenticateHttpParticipant(
      request,
      authService,
    );

  if (
    authentication.status ===
      "MISSING"
  ) {
    return Object.freeze({
      status:
        "AUTH_REQUIRED",
    });
  }

  if (
    authentication.status ===
      "INVALID"
  ) {
    return Object.freeze({
      status:
        "AUTH_INVALID",
    });
  }

  return Object.freeze({
    status:
      "AUTHENTICATED",

    connection:
      Object.freeze({
        sessionId,

        accountId:
          authentication
            .identity
            .accountId,

        authSessionId:
          authentication
            .identity
            .authSessionId,

        participantId:
          authentication
            .identity
            .participantId,
      }),
  });
}