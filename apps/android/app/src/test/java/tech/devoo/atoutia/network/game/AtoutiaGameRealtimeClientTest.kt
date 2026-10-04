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

    private companion object {
        const val TEST_SESSION_ID =
            "ms1_0123456789abcdef0123456789abcdef"
    }
}