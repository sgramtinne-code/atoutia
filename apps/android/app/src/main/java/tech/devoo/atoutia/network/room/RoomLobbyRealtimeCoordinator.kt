package tech.devoo.atoutia.network.room

import tech.devoo.atoutia.network.realtime.AtoutiaRealtimeApi
import tech.devoo.atoutia.network.realtime.AtoutiaRealtimeConnection
import tech.devoo.atoutia.network.realtime.RealtimeEvent

class RoomLobbyRealtimeCoordinator(
    private val roomApi: AtoutiaRoomApi,
    private val realtimeApi: AtoutiaRealtimeApi,
    private val accessTokenProvider: () -> String?,
) {
    fun connect(
        membership: RoomSessionMembership,
        listener: Listener,
    ): AtoutiaRealtimeConnection {
        val accessToken =
            accessTokenProvider()
                ?: throw RoomLobbyRealtimeUnavailableException(
                    "Aucune session Atoutia active pour le temps réel.",
                )

        val state =
            State(
                membership =
                    membership,
            )

        val connection = realtimeApi.connect(
            sessionId =
                membership
                    .room
                    .sessionId,

            accessToken =
                accessToken,

            listener =
                object :
                    AtoutiaRealtimeApi.Listener {
                    override fun onConnected() {
                        state.dispatch { listener.onConnected() }
                    }

                    override fun onEvent(
                        event: RealtimeEvent,
                    ) {
                        try {
                            handleEvent(
                                state = state,
                                event = event,
                                listener = listener,
                            )
                        } catch (
                            error: Throwable,
                        ) {
                            state.dispatch { listener.onFailure(error) }
                        }
                    }

                    override fun onDisconnected(
                        code: Int,
                        reason: String,
                    ) {
                        state.dispatch {
                            listener.onDisconnected(code = code, reason = reason)
                        }
                    }

                    override fun onFailure(
                        error: Throwable,
                    ) {
                        state.dispatch { listener.onFailure(error) }
                    }
                },
        )

        return object : AtoutiaRealtimeConnection {
            override fun close() {
                // Invalidate notifications before closing the transport. An HTTP
                // refresh already in progress may still finish afterwards.
                if (state.markClosed()) connection.close()
            }
        }
    }

    private fun handleEvent(
        state: State,
        event: RealtimeEvent,
        listener: Listener,
    ) {
        val membership = state.currentMembership() ?: return
        when (
            event
        ) {
            is RealtimeEvent.Snapshot -> {
                handleSnapshot(
                    state = state,
                    event = event,
                    listener = listener,
                )
            }

            is RealtimeEvent.Presence -> {
                validateEventSessionId(
                    expectedSessionId =
                        membership
                            .room
                            .sessionId,

                    actualSessionId =
                        event.sessionId,
                )
            }

            is RealtimeEvent.Adjudication -> {
                validateEventSessionId(
                    expectedSessionId =
                        membership
                            .room
                            .sessionId,

                    actualSessionId =
                        event.sessionId,
                )
            }

            is RealtimeEvent.ServerError -> {
                state.dispatch { listener.onServerError(event.code) }
            }
        }
    }

    private fun handleSnapshot(
        state: State,
        event: RealtimeEvent.Snapshot,
        listener: Listener,
    ) {
        val currentMembership =
            state.currentMembership() ?: return

        validateEventSessionId(
            expectedSessionId =
                currentMembership
                    .room
                    .sessionId,

            actualSessionId =
                event.sessionId,
        )

        if (
            event.revision <=
                currentMembership
                    .room
                    .revision
        ) {
            return
        }

        val refreshedRoom =
            roomApi.getRoom(
                currentMembership
                    .room
                    .sessionId,
            )

        validateRefreshedRoom(
            previousMembership =
                currentMembership,

            refreshedRoom =
                refreshedRoom,

            announcedRevision =
                event.revision,
        )

        val refreshedMembership =
            RoomSessionMembership(
                room =
                    refreshedRoom,

                player =
                    currentMembership
                        .player,
            )

        state.updateMembership(refreshedMembership, listener)
    }

    private fun validateEventSessionId(
        expectedSessionId: String,
        actualSessionId: String,
    ) {
        if (
            actualSessionId !=
                expectedSessionId
        ) {
            throw RoomLobbyRealtimeProtocolException(
                "Le message temps réel Atoutia concerne un autre salon.",
            )
        }
    }

    private fun validateRefreshedRoom(
        previousMembership: RoomSessionMembership,
        refreshedRoom: LiveRoomSummary,
        announcedRevision: Int,
    ) {
        if (
            refreshedRoom.sessionId !=
                previousMembership
                    .room
                    .sessionId
        ) {
            throw RoomLobbyRealtimeProtocolException(
                "Le rafraîchissement temps réel Atoutia a changé l’identifiant du salon.",
            )
        }

        if (
            refreshedRoom.mode !=
                previousMembership
                    .room
                    .mode
        ) {
            throw RoomLobbyRealtimeProtocolException(
                "Le rafraîchissement temps réel Atoutia a changé le mode du salon.",
            )
        }

        if (
            refreshedRoom.revision <
                announcedRevision
        ) {
            throw RoomLobbyRealtimeProtocolException(
                "Le rafraîchissement temps réel Atoutia est plus ancien que le snapshot annoncé.",
            )
        }

        if (
            !refreshedRoom
                .seats
                .isOccupied(
                    previousMembership
                        .player,
                )
        ) {
            throw RoomLobbyRealtimeProtocolException(
                "Le siège du joueur n’est plus réservé dans le salon Atoutia.",
            )
        }
    }

    interface Listener {
        fun onConnected()

        fun onRoomUpdated(
            membership: RoomSessionMembership,
        )

        fun onServerError(
            code: String,
        )

        fun onDisconnected(
            code: Int,
            reason: String,
        )

        fun onFailure(
            error: Throwable,
        )
    }

    private class State(
        membership: RoomSessionMembership,
    ) {
        private val lock = Any()
        private var closed = false
        private var membership = membership

        fun currentMembership(): RoomSessionMembership? = synchronized(lock) {
            if (closed) null else membership
        }

        fun markClosed(): Boolean = synchronized(lock) {
            if (closed) false else {
                closed = true
                true
            }
        }

        // Keep HTTP and transport close outside this lock. Only state changes
        // and listener delivery are serialized with local invalidation.
        fun dispatch(action: () -> Unit) {
            synchronized(lock) {
                if (!closed) action()
            }
        }

        fun updateMembership(updated: RoomSessionMembership, listener: Listener) {
            dispatch {
                membership = updated
                listener.onRoomUpdated(updated)
            }
        }
    }
}

class RoomLobbyRealtimeUnavailableException(
    message: String,
) : Exception(
    message,
)

class RoomLobbyRealtimeProtocolException(
    message: String,
) : Exception(
    message,
)
