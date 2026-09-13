import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import {
  BELOTE_ENGINE_VERSION,
  PLAYER_POSITIONS,
  isMatchSessionId,
  parseLiveMatchRoomCommandDocument,
  type LiveMatchRoomCommandDocument,
  type PlayerPosition,
} from "@atoutia/belote-engine";

import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
} from "./http.js";

import {
  createLiveRoomSummary,
  LiveRoomNotFoundError,
  LiveRoomStore,
} from "./liveRoomStore.js";

export interface CreateBackendServerOptions {
  readonly roomStore?:
    LiveRoomStore;
}

interface SeatMutationBody {
  readonly participantId:
    string;
  readonly player:
    PlayerPosition;
  readonly expectedRevision:
    number;
}

interface StartRoomBody {
  readonly expectedRevision:
    number;
}

interface ParticipantBody {
  readonly participantId:
    string;
}

interface CommandBody {
  readonly participantId:
    string;
  readonly document:
    LiveMatchRoomCommandDocument;
}

function getPathname(
  request: IncomingMessage,
): string {
  const url =
    new URL(
      request.url ?? "/",
      "http://localhost",
    );

  return url.pathname;
}

function getRoomRouteParts(
  pathname: string,
):
  | readonly [
      string,
      string | null,
    ]
  | null {
  const prefix =
    "/api/v1/rooms/";

  if (
    !pathname.startsWith(
      prefix,
    )
  ) {
    return null;
  }

  const remaining =
    pathname.slice(
      prefix.length,
    );

  if (
    remaining.length === 0
  ) {
    return null;
  }

  const parts =
    remaining.split("/");

  if (parts.length === 1) {
    return [
      parts[0] ?? "",
      null,
    ];
  }

  if (
    parts.length === 2 &&
    parts[1] !== ""
  ) {
    return [
      parts[0] ?? "",
      parts[1] ?? null,
    ];
  }

  return null;
}

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<
    string,
    unknown
  >,
  keys: readonly string[],
): boolean {
  const actualKeys =
    Object.keys(value).sort();

  const expectedKeys =
    [...keys].sort();

  return (
    actualKeys.length ===
      expectedKeys.length &&
    actualKeys.every(
      (
        key,
        index,
      ) =>
        key ===
        expectedKeys[index],
    )
  );
}

function isPlayerPosition(
  value: unknown,
): value is PlayerPosition {
  return (
    typeof value === "string" &&
    (
      PLAYER_POSITIONS as
        readonly string[]
    ).includes(value)
  );
}

function isValidParticipantId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value === value.trim() &&
    value.length <= 128
  );
}

function isValidRevision(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function parseSeatMutationBody(
  value: unknown,
): SeatMutationBody | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    !hasExactKeys(
      value,
      [
        "participantId",
        "player",
        "expectedRevision",
      ],
    )
  ) {
    return null;
  }

  if (
    !isValidParticipantId(
      value.participantId,
    ) ||
    !isPlayerPosition(
      value.player,
    ) ||
    !isValidRevision(
      value.expectedRevision,
    )
  ) {
    return null;
  }

  return Object.freeze({
    participantId:
      value.participantId,

    player:
      value.player,

    expectedRevision:
      value.expectedRevision,
  });
}

function parseStartRoomBody(
  value: unknown,
): StartRoomBody | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    !hasExactKeys(
      value,
      [
        "expectedRevision",
      ],
    )
  ) {
    return null;
  }

  if (
    !isValidRevision(
      value.expectedRevision,
    )
  ) {
    return null;
  }

  return Object.freeze({
    expectedRevision:
      value.expectedRevision,
  });
}

function parseParticipantBody(
  value: unknown,
): ParticipantBody | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    !hasExactKeys(
      value,
      [
        "participantId",
      ],
    )
  ) {
    return null;
  }

  if (
    !isValidParticipantId(
      value.participantId,
    )
  ) {
    return null;
  }

  return Object.freeze({
    participantId:
      value.participantId,
  });
}

function parseCommandBody(
  value: unknown,
): CommandBody | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    !hasExactKeys(
      value,
      [
        "participantId",
        "document",
      ],
    )
  ) {
    return null;
  }

  if (
    !isValidParticipantId(
      value.participantId,
    )
  ) {
    return null;
  }

  try {
    const document =
      parseLiveMatchRoomCommandDocument(
        JSON.stringify(
          value.document,
        ),
      );

    return Object.freeze({
      participantId:
        value.participantId,

      document,
    });
  } catch {
    return null;
  }
}

function handleHealth(
  response: ServerResponse,
  roomStore: LiveRoomStore,
): void {
  sendJson(
    response,
    200,
    {
      status: "ok",
      service:
        "@atoutia/backend",
      engineVersion:
        BELOTE_ENGINE_VERSION,
      liveRooms:
        roomStore.count(),
    },
  );
}

function handleCreateRoom(
  response: ServerResponse,
  roomStore: LiveRoomStore,
): void {
  const room =
    roomStore.create();

  sendJson(
    response,
    201,
    createLiveRoomSummary(
      room,
    ),
  );
}

function handleGetRoom(
  response: ServerResponse,
  roomStore: LiveRoomStore,
  sessionId: string,
): void {
  const room =
    roomStore.get(
      sessionId,
    );

  if (room === undefined) {
    sendJson(
      response,
      404,
      {
        error:
          "ROOM_NOT_FOUND",
      },
    );

    return;
  }

  sendJson(
    response,
    200,
    createLiveRoomSummary(
      room,
    ),
  );
}

async function handleClaimSeat(
  request: IncomingMessage,
  response: ServerResponse,
  roomStore: LiveRoomStore,
  sessionId: string,
): Promise<void> {
  const body =
    parseSeatMutationBody(
      await readJsonBody(
        request,
      ),
    );

  if (body === null) {
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

  const room =
    roomStore.claimSeat({
      sessionId,
      expectedRevision:
        body.expectedRevision,
      player:
        body.player,
      participantId:
        body.participantId,
    });

  sendJson(
    response,
    200,
    createLiveRoomSummary(
      room,
    ),
  );
}

async function handleReleaseSeat(
  request: IncomingMessage,
  response: ServerResponse,
  roomStore: LiveRoomStore,
  sessionId: string,
): Promise<void> {
  const body =
    parseSeatMutationBody(
      await readJsonBody(
        request,
      ),
    );

  if (body === null) {
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

  const room =
    roomStore.releaseSeat({
      sessionId,
      expectedRevision:
        body.expectedRevision,
      player:
        body.player,
      participantId:
        body.participantId,
    });

  sendJson(
    response,
    200,
    createLiveRoomSummary(
      room,
    ),
  );
}

async function handleStartRoom(
  request: IncomingMessage,
  response: ServerResponse,
  roomStore: LiveRoomStore,
  sessionId: string,
): Promise<void> {
  const body =
    parseStartRoomBody(
      await readJsonBody(
        request,
      ),
    );

  if (body === null) {
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

  const room =
    roomStore.start({
      sessionId,
      expectedRevision:
        body.expectedRevision,
    });

  sendJson(
    response,
    200,
    createLiveRoomSummary(
      room,
    ),
  );
}

async function handleSnapshot(
  request: IncomingMessage,
  response: ServerResponse,
  roomStore: LiveRoomStore,
  sessionId: string,
): Promise<void> {
  const body =
    parseParticipantBody(
      await readJsonBody(
        request,
      ),
    );

  if (body === null) {
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

  const snapshot =
    roomStore.createParticipantSnapshot({
      sessionId,
      participantId:
        body.participantId,
    });

  sendJson(
    response,
    200,
    snapshot,
  );
}

async function handleCommand(
  request: IncomingMessage,
  response: ServerResponse,
  roomStore: LiveRoomStore,
  sessionId: string,
): Promise<void> {
  const body =
    parseCommandBody(
      await readJsonBody(
        request,
      ),
    );

  if (body === null) {
    sendJson(
      response,
      400,
      {
        error:
          "INVALID_COMMAND",
      },
    );

    return;
  }

  if (
    body.document.sessionId !==
    sessionId
  ) {
    sendJson(
      response,
      409,
      {
        error:
          "SESSION_MISMATCH",
      },
    );

    return;
  }

  const result =
    roomStore.applyCommand({
      sessionId,
      participantId:
        body.participantId,
      document:
        body.document,
    });

  sendJson(
    response,
    200,
    result.snapshot,
  );
}

function isRevisionMismatchError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith(
      "Match room revision mismatch:",
    )
  );
}

function isParticipantError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    (
      error.message.includes(
        "Participant",
      ) ||
      error.message.includes(
        "participant",
      )
    )
  );
}

function isCommandConflictError(
  error: unknown,
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.startsWith(
      "Cannot ",
    ) ||
    error.message.includes(
      "not legal",
    ) ||
    error.message.includes(
      "turn",
    )
  );
}

function isRoomConflictError(
  error: unknown,
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.startsWith(
      "Cannot ",
    ) ||
    error.message.includes(
      "seat",
    ) ||
    error.message.includes(
      "participant",
    )
  );
}

function handleDomainError(
  response: ServerResponse,
  error: unknown,
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

  if (
    error instanceof
      LiveRoomNotFoundError
  ) {
    sendJson(
      response,
      404,
      {
        error:
          "ROOM_NOT_FOUND",
      },
    );

    return;
  }

  if (
    isRevisionMismatchError(
      error,
    )
  ) {
    sendJson(
      response,
      409,
      {
        error:
          "REVISION_MISMATCH",
      },
    );

    return;
  }

  if (
    isParticipantError(
      error,
    )
  ) {
    sendJson(
      response,
      403,
      {
        error:
          "PARTICIPANT_FORBIDDEN",
      },
    );

    return;
  }

  if (
    isCommandConflictError(
      error,
    )
  ) {
    sendJson(
      response,
      409,
      {
        error:
          "COMMAND_REJECTED",
      },
    );

    return;
  }

  if (
    isRoomConflictError(
      error,
    )
  ) {
    sendJson(
      response,
      409,
      {
        error:
          "ROOM_CONFLICT",
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

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  roomStore: LiveRoomStore,
): Promise<void> {
  const pathname =
    getPathname(request);

  if (
    pathname === "/health"
  ) {
    if (
      request.method !== "GET"
    ) {
      sendMethodNotAllowed(
        response,
      );

      return;
    }

    handleHealth(
      response,
      roomStore,
    );

    return;
  }

  if (
    pathname ===
    "/api/v1/rooms"
  ) {
    if (
      request.method !== "POST"
    ) {
      sendMethodNotAllowed(
        response,
      );

      return;
    }

    handleCreateRoom(
      response,
      roomStore,
    );

    return;
  }

  const roomRoute =
    getRoomRouteParts(
      pathname,
    );

  if (roomRoute === null) {
    sendNotFound(
      response,
    );

    return;
  }

  const [
    sessionId,
    action,
  ] = roomRoute;

  if (
    !isMatchSessionId(
      sessionId,
    )
  ) {
    sendJson(
      response,
      400,
      {
        error:
          "INVALID_SESSION_ID",
      },
    );

    return;
  }

  if (action === null) {
    if (
      request.method !== "GET"
    ) {
      sendMethodNotAllowed(
        response,
      );

      return;
    }

    handleGetRoom(
      response,
      roomStore,
      sessionId,
    );

    return;
  }

  if (action === "seats") {
    if (
      request.method === "POST"
    ) {
      await handleClaimSeat(
        request,
        response,
        roomStore,
        sessionId,
      );

      return;
    }

    if (
      request.method === "DELETE"
    ) {
      await handleReleaseSeat(
        request,
        response,
        roomStore,
        sessionId,
      );

      return;
    }

    sendMethodNotAllowed(
      response,
    );

    return;
  }

  if (action === "start") {
    if (
      request.method !== "POST"
    ) {
      sendMethodNotAllowed(
        response,
      );

      return;
    }

    await handleStartRoom(
      request,
      response,
      roomStore,
      sessionId,
    );

    return;
  }

  if (action === "snapshot") {
    if (
      request.method !== "POST"
    ) {
      sendMethodNotAllowed(
        response,
      );

      return;
    }

    await handleSnapshot(
      request,
      response,
      roomStore,
      sessionId,
    );

    return;
  }

  if (action === "commands") {
    if (
      request.method !== "POST"
    ) {
      sendMethodNotAllowed(
        response,
      );

      return;
    }

    await handleCommand(
      request,
      response,
      roomStore,
      sessionId,
    );

    return;
  }

  sendNotFound(
    response,
  );
}

export function createBackendServer(
  options:
    CreateBackendServerOptions = {},
): Server {
  const roomStore =
    options.roomStore ??
    new LiveRoomStore();

  return createServer(
    (
      request,
      response,
    ) => {
      void handleRequest(
        request,
        response,
        roomStore,
      ).catch(
        (
          error: unknown,
        ) => {
          handleDomainError(
            response,
            error,
          );
        },
      );
    },
  );
}