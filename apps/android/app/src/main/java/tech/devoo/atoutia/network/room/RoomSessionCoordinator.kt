package tech.devoo.atoutia.network.room

class RoomSessionCoordinator(
    private val roomApi:
        AtoutiaRoomApi,

    private val accessTokenProvider:
        () -> String?,
) {
    fun createPrivateRoomAndClaimHostSeat():
        LiveRoomSummary {
        val accessToken =
            accessTokenProvider()
                ?: throw RoomSessionUnavailableException(
                    "Aucune session Atoutia active.",
                )

        val createdRoom =
            roomApi.createRoom(
                mode =
                    MatchMode.PRIVATE,
            )

        val claimedRoom =
            roomApi.claimSeat(
                sessionId =
                    createdRoom.sessionId,

                player =
                    PlayerPosition.PLAYER_0,

                expectedRevision =
                    createdRoom.revision,

                accessToken =
                    accessToken,
            )

        validateClaimedHostRoom(
            createdRoom =
                createdRoom,

            claimedRoom =
                claimedRoom,
        )

        return claimedRoom
    }

    private fun validateClaimedHostRoom(
        createdRoom:
            LiveRoomSummary,

        claimedRoom:
            LiveRoomSummary,
    ) {
        if (
            claimedRoom.sessionId !=
                createdRoom.sessionId
        ) {
            throw RoomSessionProtocolException(
                "La réponse Atoutia a changé l’identifiant du salon.",
            )
        }

        if (
            claimedRoom.mode !=
                MatchMode.PRIVATE
        ) {
            throw RoomSessionProtocolException(
                "Le salon Atoutia créé n’est plus en mode privé.",
            )
        }

        if (
            !claimedRoom
                .seats
                .isOccupied(
                    PlayerPosition.PLAYER_0,
                )
        ) {
            throw RoomSessionProtocolException(
                "Le siège hôte Atoutia n’a pas été réservé.",
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

class RoomSessionProtocolException(
    message:
        String,
) : Exception(
    message,
)