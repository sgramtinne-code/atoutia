package tech.devoo.atoutia.network.room

data class RoomSessionMembership(
    val room:
        LiveRoomSummary,

    val player:
        PlayerPosition,
)

class RoomSessionCoordinator(
    private val roomApi:
        AtoutiaRoomApi,

    private val accessTokenProvider:
        () -> String?,
) {
    fun createPrivateRoomAndClaimHostSeat():
        RoomSessionMembership {
        val accessToken =
            requireAccessToken()

        val createdRoom =
            roomApi.createRoom(
                mode =
                    MatchMode.PRIVATE,
            )

        val player =
            PlayerPosition.PLAYER_0

        val claimedRoom =
            roomApi.claimSeat(
                sessionId =
                    createdRoom.sessionId,

                player =
                    player,

                expectedRevision =
                    createdRoom.revision,

                accessToken =
                    accessToken,
            )

        validateClaimedRoom(
            previousRoom =
                createdRoom,

            claimedRoom =
                claimedRoom,

            player =
                player,
        )

        return RoomSessionMembership(
            room =
                claimedRoom,

            player =
                player,
        )
    }

    fun joinRoomAndClaimFirstAvailableSeat(
        sessionId:
            String,
    ): RoomSessionMembership {
        val accessToken =
            requireAccessToken()

        val room =
            roomApi.getRoom(
                sessionId,
            )

        val player =
            findFirstAvailableSeat(
                room,
            ) ?: throw RoomSessionFullException(
                "Cette partie Atoutia est complète.",
            )

        val claimedRoom =
            roomApi.claimSeat(
                sessionId =
                    room.sessionId,

                player =
                    player,

                expectedRevision =
                    room.revision,

                accessToken =
                    accessToken,
            )

        validateClaimedRoom(
            previousRoom =
                room,

            claimedRoom =
                claimedRoom,

            player =
                player,
        )

        return RoomSessionMembership(
            room =
                claimedRoom,

            player =
                player,
        )
    }

    fun leaveRoom(
        membership:
            RoomSessionMembership,
    ): LiveRoomSummary {
        val accessToken =
            requireAccessToken()

        val releasedRoom =
            roomApi.releaseSeat(
                sessionId =
                    membership
                        .room
                        .sessionId,

                player =
                    membership
                        .player,

                expectedRevision =
                    membership
                        .room
                        .revision,

                accessToken =
                    accessToken,
            )

        validateReleasedRoom(
            previousMembership =
                membership,

            releasedRoom =
                releasedRoom,
        )

        return releasedRoom
    }

    fun startRoom(
        membership:
            RoomSessionMembership,
    ): RoomSessionMembership {
        val accessToken =
            requireAccessToken()

        validateRoomCanBeStarted(
            membership,
        )

        val startedRoom =
            roomApi.startRoom(
                sessionId =
                    membership
                        .room
                        .sessionId,

                expectedRevision =
                    membership
                        .room
                        .revision,

                accessToken =
                    accessToken,
            )

        validateStartedRoom(
            previousMembership =
                membership,

            startedRoom =
                startedRoom,
        )

        return RoomSessionMembership(
            room =
                startedRoom,

            player =
                membership.player,
        )
    }

    private fun requireAccessToken():
        String =
        accessTokenProvider()
            ?: throw RoomSessionUnavailableException(
                "Aucune session Atoutia active.",
            )

    private fun findFirstAvailableSeat(
        room:
            LiveRoomSummary,
    ): PlayerPosition? =
        PlayerPosition.entries
            .firstOrNull {
                player ->
                !room
                    .seats
                    .isOccupied(
                        player,
                    )
            }

    private fun validateRoomCanBeStarted(
        membership:
            RoomSessionMembership,
    ) {
        if (
            membership.player !=
                PlayerPosition.PLAYER_0
        ) {
            throw RoomSessionStartUnavailableException(
                "Seul l’hôte Atoutia peut démarrer la partie.",
            )
        }

        if (
            membership.room.phase !=
                "READY"
        ) {
            throw RoomSessionStartUnavailableException(
                "La partie Atoutia n’est pas prête à démarrer.",
            )
        }

        if (
            membership.room.occupiedSeats !=
                PlayerPosition.entries.size ||
            membership.room.seats.occupiedCount !=
                PlayerPosition.entries.size
        ) {
            throw RoomSessionStartUnavailableException(
                "La partie Atoutia doit avoir quatre joueurs pour démarrer.",
            )
        }

        val allSeatsOccupied =
            PlayerPosition.entries
                .all {
                    player ->
                    membership
                        .room
                        .seats
                        .isOccupied(
                            player,
                        )
                }

        if (
            !allSeatsOccupied
        ) {
            throw RoomSessionStartUnavailableException(
                "La partie Atoutia doit avoir quatre joueurs pour démarrer.",
            )
        }
    }

    private fun validateClaimedRoom(
        previousRoom:
            LiveRoomSummary,

        claimedRoom:
            LiveRoomSummary,

        player:
            PlayerPosition,
    ) {
        if (
            claimedRoom.sessionId !=
                previousRoom.sessionId
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a changé l’identifiant du salon.",
            )
        }

        if (
            claimedRoom.mode !=
                previousRoom.mode
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a changé le mode du salon.",
            )
        }

        if (
            !claimedRoom
                .seats
                .isOccupied(
                    player,
                )
        ) {
            throw RoomSessionProtocolException(
                "Le siège Atoutia demandé n’a pas été réservé.",
            )
        }
    }

    private fun validateReleasedRoom(
        previousMembership:
            RoomSessionMembership,

        releasedRoom:
            LiveRoomSummary,
    ) {
        if (
            releasedRoom.sessionId !=
                previousMembership
                    .room
                    .sessionId
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a changé l’identifiant du salon pendant la sortie.",
            )
        }

        if (
            releasedRoom.mode !=
                previousMembership
                    .room
                    .mode
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a changé le mode du salon pendant la sortie.",
            )
        }

        if (
            releasedRoom.revision <=
                previousMembership
                    .room
                    .revision
        ) {
            throw RoomSessionProtocolException(
                "La libération du siège Atoutia n’a pas avancé la révision du salon.",
            )
        }

        if (
            releasedRoom
                .seats
                .isOccupied(
                    previousMembership
                        .player,
                )
        ) {
            throw RoomSessionProtocolException(
                "Le siège Atoutia du joueur est toujours réservé après la sortie.",
            )
        }
    }

    private fun validateStartedRoom(
        previousMembership:
            RoomSessionMembership,

        startedRoom:
            LiveRoomSummary,
    ) {
        if (
            startedRoom.sessionId !=
                previousMembership
                    .room
                    .sessionId
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a changé l’identifiant du salon pendant le démarrage.",
            )
        }

        if (
            startedRoom.mode !=
                previousMembership
                    .room
                    .mode
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a changé le mode du salon pendant le démarrage.",
            )
        }

        if (
            startedRoom.revision <=
                previousMembership
                    .room
                    .revision
        ) {
            throw RoomSessionProtocolException(
                "Le démarrage Atoutia n’a pas avancé la révision du salon.",
            )
        }

        if (
            startedRoom.phase !=
                "IN_PROGRESS"
        ) {
            throw RoomSessionProtocolException(
                "La partie Atoutia n’est pas passée en cours après le démarrage.",
            )
        }

        if (
            startedRoom.occupiedSeats !=
                PlayerPosition.entries.size ||
            startedRoom.seats.occupiedCount !=
                PlayerPosition.entries.size
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a perdu un joueur pendant le démarrage.",
            )
        }

        val allSeatsOccupied =
            PlayerPosition.entries
                .all {
                    player ->
                    startedRoom
                        .seats
                        .isOccupied(
                            player,
                        )
                }

        if (
            !allSeatsOccupied
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a perdu un joueur pendant le démarrage.",
            )
        }

        if (
            !startedRoom
                .seats
                .isOccupied(
                    previousMembership
                        .player,
                )
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a perdu le siège du joueur pendant le démarrage.",
            )
        }
    }
}

class RoomSessionUnavailableException(
    message:
        String,
) : Exception(
    message,
)

class RoomSessionFullException(
    message:
        String,
) : Exception(
    message,
)

class RoomSessionStartUnavailableException(
    message:
        String,
) : Exception(
    message,
)

class RoomSessionProtocolException(
    message:
        String,
) : Exception(
    message,
)