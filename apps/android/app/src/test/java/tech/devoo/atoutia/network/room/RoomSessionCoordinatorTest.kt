package tech.devoo.atoutia.network.room

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class RoomSessionCoordinatorTest {
    @Test
    fun createsPrivateRoomThenClaimsPlayerZero() {
        val calls =
            mutableListOf<
                String
            >()

        val api =
            RecordingRoomApi(
                onCreateRoom = {
                    mode ->
                    calls.add(
                        "create:$mode",
                    )

                    room(
                        sessionId =
                            "ms1_test_room",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            0,
                    )
                },

                onClaimSeat = {
                    sessionId,
                    player,
                    expectedRevision,
                    accessToken ->
                    calls.add(
                        "claim:$sessionId:$player:$expectedRevision:$accessToken",
                    )

                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            1,

                        occupiedPlayers =
                            setOf(
                                player,
                            ),
                    )
                },
            )

        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    api,

                accessTokenProvider = {
                    calls.add(
                        "token",
                    )

                    "atk1_test_access_token"
                },
            )

        val membership =
            coordinator
                .createPrivateRoomAndClaimHostSeat()

        assertEquals(
            listOf(
                "token",
                "create:PRIVATE",
                "claim:ms1_test_room:PLAYER_0:0:atk1_test_access_token",
            ),
            calls,
        )

        assertEquals(
            PlayerPosition.PLAYER_0,
            membership.player,
        )

        assertEquals(
            "ms1_test_room",
            membership.room.sessionId,
        )

        assertTrue(
            membership.room.seats.player0,
        )
    }

    @Test
    fun joinsRoomUsingFirstAvailableSeat() {
        val calls =
            mutableListOf<
                String
            >()

        val api =
            RecordingRoomApi(
                onGetRoom = {
                    sessionId ->
                    calls.add(
                        "get:$sessionId",
                    )

                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            4,

                        occupiedPlayers =
                            setOf(
                                PlayerPosition.PLAYER_0,
                                PlayerPosition.PLAYER_1,
                            ),
                    )
                },

                onClaimSeat = {
                    sessionId,
                    player,
                    expectedRevision,
                    accessToken ->
                    calls.add(
                        "claim:$sessionId:$player:$expectedRevision:$accessToken",
                    )

                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            5,

                        occupiedPlayers =
                            setOf(
                                PlayerPosition.PLAYER_0,
                                PlayerPosition.PLAYER_1,
                                player,
                            ),
                    )
                },
            )

        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    api,

                accessTokenProvider = {
                    calls.add(
                        "token",
                    )

                    "atk1_join_access_token"
                },
            )

        val membership =
            coordinator
                .joinRoomAndClaimFirstAvailableSeat(
                    "ms1_join_room",
                )

        assertEquals(
            listOf(
                "token",
                "get:ms1_join_room",
                "claim:ms1_join_room:PLAYER_2:4:atk1_join_access_token",
            ),
            calls,
        )

        assertEquals(
            PlayerPosition.PLAYER_2,
            membership.player,
        )

        assertEquals(
            3,
            membership.room.occupiedSeats,
        )

        assertTrue(
            membership.room.seats.player2,
        )
    }

    @Test
    fun joinChoosesPlayerZeroWhenRoomIsEmpty() {
        val api =
            RecordingRoomApi(
                onGetRoom = {
                    sessionId ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            0,
                    )
                },

                onClaimSeat = {
                    sessionId,
                    player,
                    _,
                    _ ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            1,

                        occupiedPlayers =
                            setOf(
                                player,
                            ),
                    )
                },
            )

        val membership =
            RoomSessionCoordinator(
                roomApi =
                    api,

                accessTokenProvider = {
                    "atk1_test"
                },
            )
                .joinRoomAndClaimFirstAvailableSeat(
                    "ms1_empty_room",
                )

        assertEquals(
            PlayerPosition.PLAYER_0,
            membership.player,
        )
    }

    @Test
    fun rejectsFullRoomBeforeClaimRequest() {
        var claimCalled =
            false

        val api =
            RecordingRoomApi(
                onGetRoom = {
                    sessionId ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            9,

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    )
                },

                onClaimSeat = {
                    _,
                    _,
                    _,
                    _ ->
                    claimCalled =
                        true

                    throw AssertionError(
                        "Claim must not be called for a full room.",
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionFullException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .joinRoomAndClaimFirstAvailableSeat(
                        "ms1_full_room",
                    )
            }

        assertEquals(
            "Cette partie Atoutia est complète.",
            error.message,
        )

        assertFalse(
            claimCalled,
        )
    }

    @Test
    fun doesNotCreateRoomWithoutActiveSession() {
        var createCalled =
            false

        val api =
            RecordingRoomApi(
                onCreateRoom = {
                    createCalled =
                        true

                    room(
                        sessionId =
                            "ms1_should_not_exist",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            0,
                    )
                },
            )

        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    api,

                accessTokenProvider = {
                    null
                },
            )

        val error =
            assertThrows(
                RoomSessionUnavailableException::class.java,
            ) {
                coordinator
                    .createPrivateRoomAndClaimHostSeat()
            }

        assertEquals(
            "Aucune session Atoutia active.",
            error.message,
        )

        assertFalse(
            createCalled,
        )
    }

    @Test
    fun doesNotReadJoinRoomWithoutActiveSession() {
        var getCalled =
            false

        val api =
            RecordingRoomApi(
                onGetRoom = {
                    getCalled =
                        true

                    throw AssertionError(
                        "Room must not be read without authentication.",
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionUnavailableException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        null
                    },
                )
                    .joinRoomAndClaimFirstAvailableSeat(
                        "ms1_test",
                    )
            }

        assertEquals(
            "Aucune session Atoutia active.",
            error.message,
        )

        assertFalse(
            getCalled,
        )
    }

    @Test
    fun usesCreatedRoomRevisionWhenClaimingHostSeat() {
        var claimedRevision:
            Int? =
            null

        val api =
            RecordingRoomApi(
                onCreateRoom = {
                    room(
                        sessionId =
                            "ms1_revision_test",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            7,
                    )
                },

                onClaimSeat = {
                    sessionId,
                    player,
                    expectedRevision,
                    _ ->
                    claimedRevision =
                        expectedRevision

                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            8,

                        occupiedPlayers =
                            setOf(
                                player,
                            ),
                    )
                },
            )

        RoomSessionCoordinator(
            roomApi =
                api,

            accessTokenProvider = {
                "atk1_revision_test"
            },
        )
            .createPrivateRoomAndClaimHostSeat()

        assertEquals(
            7,
            claimedRevision,
        )
    }

    @Test
    fun rejectsClaimResponseWithDifferentSessionId() {
        val api =
            RecordingRoomApi(
                onCreateRoom = {
                    room(
                        sessionId =
                            "ms1_original",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            0,
                    )
                },

                onClaimSeat = {
                    _,
                    player,
                    _,
                    _ ->
                    room(
                        sessionId =
                            "ms1_different",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            1,

                        occupiedPlayers =
                            setOf(
                                player,
                            ),
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .createPrivateRoomAndClaimHostSeat()
            }

        assertEquals(
            "La réponse Atoutia a changé l’identifiant du salon.",
            error.message,
        )
    }

    @Test
    fun rejectsClaimResponseWithDifferentMode() {
        val api =
            RecordingRoomApi(
                onGetRoom = {
                    sessionId ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            2,
                    )
                },

                onClaimSeat = {
                    sessionId,
                    player,
                    _,
                    _ ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.CASUAL,

                        revision =
                            3,

                        occupiedPlayers =
                            setOf(
                                player,
                            ),
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .joinRoomAndClaimFirstAvailableSeat(
                        "ms1_mode_test",
                    )
            }

        assertEquals(
            "La réponse Atoutia a changé le mode du salon.",
            error.message,
        )
    }

    @Test
    fun rejectsClaimResponseWithoutRequestedSeat() {
        val api =
            RecordingRoomApi(
                onGetRoom = {
                    sessionId ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            0,

                        occupiedPlayers =
                            setOf(
                                PlayerPosition.PLAYER_0,
                            ),
                    )
                },

                onClaimSeat = {
                    sessionId,
                    _,
                    _,
                    _ ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            1,

                        occupiedPlayers =
                            setOf(
                                PlayerPosition.PLAYER_0,
                            ),
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .joinRoomAndClaimFirstAvailableSeat(
                        "ms1_seat_test",
                    )
            }

        assertEquals(
            "Le siège Atoutia demandé n’a pas été réservé.",
            error.message,
        )
    }

    @Test
    fun startsReadyRoomUsingCurrentRevisionAndAccessToken() {
        val calls =
            mutableListOf<
                String
            >()

        val readyRoom =
            room(
                sessionId =
                    "ms1_start_test",

                mode =
                    MatchMode.PRIVATE,

                revision =
                    4,

                phase =
                    "READY",

                occupiedPlayers =
                    PlayerPosition
                        .entries
                        .toSet(),
            )

        val api =
            RecordingRoomApi(
                onStartRoom = {
                    sessionId,
                    expectedRevision,
                    accessToken ->
                    calls.add(
                        "start:$sessionId:$expectedRevision:$accessToken",
                    )

                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            5,

                        phase =
                            "IN_PROGRESS",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    )
                },
            )

        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    api,

                accessTokenProvider = {
                    calls.add(
                        "token",
                    )

                    "atk1_start_token"
                },
            )

        val result =
            coordinator.startRoom(
                RoomSessionMembership(
                    room =
                        readyRoom,

                    player =
                        PlayerPosition.PLAYER_0,
                ),
            )

        assertEquals(
            listOf(
                "token",
                "start:ms1_start_test:4:atk1_start_token",
            ),
            calls,
        )

        assertEquals(
            PlayerPosition.PLAYER_0,
            result.player,
        )

        assertEquals(
            5,
            result.room.revision,
        )

        assertEquals(
            "IN_PROGRESS",
            result.room.phase,
        )

        assertEquals(
            4,
            result.room.occupiedSeats,
        )
    }

    @Test
    fun doesNotStartRoomWithoutActiveSession() {
        var startCalled =
            false

        val api =
            RecordingRoomApi(
                onStartRoom = {
                    _,
                    _,
                    _ ->
                    startCalled =
                        true

                    throw AssertionError(
                        "Start must not be called without authentication.",
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionUnavailableException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        null
                    },
                )
                    .startRoom(
                        readyHostMembership(),
                    )
            }

        assertEquals(
            "Aucune session Atoutia active.",
            error.message,
        )

        assertFalse(
            startCalled,
        )
    }

    @Test
    fun rejectsNonHostBeforeStartRequest() {
        var startCalled =
            false

        val api =
            RecordingRoomApi(
                onStartRoom = {
                    _,
                    _,
                    _ ->
                    startCalled =
                        true

                    throw AssertionError(
                        "Start must not be called by a non-host player.",
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionStartUnavailableException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .startRoom(
                        RoomSessionMembership(
                            room =
                                room(
                                    sessionId =
                                        "ms1_non_host",

                                    mode =
                                        MatchMode.PRIVATE,

                                    revision =
                                        4,

                                    phase =
                                        "READY",

                                    occupiedPlayers =
                                        PlayerPosition
                                            .entries
                                            .toSet(),
                                ),

                            player =
                                PlayerPosition.PLAYER_1,
                        ),
                    )
            }

        assertEquals(
            "Seul l’hôte Atoutia peut démarrer la partie.",
            error.message,
        )

        assertFalse(
            startCalled,
        )
    }

    @Test
    fun rejectsRoomThatIsNotReadyBeforeStartRequest() {
        var startCalled =
            false

        val api =
            RecordingRoomApi(
                onStartRoom = {
                    _,
                    _,
                    _ ->
                    startCalled =
                        true

                    throw AssertionError(
                        "Start must not be called before the room is ready.",
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionStartUnavailableException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .startRoom(
                        RoomSessionMembership(
                            room =
                                room(
                                    sessionId =
                                        "ms1_not_ready",

                                    mode =
                                        MatchMode.PRIVATE,

                                    revision =
                                        3,

                                    phase =
                                        "WAITING_FOR_PLAYERS",

                                    occupiedPlayers =
                                        setOf(
                                            PlayerPosition.PLAYER_0,
                                            PlayerPosition.PLAYER_1,
                                            PlayerPosition.PLAYER_2,
                                        ),
                                ),

                            player =
                                PlayerPosition.PLAYER_0,
                        ),
                    )
            }

        assertEquals(
            "La partie Atoutia n’est pas prête à démarrer.",
            error.message,
        )

        assertFalse(
            startCalled,
        )
    }

    @Test
    fun rejectsReadyRoomWithoutFourPlayersBeforeStartRequest() {
        var startCalled =
            false

        val api =
            RecordingRoomApi(
                onStartRoom = {
                    _,
                    _,
                    _ ->
                    startCalled =
                        true

                    throw AssertionError(
                        "Start must not be called without four occupied seats.",
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionStartUnavailableException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .startRoom(
                        RoomSessionMembership(
                            room =
                                room(
                                    sessionId =
                                        "ms1_missing_player",

                                    mode =
                                        MatchMode.PRIVATE,

                                    revision =
                                        4,

                                    phase =
                                        "READY",

                                    occupiedPlayers =
                                        setOf(
                                            PlayerPosition.PLAYER_0,
                                            PlayerPosition.PLAYER_1,
                                            PlayerPosition.PLAYER_2,
                                        ),
                                ),

                            player =
                                PlayerPosition.PLAYER_0,
                        ),
                    )
            }

        assertEquals(
            "La partie Atoutia doit avoir quatre joueurs pour démarrer.",
            error.message,
        )

        assertFalse(
            startCalled,
        )
    }

    @Test
    fun rejectsStartResponseWithoutRevisionAdvance() {
        val api =
            RecordingRoomApi(
                onStartRoom = {
                    sessionId,
                    _,
                    _ ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            4,

                        phase =
                            "IN_PROGRESS",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .startRoom(
                        readyHostMembership(),
                    )
            }

        assertEquals(
            "Le démarrage Atoutia n’a pas avancé la révision du salon.",
            error.message,
        )
    }

    @Test
    fun rejectsStartResponseThatIsNotInProgress() {
        val api =
            RecordingRoomApi(
                onStartRoom = {
                    sessionId,
                    _,
                    _ ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            5,

                        phase =
                            "READY",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .startRoom(
                        readyHostMembership(),
                    )
            }

        assertEquals(
            "La partie Atoutia n’est pas passée en cours après le démarrage.",
            error.message,
        )
    }

    @Test
    fun rejectsStartResponseWithDifferentSessionId() {
        val api =
            RecordingRoomApi(
                onStartRoom = {
                    _,
                    _,
                    _ ->
                    room(
                        sessionId =
                            "ms1_other",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            5,

                        phase =
                            "IN_PROGRESS",

                        occupiedPlayers =
                            PlayerPosition
                                .entries
                                .toSet(),
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .startRoom(
                        readyHostMembership(),
                    )
            }

        assertEquals(
            "La réponse Atoutia a changé l’identifiant du salon pendant le démarrage.",
            error.message,
        )
    }

    @Test
    fun rejectsStartResponseThatLosesAPlayer() {
        val api =
            RecordingRoomApi(
                onStartRoom = {
                    sessionId,
                    _,
                    _ ->
                    room(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            5,

                        phase =
                            "IN_PROGRESS",

                        occupiedPlayers =
                            setOf(
                                PlayerPosition.PLAYER_0,
                                PlayerPosition.PLAYER_1,
                                PlayerPosition.PLAYER_2,
                            ),
                    )
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                RoomSessionCoordinator(
                    roomApi =
                        api,

                    accessTokenProvider = {
                        "atk1_test"
                    },
                )
                    .startRoom(
                        readyHostMembership(),
                    )
            }

        assertEquals(
            "La réponse Atoutia a perdu un joueur pendant le démarrage.",
            error.message,
        )
    }

    private fun readyHostMembership():
        RoomSessionMembership =
        RoomSessionMembership(
            room =
                room(
                    sessionId =
                        "ms1_start_test",

                    mode =
                        MatchMode.PRIVATE,

                    revision =
                        4,

                    phase =
                        "READY",

                    occupiedPlayers =
                        PlayerPosition
                            .entries
                            .toSet(),
                ),

            player =
                PlayerPosition.PLAYER_0,
        )

    private fun room(
        sessionId:
            String,

        mode:
            MatchMode,

        revision:
            Int,

        phase:
            String =
            "WAITING_FOR_PLAYERS",

        occupiedPlayers:
            Set<PlayerPosition> =
            emptySet(),
    ): LiveRoomSummary {
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
                sessionId,

            mode =
                mode,

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

    private class RecordingRoomApi(
        private val onCreateRoom:
            (
                MatchMode?,
            ) -> LiveRoomSummary = {
                throw UnsupportedOperationException()
            },

        private val onGetRoom:
            (
                String,
            ) -> LiveRoomSummary = {
                throw UnsupportedOperationException()
            },

        private val onClaimSeat:
            (
                String,
                PlayerPosition,
                Int,
                String,
            ) -> LiveRoomSummary = {
                _,
                _,
                _,
                _ ->
                throw UnsupportedOperationException()
            },

        private val onReleaseSeat:
            (
                String,
                PlayerPosition,
                Int,
                String,
            ) -> LiveRoomSummary = {
                _,
                _,
                _,
                _ ->
                throw UnsupportedOperationException()
            },

        private val onStartRoom:
            (
                String,
                Int,
                String,
            ) -> LiveRoomSummary = {
                _,
                _,
                _ ->
                throw UnsupportedOperationException()
            },
    ) : AtoutiaRoomApi {
        override fun createRoom(
            mode:
                MatchMode?,
        ): LiveRoomSummary =
            onCreateRoom(
                mode,
            )

        override fun getRoom(
            sessionId:
                String,
        ): LiveRoomSummary =
            onGetRoom(
                sessionId,
            )

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
            onClaimSeat(
                sessionId,
                player,
                expectedRevision,
                accessToken,
            )

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
            onReleaseSeat(
                sessionId,
                player,
                expectedRevision,
                accessToken,
            )

        override fun startRoom(
            sessionId:
                String,

            expectedRevision:
                Int,

            accessToken:
                String,
        ): LiveRoomSummary =
            onStartRoom(
                sessionId,
                expectedRevision,
                accessToken,
            )
    }
}