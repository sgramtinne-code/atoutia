import type {
  IncomingMessage,
  Server,
} from "node:http";

import {
  PLAYER_POSITIONS,
  isMatchSessionId,
  type PlayerPosition,
  type RevisionedLiveMatchRoom,
} from "@atoutia/belote-engine";

import {
  WebSocket,
  WebSocketServer,
  type RawData,
} from "ws";

import {
  createCasualAbsencePolicy,
  createPrivateAbsencePolicy,
  createRankedAbsencePolicy,
  evaluateAbsenceResolution,
  type AbsencePolicy,
} from "./absencePolicy.js";

import {
  decideAbsenceResolution,
} from "./absenceResolution.js";

import {
  LiveRoomNotFoundError,
  LiveRoomStore,
} from "./liveRoomStore.js";

import {
  createRealtimeErrorMessage,
  createRealtimePresenceMessage,
  createRealtimeSnapshotMessage,
  parseRealtimeClientMessage,
  serializeRealtimeServerMessage,
  type RealtimeAbsencePlayer,
  type RealtimeConnectionState,
  type RealtimeErrorCode,
  type RealtimePresencePlayer,
} from "./realtimeProtocol.js";

export const DEFAULT_HEARTBEAT_TIMEOUT_MS =
  30_000;

export const DEFAULT_HEARTBEAT_CHECK_INTERVAL_MS =
  1_000;

export const DEFAULT_RECONNECT_GRACE_MS =
  120_000;

export const HEARTBEAT_TIMEOUT_CLOSE_CODE =
  4002;

export const HEARTBEAT_TIMEOUT_CLOSE_REASON =
  "Heartbeat timeout";

interface ConnectionContext {
  readonly sessionId:
    string;

  readonly participantId:
    string;
}

interface DisconnectionState {
  readonly context:
    ConnectionContext;

  readonly disconnectedAtMs:
    number;

  readonly graceExpired:
    boolean;
}

interface SessionPresenceState {
  readonly connectionStates:
    readonly RealtimeConnectionState[];

  readonly absences:
    readonly RealtimeAbsencePlayer[];
}

export interface RealtimeServer {
  readonly webSocketServer:
    WebSocketServer;

  close():
    Promise<void>;
}

export interface CreateRealtimeServerOptions {
  readonly server:
    Server;

  readonly roomStore:
    LiveRoomStore;

  readonly now?:
    () => number;

  readonly heartbeatTimeoutMs?:
    number;

  readonly heartbeatCheckIntervalMs?:
    number;

  readonly reconnectGraceMs?:
    number;

  readonly absencePolicy?:
    AbsencePolicy;
}

function resolvePositiveInteger(
  value:
    number | undefined,

  fallback:
    number,

  name:
    string,
): number {
  if (
    value ===
    undefined
  ) {
    return fallback;
  }

  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `${name} must be a positive safe integer.`,
    );
  }

  return value;
}

function isValidParticipantId(
  value:
    string | null,
): value is string {
  return (
    value !==
      null &&
    value.trim().length >
      0 &&
    value ===
      value.trim() &&
    value.length <=
      128
  );
}

function getConnectionContext(
  request:
    IncomingMessage,
): ConnectionContext | null {
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

  const participantId =
    url.searchParams.get(
      "participantId",
    );

  if (
    sessionId ===
      null ||
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

function getConnectionKey(
  context:
    ConnectionContext,
): string {
  return [
    context.sessionId,
    context.participantId,
  ].join(
    "\u0000",
  );
}

function sendError(
  socket:
    WebSocket,

  code:
    RealtimeErrorCode,
): void {
  if (
    socket.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  socket.send(
    serializeRealtimeServerMessage(
      createRealtimeErrorMessage(
        code,
      ),
    ),
  );
}

function sendSnapshot(
  socket:
    WebSocket,

  roomStore:
    LiveRoomStore,

  context:
    ConnectionContext,
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
      serializeRealtimeServerMessage(
        createRealtimeSnapshotMessage(
          snapshot,
        ),
      ),
    );

    return true;
  } catch {
    sendError(
      socket,
      "PARTICIPANT_FORBIDDEN",
    );

    socket.close(
      1008,
      "Participant is not authorized for this room",
    );

    return false;
  }
}

function resolvePlayer(
  room:
    RevisionedLiveMatchRoom,

  participantId:
    string,
): PlayerPosition | null {
  const assignments =
    room.managedRoom.room.seats
      .assignments;

  for (
    const player
    of PLAYER_POSITIONS
  ) {
    if (
      assignments[
        player
      ] ===
      participantId
    ) {
      return player;
    }
  }

  return null;
}

function isRevisionMismatchError(
  error:
    unknown,
): boolean {
  return (
    error instanceof
      Error &&
    error.message.startsWith(
      "Match room revision mismatch:",
    )
  );
}

function isParticipantError(
  error:
    unknown,
): boolean {
  return (
    error instanceof
      Error &&
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
  error:
    unknown,
): boolean {
  if (
    !(
      error instanceof
      Error
    )
  ) {
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

function getCommandErrorCode(
  error:
    unknown,
): RealtimeErrorCode {
  if (
    error instanceof
      LiveRoomNotFoundError
  ) {
    return "ROOM_NOT_FOUND";
  }

  if (
    isRevisionMismatchError(
      error,
    )
  ) {
    return "REVISION_MISMATCH";
  }

  if (
    isParticipantError(
      error,
    )
  ) {
    return "PARTICIPANT_FORBIDDEN";
  }

  if (
    isCommandConflictError(
      error,
    )
  ) {
    return "COMMAND_REJECTED";
  }

  return "INTERNAL_SERVER_ERROR";
}

export function createRealtimeServer(
  options:
    CreateRealtimeServerOptions,
): RealtimeServer {
  const now =
    options.now ??
    Date.now;

  const heartbeatTimeoutMs =
    resolvePositiveInteger(
      options.heartbeatTimeoutMs,
      DEFAULT_HEARTBEAT_TIMEOUT_MS,
      "heartbeatTimeoutMs",
    );

  const heartbeatCheckIntervalMs =
    resolvePositiveInteger(
      options.heartbeatCheckIntervalMs,
      DEFAULT_HEARTBEAT_CHECK_INTERVAL_MS,
      "heartbeatCheckIntervalMs",
    );

  const reconnectGraceMs =
    resolvePositiveInteger(
      options.reconnectGraceMs,
      DEFAULT_RECONNECT_GRACE_MS,
      "reconnectGraceMs",
    );

  const absencePolicyOverride =
    options.absencePolicy;

  function getAbsencePolicy(
    sessionId:
      string,
  ): AbsencePolicy {
    if (
      absencePolicyOverride !==
      undefined
    ) {
      return absencePolicyOverride;
    }

    const mode =
      options.roomStore.requireMode(
        sessionId,
      );

    switch (
      mode
    ) {
      case "PRIVATE":
        return createPrivateAbsencePolicy();

      case "CASUAL":
        return createCasualAbsencePolicy();

      case "RANKED":
        return createRankedAbsencePolicy();
    }
  }

  const connections =
    new Map<
      WebSocket,
      ConnectionContext
    >();

  const participantConnections =
    new Map<
      string,
      WebSocket
    >();

  const lastSeenAtMs =
    new Map<
      string,
      number
    >();

  const disconnectionStates =
    new Map<
      string,
      DisconnectionState
    >();

  const broadcastedAbsenceEligibility =
    new Set<
      string
    >();

  const webSocketServer =
    new WebSocketServer({
      server:
        options.server,

      path:
        "/ws",
    });

  function createPresencePlayers(
    sessionId:
      string,
  ): readonly RealtimePresencePlayer[] {
    const room =
      options.roomStore.get(
        sessionId,
      );

    if (
      room ===
      undefined
    ) {
      return Object.freeze(
        [],
      );
    }

    const assignments =
      room.managedRoom.room.seats
        .assignments;

    return Object.freeze(
      PLAYER_POSITIONS.map(
        (
          player,
        ):
          RealtimePresencePlayer => {
          const participantId =
            assignments[
              player
            ];

          if (
            participantId ===
            null
          ) {
            return Object.freeze({
              player,

              connected:
                false,

              lastSeenAtMs:
                null,
            });
          }

          const context:
            ConnectionContext = {
              sessionId,
              participantId,
            };

          const key =
            getConnectionKey(
              context,
            );

          const socket =
            participantConnections.get(
              key,
            );

          const connected =
            socket !==
              undefined &&
            socket.readyState ===
              WebSocket.OPEN;

          return Object.freeze({
            player,

            connected,

            lastSeenAtMs:
              lastSeenAtMs.get(
                key,
              ) ??
              null,
          });
        },
      ),
    );
  }

  function createConnectionStates(
    sessionId:
      string,
  ): readonly RealtimeConnectionState[] {
    const room =
      options.roomStore.get(
        sessionId,
      );

    if (
      room ===
      undefined
    ) {
      return Object.freeze(
        [],
      );
    }

    const assignments =
      room.managedRoom.room.seats
        .assignments;

    return Object.freeze(
      PLAYER_POSITIONS.map(
        (
          player,
        ):
          RealtimeConnectionState => {
          const participantId =
            assignments[
              player
            ];

          if (
            participantId ===
            null
          ) {
            return Object.freeze({
              player,

              state:
                "ABSENT",

              disconnectedAtMs:
                null,

              graceDeadlineAtMs:
                null,
            });
          }

          const context:
            ConnectionContext = {
              sessionId,
              participantId,
            };

          const key =
            getConnectionKey(
              context,
            );

          const socket =
            participantConnections.get(
              key,
            );

          if (
            socket !==
              undefined &&
            socket.readyState ===
              WebSocket.OPEN
          ) {
            return Object.freeze({
              player,

              state:
                "CONNECTED",

              disconnectedAtMs:
                null,

              graceDeadlineAtMs:
                null,
            });
          }

          const disconnectionState =
            disconnectionStates.get(
              key,
            );

          if (
            disconnectionState ===
            undefined
          ) {
            return Object.freeze({
              player,

              state:
                "ABSENT",

              disconnectedAtMs:
                null,

              graceDeadlineAtMs:
                null,
            });
          }

          return Object.freeze({
            player,

            state:
              disconnectionState
                .graceExpired
                ? "ABSENT"
                : "RECONNECTING",

            disconnectedAtMs:
              disconnectionState
                .disconnectedAtMs,

            graceDeadlineAtMs:
              disconnectionState
                .disconnectedAtMs +
              reconnectGraceMs,
          });
        },
      ),
    );
  }

  function createAbsencePlayers(
    connectionStates:
      readonly RealtimeConnectionState[],

    currentTime:
      number,

    absencePolicy:
      AbsencePolicy,
  ): readonly RealtimeAbsencePlayer[] {
    return Object.freeze(
      connectionStates.map(
        (
          connectionState,
        ):
          RealtimeAbsencePlayer => {
          const evaluation =
            evaluateAbsenceResolution(
              absencePolicy,

              {
                state:
                  connectionState.state,

                disconnectedAtMs:
                  connectionState
                    .disconnectedAtMs,

                graceDeadlineAtMs:
                  connectionState
                    .graceDeadlineAtMs,
              },

              currentTime,
            );

          return Object.freeze({
            player:
              connectionState.player,

            status:
              evaluation.status,

            mode:
              evaluation.mode,

            absentSinceMs:
              evaluation.absentSinceMs,

            eligibleAtMs:
              evaluation.eligibleAtMs,

            remainingMs:
              evaluation.remainingMs,
          });
        },
      ),
    );
  }

  function createSessionPresenceState(
    sessionId:
      string,
  ): SessionPresenceState {
    const connectionStates =
      createConnectionStates(
        sessionId,
      );

    const absencePolicy =
      getAbsencePolicy(
        sessionId,
      );

    return Object.freeze({
      connectionStates,

      absences:
        createAbsencePlayers(
          connectionStates,
          now(),
          absencePolicy,
        ),
    });
  }

  function syncAbsenceResolutionState(
    sessionId:
      string,

    absences:
      readonly RealtimeAbsencePlayer[],
  ): void {
    for (
      const absence
      of absences
    ) {
      const decision =
        decideAbsenceResolution(
          absence,
        );

      const existing =
        options.roomStore
          .getAbsenceResolution(
            sessionId,
            absence.player,
          );

      if (
        decision.action ===
        "NONE"
      ) {
        if (
          existing?.status ===
          "PENDING"
        ) {
          options.roomStore
            .clearAbsenceResolution({
              sessionId,

              player:
                absence.player,
            });
        }

        continue;
      }

      if (
        existing ===
        undefined
      ) {
        options.roomStore
          .markAbsenceResolutionPending({
            sessionId,

            player:
              absence.player,

            action:
              decision.action,
          });

        continue;
      }

      if (
        existing.status !==
        "PENDING" ||
        existing.action ===
        decision.action
      ) {
        continue;
      }

      options.roomStore
        .clearAbsenceResolution({
          sessionId,

          player:
            absence.player,
        });

      options.roomStore
        .markAbsenceResolutionPending({
          sessionId,

          player:
            absence.player,

          action:
            decision.action,
        });
    }
  }

  function sendPresence(
    socket:
      WebSocket,

    sessionId:
      string,

    presenceState?:
      SessionPresenceState,
  ): void {
    if (
      socket.readyState !==
      WebSocket.OPEN
    ) {
      return;
    }

    const state =
      presenceState ??
      createSessionPresenceState(
        sessionId,
      );

    if (
      presenceState ===
      undefined
    ) {
      syncAbsenceResolutionState(
        sessionId,
        state.absences,
      );
    }

    socket.send(
      serializeRealtimeServerMessage(
        createRealtimePresenceMessage(
          sessionId,

          createPresencePlayers(
            sessionId,
          ),

          state.connectionStates,

          state.absences,
        ),
      ),
    );
  }

  function broadcastPresence(
    sessionId:
      string,
  ): void {
    const state =
      createSessionPresenceState(
        sessionId,
      );

    syncAbsenceResolutionState(
      sessionId,
      state.absences,
    );

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

      sendPresence(
        socket,
        sessionId,
        state,
      );
    }
  }

  function removeConnection(
    socket:
      WebSocket,

    broadcast:
      boolean,

    recordDisconnection:
      boolean =
        true,
  ): void {
    const context =
      connections.get(
        socket,
      );

    connections.delete(
      socket,
    );

    if (
      context ===
      undefined
    ) {
      return;
    }

    const key =
      getConnectionKey(
        context,
      );

    if (
      participantConnections.get(
        key,
      ) ===
      socket
    ) {
      participantConnections.delete(
        key,
      );

      if (
        recordDisconnection
      ) {
        disconnectionStates.set(
          key,

          Object.freeze({
            context,

            disconnectedAtMs:
              now(),

            graceExpired:
              false,
          }),
        );

        broadcastedAbsenceEligibility.delete(
          key,
        );
      }
    }

    if (
      broadcast
    ) {
      broadcastPresence(
        context.sessionId,
      );
    }
  }

  function replacePreviousConnection(
    socket:
      WebSocket,

    context:
      ConnectionContext,
  ): void {
    const key =
      getConnectionKey(
        context,
      );

    const previousSocket =
      participantConnections.get(
        key,
      );

    if (
      previousSocket ===
        undefined ||
      previousSocket ===
        socket
    ) {
      return;
    }

    removeConnection(
      previousSocket,
      false,
      false,
    );

    if (
      previousSocket.readyState ===
        WebSocket.OPEN ||
      previousSocket.readyState ===
        WebSocket.CONNECTING
    ) {
      previousSocket.close(
        4001,
        "Connection replaced by a newer connection",
      );
    }
  }

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

  function handleClientMessage(
    socket:
      WebSocket,

    context:
      ConnectionContext,

    data:
      RawData,

    isBinary:
      boolean,
  ): void {
    if (
      isBinary
    ) {
      sendError(
        socket,
        "INVALID_MESSAGE",
      );

      return;
    }

    let message:
      ReturnType<
        typeof parseRealtimeClientMessage
      >;

    try {
      message =
        parseRealtimeClientMessage(
          data.toString(),
        );
    } catch {
      sendError(
        socket,
        "INVALID_MESSAGE",
      );

      return;
    }

    if (
      message.type ===
      "HEARTBEAT"
    ) {
      const key =
        getConnectionKey(
          context,
        );

      lastSeenAtMs.set(
        key,
        now(),
      );

      broadcastPresence(
        context.sessionId,
      );

      return;
    }

    if (
      message.type ===
      "RESYNC"
    ) {
      sendSnapshot(
        socket,
        options.roomStore,
        context,
      );

      sendPresence(
        socket,
        context.sessionId,
      );

      return;
    }

    if (
      message.document.sessionId !==
      context.sessionId
    ) {
      sendError(
        socket,
        "SESSION_MISMATCH",
      );

      return;
    }

    const room =
      options.roomStore.get(
        context.sessionId,
      );

    if (
      room ===
      undefined
    ) {
      sendError(
        socket,
        "ROOM_NOT_FOUND",
      );

      return;
    }

    const player =
      resolvePlayer(
        room,
        context.participantId,
      );

    if (
      player ===
      null
    ) {
      sendError(
        socket,
        "PARTICIPANT_FORBIDDEN",
      );

      return;
    }

    const seatControl =
      options.roomStore
        .getSeatControl(
          context.sessionId,
          player,
        );

    if (
      seatControl.controller !==
      "HUMAN"
    ) {
      sendError(
        socket,
        "COMMAND_REJECTED",
      );

      return;
    }

    try {
      options.roomStore.applyCommand({
        sessionId:
          context.sessionId,

        participantId:
          context.participantId,

        document:
          message.document,
      });
    } catch (
      error:
        unknown
    ) {
      sendError(
        socket,
        getCommandErrorCode(
          error,
        ),
      );
    }
  }

  function sweepHeartbeatTimeouts():
    void {
    const currentTime =
      now();

    for (
      const [
        socket,
        context,
      ]
      of connections
    ) {
      const key =
        getConnectionKey(
          context,
        );

      const lastSeen =
        lastSeenAtMs.get(
          key,
        );

      if (
        lastSeen ===
        undefined
      ) {
        continue;
      }

      if (
        currentTime -
          lastSeen <
        heartbeatTimeoutMs
      ) {
        continue;
      }

      removeConnection(
        socket,
        true,
        true,
      );

      if (
        socket.readyState ===
          WebSocket.OPEN ||
        socket.readyState ===
          WebSocket.CONNECTING
      ) {
        socket.close(
          HEARTBEAT_TIMEOUT_CLOSE_CODE,
          HEARTBEAT_TIMEOUT_CLOSE_REASON,
        );
      }
    }
  }

  function sweepReconnectGracePeriods():
    void {
    const currentTime =
      now();

    const sessionsToBroadcast =
      new Set<
        string
      >();

    for (
      const [
        key,
        disconnectionState,
      ]
      of disconnectionStates
    ) {
      if (
        disconnectionState
          .graceExpired
      ) {
        continue;
      }

      if (
        participantConnections.has(
          key,
        )
      ) {
        continue;
      }

      if (
        currentTime -
          disconnectionState
            .disconnectedAtMs <
        reconnectGraceMs
      ) {
        continue;
      }

      disconnectionStates.set(
        key,

        Object.freeze({
          context:
            disconnectionState
              .context,

          disconnectedAtMs:
            disconnectionState
              .disconnectedAtMs,

          graceExpired:
            true,
        }),
      );

      sessionsToBroadcast.add(
        disconnectionState
          .context
          .sessionId,
      );
    }

    for (
      const sessionId
      of sessionsToBroadcast
    ) {
      broadcastPresence(
        sessionId,
      );
    }
  }

  function sweepAbsenceEligibility():
    void {
    const currentTime =
      now();

    const sessionsToBroadcast =
      new Set<
        string
      >();

    for (
      const [
        key,
        disconnectionState,
      ]
      of disconnectionStates
    ) {
      if (
        !disconnectionState
          .graceExpired
      ) {
        continue;
      }

      if (
        participantConnections.has(
          key,
        )
      ) {
        continue;
      }

      if (
        broadcastedAbsenceEligibility.has(
          key,
        )
      ) {
        continue;
      }

      const absencePolicy =
        getAbsencePolicy(
          disconnectionState
            .context
            .sessionId,
        );

      if (
        absencePolicy
          .resolutionDelayMs ===
        null
      ) {
        continue;
      }

      const absentSinceMs =
        disconnectionState
          .disconnectedAtMs +
        reconnectGraceMs;

      const eligibleAtMs =
        absentSinceMs +
        absencePolicy
          .resolutionDelayMs;

      if (
        currentTime <
        eligibleAtMs
      ) {
        continue;
      }

      broadcastedAbsenceEligibility.add(
        key,
      );

      sessionsToBroadcast.add(
        disconnectionState
          .context
          .sessionId,
      );
    }

    for (
      const sessionId
      of sessionsToBroadcast
    ) {
      broadcastPresence(
        sessionId,
      );
    }
  }

  const unsubscribe =
    options.roomStore.subscribe(
      broadcastRoom,
    );

  const heartbeatTimer =
    setInterval(
      () => {
        sweepHeartbeatTimeouts();
        sweepReconnectGracePeriods();
        sweepAbsenceEligibility();
      },

      heartbeatCheckIntervalMs,
    );

  heartbeatTimer.unref();

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

      if (
        context ===
        null
      ) {
        socket.close(
          1008,
          "Invalid WebSocket connection parameters",
        );

        return;
      }

      const room =
        options.roomStore.get(
          context.sessionId,
        );

      if (
        room ===
          undefined ||
        resolvePlayer(
          room,
          context.participantId,
        ) ===
          null
      ) {
        sendError(
          socket,
          "PARTICIPANT_FORBIDDEN",
        );

        socket.close(
          1008,
          "Participant is not authorized for this room",
        );

        return;
      }

      replacePreviousConnection(
        socket,
        context,
      );

      connections.set(
        socket,
        context,
      );

      const key =
        getConnectionKey(
          context,
        );

      participantConnections.set(
        key,
        socket,
      );

      lastSeenAtMs.set(
        key,
        now(),
      );

      disconnectionStates.delete(
        key,
      );

      broadcastedAbsenceEligibility.delete(
        key,
      );

      socket.on(
        "message",

        (
          data,
          isBinary,
        ) => {
          handleClientMessage(
            socket,
            context,
            data,
            isBinary,
          );
        },
      );

      socket.on(
        "close",

        () => {
          removeConnection(
            socket,
            true,
            true,
          );
        },
      );

      socket.on(
        "error",

        () => {
          removeConnection(
            socket,
            true,
            true,
          );
        },
      );

      sendSnapshot(
        socket,
        options.roomStore,
        context,
      );

      broadcastPresence(
        context.sessionId,
      );
    },
  );

  return Object.freeze({
    webSocketServer,

    async close():
      Promise<void> {
      clearInterval(
        heartbeatTimer,
      );

      unsubscribe();

      for (
        const socket
        of connections.keys()
      ) {
        socket.terminate();
      }

      connections.clear();

      participantConnections.clear();

      lastSeenAtMs.clear();

      disconnectionStates.clear();

      broadcastedAbsenceEligibility.clear();

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
                error !==
                undefined
              ) {
                reject(
                  error,
                );

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