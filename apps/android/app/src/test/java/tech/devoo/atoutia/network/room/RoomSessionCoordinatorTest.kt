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

                        player0 =
                            false,
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

                        player0 =
                            true,
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

        val room =
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
            "ms1_test_room",
            room.sessionId,
        )

        assertEquals(
            MatchMode.PRIVATE,
            room.mode,
        )

        assertEquals(
            1,
            room.revision,
        )

        assertTrue(
            room.seats.player0,
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

                        player0 =
                            false,
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
    fun usesCreatedRoomRevisionWhenClaimingHostSeat() {
        var claimedSessionId:
            String? =
            null

        var claimedPlayer:
            PlayerPosition? =
            null

        var claimedRevision:
            Int? =
            null

        var claimedAccessToken:
            String? =
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

                        player0 =
                            false,
                    )
                },

                onClaimSeat = {
                    sessionId,
                    player,
                    expectedRevision,
                    accessToken ->
                    claimedSessionId =
                        sessionId

                    claimedPlayer =
                        player

                    claimedRevision =
                        expectedRevision

                    claimedAccessToken =
                        accessToken

                    waitingRoom(
                        sessionId =
                            sessionId,

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            8,

                        player0 =
                            true,
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
            "ms1_revision_test",
            claimedSessionId,
        )

        assertEquals(
            PlayerPosition.PLAYER_0,
            claimedPlayer,
        )

        assertEquals(
            7,
            claimedRevision,
        )

        assertEquals(
            "atk1_revision_test",
            claimedAccessToken,
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

                        player0 =
                            false,
                    )
                },

                onClaimSeat = {
                    _,
                    _,
                    _,
                    _ ->
                    waitingRoom(
                        sessionId =
                            "ms1_different",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            1,

                        player0 =
                            true,
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
    fun rejectsClaimResponseWithoutHostSeat() {
        val api =
            RecordingRoomApi(
                onCreateRoom = {
                    waitingRoom(
                        sessionId =
                            "ms1_host_test",

                        mode =
                            MatchMode.PRIVATE,

                        revision =
                            0,

                        player0 =
                            false,
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

                        player0 =
                            false,
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
            "Le siège hôte Atoutia n’a pas été réservé.",
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

        player0:
            Boolean,
    ): LiveRoomSummary {
        val seats =
            LiveRoomSeats(
                player0 =
                    player0,

                player1 =
                    false,

                player2 =
                    false,

                player3 =
                    false,
            )

        return LiveRoomSummary(
            sessionId =
                sessionId,

            mode =
                mode,

            revision =
                revision,

            phase =
                "WAITING",

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
            ) -> LiveRoomSummary,

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