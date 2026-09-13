import {
  OAuth2Client,
} from "google-auth-library";

import type {
  VerifiedExternalIdentity,
} from "./authService.js";

export interface GoogleIdTokenPayload {
  readonly sub?:
    string;
}

export type GoogleIdTokenVerificationFunction =
  (
    idToken:
      string,

    audience:
      string,
  ) =>
    Promise<
      | GoogleIdTokenPayload
      | undefined
    >;

export interface GoogleIdentityVerifierOptions {
  readonly clientId:
    string;

  readonly verifyIdToken?:
    GoogleIdTokenVerificationFunction;
}

function validateClientId(
  value:
    string,
): string {
  const trimmed =
    value.trim();

  if (
    trimmed.length ===
      0 ||
    value !==
      trimmed ||
    trimmed.length >
      512
  ) {
    throw new Error(
      "Google client ID is invalid.",
    );
  }

  return trimmed;
}

function isValidIdToken(
  value:
    string,
): boolean {
  return (
    value.trim().length >
      0 &&
    value ===
      value.trim() &&
    value.length <=
      16_384
  );
}

function isValidProviderSubject(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0 &&
    value ===
      value.trim() &&
    value.length <=
      512
  );
}

function createDefaultVerificationFunction():
  GoogleIdTokenVerificationFunction {
  const client =
    new OAuth2Client();

  return async (
    idToken,
    audience,
  ) => {
    const ticket =
      await client.verifyIdToken({
        idToken,
        audience,
      });

    const payload =
      ticket.getPayload();

    if (
      payload ===
        undefined
    ) {
      return undefined;
    }

    return Object.freeze({
      sub:
        payload.sub,
    });
  };
}

export class GoogleIdentityVerifier {
  readonly #clientId:
    string;

  readonly #verifyIdToken:
    GoogleIdTokenVerificationFunction;

  public constructor(
    options:
      GoogleIdentityVerifierOptions,
  ) {
    this.#clientId =
      validateClientId(
        options.clientId,
      );

    this.#verifyIdToken =
      options.verifyIdToken ??
      createDefaultVerificationFunction();
  }

  public async verify(
    idToken:
      string,
  ): Promise<
    | VerifiedExternalIdentity
    | undefined
  > {
    if (
      !isValidIdToken(
        idToken,
      )
    ) {
      return undefined;
    }

    let payload:
      | GoogleIdTokenPayload
      | undefined;

    try {
      payload =
        await this.#verifyIdToken(
          idToken,
          this.#clientId,
        );
    } catch {
      return undefined;
    }

    if (
      payload ===
        undefined ||
      !isValidProviderSubject(
        payload.sub,
      )
    ) {
      return undefined;
    }

    return Object.freeze({
      provider:
        "GOOGLE",

      providerSubject:
        payload.sub,
    });
  }
}