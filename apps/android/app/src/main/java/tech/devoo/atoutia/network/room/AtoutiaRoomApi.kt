package tech.devoo.atoutia.network.room

interface AtoutiaRoomApi {
    fun createRoom(
        mode:
            MatchMode? =
            null,
    ): LiveRoomSummary

    fun getRoom(
        sessionId:
            String,
    ): LiveRoomSummary

    fun claimSeat(
        sessionId:
            String,

        player:
            PlayerPosition,

        expectedRevision:
            Int,

        accessToken:
            String,
    ): LiveRoomSummary
}