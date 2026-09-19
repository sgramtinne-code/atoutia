package tech.devoo.atoutia.network.room

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tech.devoo.atoutia.network.realtime.AtoutiaRealtimeApi
import tech.devoo.atoutia.network.realtime.AtoutiaRealtimeConnection
import tech.devoo.atoutia.network.realtime.RealtimeEvent

class RoomLobbyRealtimeCoordinatorTest {
    @Test
    fun connectsWithMembershipSessionAndAccessToken() {
        val roomApi =
            FakeRoomApi()

        val realtimeApi =
            FakeRealtimeApi()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi = roomApi,
                realtimeApi = realtimeApi,
                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val membership =
            membership(
                revision = 1,
                occupiedSeats = 1,
            )

        val listener =
            RecordingListener()

        coordinator.connect(
            membership = membership,
            listener = listener,
        )

        assertEquals(
            membership.room.sessionId,
            realtimeApi.sessionId,
        )

        assertEquals(
            "atk1_test",
            realtimeApi.accessToken,
        )
    }

    @Test
    fun rejectsConnectionWithoutActiveAccessToken() {
        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi =
                    FakeRoomApi(),

                realtimeApi =
                    FakeRealtimeApi(),

                accessTokenProvider = {
                    null
                },
            )

        val error =
            assertThrows(
                RoomLobbyRealtimeUnavailableException::class.java,
            ) {
                coordinator.connect(
                    membership =
                        membership(
                            revision = 1,
                            occupiedSeats = 1,
                        ),

                    listener =
                        RecordingListener(),
                )
            }

        assertEquals(
            "Aucune session Atoutia active pour le temps réel.",
            error.message,
        )
    }

    @Test
    fun newerSnapshotRefreshesRoomAndNotifiesListener() {
        val initialMembership =
            membership(
                revision = 1,
                occupiedSeats = 1,
            )

        val refreshedRoom =
            room(
                revision = 2,
                occupiedSeats = 2,
                player1Occupied = true,
            )

        val roomApi =
            FakeRoomApi(
                roomToReturn =
                    refreshedRoom,
            )

        val realtimeApi =
            FakeRealtimeApi()

        val listener =
            RecordingListener()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi = roomApi,
                realtimeApi = realtimeApi,
                accessTokenProvider = {
                    "atk1_test"
                },
            )

        coordinator.connect(
            membership =
                initialMembership,

            listener =
                listener,
        )

        realtimeApi.emit(
            RealtimeEvent.Snapshot(
                sessionId =
                    initialMembership
                        .room
                        .sessionId,

                revision =
                    2,
            ),
        )

        assertEquals(
            1,
            roomApi.getRoomCallCount,
        )

        assertEquals(
            1,
            listener.updatedMemberships.size,
        )

        assertEquals(
            2,
            listener.updatedMemberships
                .single()
                .room
                .revision,
        )

        assertEquals(
            2,
            listener.updatedMemberships
                .single()
                .room
                .occupiedSeats,
        )

        assertEquals(
            PlayerPosition.PLAYER_0,
            listener.updatedMemberships
                .single()
                .player,
        )
    }

    @Test
    fun sameRevisionSnapshotDoesNotRefreshRoom() {
        val initialMembership =
            membership(
                revision = 2,
                occupiedSeats = 2,
            )

        val roomApi =
            FakeRoomApi()

        val realtimeApi =
            FakeRealtimeApi()

        val listener =
            RecordingListener()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi = roomApi,
                realtimeApi = realtimeApi,
                accessTokenProvider = {
                    "atk1_test"
                },
            )

        coordinator.connect(
            membership =
                initialMembership,

            listener =
                listener,
        )

        realtimeApi.emit(
            RealtimeEvent.Snapshot(
                sessionId =
                    initialMembership
                        .room
                        .sessionId,

                revision =
                    2,
            ),
        )

        assertEquals(
            0,
            roomApi.getRoomCallCount,
        )

        assertTrue(
            listener.updatedMemberships.isEmpty(),
        )
    }

    @Test
    fun presenceDoesNotCauseHttpRoomRefresh() {
        val initialMembership =
            membership(
                revision = 1,
                occupiedSeats = 1,
            )

        val roomApi =
            FakeRoomApi()

        val realtimeApi =
            FakeRealtimeApi()

        val listener =
            RecordingListener()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi = roomApi,
                realtimeApi = realtimeApi,
                accessTokenProvider = {
                    "atk1_test"
                },
            )

        coordinator.connect(
            membership =
                initialMembership,

            listener =
                listener,
        )

        realtimeApi.emit(
            RealtimeEvent.Presence(
                sessionId =
                    initialMembership
                        .room
                        .sessionId,
            ),
        )

        assertEquals(
            0,
            roomApi.getRoomCallCount,
        )
    }

    @Test
    fun snapshotForAnotherRoomIsReportedAsFailure() {
        val initialMembership =
            membership(
                revision = 1,
                occupiedSeats = 1,
            )

        val realtimeApi =
            FakeRealtimeApi()

        val listener =
            RecordingListener()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi =
                    FakeRoomApi(),

                realtimeApi =
                    realtimeApi,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        coordinator.connect(
            membership =
                initialMembership,

            listener =
                listener,
        )

        realtimeApi.emit(
            RealtimeEvent.Snapshot(
                sessionId =
                    "ms1_other",

                revision =
                    2,
            ),
        )

        assertEquals(
            1,
            listener.failures.size,
        )

        assertTrue(
            listener.failures.single() is
                RoomLobbyRealtimeProtocolException,
        )
    }

    @Test
    fun refreshedRoomCannotLoseCurrentPlayersSeat() {
        val initialMembership =
            membership(
                revision = 1,
                occupiedSeats = 1,
            )

        val roomApi =
            FakeRoomApi(
                roomToReturn =
                    room(
                        revision = 2,
                        occupiedSeats = 1,
                        player0Occupied = false,
                        player1Occupied = true,
                    ),
            )

        val realtimeApi =
            FakeRealtimeApi()

        val listener =
            RecordingListener()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi = roomApi,
                realtimeApi = realtimeApi,
                accessTokenProvider = {
                    "atk1_test"
                },
            )

        coordinator.connect(
            membership =
                initialMembership,

            listener =
                listener,
        )

        realtimeApi.emit(
            RealtimeEvent.Snapshot(
                sessionId =
                    initialMembership
                        .room
                        .sessionId,

                revision =
                    2,
            ),
        )

        assertEquals(
            1,
            listener.failures.size,
        )

        assertTrue(
            listener.failures.single() is
                RoomLobbyRealtimeProtocolException,
        )

        assertTrue(
            listener.updatedMemberships.isEmpty(),
        )
    }

    @Test
    fun serverErrorIsForwarded() {
        val realtimeApi =
            FakeRealtimeApi()

        val listener =
            RecordingListener()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi =
                    FakeRoomApi(),

                realtimeApi =
                    realtimeApi,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        coordinator.connect(
            membership =
                membership(
                    revision = 1,
                    occupiedSeats = 1,
                ),

            listener =
                listener,
        )

        realtimeApi.emit(
            RealtimeEvent.ServerError(
                code =
                    "REVISION_MISMATCH",
            ),
        )

        assertEquals(
            listOf(
                "REVISION_MISMATCH",
            ),
            listener.serverErrors,
        )
    }

    @Test
    fun connectionCallbacksAreForwarded() {
        val realtimeApi =
            FakeRealtimeApi()

        val listener =
            RecordingListener()

        val coordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi =
                    FakeRoomApi(),

                realtimeApi =
                    realtimeApi,

                accessTokenProvider = {
                    "atk1_test"
                },
            )

        val connection =
            coordinator.connect(
                membership =
                    membership(
                        revision = 1,
                        occupiedSeats = 1,
                    ),

                listener =
                    listener,
            )

        realtimeApi.open()

        realtimeApi.disconnect(
            code = 1000,
            reason = "done",
        )

        val failure =
            IllegalStateException(
                "failure",
            )

        realtimeApi.fail(
            failure,
        )

        connection.close()

        assertTrue(
            listener.connected,
        )

        assertEquals(
            1000,
            listener.disconnectedCode,
        )

        assertEquals(
            "done",
            listener.disconnectedReason,
        )

        assertSame(
            failure,
            listener.failures.single(),
        )

        assertTrue(
            realtimeApi.connection.closed,
        )
    }

    private class FakeRoomApi(
        private val roomToReturn:
            LiveRoomSummary =
            room(
                revision = 1,
                occupiedSeats = 1,
            ),
    ) : AtoutiaRoomApi {
        var getRoomCallCount:
            Int =
            0

        override fun createRoom(
            mode: MatchMode?,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()

        override fun getRoom(
            sessionId: String,
        ): LiveRoomSummary {
            getRoomCallCount +=
                1

            return roomToReturn
        }

        override fun claimSeat(
            sessionId: String,
            player: PlayerPosition,
            expectedRevision: Int,
            accessToken: String,
        ): LiveRoomSummary =
            throw UnsupportedOperationException()
    }

    private class FakeRealtimeApi :
        AtoutiaRealtimeApi {
        var sessionId:
            String? =
            null

        var accessToken:
            String? =
            null

        var listener:
            AtoutiaRealtimeApi.Listener? =
            null

        val connection =
            FakeConnection()

        override fun connect(
            sessionId: String,
            accessToken: String,
            listener: AtoutiaRealtimeApi.Listener,
        ): AtoutiaRealtimeConnection {
            this.sessionId =
                sessionId

            this.accessToken =
                accessToken

            this.listener =
                listener

            return connection
        }

        fun open() {
            requireNotNull(
                listener,
            ).onConnected()
        }

        fun emit(
            event: RealtimeEvent,
        ) {
            requireNotNull(
                listener,
            ).onEvent(
                event,
            )
        }

        fun disconnect(
            code: Int,
            reason: String,
        ) {
            requireNotNull(
                listener,
            ).onDisconnected(
                code = code,
                reason = reason,
            )
        }

        fun fail(
            error: Throwable,
        ) {
            requireNotNull(
                listener,
            ).onFailure(
                error,
            )
        }
    }

    private class FakeConnection :
        AtoutiaRealtimeConnection {
        var closed:
            Boolean =
            false

        override fun close() {
            closed =
                true
        }
    }

    private class RecordingListener :
        RoomLobbyRealtimeCoordinator.Listener {
        var connected:
            Boolean =
            false

        val updatedMemberships =
            mutableListOf<
                RoomSessionMembership
            >()

        val serverErrors =
            mutableListOf<
                String
            >()

        var disconnectedCode:
            Int? =
            null

        var disconnectedReason:
            String? =
            null

        val failures =
            mutableListOf<
                Throwable
            >()

        override fun onConnected() {
            connected =
                true
        }

        override fun onRoomUpdated(
            membership: RoomSessionMembership,
        ) {
            updatedMemberships.add(
                membership,
            )
        }

        override fun onServerError(
            code: String,
        ) {
            serverErrors.add(
                code,
            )
        }

        override fun onDisconnected(
            code: Int,
            reason: String,
        ) {
            disconnectedCode =
                code

            disconnectedReason =
                reason
        }

        override fun onFailure(
            error: Throwable,
        ) {
            failures.add(
                error,
            )
        }
    }

    private companion object {
        fun membership(
            revision: Int,
            occupiedSeats: Int,
        ): RoomSessionMembership =
            RoomSessionMembership(
                room =
                    room(
                        revision =
                            revision,

                        occupiedSeats =
                            occupiedSeats,

                        player0Occupied =
                            occupiedSeats >= 1,

                        player1Occupied =
                            occupiedSeats >= 2,

                        player2Occupied =
                            occupiedSeats >= 3,

                        player3Occupied =
                            occupiedSeats >= 4,
                    ),

                player =
                    PlayerPosition.PLAYER_0,
            )

        fun room(
            revision: Int,
            occupiedSeats: Int,
            player0Occupied: Boolean = true,
            player1Occupied: Boolean = false,
            player2Occupied: Boolean = false,
            player3Occupied: Boolean = false,
        ): LiveRoomSummary =
            LiveRoomSummary(
                sessionId =
                    "ms1_test",

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