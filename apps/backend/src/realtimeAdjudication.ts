import {
  WebSocket,
} from "ws";

import type {
  LiveRoomAdjudication,
} from "./liveRoomAdjudication.js";

import {
  createLiveRoomAdjudicationDocument,
} from "./liveRoomAdjudicationDocument.js";

import {
  createRealtimeAdjudicationMessage,
  serializeRealtimeServerMessage,
} from "./realtimeProtocol.js";

export interface RealtimeAdjudicationConnection {
  readonly socket:
    WebSocket;

  readonly sessionId:
    string;
}

export interface SendRealtimeAdjudicationOptions {
  readonly socket:
    WebSocket;

  readonly sessionId:
    string;

  readonly adjudication:
    LiveRoomAdjudication;
}

export interface BroadcastRealtimeAdjudicationOptions {
  readonly connections:
    Iterable<
      RealtimeAdjudicationConnection
    >;

  readonly sessionId:
    string;

  readonly adjudication:
    LiveRoomAdjudication;
}

export function sendRealtimeAdjudication(
  options:
    SendRealtimeAdjudicationOptions,
): boolean {
  if (
    options.socket.readyState !==
    WebSocket.OPEN
  ) {
    return false;
  }

  const document =
    createLiveRoomAdjudicationDocument(
      options.adjudication,
    );

  options.socket.send(
    serializeRealtimeServerMessage(
      createRealtimeAdjudicationMessage(
        options.sessionId,
        document,
      ),
    ),
  );

  return true;
}

export function broadcastRealtimeAdjudication(
  options:
    BroadcastRealtimeAdjudicationOptions,
): number {
  let sent =
    0;

  for (
    const connection
    of options.connections
  ) {
    if (
      connection.sessionId !==
      options.sessionId
    ) {
      continue;
    }

    if (
      sendRealtimeAdjudication({
        socket:
          connection.socket,

        sessionId:
          options.sessionId,

        adjudication:
          options.adjudication,
      })
    ) {
      sent +=
        1;
    }
  }

  return sent;
}