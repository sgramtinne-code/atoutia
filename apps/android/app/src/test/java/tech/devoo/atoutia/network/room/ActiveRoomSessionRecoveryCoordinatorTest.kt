package tech.devoo.atoutia.network.room

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import tech.devoo.atoutia.network.game.AtoutiaGameApi
import tech.devoo.atoutia.network.game.AtoutiaGameApiException
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.CardRank
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.DealPhase
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerAvailableActions
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.network.game.PlayerClientSnapshot
import tech.devoo.atoutia.network.game.PlayerClientSnapshotDocument
import tech.devoo.atoutia.network.game.PlayerGameCommand
import tech.devoo.atoutia.network.game.PlayerGameSessionCoordinator
import tech.devoo.atoutia.network.game.PlayerGameSnapshot
import tech.devoo.atoutia.network.game.PlayerMatchSnapshot
import tech.devoo.atoutia.network.game.PublicMatchScoreSnapshot
import tech.devoo.atoutia.network.game.PublicMatchSnapshot
import tech.devoo.atoutia.network.game.SUPPORTED_PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION
import tech.devoo.atoutia.network.game.TeamPointsSnapshot

class ActiveRoomSessionRecoveryCoordinatorTest {
    @Test
    fun returnsNoneWhenNoActiveRoomIsStored() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    null,
            )

        val roomApi =
            RecordingRoomApi()

        val gameApi =
            RecordingGameApi()

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertEquals(
            ActiveRoomSessionRecoveryResult.None,
            result,
        )

        assertFalse(
            roomApi.getCalled,
        )

        assertFalse(
            gameApi.getCalled,
        )

        assertEquals(
            0,
            store.clearCount,
        )
    }

    @Test
    fun clearsStoredRoomWhenItBelongsToAnotherAccount() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    reference(
                        accountId =
                            "acc1_other",
                    ),
            )

        val roomApi =
            RecordingRoomApi()

        val gameApi =
            RecordingGameApi()

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertEquals(
            ActiveRoomSessionRecoveryResult.None,
            result,
        )

        assertEquals(
            1,
            store.clearCount,
        )

        assertEquals(
            null,
            store.currentReference,
        )

        assertFalse(
            roomApi.getCalled,
        )

        assertFalse(
            gameApi.getCalled,
        )
    }

    @Test
    fun restoresWaitingRoomLobby() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    reference(
                        player =
                            PlayerPosition.PLAYER_2,
                    ),
            )

        val roomApi =
            RecordingRoomApi(
                room =
                    room(
                        phase =
                            "WAITING_FOR_PLAYERS",

                        occupiedPlayers =
                            setOf(
                                PlayerPosition.PLAYER_0,
                                PlayerPosition.PLAYER_2,
                            ),
                    ),
            )

        val gameApi =
            RecordingGameApi(
                snapshot =
                    gameSnapshot(
                        player =
                            PlayerPosition.PLAYER_2,

                        phase =
                            "WAITING_FOR_PLAYERS",
                    ),
            )

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertTrue(
            result is
                ActiveRoomSessionRecoveryResult.Lobby,
        )

        val lobby =
            result as
                ActiveRoomSessionRecoveryResult.Lobby

        assertEquals(
            SESSION_ID,
            lobby.membership
                .room
                .sessionId,
        )

        assertEquals(
            "WAITING_FOR_PLAYERS",
            lobby.membership
                .room
                .phase,
        )

        assertEquals(
            PlayerPosition.PLAYER_2,
            lobby.membership.player,
        )

        assertEquals(
            SESSION_ID,
            roomApi.lastSessionId,
        )

        assertEquals(
            SESSION_ID,
            gameApi.lastSessionId,
        )

        assertEquals(
            ACCESS_TOKEN,
            gameApi.lastAccessToken,
        )

        assertEquals(
            0,
            store.clearCount,
        )
    }

    @Test
    fun restoresReadyRoomLobby() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    reference(
                        player =
                            PlayerPosition.PLAYER_0,
                    ),
            )

        val roomApi =
            RecordingRoomApi(
                room =
                    room(
                        phase =
                            "READY",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    ),
            )

        val gameApi =
            RecordingGameApi(
                snapshot =
                    gameSnapshot(
                        player =
                            PlayerPosition.PLAYER_0,

                        phase =
                            "READY",
                    ),
            )

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertTrue(
            result is
                ActiveRoomSessionRecoveryResult.Lobby,
        )

        val lobby =
            result as
                ActiveRoomSessionRecoveryResult.Lobby

        assertEquals(
            "READY",
            lobby.membership
                .room
                .phase,
        )

        assertEquals(
            PlayerPosition.PLAYER_0,
            lobby.membership.player,
        )

        assertEquals(
            0,
            store.clearCount,
        )
    }

    @Test
    fun restoresGameWhenRoomIsInProgress() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    reference(
                        player =
                            PlayerPosition.PLAYER_1,
                    ),
            )

        val roomApi =
            RecordingRoomApi(
                room =
                    room(
                        phase =
                            "IN_PROGRESS",

                        revision =
                            42,

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    ),
            )

        val gameApi =
            RecordingGameApi(
                snapshot =
                    gameSnapshot(
                        player =
                            PlayerPosition.PLAYER_1,

                        phase =
                            "IN_PROGRESS",

                        revision =
                            42,
                    ),
            )

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertTrue(
            result is
                ActiveRoomSessionRecoveryResult.Game,
        )

        val game =
            result as
                ActiveRoomSessionRecoveryResult.Game

        assertEquals(
            SESSION_ID,
            game.session.sessionId,
        )

        assertEquals(
            PlayerPosition.PLAYER_1,
            game.session.player,
        )

        assertEquals(
            42,
            game.session.revision,
        )

        assertEquals(
            "IN_PROGRESS",
            game.session.phase,
        )

        assertEquals(
            0,
            store.clearCount,
        )
    }

    @Test
    fun clearsStoredRoomWhenMatchIsFinished() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    reference(
                        player =
                            PlayerPosition.PLAYER_3,
                    ),
            )

        val roomApi =
            RecordingRoomApi(
                room =
                    room(
                        phase =
                            "FINISHED",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    ),
            )

        val gameApi =
            RecordingGameApi(
                snapshot =
                    gameSnapshot(
                        player =
                            PlayerPosition.PLAYER_3,

                        phase =
                            "FINISHED",

                        completed =
                            true,
                    ),
            )

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertEquals(
            ActiveRoomSessionRecoveryResult.None,
            result,
        )

        assertEquals(
            1,
            store.clearCount,
        )

        assertEquals(
            null,
            store.currentReference,
        )
    }

    @Test
    fun clearsStoredRoomWhenServerRejectsParticipantSeat() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    reference(
                        player =
                            PlayerPosition.PLAYER_1,
                    ),
            )

        val roomApi =
            RecordingRoomApi(
                room =
                    room(
                        phase =
                            "IN_PROGRESS",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    ),
            )

        val gameApi =
            RecordingGameApi(
                failure =
                    AtoutiaGameApiException(
                        message =
                            "Atoutia game API returned HTTP 403.",

                        statusCode =
                            403,

                        errorCode =
                            "PARTICIPANT_FORBIDDEN",
                    ),
            )

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertEquals(
            ActiveRoomSessionRecoveryResult.None,
            result,
        )

        assertEquals(
            1,
            store.clearCount,
        )

        assertEquals(
            null,
            store.currentReference,
        )
    }

    @Test
    fun keepsStoredRoomWhenRoomCheckIsTemporarilyUnavailable() {
        val storedReference =
            reference(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    storedReference,
            )

        val roomApi =
            RecordingRoomApi(
                failure =
                    AtoutiaRoomApiException(
                        message =
                            "Unable to contact Atoutia room API.",
                    ),
            )

        val gameApi =
            RecordingGameApi()

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertTrue(
            result is
                ActiveRoomSessionRecoveryResult.Unavailable,
        )

        val unavailable =
            result as
                ActiveRoomSessionRecoveryResult.Unavailable

        assertEquals(
            "Impossible de vérifier la partie Atoutia enregistrée.",
            unavailable.message,
        )

        assertEquals(
            storedReference,
            store.currentReference,
        )

        assertEquals(
            0,
            store.clearCount,
        )

        assertFalse(
            gameApi.getCalled,
        )
    }

    @Test
    fun reportsExpiredAuthenticationWithoutDeletingStoredRoom() {
        val storedReference =
            reference(
                player =
                    PlayerPosition.PLAYER_0,
            )

        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    storedReference,
            )

        val roomApi =
            RecordingRoomApi(
                room =
                    room(
                        phase =
                            "IN_PROGRESS",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    ),
            )

        val gameApi =
            RecordingGameApi(
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

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertTrue(
            result is
                ActiveRoomSessionRecoveryResult.SessionExpired,
        )

        val expired =
            result as
                ActiveRoomSessionRecoveryResult.SessionExpired

        assertEquals(
            "La session Atoutia a expiré.",
            expired.message,
        )

        assertEquals(
            storedReference,
            store.currentReference,
        )

        assertEquals(
            0,
            store.clearCount,
        )
    }

    @Test
    fun clearsStoredRoomWhenServerSnapshotUsesDifferentPlayer() {
        val store =
            RecordingActiveRoomSessionStore(
                initialReference =
                    reference(
                        player =
                            PlayerPosition.PLAYER_0,
                    ),
            )

        val roomApi =
            RecordingRoomApi(
                room =
                    room(
                        phase =
                            "IN_PROGRESS",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    ),
            )

        val gameApi =
            RecordingGameApi(
                snapshot =
                    gameSnapshot(
                        player =
                            PlayerPosition.PLAYER_1,

                        phase =
                            "IN_PROGRESS",
                    ),
            )

        val result =
            createCoordinator(
                store =
                    store,

                roomApi =
                    roomApi,

                gameApi =
                    gameApi,
            )
                .restore(
                    accountId =
                        ACCOUNT_ID,
                )

        assertEquals(
            ActiveRoomSessionRecoveryResult.None,
            result,
        )

        assertEquals(
            1,
            store.clearCount,
        )
    }

    private fun createCoordinator(
        store:
            ActiveRoomSessionStore,

        roomApi:
            AtoutiaRoomApi,

        gameApi:
            AtoutiaGameApi,
    ):
        ActiveRoomSessionRecoveryCoordinator =
        ActiveRoomSessionRecoveryCoordinator(
            activeRoomSessionStore =
                store,

            roomApi =
                roomApi,

            gameSessionCoordinator =
                PlayerGameSessionCoordinator(
                    gameApi =
                        gameApi,

                    accessTokenProvider = {
                        ACCESS_TOKEN
                    },
                ),
        )

    private class RecordingActiveRoomSessionStore(
        initialReference:
            ActiveRoomSessionReference?,
    ) : ActiveRoomSessionStore {
        var currentReference:
            ActiveRoomSessionReference? =
            initialReference
            private set

        var clearCount:
            Int =
            0
            private set

        override fun save(
            reference:
                ActiveRoomSessionReference,
        ) {
            currentReference =
                reference
        }

        override fun load():
            ActiveRoomSessionReference? =
            currentReference

        override fun clear() {
            clearCount +=
                1

            currentReference =
                null
        }
    }

    private class RecordingRoomApi(
        private val room:
            LiveRoomSummary =
            room(),

        private val failure:
            AtoutiaRoomApiException? =
            null,
    ) : AtoutiaRoomApi {
        var getCalled:
            Boolean =
            false
            private set

        var lastSessionId:
            String? =
            null
            private set

        override fun createRoom(
            mode:
                MatchMode?,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()

        override fun getRoom(
            sessionId:
                String,
        ): LiveRoomSummary {
            getCalled =
                true

            lastSessionId =
                sessionId

            failure
                ?.let {
                    throw it
                }

            return room
        }

        override fun claimSeat(
            sessionId:
                String,

            player:
                PlayerPosition,

            expectedRevision:
                Int,

            accessToken:
                String,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()

        override fun releaseSeat(
            sessionId:
                String,

            player:
                PlayerPosition,

            expectedRevision:
                Int,

            accessToken:
                String,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()

        override fun startRoom(
            sessionId:
                String,

            expectedRevision:
                Int,

            accessToken:
                String,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()
    }

    private class RecordingGameApi(
        private val snapshot:
            PlayerGameSnapshot =
            gameSnapshot(
                player =
                    PlayerPosition.PLAYER_0,

                phase =
                    "IN_PROGRESS",
            ),

        private val failure:
            AtoutiaGameApiException? =
            null,
    ) : AtoutiaGameApi {
        var getCalled:
            Boolean =
            false
            private set

        var lastSessionId:
            String? =
            null
            private set

        var lastAccessToken:
            String? =
            null
            private set

        override fun getPlayerSnapshot(
            sessionId:
                String,

            accessToken:
                String,
        ): PlayerGameSnapshot {
            getCalled =
                true

            lastSessionId =
                sessionId

            lastAccessToken =
                accessToken

            failure
                ?.let {
                    throw it
                }

            return snapshot
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
        ): PlayerGameSnapshot =
            throw UnsupportedOperationException()
    }

    private companion object {
        const val ACCOUNT_ID =
            "acc1_test"

        const val ACCESS_TOKEN =
            "atk1_test"

        const val SESSION_ID =
            "ms1_0123456789abcdef0123456789abcdef"

        fun reference(
            accountId:
                String =
                ACCOUNT_ID,

            player:
                PlayerPosition =
                PlayerPosition.PLAYER_0,
        ):
            ActiveRoomSessionReference =
            ActiveRoomSessionReference(
                accountId =
                    accountId,

                sessionId =
                    SESSION_ID,

                player =
                    player,
            )

        fun room(
            phase:
                String =
                "IN_PROGRESS",

            revision:
                Int =
                5,

            occupiedPlayers:
                Set<PlayerPosition> =
                PlayerPosition
                    .entries
                    .toSet(),
        ):
            LiveRoomSummary {
            val seats =
                LiveRoomSeats(
                    player0 =
                        PlayerPosition.PLAYER_0 in
                            occupiedPlayers,

                    player1 =
                        PlayerPosition.PLAYER_1 in
                            occupiedPlayers,

                    player2 =
                        PlayerPosition.PLAYER_2 in
                            occupiedPlayers,

                    player3 =
                        PlayerPosition.PLAYER_3 in
                            occupiedPlayers,
                )

            return LiveRoomSummary(
                sessionId =
                    SESSION_ID,

                mode =
                    MatchMode.PRIVATE,

                revision =
                    revision,

                phase =
                    phase,

                occupiedSeats =
                    seats.occupiedCount,

                seats =
                    seats,

                adjudicationJson =
                    "{}",
            )
        }

        fun gameSnapshot(
            player:
                PlayerPosition,

            phase:
                String,

            revision:
                Int =
                5,

            completed:
                Boolean =
                false,
        ):
            PlayerGameSnapshot {
            val actionMode =
                if (
                    completed
                ) {
                    PlayerActionMode.MATCH_FINISHED
                } else {
                    PlayerActionMode.WAIT
                }

            val dealPhase =
                if (
                    completed
                ) {
                    DealPhase.FINISHED
                } else {
                    DealPhase.BIDDING
                }

            val card =
                PlayerCard(
                    suit =
                        CardSuit.HEARTS,

                    rank =
                        CardRank.JACK,
                )

            return PlayerGameSnapshot(
                revision =
                    revision,

                phase =
                    phase,

                document =
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
                                                    dealPhase,

                                                score =
                                                    PublicMatchScoreSnapshot(
                                                        targetScore =
                                                            1000,

                                                        scores =
                                                            TeamPointsSnapshot(
                                                                team0 =
                                                                    if (
                                                                        completed
                                                                    ) {
                                                                        1000
                                                                    } else {
                                                                        0
                                                                    },

                                                                team1 =
                                                                    0,
                                                            ),

                                                        completed =
                                                            completed,

                                                        winner =
                                                            null,
                                                    ),

                                                biddingPlayer =
                                                    if (
                                                        completed
                                                    ) {
                                                        null
                                                    } else {
                                                        PlayerPosition.PLAYER_0
                                                    },

                                                taker =
                                                    null,

                                                trumpSuit =
                                                    null,

                                                turnUpCard =
                                                    card,

                                                currentTrick =
                                                    null,
                                            ),

                                        player =
                                            player,

                                        hand =
                                            if (
                                                completed
                                            ) {
                                                emptyList()
                                            } else {
                                                listOf(
                                                    card,
                                                )
                                            },

                                        legalCards =
                                            emptyList(),
                                    ),

                                actions =
                                    PlayerAvailableActions(
                                        player =
                                            player,

                                        mode =
                                            actionMode,

                                        biddingActions =
                                            if (
                                                actionMode ==
                                                    PlayerActionMode.BID
                                            ) {
                                                listOf(
                                                    BiddingActionSnapshot.Pass(
                                                        player =
                                                            player,
                                                    ),
                                                )
                                            } else {
                                                emptyList()
                                            },

                                        legalCards =
                                            emptyList(),
                                    ),
                            ),
                    ),
            )
        }
    }
}