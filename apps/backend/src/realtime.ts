import type {
  IncomingMessage,
  Server,
} from "node:http";

import {
  isMatchSessionId,
  type RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

import {
  WebSocket,
  WebSocketServer,
} from "ws";

import {
  LiveRoomStore,
} from "./liveRoomStore.js";

interface ConnectionContext {
  readonly sessionId: string;
  readonly participantId: string;
}

export interface RealtimeServer {
  readonly webSocketServer:
    WebSocketServer;

  close():
    Promise<void>;
}

export interface CreateRealtimeServerOptions {
  readonly server: Server;
  readonly roomStore:
    LiveRoomStore;
}

function isValidParticipantId(
  value: string | null,
): value is string {
  return (
    value !== null &&
    value.trim().length > 0 &&
    value === value.trim() &&
    value.length <= 128
  );
}

function getConnectionContext(
  request: IncomingMessage,
): ConnectionContext | null {
  const url =
    new URL(
      request.url ?? "/",
      "http://localhost",
    );

  const sessionId =
    url.searchParams.get(
      "sessionId",
    );

  const participantId =
    url.searchParams.get(
      "participantId",
    );

  if (
    sessionId === null ||
    !isMatchSessionId(
      sessionId,
    ) ||
    !isValidParticipantId(
      participantId,
    )
  ) {
    return null;
  }

  return Object.freeze({
    sessionId,
    participantId,
  });
}

function sendSnapshot(
  socket: WebSocket,
  roomStore: LiveRoomStore,
  context: ConnectionContext,
): boolean {
  if (
    socket.readyState !==
    WebSocket.OPEN
  ) {
    return false;
  }

  try {
    const snapshot =
      roomStore.createParticipantSnapshot({
        sessionId:
          context.sessionId,

        participantId:
          context.participantId,
      });

    socket.send(
      JSON.stringify(
        snapshot,
      ),
    );

    return true;
  } catch {
    socket.close(
      1008,
      "Participant is not authorized for this room",
    );

    return false;
  }
}

export function createRealtimeServer(
  options:
    CreateRealtimeServerOptions,
): RealtimeServer {
  const connections =
    new Map<
      WebSocket,
      ConnectionContext
    >();

  const webSocketServer =
    new WebSocketServer({
      server:
        options.server,

      path:
        "/ws",
    });

  function broadcastRoom(
    room:
      RevisionedLiveMatchRoom,
  ): void {
    const sessionId =
      room.managedRoom.room.session
        .sessionId;

    for (
      const [
        socket,
        context,
      ]
      of connections
    ) {
      if (
        context.sessionId !==
        sessionId
      ) {
        continue;
      }

      sendSnapshot(
        socket,
        options.roomStore,
        context,
      );
    }
  }

  const unsubscribe =
    options.roomStore.subscribe(
      broadcastRoom,
    );

  webSocketServer.on(
    "connection",
    (
      socket,
      request,
    ) => {
      const context =
        getConnectionContext(
          request,
        );

      if (context === null) {
        socket.close(
          1008,
          "Invalid WebSocket connection parameters",
        );

        return;
      }

      try {
        options.roomStore
          .createParticipantSnapshot({
            sessionId:
              context.sessionId,

            participantId:
              context.participantId,
          });
      } catch {
        socket.close(
          1008,
          "Participant is not authorized for this room",
        );

        return;
      }

      connections.set(
        socket,
        context,
      );

      socket.on(
        "close",
        () => {
          connections.delete(
            socket,
          );
        },
      );

      socket.on(
        "error",
        () => {
          connections.delete(
            socket,
          );
        },
      );

      sendSnapshot(
        socket,
        options.roomStore,
        context,
      );
    },
  );

  return Object.freeze({
    webSocketServer,

    async close():
      Promise<void> {
      unsubscribe();

      for (
        const socket
        of connections.keys()
      ) {
        socket.terminate();
      }

      connections.clear();

      await new Promise<void>(
        (
          resolve,
          reject,
        ) => {
          webSocketServer.close(
            (
              error,
            ) => {
              if (
                error !== undefined
              ) {
                reject(error);

                return;
              }

              resolve();
            },
          );
        },
      );
    },
  });
}