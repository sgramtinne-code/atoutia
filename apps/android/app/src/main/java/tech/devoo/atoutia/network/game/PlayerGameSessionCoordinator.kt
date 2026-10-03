package tech.devoo.atoutia.network.game

import tech.devoo.atoutia.network.room.PlayerPosition

data class PlayerGameSession(
    val sessionId:
        String,

    val player:
        PlayerPosition,

    val document:
        PlayerClientSnapshotDocument,
)

class PlayerGameSessionCoordinator(
    private val gameApi:
        AtoutiaGameApi,

    private val accessTokenProvider:
        () -> String?,
) {
    fun load(
        sessionId:
            String,

        expectedPlayer:
            PlayerPosition,
    ): PlayerGameSession {
        val accessToken =
            accessTokenProvider()
                ?: throw PlayerGameSessionUnavailableException(
                    "Aucune session Atoutia active.",
                )

        val document =
            gameApi.getPlayerSnapshot(
                sessionId =
                    sessionId,

                accessToken =
                    accessToken,
            )

        validatePlayerIdentity(
            document =
                document,

            expectedPlayer =
                expectedPlayer,
        )

        return PlayerGameSession(
            sessionId =
                sessionId,

            player =
                expectedPlayer,

            document =
                document,
        )
    }

    private fun validatePlayerIdentity(
        document:
            PlayerClientSnapshotDocument,

        expectedPlayer:
            PlayerPosition,
    ) {
        val matchPlayer =
            document
                .snapshot
                .match
                .player

        val actionsPlayer =
            document
                .snapshot
                .actions
                .player

        if (
            matchPlayer !=
                expectedPlayer ||
            actionsPlayer !=
                expectedPlayer
        ) {
            throw PlayerGameSessionProtocolException(
                "Le snapshot Atoutia ne correspond pas au joueur du salon.",
            )
        }
    }
}

class PlayerGameSessionUnavailableException(
    message:
        String,
) : Exception(
    message,
)

class PlayerGameSessionProtocolException(
    message:
        String,
) : Exception(
    message,
)