package tech.devoo.atoutia.network.game

import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tech.devoo.atoutia.network.room.MatchMode
import tech.devoo.atoutia.network.room.PlayerPosition
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class AtoutiaGameRealtimeClientTest {
    @Test
    fun connectsWithBearerAndSignalsOnlyNewRevisions() {
        val server =
            MockWebServer()

        val webSocketClient =
            OkHttpClient
                .Builder()
                .build()

        val serverSocket =
            AtomicReference<
                WebSocket?
            >(
                null,
            )

        val serverConnected =
            CountDownLatch(
                1,
            )

        val revisionLatch =
            CountDownLatch(
                2,
            )

        val revisions =
            CopyOnWriteArrayList<
                Int
            >()

        val connectionIssues =
            CopyOnWriteArrayList<
                String
            >()

        val serverListener =
            object :
                WebSocketListener() {
                override fun onOpen(
                    webSocket:
                        WebSocket,

                    response:
                        Response,
                ) {
                    serverSocket.set(
                        webSocket,
                    )

                    serverConnected.countDown()

                    webSocket.send(
                        snapshotMessage(
                            revision =
                                5,
                        ),
                    )

                    webSocket.send(
                        snapshotMessage(
                            revision =
                                6,
                        ),
                    )

                    webSocket.send(
                        snapshotMessage(
                            revision =
                                6,
                        ),
                    )

                    webSocket.send(
                        snapshotMessage(
                            revision =
                                4,
                        ),
                    )

                    webSocket.send(
                        snapshotMessage(
                            revision =
                                8,
                        ),
                    )
                }
            }

        server.start()

        server.enqueue(
            MockResponse
                .Builder()
                .webSocketUpgrade(
                    serverListener,
                )
                .build(),
        )

        val baseUrl =
            server
                .url(
                    "/",
                )
                .toString()
                .removeSuffix(
                    "/",
                )

        val client =
            AtoutiaGameRealtimeClient(
                baseUrl =
                    baseUrl,

                webSocketClient =
                    webSocketClient,
            )

        val subscription =
            client.subscribe(
                sessionId =
                    TEST_SESSION_ID,

                initialRevision =
                    5,

                accessTokenProvider = {
                    "atk1_realtime_test"
                },

                onRevisionAvailable = {
                    revision ->
                    revisions.add(
                        revision,
                    )

                    revisionLatch.countDown()
                },

                onConnectionIssue = {
                    message ->
                    connectionIssues.add(
                        message,
                    )
                },
            )

        try {
            assertTrue(
                "Le serveur WebSocket n’a pas accepté la connexion.",
                serverConnected.await(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            val request =
                server.takeRequest(
                    5,
                    TimeUnit.SECONDS,
                )

            assertNotNull(
                request,
            )

            requireNotNull(
                request,
            )

            assertEquals(
                "/ws",
                request.url.encodedPath,
            )

            assertEquals(
                TEST_SESSION_ID,
                request.url.queryParameter(
                    "sessionId",
                ),
            )

            assertEquals(
                "Bearer atk1_realtime_test",
                request.headers[
                    "Authorization"
                ],
            )

            assertTrue(
                "Le client n’a pas signalé les nouvelles révisions attendues.",
                revisionLatch.await(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertEquals(
                listOf(
                    6,
                    8,
                ),
                revisions.toList(),
            )

            assertTrue(
                connectionIssues.isEmpty(),
            )
        } finally {
            subscription.close()

            serverSocket
                .get()
                ?.close(
                    1000,
                    "test complete",
                )

            server.close()

            webSocketClient
                .dispatcher
                .executorService
                .shutdownNow()

            webSocketClient
                .connectionPool
                .evictAll()
        }
    }

    @Test
    fun signalsPresenceAndAdjudicationMessages() {
        val server =
            MockWebServer()

        val webSocketClient =
            OkHttpClient
                .Builder()
                .build()

        val serverSocket =
            AtomicReference<
                WebSocket?
            >(
                null,
            )

        val serverConnected =
            CountDownLatch(
                1,
            )

        val presenceLatch =
            CountDownLatch(
                1,
            )

        val adjudicationLatch =
            CountDownLatch(
                1,
            )

        val presences =
            CopyOnWriteArrayList<
                GameRealtimePresence
            >()

        val adjudications =
            CopyOnWriteArrayList<
                GameRealtimeAdjudicationEvent
            >()

        val connectionIssues =
            CopyOnWriteArrayList<
                String
            >()

        val serverListener =
            object :
                WebSocketListener() {
                override fun onOpen(
                    webSocket:
                        WebSocket,

                    response:
                        Response,
                ) {
                    serverSocket.set(
                        webSocket,
                    )

                    serverConnected.countDown()

                    webSocket.send(
                        presenceMessage(
                            sessionId =
                                TEST_SESSION_ID,
                        ),
                    )

                    webSocket.send(
                        forfeitAdjudicationMessage(
                            sessionId =
                                TEST_SESSION_ID,
                        ),
                    )
                }
            }

        server.start()

        server.enqueue(
            MockResponse
                .Builder()
                .webSocketUpgrade(
                    serverListener,
                )
                .build(),
        )

        val baseUrl =
            server
                .url(
                    "/",
                )
                .toString()
                .removeSuffix(
                    "/",
                )

        val client =
            AtoutiaGameRealtimeClient(
                baseUrl =
                    baseUrl,

                webSocketClient =
                    webSocketClient,
            )

        val subscription =
            client.subscribe(
                sessionId =
                    TEST_SESSION_ID,

                initialRevision =
                    5,

                accessTokenProvider = {
                    "atk1_presence_test"
                },

                onRevisionAvailable = {
                    Unit
                },

                onPresence = {
                    presence ->
                    presences.add(
                        presence,
                    )

                    presenceLatch.countDown()
                },

                onAdjudication = {
                    adjudication ->
                    adjudications.add(
                        adjudication,
                    )

                    adjudicationLatch.countDown()
                },

                onConnectionIssue = {
                    message ->
                    connectionIssues.add(
                        message,
                    )
                },
            )

        try {
            assertTrue(
                "Le serveur WebSocket n’a pas accepté la connexion.",
                serverConnected.await(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertTrue(
                "Le client n’a pas transmis le message PRESENCE.",
                presenceLatch.await(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertTrue(
                "Le client n’a pas transmis le message ADJUDICATION.",
                adjudicationLatch.await(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertEquals(
                1,
                presences.size,
            )

            val presence =
                presences.single()

            assertEquals(
                TEST_SESSION_ID,
                presence.sessionId,
            )

            assertEquals(
                GameRealtimePresencePlayer(
                    player =
                        PlayerPosition.PLAYER_1,

                    connected =
                        false,

                    lastSeenAtMs =
                        1000L,
                ),
                presence.players.single(),
            )

            assertEquals(
                GameRealtimeConnectionState(
                    player =
                        PlayerPosition.PLAYER_1,

                    state =
                        GameRealtimeConnectionStateName.RECONNECTING,

                    disconnectedAtMs =
                        900L,

                    graceDeadlineAtMs =
                        120900L,
                ),
                presence.connectionStates.single(),
            )

            assertEquals(
                GameRealtimeAbsencePlayer(
                    player =
                        PlayerPosition.PLAYER_1,

                    status =
                        GameRealtimeAbsenceStatus.NOT_ABSENT,

                    mode =
                        MatchMode.PRIVATE,

                    absentSinceMs =
                        null,

                    eligibleAtMs =
                        null,

                    remainingMs =
                        null,
                ),
                presence.absences.single(),
            )

            assertEquals(
                GameRealtimeAbsenceResolution(
                    player =
                        PlayerPosition.PLAYER_1,

                    action =
                        GameRealtimeAbsenceResolutionAction.NONE,

                    automatic =
                        false,
                ),
                presence.resolutions.single(),
            )

            assertEquals(
                1,
                adjudications.size,
            )

            val adjudication =
                adjudications.single()

            assertEquals(
                TEST_SESSION_ID,
                adjudication.sessionId,
            )

            assertEquals(
                GameRealtimeAdjudication.Forfeit(
                    forfeitingPlayer =
                        PlayerPosition.PLAYER_1,

                    losingTeam =
                        MatchTeam.TEAM_1,

                    winningTeam =
                        MatchTeam.TEAM_0,

                    completedAtMs =
                        123456L,
                ),
                adjudication.adjudication,
            )

            assertTrue(
                connectionIssues.isEmpty(),
            )
        } finally {
            subscription.close()

            serverSocket
                .get()
                ?.close(
                    1000,
                    "test complete",
                )

            server.close()

            webSocketClient
                .dispatcher
                .executorService
                .shutdownNow()

            webSocketClient
                .connectionPool
                .evictAll()
        }
    }

    @Test
    fun rejectsPresenceAndAdjudicationFromAnotherSession() {
        val server =
            MockWebServer()

        val webSocketClient =
            OkHttpClient
                .Builder()
                .build()

        val serverSocket =
            AtomicReference<
                WebSocket?
            >(
                null,
            )

        val serverConnected =
            CountDownLatch(
                1,
            )

        val issueLatch =
            CountDownLatch(
                2,
            )

        val presences =
            CopyOnWriteArrayList<
                GameRealtimePresence
            >()

        val adjudications =
            CopyOnWriteArrayList<
                GameRealtimeAdjudicationEvent
            >()

        val connectionIssues =
            CopyOnWriteArrayList<
                String
            >()

        val serverListener =
            object :
                WebSocketListener() {
                override fun onOpen(
                    webSocket:
                        WebSocket,

                    response:
                        Response,
                ) {
                    serverSocket.set(
                        webSocket,
                    )

                    serverConnected.countDown()

                    webSocket.send(
                        presenceMessage(
                            sessionId =
                                OTHER_SESSION_ID,
                        ),
                    )

                    webSocket.send(
                        activeAdjudicationMessage(
                            sessionId =
                                OTHER_SESSION_ID,
                        ),
                    )
                }
            }

        server.start()

        server.enqueue(
            MockResponse
                .Builder()
                .webSocketUpgrade(
                    serverListener,
                )
                .build(),
        )

        val baseUrl =
            server
                .url(
                    "/",
                )
                .toString()
                .removeSuffix(
                    "/",
                )

        val client =
            AtoutiaGameRealtimeClient(
                baseUrl =
                    baseUrl,

                webSocketClient =
                    webSocketClient,
            )

        val subscription =
            client.subscribe(
                sessionId =
                    TEST_SESSION_ID,

                initialRevision =
                    5,

                accessTokenProvider = {
                    "atk1_wrong_session_test"
                },

                onRevisionAvailable = {
                    Unit
                },

                onPresence = {
                    presence ->
                    presences.add(
                        presence,
                    )
                },

                onAdjudication = {
                    adjudication ->
                    adjudications.add(
                        adjudication,
                    )
                },

                onConnectionIssue = {
                    message ->
                    connectionIssues.add(
                        message,
                    )

                    issueLatch.countDown()
                },
            )

        try {
            assertTrue(
                "Le serveur WebSocket n’a pas accepté la connexion.",
                serverConnected.await(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertTrue(
                "Le client n’a pas rejeté les messages d’un autre salon.",
                issueLatch.await(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertTrue(
                presences.isEmpty(),
            )

            assertTrue(
                adjudications.isEmpty(),
            )

            assertEquals(
                listOf(
                    "Présence temps réel reçue pour un autre salon.",
                    "Adjudication temps réel reçue pour un autre salon.",
                ),
                connectionIssues.toList(),
            )
        } finally {
            subscription.close()

            serverSocket
                .get()
                ?.close(
                    1000,
                    "test complete",
                )

            server.close()

            webSocketClient
                .dispatcher
                .executorService
                .shutdownNow()

            webSocketClient
                .connectionPool
                .evictAll()
        }
    }

    @Test
    fun rejectsInvalidSessionIdentifierBeforeConnecting() {
        val client =
            AtoutiaGameRealtimeClient(
                baseUrl =
                    "http://127.0.0.1:3000",
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                client.subscribe(
                    sessionId =
                        "invalid-room",

                    initialRevision =
                        0,

                    accessTokenProvider = {
                        "atk1_test"
                    },

                    onRevisionAvailable = {
                        Unit
                    },
                )
            }

        assertEquals(
            "Atoutia realtime session identifier is invalid.",
            error.message,
        )
    }

    @Test
    fun rejectsNegativeInitialRevisionBeforeConnecting() {
        val client =
            AtoutiaGameRealtimeClient(
                baseUrl =
                    "http://127.0.0.1:3000",
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                client.subscribe(
                    sessionId =
                        TEST_SESSION_ID,

                    initialRevision =
                        -1,

                    accessTokenProvider = {
                        "atk1_test"
                    },

                    onRevisionAvailable = {
                        Unit
                    },
                )
            }

        assertEquals(
            "Atoutia realtime initial revision must not be negative.",
            error.message,
        )
    }

    private fun snapshotMessage(
        revision:
            Int,
    ): String =
        """
        {
          "protocolVersion": 1,
          "type": "SNAPSHOT",
          "snapshot": {
            "sessionId": "$TEST_SESSION_ID",
            "revision": $revision
          }
        }
        """.trimIndent()

    private fun presenceMessage(
        sessionId:
            String,
    ): String =
        """
        {
          "protocolVersion": 1,
          "type": "PRESENCE",
          "sessionId": "$sessionId",
          "players": [
            {
              "player": "PLAYER_1",
              "connected": false,
              "lastSeenAtMs": 1000
            }
          ],
          "connectionStates": [
            {
              "player": "PLAYER_1",
              "state": "RECONNECTING",
              "disconnectedAtMs": 900,
              "graceDeadlineAtMs": 120900
            }
          ],
          "absences": [
            {
              "player": "PLAYER_1",
              "status": "NOT_ABSENT",
              "mode": "PRIVATE",
              "absentSinceMs": null,
              "eligibleAtMs": null,
              "remainingMs": null
            }
          ],
          "resolutions": [
            {
              "player": "PLAYER_1",
              "action": "NONE",
              "automatic": false
            }
          ]
        }
        """.trimIndent()

    private fun activeAdjudicationMessage(
        sessionId:
            String,
    ): String =
        """
        {
          "protocolVersion": 1,
          "type": "ADJUDICATION",
          "sessionId": "$sessionId",
          "adjudication": {
            "formatVersion": 1,
            "status": "ACTIVE",
            "completion": null,
            "completedAtMs": null
          }
        }
        """.trimIndent()

    private fun forfeitAdjudicationMessage(
        sessionId:
            String,
    ): String =
        """
        {
          "protocolVersion": 1,
          "type": "ADJUDICATION",
          "sessionId": "$sessionId",
          "adjudication": {
            "formatVersion": 1,
            "status": "COMPLETED",
            "completion": "FORFEIT",
            "reason": "PLAYER_ABSENCE",
            "forfeitingPlayer": "PLAYER_1",
            "losingTeam": "TEAM_1",
            "winningTeam": "TEAM_0",
            "completedAtMs": 123456
          }
        }
        """.trimIndent()

    private companion object {
        const val TEST_SESSION_ID =
            "ms1_0123456789abcdef0123456789abcdef"

        const val OTHER_SESSION_ID =
            "ms1_fedcba9876543210fedcba9876543210"
    }
}