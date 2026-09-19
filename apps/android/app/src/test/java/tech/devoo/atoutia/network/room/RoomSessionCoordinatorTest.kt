package tech.devoo.atoutia.network.room

import org.junit.Assert.assertEquals
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

                    waitingRoom(
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

                    waitingRoom(
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

                    waitingRoom(
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

                    waitingRoom(
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
                    waitingRoom(
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
                    waitingRoom(
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
                    waitingRoom(
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

        assertEquals(
            false,
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

                    waitingRoom(
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

        assertEquals(
            false,
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

        assertEquals(
            false,
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
                    waitingRoom(
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

                    waitingRoom(
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
                    waitingRoom(
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
                    waitingRoom(
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
                    waitingRoom(
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
                    waitingRoom(
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
                    waitingRoom(
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
                    waitingRoom(
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

    private fun waitingRoom(
        sessionId:
            String,

        mode:
            MatchMode,

        revision:
            Int,

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
                "WAITING_FOR_PLAYERS",

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
    }
}