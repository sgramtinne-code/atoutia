package tech.devoo.atoutia.network.room

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test

class RoomSessionLeaveTest {
    @Test
    fun leavesCurrentSeatUsingCurrentRoomRevision() {
        val initialRoom =
            room(
                revision = 2,
                occupiedSeats = 2,
                player0Occupied = true,
                player1Occupied = true,
            )

        val releasedRoom =
            room(
                revision = 3,
                occupiedSeats = 1,
                player0Occupied = true,
                player1Occupied = false,
            )

        val roomApi =
            FakeRoomApi(
                releaseRoom =
                    releasedRoom,
            )

        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    roomApi,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val result =
            coordinator.leaveRoom(
                RoomSessionMembership(
                    room =
                        initialRoom,

                    player =
                        PlayerPosition.PLAYER_1,
                ),
            )

        assertEquals(
            initialRoom.sessionId,
            roomApi.releaseSessionId,
        )

        assertEquals(
            PlayerPosition.PLAYER_1,
            roomApi.releasePlayer,
        )

        assertEquals(
            2,
            roomApi.releaseExpectedRevision,
        )

        assertEquals(
            "atk1_test",
            roomApi.releaseAccessToken,
        )

        assertEquals(
            3,
            result.revision,
        )

        assertFalse(
            result.seats.isOccupied(
                PlayerPosition.PLAYER_1,
            ),
        )
    }

    @Test
    fun leavingRequiresActiveAuthentication() {
        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    FakeRoomApi(),

                accessTokenProvider = {
                    null
                },
            )

        val error =
            assertThrows(
                RoomSessionUnavailableException::class.java,
            ) {
                coordinator.leaveRoom(
                    RoomSessionMembership(
                        room =
                            room(
                                revision = 1,
                                occupiedSeats = 1,
                                player0Occupied = true,
                            ),

                        player =
                            PlayerPosition.PLAYER_0,
                    ),
                )
            }

        assertEquals(
            "Aucune session Atoutia active.",
            error.message,
        )
    }

    @Test
    fun rejectsReleaseThatKeepsPlayersSeatOccupied() {
        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    FakeRoomApi(
                        releaseRoom =
                            room(
                                revision = 3,
                                occupiedSeats = 2,
                                player0Occupied = true,
                                player1Occupied = true,
                            ),
                    ),

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        assertThrows(
            RoomSessionProtocolException::class.java,
        ) {
            coordinator.leaveRoom(
                RoomSessionMembership(
                    room =
                        room(
                            revision = 2,
                            occupiedSeats = 2,
                            player0Occupied = true,
                            player1Occupied = true,
                        ),

                    player =
                        PlayerPosition.PLAYER_1,
                ),
            )
        }
    }

    @Test
    fun rejectsReleaseWithoutRevisionAdvance() {
        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    FakeRoomApi(
                        releaseRoom =
                            room(
                                revision = 2,
                                occupiedSeats = 1,
                                player0Occupied = true,
                                player1Occupied = false,
                            ),
                    ),

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val error =
            assertThrows(
                RoomSessionProtocolException::class.java,
            ) {
                coordinator.leaveRoom(
                    RoomSessionMembership(
                        room =
                            room(
                                revision = 2,
                                occupiedSeats = 2,
                                player0Occupied = true,
                                player1Occupied = true,
                            ),

                    player =
                        PlayerPosition.PLAYER_1,
                ),
            )
        }

        assertEquals(
            "La libération du siège Atoutia n’a pas avancé la révision du salon.",
            error.message,
        )
    }

    @Test
    fun rejectsReleaseThatChangesSessionId() {
        val coordinator =
            RoomSessionCoordinator(
                roomApi =
                    FakeRoomApi(
                        releaseRoom =
                            room(
                                sessionId =
                                    "ms1_other",

                                revision =
                                    3,

                                occupiedSeats =
                                    1,

                                player0Occupied =
                                    true,
                            ),
                    ),

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        assertThrows(
            RoomSessionProtocolException::class.java,
        ) {
            coordinator.leaveRoom(
                RoomSessionMembership(
                    room =
                        room(
                            revision =
                                2,

                            occupiedSeats =
                                2,

                            player0Occupied =
                                true,

                            player1Occupied =
                                true,
                        ),

                    player =
                        PlayerPosition.PLAYER_1,
                ),
            )
        }
    }

    private class FakeRoomApi(
        private val releaseRoom:
            LiveRoomSummary =
            room(
                revision = 2,
                occupiedSeats = 0,
                player0Occupied = false,
            ),
    ) : AtoutiaRoomApi {
        var releaseSessionId:
            String? =
            null

        var releasePlayer:
            PlayerPosition? =
            null

        var releaseExpectedRevision:
            Int? =
            null

        var releaseAccessToken:
            String? =
            null

        override fun createRoom(
            mode: MatchMode?,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()

        override fun getRoom(
            sessionId: String,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()

        override fun claimSeat(
            sessionId: String,
            player: PlayerPosition,
            expectedRevision: Int,
            accessToken: String,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()

        override fun releaseSeat(
            sessionId: String,
            player: PlayerPosition,
            expectedRevision: Int,
            accessToken: String,
        ): LiveRoomSummary {
            releaseSessionId =
                sessionId

            releasePlayer =
                player

            releaseExpectedRevision =
                expectedRevision

            releaseAccessToken =
                accessToken

            return releaseRoom
        }
    }

    private companion object {
        fun room(
            sessionId: String = "ms1_test",
            revision: Int,
            occupiedSeats: Int,
            player0Occupied: Boolean = false,
            player1Occupied: Boolean = false,
            player2Occupied: Boolean = false,
            player3Occupied: Boolean = false,
        ): LiveRoomSummary =
            LiveRoomSummary(
                sessionId =
                    sessionId,

                mode =
                    MatchMode.PRIVATE,

                revision =
                    revision,

                phase =
                    "WAITING_FOR_PLAYERS",

                occupiedSeats =
                    occupiedSeats,

                seats =
                    LiveRoomSeats(
                        player0 =
                            player0Occupied,

                        player1 =
                            player1Occupied,

                        player2 =
                            player2Occupied,

                        player3 =
                            player3Occupied,
                    ),

                adjudicationJson =
                    """
                    {
                      "formatVersion": 1,
                      "status": "ACTIVE",
                      "completion": null,
                      "completedAtMs": null
                    }
                    """.trimIndent(),
            )
    }
}