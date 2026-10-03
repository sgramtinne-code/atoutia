package tech.devoo.atoutia.network.game

import tech.devoo.atoutia.network.room.PlayerPosition

data class PlayerGameSession(
    val sessionId:
        String,

    val player:
        PlayerPosition,

    val revision:
        Int,

    val phase:
        String,

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
            requireAccessToken()

        val snapshot =
            gameApi.getPlayerSnapshot(
                sessionId =
                    sessionId,

                accessToken =
                    accessToken,
            )

        return createSession(
            sessionId =
                sessionId,

            expectedPlayer =
                expectedPlayer,

            snapshot =
                snapshot,
        )
    }

    fun submitBiddingAction(
        session:
            PlayerGameSession,

        action:
            BiddingActionSnapshot,
    ): PlayerGameSession {
        validateBiddingAction(
            session =
                session,

            action =
                action,
        )

        val accessToken =
            requireAccessToken()

        val command =
            when (
                action
            ) {
                is BiddingActionSnapshot.Pass ->
                    PlayerGameCommand.Pass

                is BiddingActionSnapshot.Take ->
                    PlayerGameCommand.Take(
                        suit =
                            action.suit,
                    )
            }

        return submitValidatedCommand(
            session =
                session,

            command =
                command,

            accessToken =
                accessToken,
        )
    }

    fun submitPlayCard(
        session:
            PlayerGameSession,

        card:
            PlayerCard,
    ): PlayerGameSession {
        validatePlayCard(
            session =
                session,

            card =
                card,
        )

        val accessToken =
            requireAccessToken()

        return submitValidatedCommand(
            session =
                session,

            command =
                PlayerGameCommand.PlayCard(
                    card =
                        card,
                ),

            accessToken =
                accessToken,
        )
    }

    private fun submitValidatedCommand(
        session:
            PlayerGameSession,

        command:
            PlayerGameCommand,

        accessToken:
            String,
    ): PlayerGameSession {
        val snapshot =
            gameApi.submitCommand(
                sessionId =
                    session.sessionId,

                expectedRevision =
                    session.revision,

                engineVersion =
                    session.document
                        .engineVersion,

                command =
                    command,

                accessToken =
                    accessToken,
            )

        val updatedSession =
            createSession(
                sessionId =
                    session.sessionId,

                expectedPlayer =
                    session.player,

                snapshot =
                    snapshot,
            )

        if (
            updatedSession.revision <=
                session.revision
        ) {
            throw PlayerGameSessionProtocolException(
                "La commande Atoutia n’a pas avancé la révision de la partie.",
            )
        }

        return updatedSession
    }

    private fun requireAccessToken():
        String =
        accessTokenProvider()
            ?: throw PlayerGameSessionUnavailableException(
                "Aucune session Atoutia active.",
            )

    private fun validateBiddingAction(
        session:
            PlayerGameSession,

        action:
            BiddingActionSnapshot,
    ) {
        val availableActions =
            session
                .document
                .snapshot
                .actions

        if (
            availableActions.mode !=
                PlayerActionMode.BID
        ) {
            throw PlayerGameSessionProtocolException(
                "Aucune enchère Atoutia n’est disponible pour ce joueur.",
            )
        }

        if (
            action.player !=
                session.player
        ) {
            throw PlayerGameSessionProtocolException(
                "L’enchère Atoutia ne correspond pas au joueur de la partie.",
            )
        }

        if (
            action !in
                availableActions
                    .biddingActions
        ) {
            throw PlayerGameSessionProtocolException(
                "Cette enchère Atoutia n’est pas proposée par le serveur.",
            )
        }
    }

    private fun validatePlayCard(
        session:
            PlayerGameSession,

        card:
            PlayerCard,
    ) {
        val snapshot =
            session
                .document
                .snapshot

        val availableActions =
            snapshot.actions

        if (
            availableActions.mode !=
                PlayerActionMode.PLAY_CARD
        ) {
            throw PlayerGameSessionProtocolException(
                "Aucune carte Atoutia ne peut être jouée par ce joueur.",
            )
        }

        if (
            availableActions.player !=
                session.player
        ) {
            throw PlayerGameSessionProtocolException(
                "Les cartes jouables Atoutia ne correspondent pas au joueur de la partie.",
            )
        }

        if (
            card !in
                availableActions
                    .legalCards
        ) {
            throw PlayerGameSessionProtocolException(
                "Cette carte Atoutia n’est pas proposée par le serveur.",
            )
        }

        if (
            card !in
                snapshot
                    .match
                    .hand
        ) {
            throw PlayerGameSessionProtocolException(
                "Cette carte Atoutia n’est pas présente dans la main du joueur.",
            )
        }
    }

    private fun createSession(
        sessionId:
            String,

        expectedPlayer:
            PlayerPosition,

        snapshot:
            PlayerGameSnapshot,
    ): PlayerGameSession {
        val document =
            snapshot.document

        if (
            document.snapshot.match.player !=
                expectedPlayer ||
            document.snapshot.actions.player !=
                expectedPlayer
        ) {
            throw PlayerGameSessionProtocolException(
                "Le snapshot Atoutia ne correspond pas au joueur du salon.",
            )
        }

        return PlayerGameSession(
            sessionId =
                sessionId,

            player =
                expectedPlayer,

            revision =
                snapshot.revision,

            phase =
                snapshot.phase,

            document =
                document,
        )
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