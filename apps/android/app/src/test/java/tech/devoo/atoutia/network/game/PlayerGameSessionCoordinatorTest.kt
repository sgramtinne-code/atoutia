package tech.devoo.atoutia.network.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tech.devoo.atoutia.network.room.PlayerPosition

class PlayerGameSessionCoordinatorTest {
    @Test
    fun loadsAuthenticatedPlayerSnapshot() {
        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_2,

                        revision =
                            5,
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_2,
            )

        assertEquals(
            "ms1_testroom",
            api.loadSessionId,
        )

        assertEquals(
            "atk1_test",
            api.loadAccessToken,
        )

        assertEquals(
            "ms1_testroom",
            session.sessionId,
        )

        assertEquals(
            PlayerPosition.PLAYER_2,
            session.player,
        )

        assertEquals(
            5,
            session.revision,
        )

        assertEquals(
            "IN_PROGRESS",
            session.phase,
        )

        assertEquals(
            "0.1.0",
            session.document.engineVersion,
        )

        assertEquals(
            PlayerPosition.PLAYER_2,
            session.document
                .snapshot
                .match
                .player,
        )

        assertEquals(
            PlayerPosition.PLAYER_2,
            session.document
                .snapshot
                .actions
                .player,
        )
    }

    @Test
    fun loadingRequiresActiveAuthentication() {
        val api =
            RecordingGameApi()

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    null
                },
            )

        val error =
            assertThrows(
                PlayerGameSessionUnavailableException::class.java,
            ) {
                coordinator.load(
                    sessionId =
                        "ms1_testroom",

                    expectedPlayer =
                        PlayerPosition.PLAYER_0,
                )
            }

        assertEquals(
            "Aucune session Atoutia active.",
            error.message,
        )

        assertFalse(
            api.loadCalled,
        )
    }

    @Test
    fun rejectsSnapshotWithDifferentMatchPlayer() {
        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        matchPlayer =
                            PlayerPosition.PLAYER_1,
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val error =
            assertThrows(
                PlayerGameSessionProtocolException::class.java,
            ) {
                coordinator.load(
                    sessionId =
                        "ms1_testroom",

                    expectedPlayer =
                        PlayerPosition.PLAYER_0,
                )
            }

        assertEquals(
            "Le snapshot Atoutia ne correspond pas au joueur du salon.",
            error.message,
        )
    }

    @Test
    fun rejectsSnapshotWithDifferentActionsPlayer() {
        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        actionsPlayer =
                            PlayerPosition.PLAYER_1,
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val error =
            assertThrows(
                PlayerGameSessionProtocolException::class.java,
            ) {
                coordinator.load(
                    sessionId =
                        "ms1_testroom",

                    expectedPlayer =
                        PlayerPosition.PLAYER_0,
                )
            }

        assertEquals(
            "Le snapshot Atoutia ne correspond pas au joueur du salon.",
            error.message,
        )
    }

    @Test
    fun propagatesStructuredApiFailureWhileLoading() {
        val api =
            FailingGameApi(
                failure =
                    AtoutiaGameApiException(
                        message =
                            "Atoutia game API returned HTTP 401.",

                        statusCode =
                            401,

                        errorCode =
                            "AUTH_INVALID",
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val error =
            assertThrows(
                AtoutiaGameApiException::class.java,
            ) {
                coordinator.load(
                    sessionId =
                        "ms1_testroom",

                    expectedPlayer =
                        PlayerPosition.PLAYER_0,
                )
            }

        assertEquals(
            "Atoutia game API returned HTTP 401.",
            error.message,
        )

        assertEquals(
            401,
            error.statusCode,
        )

        assertEquals(
            "AUTH_INVALID",
            error.errorCode,
        )
    }

    @Test
    fun submitsServerProvidedPassUsingCurrentRevision() {
        val pass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val initialSnapshot =
            createGameSnapshot(
                player =
                    PlayerPosition.PLAYER_0,

                revision =
                    5,

                biddingActions =
                    listOf(
                        pass,
                    ),
            )

        val updatedSnapshot =
            createGameSnapshot(
                player =
                    PlayerPosition.PLAYER_0,

                revision =
                    6,

                mode =
                    PlayerActionMode.WAIT,

                biddingActions =
                    emptyList(),

                biddingPlayer =
                    PlayerPosition.PLAYER_1,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    initialSnapshot,

                commandSnapshot =
                    updatedSnapshot,
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_submit_token"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_0,
            )

        val updatedSession =
            coordinator.submitBiddingAction(
                session =
                    session,

                action =
                    pass,
            )

        assertTrue(
            api.submitCalled,
        )

        assertEquals(
            "ms1_testroom",
            api.submitSessionId,
        )

        assertEquals(
            5,
            api.submitExpectedRevision,
        )

        assertEquals(
            "0.1.0",
            api.submitEngineVersion,
        )

        assertEquals(
            PlayerGameCommand.Pass,
            api.submitCommand,
        )

        assertEquals(
            "atk1_submit_token",
            api.submitAccessToken,
        )

        assertEquals(
            6,
            updatedSession.revision,
        )

        assertEquals(
            "IN_PROGRESS",
            updatedSession.phase,
        )

        assertEquals(
            PlayerPosition.PLAYER_0,
            updatedSession.player,
        )

        assertEquals(
            PlayerActionMode.WAIT,
            updatedSession
                .document
                .snapshot
                .actions
                .mode,
        )
    }

    @Test
    fun submitsServerProvidedTakeUsingCurrentRevision() {
        val take =
            BiddingActionSnapshot.Take(
                player =
                    PlayerPosition.PLAYER_1,

                suit =
                    CardSuit.HEARTS,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_1,

                        revision =
                            8,

                        biddingActions =
                            listOf(
                                take,
                            ),
                    ),

                commandSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_1,

                        revision =
                            9,

                        mode =
                            PlayerActionMode.WAIT,

                        biddingActions =
                            emptyList(),

                        biddingPlayer =
                            null,
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_take_token"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_1,
            )

        val updatedSession =
            coordinator.submitBiddingAction(
                session =
                    session,

                action =
                    take,
            )

        assertEquals(
            8,
            api.submitExpectedRevision,
        )

        assertEquals(
            PlayerGameCommand.Take(
                suit =
                    CardSuit.HEARTS,
            ),
            api.submitCommand,
        )

        assertEquals(
            "atk1_take_token",
            api.submitAccessToken,
        )

        assertEquals(
            9,
            updatedSession.revision,
        )
    }

    @Test
    fun rejectsBiddingActionWhenServerModeIsWait() {
        val pass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        mode =
                            PlayerActionMode.WAIT,

                        biddingActions =
                            emptyList(),
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_0,
            )

        val error =
            assertThrows(
                PlayerGameSessionProtocolException::class.java,
            ) {
                coordinator.submitBiddingAction(
                    session =
                        session,

                    action =
                        pass,
                )
            }

        assertEquals(
            "Aucune enchère Atoutia n’est disponible pour ce joueur.",
            error.message,
        )

        assertFalse(
            api.submitCalled,
        )
    }

    @Test
    fun rejectsBiddingActionForAnotherPlayer() {
        val allowedPass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val otherPlayerPass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_1,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        biddingActions =
                            listOf(
                                allowedPass,
                            ),
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_0,
            )

        val error =
            assertThrows(
                PlayerGameSessionProtocolException::class.java,
            ) {
                coordinator.submitBiddingAction(
                    session =
                        session,

                    action =
                        otherPlayerPass,
                )
            }

        assertEquals(
            "L’enchère Atoutia ne correspond pas au joueur de la partie.",
            error.message,
        )

        assertFalse(
            api.submitCalled,
        )
    }

    @Test
    fun rejectsBiddingActionNotProvidedByServer() {
        val pass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val allowedTake =
            BiddingActionSnapshot.Take(
                player =
                    PlayerPosition.PLAYER_0,

                suit =
                    CardSuit.HEARTS,
            )

        val unofferedTake =
            BiddingActionSnapshot.Take(
                player =
                    PlayerPosition.PLAYER_0,

                suit =
                    CardSuit.SPADES,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        biddingActions =
                            listOf(
                                pass,
                                allowedTake,
                            ),
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_0,
            )

        val error =
            assertThrows(
                PlayerGameSessionProtocolException::class.java,
            ) {
                coordinator.submitBiddingAction(
                    session =
                        session,

                    action =
                        unofferedTake,
                )
            }

        assertEquals(
            "Cette enchère Atoutia n’est pas proposée par le serveur.",
            error.message,
        )

        assertFalse(
            api.submitCalled,
        )
    }

    @Test
    fun submittingBiddingActionRequiresActiveAuthentication() {
        val pass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        biddingActions =
                            listOf(
                                pass,
                            ),
                    ),
            )

        var accessToken:
            String? =
            "atk1_initial"

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    accessToken
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_0,
            )

        accessToken =
            null

        val error =
            assertThrows(
                PlayerGameSessionUnavailableException::class.java,
            ) {
                coordinator.submitBiddingAction(
                    session =
                        session,

                    action =
                        pass,
                )
            }

        assertEquals(
            "Aucune session Atoutia active.",
            error.message,
        )

        assertFalse(
            api.submitCalled,
        )
    }

    @Test
    fun rejectsCommandResponseWithoutRevisionAdvance() {
        val pass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        revision =
                            5,

                        biddingActions =
                            listOf(
                                pass,
                            ),
                    ),

                commandSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        revision =
                            5,

                        mode =
                            PlayerActionMode.WAIT,

                        biddingActions =
                            emptyList(),
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_0,
            )

        val error =
            assertThrows(
                PlayerGameSessionProtocolException::class.java,
            ) {
                coordinator.submitBiddingAction(
                    session =
                        session,

                    action =
                        pass,
                )
            }

        assertEquals(
            "La commande Atoutia n’a pas avancé la révision de la partie.",
            error.message,
        )

        assertTrue(
            api.submitCalled,
        )
    }

    @Test
    fun rejectsCommandResponseForDifferentPlayer() {
        val pass =
            BiddingActionSnapshot.Pass(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val api =
            RecordingGameApi(
                loadSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        revision =
                            5,

                        biddingActions =
                            listOf(
                                pass,
                            ),
                    ),

                commandSnapshot =
                    createGameSnapshot(
                        player =
                            PlayerPosition.PLAYER_1,

                        revision =
                            6,
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val session =
            coordinator.load(
                sessionId =
                    "ms1_testroom",

                expectedPlayer =
                    PlayerPosition.PLAYER_0,
            )

        val error =
            assertThrows(
                PlayerGameSessionProtocolException::class.java,
            ) {
                coordinator.submitBiddingAction(
                    session =
                        session,

                    action =
                        pass,
                )
            }

        assertEquals(
            "Le snapshot Atoutia ne correspond pas au joueur du salon.",
            error.message,
        )
    }

    private class RecordingGameApi(
        private val loadSnapshot:
            PlayerGameSnapshot =
            createGameSnapshot(
                player =
                    PlayerPosition.PLAYER_0,
            ),

        private val commandSnapshot:
            PlayerGameSnapshot =
            createGameSnapshot(
                player =
                    PlayerPosition.PLAYER_0,

                revision =
                    6,

                mode =
                    PlayerActionMode.WAIT,

                biddingActions =
                    emptyList(),
            ),
    ) : AtoutiaGameApi {
        var loadCalled:
            Boolean =
            false

        var loadSessionId:
            String? =
            null

        var loadAccessToken:
            String? =
            null

        var submitCalled:
            Boolean =
            false

        var submitSessionId:
            String? =
            null

        var submitExpectedRevision:
            Int? =
            null

        var submitEngineVersion:
            String? =
            null

        var submitCommand:
            PlayerGameCommand? =
            null

        var submitAccessToken:
            String? =
            null

        override fun getPlayerSnapshot(
            sessionId:
                String,

            accessToken:
                String,
        ): PlayerGameSnapshot {
            loadCalled =
                true

            loadSessionId =
                sessionId

            loadAccessToken =
                accessToken

            return loadSnapshot
        }

        override fun submitCommand(
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
        ): PlayerGameSnapshot {
            submitCalled =
                true

            submitSessionId =
                sessionId

            submitExpectedRevision =
                expectedRevision

            submitEngineVersion =
                engineVersion

            submitCommand =
                command

            submitAccessToken =
                accessToken

            return commandSnapshot
        }
    }

    private class FailingGameApi(
        private val failure:
            AtoutiaGameApiException,
    ) : AtoutiaGameApi {
        override fun getPlayerSnapshot(
            sessionId:
                String,

            accessToken:
                String,
        ): PlayerGameSnapshot {
            throw failure
        }

        override fun submitCommand(
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
        ): PlayerGameSnapshot {
            throw AssertionError(
                "Command must not be submitted.",
            )
        }
    }

    private companion object {
        fun createGameSnapshot(
            player:
                PlayerPosition,

            revision:
                Int = 5,

            phase:
                String = "IN_PROGRESS",

            matchPlayer:
                PlayerPosition = player,

            actionsPlayer:
                PlayerPosition = player,

            mode:
                PlayerActionMode =
                PlayerActionMode.BID,

            biddingActions:
                List<BiddingActionSnapshot> =
                listOf(
                    BiddingActionSnapshot.Pass(
                        player =
                            actionsPlayer,
                    ),

                    BiddingActionSnapshot.Take(
                        player =
                            actionsPlayer,

                        suit =
                            CardSuit.HEARTS,
                    ),
                ),

            biddingPlayer:
                PlayerPosition? =
                player,

            engineVersion:
                String = "0.1.0",
        ): PlayerGameSnapshot =
            PlayerGameSnapshot(
                revision =
                    revision,

                phase =
                    phase,

                document =
                    createDocument(
                        matchPlayer =
                            matchPlayer,

                        actionsPlayer =
                            actionsPlayer,

                        mode =
                            mode,

                        biddingActions =
                            biddingActions,

                        biddingPlayer =
                            biddingPlayer,

                        engineVersion =
                            engineVersion,
                    ),
            )

        fun createDocument(
            matchPlayer:
                PlayerPosition,

            actionsPlayer:
                PlayerPosition,

            mode:
                PlayerActionMode,

            biddingActions:
                List<BiddingActionSnapshot>,

            biddingPlayer:
                PlayerPosition?,

            engineVersion:
                String,
        ): PlayerClientSnapshotDocument =
            PlayerClientSnapshotDocument(
                formatVersion =
                    SUPPORTED_PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,

                engineVersion =
                    engineVersion,

                snapshot =
                    PlayerClientSnapshot(
                        match =
                            PlayerMatchSnapshot(
                                publicMatch =
                                    PublicMatchSnapshot(
                                        dealNumber =
                                            1,

                                        dealer =
                                            PlayerPosition.PLAYER_3,

                                        phase =
                                            DealPhase.BIDDING,

                                        score =
                                            PublicMatchScoreSnapshot(
                                                targetScore =
                                                    1000,

                                                scores =
                                                    TeamPointsSnapshot(
                                                        team0 =
                                                            0,

                                                        team1 =
                                                            0,
                                                    ),

                                                completed =
                                                    false,

                                                winner =
                                                    null,
                                            ),

                                        biddingPlayer =
                                            biddingPlayer,

                                        taker =
                                            null,

                                        trumpSuit =
                                            null,

                                        turnUpCard =
                                            PlayerCard(
                                                suit =
                                                    CardSuit.HEARTS,

                                                rank =
                                                    CardRank.JACK,
                                            ),

                                        currentTrick =
                                            null,
                                    ),

                                player =
                                    matchPlayer,

                                hand =
                                    listOf(
                                        PlayerCard(
                                            suit =
                                                CardSuit.CLUBS,

                                            rank =
                                                CardRank.ACE,
                                        ),

                                        PlayerCard(
                                            suit =
                                                CardSuit.DIAMONDS,

                                            rank =
                                                CardRank.KING,
                                        ),

                                        PlayerCard(
                                            suit =
                                                CardSuit.HEARTS,

                                            rank =
                                                CardRank.QUEEN,
                                        ),

                                        PlayerCard(
                                            suit =
                                                CardSuit.SPADES,

                                            rank =
                                                CardRank.TEN,
                                        ),

                                        PlayerCard(
                                            suit =
                                                CardSuit.CLUBS,

                                            rank =
                                                CardRank.NINE,
                                        ),
                                    ),

                                legalCards =
                                    emptyList(),
                            ),

                        actions =
                            PlayerAvailableActions(
                                player =
                                    actionsPlayer,

                                mode =
                                    mode,

                                biddingActions =
                                    biddingActions,

                                legalCards =
                                    emptyList(),
                            ),
                    ),
            )
    }
}