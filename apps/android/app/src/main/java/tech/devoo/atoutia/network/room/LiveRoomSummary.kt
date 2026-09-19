package tech.devoo.atoutia.network.room

data class LiveRoomSeats(
    val player0:
        Boolean,

    val player1:
        Boolean,

    val player2:
        Boolean,

    val player3:
        Boolean,
) {
    val occupiedCount:
        Int
        get() =
            listOf(
                player0,
                player1,
                player2,
                player3,
            ).count {
                it
            }

    fun isOccupied(
        player:
            PlayerPosition,
    ): Boolean =
        when (
            player
        ) {
            PlayerPosition.PLAYER_0 ->
                player0

            PlayerPosition.PLAYER_1 ->
                player1

            PlayerPosition.PLAYER_2 ->
                player2

            PlayerPosition.PLAYER_3 ->
                player3
        }
}

data class LiveRoomSummary(
    val sessionId:
        String,

    val mode:
        MatchMode,

    val revision:
        Int,

    val phase:
        String,

    val occupiedSeats:
        Int,

    val seats:
        LiveRoomSeats,

    val adjudicationJson:
        String,
) {
    init {
        require(
            sessionId.isNotBlank() &&
                sessionId ==
                sessionId.trim(),
        ) {
            "Invalid Atoutia room session ID."
        }

        require(
            revision >=
                0,
        ) {
            "Atoutia room revision must be non-negative."
        }

        require(
            phase.isNotBlank() &&
                phase ==
                phase.trim(),
        ) {
            "Invalid Atoutia room phase."
        }

        require(
            occupiedSeats in
                0..4,
        ) {
            "Atoutia occupied seat count must be between 0 and 4."
        }

        require(
            occupiedSeats ==
                seats.occupiedCount,
        ) {
            "Atoutia occupied seat count does not match seat state."
        }

        require(
            adjudicationJson.isNotBlank(),
        ) {
            "Invalid Atoutia room adjudication document."
        }
    }
}