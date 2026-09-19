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

        return realtimeApi.connect(
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
                        listener.onConnected()
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
                            listener.onFailure(
                                error,
                            )
                        }
                    }

                    override fun onDisconnected(
                        code: Int,
                        reason: String,
                    ) {
                        listener.onDisconnected(
                            code = code,
                            reason = reason,
                        )
                    }

                    override fun onFailure(
                        error: Throwable,
                    ) {
                        listener.onFailure(
                            error,
                        )
                    }
                },
        )
    }

    private fun handleEvent(
        state: State,
        event: RealtimeEvent,
        listener: Listener,
    ) {
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
                        state.membership
                            .room
                            .sessionId,

                    actualSessionId =
                        event.sessionId,
                )
            }

            is RealtimeEvent.Adjudication -> {
                validateEventSessionId(
                    expectedSessionId =
                        state.membership
                            .room
                            .sessionId,

                    actualSessionId =
                        event.sessionId,
                )
            }

            is RealtimeEvent.ServerError -> {
                listener.onServerError(
                    event.code,
                )
            }
        }
    }

    private fun handleSnapshot(
        state: State,
        event: RealtimeEvent.Snapshot,
        listener: Listener,
    ) {
        val currentMembership =
            state.membership

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

        state.membership =
            refreshedMembership

        listener.onRoomUpdated(
            refreshedMembership,
        )
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
        var membership:
            RoomSessionMembership =
            membership
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