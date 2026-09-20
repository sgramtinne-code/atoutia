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

class RoomSessionProtocolException(
    message:
        String,
) : Exception(
    message,
)