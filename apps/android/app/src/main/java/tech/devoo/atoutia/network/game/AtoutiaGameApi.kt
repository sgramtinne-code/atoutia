package tech.devoo.atoutia.network.game

data class PlayerGameSnapshot(
    val revision:
        Int,

    val phase:
        String,

    val document:
        PlayerClientSnapshotDocument,
)

sealed interface PlayerGameCommand {
    data object Pass :
        PlayerGameCommand

    data class Take(
        val suit:
            CardSuit,
    ) : PlayerGameCommand

    data class PlayCard(
        val card:
            PlayerCard,
    ) : PlayerGameCommand
}

interface AtoutiaGameApi {
    fun getPlayerSnapshot(
        sessionId:
            String,

        accessToken:
            String,
    ): PlayerGameSnapshot

    fun submitCommand(
        sessionId:
            String,

        expectedRevision:
            Int,

        engineVersion:
            String,

        command:
            PlayerGameCommand,

        accessToken:
            String,
    ): PlayerGameSnapshot
}