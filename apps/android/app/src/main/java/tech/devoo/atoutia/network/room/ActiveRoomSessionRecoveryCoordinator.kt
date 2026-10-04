package tech.devoo.atoutia.network.room

import tech.devoo.atoutia.network.game.AtoutiaGameApiException
import tech.devoo.atoutia.network.game.PlayerGameSession
import tech.devoo.atoutia.network.game.PlayerGameSessionCoordinator
import tech.devoo.atoutia.network.game.PlayerGameSessionProtocolException
import tech.devoo.atoutia.network.game.PlayerGameSessionUnavailableException

sealed interface ActiveRoomSessionRecoveryResult {
    data object None :
        ActiveRoomSessionRecoveryResult

    data class Lobby(
        val membership:
            RoomSessionMembership,
    ) : ActiveRoomSessionRecoveryResult

    data class Game(
        val session:
            PlayerGameSession,
    ) : ActiveRoomSessionRecoveryResult

    data class SessionExpired(
        val message:
            String,
    ) : ActiveRoomSessionRecoveryResult

    data class Unavailable(
        val message:
            String,
    ) : ActiveRoomSessionRecoveryResult
}

class ActiveRoomSessionRecoveryCoordinator(
    private val activeRoomSessionStore:
        ActiveRoomSessionStore,

    private val roomApi:
        AtoutiaRoomApi,

    private val gameSessionCoordinator:
        PlayerGameSessionCoordinator,
) {
    fun restore(
        accountId:
            String,
    ): ActiveRoomSessionRecoveryResult {
        require(
            accountId.isNotBlank() &&
                accountId ==
                accountId.trim() &&
                accountId.none {
                    it.isWhitespace()
                },
        ) {
            "Invalid Atoutia account ID."
        }

        val reference =
            activeRoomSessionStore
                .load()
                ?: return ActiveRoomSessionRecoveryResult.None

        if (
            reference.accountId !=
                accountId
        ) {
            activeRoomSessionStore
                .clear()

            return ActiveRoomSessionRecoveryResult.None
        }

        val room =
            try {
                roomApi.getRoom(
                    reference.sessionId,
                )
            } catch (
                error:
                    AtoutiaRoomApiException,
            ) {
                return handleRoomApiFailure(
                    error,
                )
            }

        val gameSession =
            try {
                gameSessionCoordinator
                    .load(
                        sessionId =
                            reference.sessionId,

                        expectedPlayer =
                            reference.player,
                    )
            } catch (
                error:
                    AtoutiaGameApiException,
            ) {
                return handleGameApiFailure(
                    error,
                )
            } catch (
                error:
                    PlayerGameSessionUnavailableException,
            ) {
                return ActiveRoomSessionRecoveryResult
                    .SessionExpired(
                        message =
                            error.message
                                ?: "La session Atoutia n’est plus disponible.",
                    )
            } catch (
                error:
                    PlayerGameSessionProtocolException,
            ) {
                activeRoomSessionStore
                    .clear()

                return ActiveRoomSessionRecoveryResult.None
            }

        if (
            gameSession.sessionId !=
                reference.sessionId ||
            gameSession.player !=
                reference.player
        ) {
            activeRoomSessionStore
                .clear()

            return ActiveRoomSessionRecoveryResult.None
        }

        return when (
            gameSession.phase
        ) {
            PHASE_WAITING_FOR_PLAYERS,
            PHASE_READY,
            -> {
                if (
                    room.sessionId !=
                        reference.sessionId ||
                    !room.seats.isOccupied(
                        reference.player,
                    )
                ) {
                    activeRoomSessionStore
                        .clear()

                    ActiveRoomSessionRecoveryResult.None
                } else {
                    ActiveRoomSessionRecoveryResult
                        .Lobby(
                            membership =
                                RoomSessionMembership(
                                    room =
                                        room,

                                    player =
                                        reference.player,
                                ),
                        )
                }
            }

            PHASE_IN_PROGRESS -> {
                ActiveRoomSessionRecoveryResult
                    .Game(
                        session =
                            gameSession,
                    )
            }

            PHASE_FINISHED -> {
                activeRoomSessionStore
                    .clear()

                ActiveRoomSessionRecoveryResult.None
            }

            else -> {
                ActiveRoomSessionRecoveryResult
                    .Unavailable(
                        message =
                            "La phase de la partie Atoutia est inconnue : ${gameSession.phase}.",
                    )
            }
        }
    }

    private fun handleRoomApiFailure(
        error:
            AtoutiaRoomApiException,
    ): ActiveRoomSessionRecoveryResult {
        if (
            error.statusCode ==
                HTTP_NOT_FOUND ||
            error.errorCode ==
                ERROR_ROOM_NOT_FOUND
        ) {
            activeRoomSessionStore
                .clear()

            return ActiveRoomSessionRecoveryResult.None
        }

        return ActiveRoomSessionRecoveryResult
            .Unavailable(
                message =
                    "Impossible de vérifier la partie Atoutia enregistrée.",
            )
    }

    private fun handleGameApiFailure(
        error:
            AtoutiaGameApiException,
    ): ActiveRoomSessionRecoveryResult {
        return when (
            error.statusCode
        ) {
            HTTP_UNAUTHORIZED -> {
                ActiveRoomSessionRecoveryResult
                    .SessionExpired(
                        message =
                            "La session Atoutia a expiré.",
                    )
            }

            HTTP_FORBIDDEN,
            HTTP_NOT_FOUND,
            -> {
                activeRoomSessionStore
                    .clear()

                ActiveRoomSessionRecoveryResult.None
            }

            else -> {
                when (
                    error.errorCode
                ) {
                    ERROR_AUTH_REQUIRED,
                    ERROR_AUTH_INVALID,
                    -> {
                        ActiveRoomSessionRecoveryResult
                            .SessionExpired(
                                message =
                                    "La session Atoutia a expiré.",
                            )
                    }

                    ERROR_PARTICIPANT_FORBIDDEN,
                    ERROR_ROOM_NOT_FOUND,
                    -> {
                        activeRoomSessionStore
                            .clear()

                        ActiveRoomSessionRecoveryResult.None
                    }

                    else -> {
                        ActiveRoomSessionRecoveryResult
                            .Unavailable(
                                message =
                                    "Impossible de restaurer la partie Atoutia pour le moment.",
                            )
                    }
                }
            }
        }
    }

    private companion object {
        const val PHASE_WAITING_FOR_PLAYERS =
            "WAITING_FOR_PLAYERS"

        const val PHASE_READY =
            "READY"

        const val PHASE_IN_PROGRESS =
            "IN_PROGRESS"

        const val PHASE_FINISHED =
            "FINISHED"

        const val HTTP_UNAUTHORIZED =
            401

        const val HTTP_FORBIDDEN =
            403

        const val HTTP_NOT_FOUND =
            404

        const val ERROR_AUTH_REQUIRED =
            "AUTH_REQUIRED"

        const val ERROR_AUTH_INVALID =
            "AUTH_INVALID"

        const val ERROR_PARTICIPANT_FORBIDDEN =
            "PARTICIPANT_FORBIDDEN"

        const val ERROR_ROOM_NOT_FOUND =
            "ROOM_NOT_FOUND"
    }
}