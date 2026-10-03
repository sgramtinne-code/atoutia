package tech.devoo.atoutia.network.game

interface AtoutiaGameApi {
    fun getPlayerSnapshot(
        sessionId:
            String,

        accessToken:
            String,
    ): PlayerClientSnapshotDocument
}