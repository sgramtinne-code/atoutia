import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import {
  BELOTE_ENGINE_VERSION,
  isMatchSessionId,
} from "@atoutia/belote-engine";

import {
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
} from "./http.js";
import {
  createLiveRoomSummary,
  LiveRoomStore,
} from "./liveRoomStore.js";

export interface CreateBackendServerOptions {
  readonly roomStore?: LiveRoomStore;
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

function getRoomSessionId(
  pathname: string,
): string | null {
  const prefix =
    "/api/v1/rooms/";

  if (
    !pathname.startsWith(
      prefix,
    )
  ) {
    return null;
  }

  const sessionId =
    pathname.slice(
      prefix.length,
    );

  if (
    sessionId.length === 0 ||
    sessionId.includes("/")
  ) {
    return null;
  }

  return sessionId;
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

  const room =
    roomStore.get(
      sessionId,
    );

  if (
    room === undefined
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

  sendJson(
    response,
    200,
    createLiveRoomSummary(
      room,
    ),
  );
}

function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  roomStore: LiveRoomStore,
): void {
  const pathname =
    getPathname(
      request,
    );

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

  const roomSessionId =
    getRoomSessionId(
      pathname,
    );

  if (
    roomSessionId !== null
  ) {
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
      roomSessionId,
    );

    return;
  }

  sendNotFound(
    response,
  );
}

export function createBackendServer(
  options:
    CreateBackendServerOptions =
      {},
): Server {
  const roomStore =
    options.roomStore ??
    new LiveRoomStore();

  return createServer(
    (
      request,
      response,
    ) => {
      try {
        handleRequest(
          request,
          response,
          roomStore,
        );
      } catch {
        sendJson(
          response,
          500,
          {
            error:
              "INTERNAL_SERVER_ERROR",
          },
        );
      }
    },
  );
}