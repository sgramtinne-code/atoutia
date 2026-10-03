package tech.devoo.atoutia.network.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tech.devoo.atoutia.network.room.PlayerPosition

class PlayerGameSessionCoordinatorTest {
    @Test
    fun loadsSnapshotForAuthenticatedPlayer() {
        val gameApi =
            RecordingGameApi(
                document =
                    createDocument(
                        player =
                            PlayerPosition.PLAYER_2,
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    gameApi,

                accessTokenProvider = {
                    "atk1_game_access_token"
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
            gameApi.receivedSessionId,
        )

        assertEquals(
            "atk1_game_access_token",
            gameApi.receivedAccessToken,
        )

        assertEquals(
            1,
            gameApi.callCount,
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
            PlayerPosition.PLAYER_2,
            session.document
                .snapshot
                .match
                .player,
        )
    }

    @Test
    fun rejectsMissingAuthenticatedSessionBeforeApiCall() {
        val gameApi =
            RecordingGameApi(
                document =
                    createDocument(
                        player =
                            PlayerPosition.PLAYER_0,
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    gameApi,

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

        assertEquals(
            0,
            gameApi.callCount,
        )
    }

    @Test
    fun rejectsSnapshotForDifferentMatchPlayer() {
        val document =
            createDocument(
                player =
                    PlayerPosition.PLAYER_1,
            )

        val gameApi =
            RecordingGameApi(
                document =
                    document.copy(
                        snapshot =
                            document.snapshot.copy(
                                match =
                                    document
                                        .snapshot
                                        .match
                                        .copy(
                                            player =
                                                PlayerPosition.PLAYER_3,
                                        ),
                            ),
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    gameApi,

                accessTokenProvider = {
                    "atk1_game_access_token"
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
                        PlayerPosition.PLAYER_1,
                )
            }

        assertEquals(
            "Le snapshot Atoutia ne correspond pas au joueur du salon.",
            error.message,
        )
    }

    @Test
    fun rejectsSnapshotForDifferentActionsPlayer() {
        val document =
            createDocument(
                player =
                    PlayerPosition.PLAYER_1,
            )

        val gameApi =
            RecordingGameApi(
                document =
                    document.copy(
                        snapshot =
                            document.snapshot.copy(
                                actions =
                                    document
                                        .snapshot
                                        .actions
                                        .copy(
                                            player =
                                                PlayerPosition.PLAYER_3,
                                        ),
                            ),
                    ),
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    gameApi,

                accessTokenProvider = {
                    "atk1_game_access_token"
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
                        PlayerPosition.PLAYER_1,
                )
            }

        assertEquals(
            "Le snapshot Atoutia ne correspond pas au joueur du salon.",
            error.message,
        )
    }

    @Test
    fun propagatesStructuredGameApiFailure() {
        val expectedError =
            AtoutiaGameApiException(
                message =
                    "Atoutia game API returned HTTP 401.",

                statusCode =
                    401,

                errorCode =
                    "AUTH_INVALID",
            )

        val gameApi =
            FailingGameApi(
                error =
                    expectedError,
            )

        val coordinator =
            PlayerGameSessionCoordinator(
                gameApi =
                    gameApi,

                accessTokenProvider = {
                    "atk1_expired_access_token"
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

        assertTrue(
            error ===
                expectedError,
        )

        assertEquals(
            "AUTH_INVALID",
            error.errorCode,
        )
    }

    private class RecordingGameApi(
        private val document:
            PlayerClientSnapshotDocument,
    ) : AtoutiaGameApi {
        var receivedSessionId:
            String? =
            null
            private set

        var receivedAccessToken:
            String? =
            null
            private set

        var callCount:
            Int =
            0
            private set

        override fun getPlayerSnapshot(
            sessionId:
                String,

            accessToken:
                String,
        ): PlayerClientSnapshotDocument {
            receivedSessionId =
                sessionId

            receivedAccessToken =
                accessToken

            callCount +=
                1

            return document
        }
    }

    private class FailingGameApi(
        private val error:
            AtoutiaGameApiException,
    ) : AtoutiaGameApi {
        override fun getPlayerSnapshot(
            sessionId:
                String,

            accessToken:
                String,
        ): PlayerClientSnapshotDocument {
            throw error
        }
    }

    private fun createDocument(
        player:
            PlayerPosition,
    ): PlayerClientSnapshotDocument =
        PlayerClientSnapshotDocument(
            formatVersion =
                SUPPORTED_PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,

            engineVersion =
                "0.1.0",

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
                                        player,

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
                                player,

                            hand =
                                listOf(
                                    PlayerCard(
                                        suit =
                                            CardSuit.HEARTS,

                                        rank =
                                            CardRank.ACE,
                                    ),

                                    PlayerCard(
                                        suit =
                                            CardSuit.CLUBS,

                                        rank =
                                            CardRank.SEVEN,
                                    ),
                                ),

                            legalCards =
                                emptyList(),
                        ),

                    actions =
                        PlayerAvailableActions(
                            player =
                                player,

                            mode =
                                PlayerActionMode.WAIT,

                            biddingActions =
                                emptyList(),

                            legalCards =
                                emptyList(),
                        ),
                ),
        )
}