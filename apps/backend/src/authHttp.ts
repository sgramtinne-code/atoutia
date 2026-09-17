import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
} from "./http.js";

import {
  AuthService,
} from "./authService.js";

interface CreateSessionBody {
  readonly accountId:
    string;
}

interface GoogleAuthBody {
  readonly idToken:
    string;
}

interface RefreshSessionBody {
  readonly refreshToken:
    string;
}

type BearerTokenResult =
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
    };

function getPathname(
  request:
    IncomingMessage,
): string {
  const url =
    new URL(
      request.url ??
        "/",

      "http://localhost",
    );

  return url.pathname;
}

function isObject(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function hasExactKeys(
  value:
    Record<
      string,
      unknown
    >,

  keys:
    readonly string[],
): boolean {
  const actual =
    Object.keys(
      value,
    ).sort();

  const expected =
    [
      ...keys,
    ].sort();

  return (
    actual.length ===
      expected.length &&
    actual.every(
      (
        key,
        index,
      ) =>
        key ===
        expected[
          index
        ],
    )
  );
}

function isValidAccountId(
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
      128
  );
}

function isValidGoogleIdToken(
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
      16_384
  );
}

function isValidRefreshToken(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.startsWith(
      "art1_",
    ) &&
    value.trim().length >
      0 &&
    value ===
      value.trim() &&
    value.length <=
      512
  );
}

function parseCreateAccountBody(
  value:
    unknown,
): boolean {
  if (
    value ===
      null
  ) {
    return true;
  }

  return (
    isObject(
      value,
    ) &&
    Object.keys(
      value,
    ).length ===
      0
  );
}

function parseCreateSessionBody(
  value:
    unknown,
):
  | CreateSessionBody
  | null {
  if (
    !isObject(
      value,
    )
  ) {
    return null;
  }

  if (
    !hasExactKeys(
      value,
      [
        "accountId",
      ],
    ) ||
    !isValidAccountId(
      value.accountId,
    )
  ) {
    return null;
  }

  return Object.freeze({
    accountId:
      value.accountId,
  });
}

function parseGoogleAuthBody(
  value:
    unknown,
):
  | GoogleAuthBody
  | null {
  if (
    !isObject(
      value,
    )
  ) {
    return null;
  }

  if (
    !hasExactKeys(
      value,
      [
        "idToken",
      ],
    ) ||
    !isValidGoogleIdToken(
      value.idToken,
    )
  ) {
    return null;
  }

  return Object.freeze({
    idToken:
      value.idToken,
  });
}

function parseRefreshSessionBody(
  value:
    unknown,
):
  | RefreshSessionBody
  | null {
  if (
    !isObject(
      value,
    )
  ) {
    return null;
  }

  if (
    !hasExactKeys(
      value,
      [
        "refreshToken",
      ],
    ) ||
    !isValidRefreshToken(
      value.refreshToken,
    )
  ) {
    return null;
  }

  return Object.freeze({
    refreshToken:
      value.refreshToken,
  });
}

function getBearerToken(
  request:
    IncomingMessage,
): BearerTokenResult {
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

function createSessionResponse(
  created:
    ReturnType<
      AuthService[
        "createSession"
      ]
    >,
): Readonly<{
  readonly token:
    string;

  readonly accessToken:
    string;

  readonly refreshToken:
    string;

  readonly session: {
    readonly sessionId:
      string;

    readonly accountId:
      string;

    readonly createdAtMs:
      number;

    readonly expiresAtMs:
      number;

    readonly revokedAtMs:
      number | null;
  };
}> {
  return Object.freeze({
    token:
      created.token,

    accessToken:
      created.accessToken,

    refreshToken:
      created.refreshToken,

    session: Object.freeze({
      sessionId:
        created.session.sessionId,

      accountId:
        created.session.accountId,

      createdAtMs:
        created.session.createdAtMs,

      expiresAtMs:
        created.session.expiresAtMs,

      revokedAtMs:
        created.session.revokedAtMs,
    }),
  });
}

async function handleCreateAccount(
  request:
    IncomingMessage,

  response:
    ServerResponse,

  authService:
    AuthService,
): Promise<void> {
  const body =
    await readJsonBody(
      request,
    );

  if (
    !parseCreateAccountBody(
      body,
    )
  ) {
    sendJson(
      response,
      400,
      {
        error:
          "INVALID_REQUEST",
      },
    );

    return;
  }

  const account =
    authService.createAccount();

  sendJson(
    response,
    201,
    {
      accountId:
        account.accountId,

      status:
        account.status,

      createdAtMs:
        account.createdAtMs,
    },
  );
}

async function handleCreateSession(
  request:
    IncomingMessage,

  response:
    ServerResponse,

  authService:
    AuthService,
): Promise<void> {
  const body =
    parseCreateSessionBody(
      await readJsonBody(
        request,
      ),
    );

  if (
    body ===
      null
  ) {
    sendJson(
      response,
      400,
      {
        error:
          "INVALID_REQUEST",
      },
    );

    return;
  }

  let created:
    ReturnType<
      AuthService[
        "createSession"
      ]
    >;

  try {
    created =
      authService.createSession(
        body.accountId,
      );
  } catch (
    error:
      unknown
  ) {
    if (
      error instanceof
        Error &&
      error.message ===
        "Auth account is not available."
    ) {
      sendJson(
        response,
        404,
        {
          error:
            "AUTH_ACCOUNT_NOT_FOUND",
        },
      );

      return;
    }

    throw error;
  }

  sendJson(
    response,
    201,
    createSessionResponse(
      created,
    ),
  );
}

async function handleRefreshSession(
  request:
    IncomingMessage,

  response:
    ServerResponse,

  authService:
    AuthService,
): Promise<void> {
  const body =
    parseRefreshSessionBody(
      await readJsonBody(
        request,
      ),
    );

  if (
    body ===
      null
  ) {
    sendJson(
      response,
      400,
      {
        error:
          "INVALID_REQUEST",
      },
    );

    return;
  }

  const refreshed =
    authService.refreshSession(
      body.refreshToken,
    );

  if (
    refreshed ===
      undefined
  ) {
    sendJson(
      response,
      401,
      {
        error:
          "AUTH_REFRESH_INVALID",
      },
    );

    return;
  }

  sendJson(
    response,
    200,
    createSessionResponse(
      refreshed,
    ),
  );
}

async function handleGoogleAuth(
  request:
    IncomingMessage,

  response:
    ServerResponse,

  authService:
    AuthService,
): Promise<void> {
  if (
    !authService
      .isExternalIdentityProviderConfigured(
        "GOOGLE",
      )
  ) {
    sendJson(
      response,
      503,
      {
        error:
          "AUTH_PROVIDER_UNAVAILABLE",
      },
    );

    return;
  }

  const body =
    parseGoogleAuthBody(
      await readJsonBody(
        request,
      ),
    );

  if (
    body ===
      null
  ) {
    sendJson(
      response,
      400,
      {
        error:
          "INVALID_REQUEST",
      },
    );

    return;
  }

  const result =
    await authService
      .createSessionForExternalIdentityProof(
        "GOOGLE",
        body.idToken,
      );

  if (
    result ===
      undefined
  ) {
    sendJson(
      response,
      401,
      {
        error:
          "AUTH_PROVIDER_INVALID",
      },
    );

    return;
  }

  sendJson(
    response,
    201,
    {
      ...createSessionResponse(
        result.createdSession,
      ),

      accountCreated:
        result.accountCreated,
    },
  );
}

function handleMe(
  request:
    IncomingMessage,

  response:
    ServerResponse,

  authService:
    AuthService,
): void {
  const bearer =
    getBearerToken(
      request,
    );

  if (
    bearer.status ===
      "MISSING"
  ) {
    sendJson(
      response,
      401,
      {
        error:
          "AUTH_REQUIRED",
      },
    );

    return;
  }

  if (
    bearer.status ===
      "INVALID"
  ) {
    sendJson(
      response,
      401,
      {
        error:
          "AUTH_INVALID",
      },
    );

    return;
  }

  const authenticated =
    authService.authenticate(
      bearer.token,
    );

  if (
    authenticated ===
      undefined
  ) {
    sendJson(
      response,
      401,
      {
        error:
          "AUTH_INVALID",
      },
    );

    return;
  }

  sendJson(
    response,
    200,
    {
      accountId:
        authenticated.accountId,

      authSessionId:
        authenticated.authSessionId,
    },
  );
}

function handleAuthError(
  response:
    ServerResponse,

  error:
    unknown,
): void {
  if (
    error instanceof
      InvalidJsonBodyError
  ) {
    sendJson(
      response,
      400,
      {
        error:
          "INVALID_JSON",
      },
    );

    return;
  }

  if (
    error instanceof
      RequestBodyTooLargeError
  ) {
    sendJson(
      response,
      413,
      {
        error:
          "REQUEST_TOO_LARGE",
      },
    );

    return;
  }

  sendJson(
    response,
    500,
    {
      error:
        "INTERNAL_SERVER_ERROR",
    },
  );
}

export async function handleAuthHttpRequest(
  request:
    IncomingMessage,

  response:
    ServerResponse,

  authService:
    AuthService,
): Promise<boolean> {
  const pathname =
    getPathname(
      request,
    );

  if (
    !pathname.startsWith(
      "/api/v1/auth/",
    )
  ) {
    return false;
  }

  try {
    if (
      pathname ===
        "/api/v1/auth/accounts"
    ) {
      if (
        !authService
          .isBootstrapAuthenticationEnabled()
      ) {
        sendNotFound(
          response,
        );

        return true;
      }

      if (
        request.method !==
          "POST"
      ) {
        sendMethodNotAllowed(
          response,
        );

        return true;
      }

      await handleCreateAccount(
        request,
        response,
        authService,
      );

      return true;
    }

    if (
      pathname ===
        "/api/v1/auth/sessions"
    ) {
      if (
        !authService
          .isBootstrapAuthenticationEnabled()
      ) {
        sendNotFound(
          response,
        );

        return true;
      }

      if (
        request.method !==
          "POST"
      ) {
        sendMethodNotAllowed(
          response,
        );

        return true;
      }

      await handleCreateSession(
        request,
        response,
        authService,
      );

      return true;
    }

    if (
      pathname ===
        "/api/v1/auth/refresh"
    ) {
      if (
        request.method !==
          "POST"
      ) {
        sendMethodNotAllowed(
          response,
        );

        return true;
      }

      await handleRefreshSession(
        request,
        response,
        authService,
      );

      return true;
    }

    if (
      pathname ===
        "/api/v1/auth/google"
    ) {
      if (
        request.method !==
          "POST"
      ) {
        sendMethodNotAllowed(
          response,
        );

        return true;
      }

      await handleGoogleAuth(
        request,
        response,
        authService,
      );

      return true;
    }

    if (
      pathname ===
        "/api/v1/auth/me"
    ) {
      if (
        request.method !==
          "GET"
      ) {
        sendMethodNotAllowed(
          response,
        );

        return true;
      }

      handleMe(
        request,
        response,
        authService,
      );

      return true;
    }

    sendNotFound(
      response,
    );

    return true;
  } catch (
    error:
      unknown
  ) {
    handleAuthError(
      response,
      error,
    );

    return true;
  }
}