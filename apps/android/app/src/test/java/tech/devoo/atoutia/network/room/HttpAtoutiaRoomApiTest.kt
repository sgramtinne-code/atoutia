package tech.devoo.atoutia.network.room

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.HttpURLConnection
import java.net.InetSocketAddress

class HttpAtoutiaRoomApiTest {
    @Test
    fun createsCasualRoom() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms",
                    exchange.requestURI.path,
                )

                assertEquals(
                    null,
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                val requestJson =
                    JSONObject(
                        readRequestBody(
                            exchange,
                        ),
                    )

                assertEquals(
                    setOf(
                        "mode",
                    ),
                    jsonKeys(
                        requestJson,
                    ),
                )

                assertEquals(
                    "CASUAL",
                    requestJson.getString(
                        "mode",
                    ),
                )

                respondWithRoom(
                    exchange = exchange,
                    statusCode = 201,
                    revision = 0,
                    occupiedSeats = 0,
                )
            },
            block = {
                baseUrl ->
                val room =
                    HttpAtoutiaRoomApi(
                        baseUrl,
                    ).createRoom(
                        MatchMode.CASUAL,
                    )

                assertEquals(
                    "ms1_testroom",
                    room.sessionId,
                )

                assertEquals(
                    MatchMode.CASUAL,
                    room.mode,
                )

                assertEquals(
                    0,
                    room.revision,
                )

                assertEquals(
                    0,
                    room.occupiedSeats,
                )

                assertFalse(
                    room.seats.player0,
                )
            },
        )
    }

    @Test
    fun createsRoomWithoutExplicitMode() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                val requestJson =
                    JSONObject(
                        readRequestBody(
                            exchange,
                        ),
                    )

                assertTrue(
                    jsonKeys(
                        requestJson,
                    ).isEmpty(),
                )

                respondWithRoom(
                    exchange = exchange,
                    statusCode = 201,
                    revision = 0,
                    occupiedSeats = 0,
                )
            },
            block = {
                baseUrl ->
                HttpAtoutiaRoomApi(
                    baseUrl,
                ).createRoom()
            },
        )
    }

    @Test
    fun readsExistingRoom() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "GET",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom",
                    exchange.requestURI.path,
                )

                respondWithRoom(
                    exchange = exchange,
                    statusCode = 200,
                    revision = 3,
                    occupiedSeats = 1,
                    player0 = true,
                )
            },
            block = {
                baseUrl ->
                val room =
                    HttpAtoutiaRoomApi(
                        baseUrl,
                    ).getRoom(
                        "ms1_testroom",
                    )

                assertEquals(
                    3,
                    room.revision,
                )

                assertEquals(
                    1,
                    room.occupiedSeats,
                )

                assertTrue(
                    room.seats.isOccupied(
                        PlayerPosition.PLAYER_0,
                    ),
                )
            },
        )
    }

    @Test
    fun claimsSeatUsingBearerAccessToken() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom/seats",
                    exchange.requestURI.path,
                )

                assertEquals(
                    "Bearer atk1_test_access_token",
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                val requestJson =
                    JSONObject(
                        readRequestBody(
                            exchange,
                        ),
                    )

                assertEquals(
                    setOf(
                        "player",
                        "expectedRevision",
                    ),
                    jsonKeys(
                        requestJson,
                    ),
                )

                assertEquals(
                    "PLAYER_2",
                    requestJson.getString(
                        "player",
                    ),
                )

                assertEquals(
                    4,
                    requestJson.getInt(
                        "expectedRevision",
                    ),
                )

                assertFalse(
                    requestJson.has(
                        "participantId",
                    ),
                )

                respondWithRoom(
                    exchange = exchange,
                    statusCode = 200,
                    revision = 5,
                    occupiedSeats = 1,
                    player2 = true,
                )
            },
            block = {
                baseUrl ->
                val room =
                    HttpAtoutiaRoomApi(
                        baseUrl,
                    ).claimSeat(
                        sessionId =
                            "ms1_testroom",

                        player =
                            PlayerPosition.PLAYER_2,

                        expectedRevision =
                            4,

                        accessToken =
                            "atk1_test_access_token",
                    )

                assertEquals(
                    5,
                    room.revision,
                )

                assertTrue(
                    room.seats.player2,
                )
            },
        )
    }

    @Test
    fun startsRoomUsingBearerAccessTokenAndExpectedRevisionOnly() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom/start",
                    exchange.requestURI.path,
                )

                assertEquals(
                    "Bearer atk1_start_access_token",
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                val requestJson =
                    JSONObject(
                        readRequestBody(
                            exchange,
                        ),
                    )

                assertEquals(
                    setOf(
                        "expectedRevision",
                    ),
                    jsonKeys(
                        requestJson,
                    ),
                )

                assertEquals(
                    4,
                    requestJson.getInt(
                        "expectedRevision",
                    ),
                )

                assertFalse(
                    requestJson.has(
                        "participantId",
                    ),
                )

                respondWithRoom(
                    exchange = exchange,
                    statusCode = 200,
                    revision = 5,
                    occupiedSeats = 4,
                    phase = "IN_PROGRESS",
                    player0 = true,
                    player1 = true,
                    player2 = true,
                    player3 = true,
                )
            },
            block = {
                baseUrl ->
                val room =
                    HttpAtoutiaRoomApi(
                        baseUrl,
                    ).startRoom(
                        sessionId =
                            "ms1_testroom",

                        expectedRevision =
                            4,

                        accessToken =
                            "atk1_start_access_token",
                    )

                assertEquals(
                    5,
                    room.revision,
                )

                assertEquals(
                    "IN_PROGRESS",
                    room.phase,
                )

                assertEquals(
                    4,
                    room.occupiedSeats,
                )

                assertTrue(
                    room.seats.player0,
                )

                assertTrue(
                    room.seats.player1,
                )

                assertTrue(
                    room.seats.player2,
                )

                assertTrue(
                    room.seats.player3,
                )
            },
        )
    }

    @Test
    fun exposesStructuredRevisionMismatchFromStartRequest() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom/start",
                    exchange.requestURI.path,
                )

                respond(
                    exchange = exchange,
                    statusCode = 409,
                    body =
                        """
                        {
                          "error": "REVISION_MISMATCH"
                        }
                        """.trimIndent(),
                )
            },
            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaRoomApiException::class.java,
                    ) {
                        HttpAtoutiaRoomApi(
                            baseUrl,
                        ).startRoom(
                            sessionId =
                                "ms1_testroom",

                            expectedRevision =
                                4,

                            accessToken =
                                "atk1_start_access_token",
                        )
                    }

                assertEquals(
                    "Atoutia room API returned HTTP 409.",
                    error.message,
                )

                assertEquals(
                    HttpURLConnection.HTTP_CONFLICT,
                    error.statusCode,
                )

                assertEquals(
                    "REVISION_MISMATCH",
                    error.errorCode,
                )
            },
        )
    }

    @Test
    fun rejectsUnexpectedHttpStatus() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange = exchange,
                    statusCode = 404,
                    body =
                        """
                        {
                          "error": "ROOM_NOT_FOUND"
                        }
                        """.trimIndent(),
                )
            },
            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaRoomApiException::class.java,
                    ) {
                        HttpAtoutiaRoomApi(
                            baseUrl,
                        ).getRoom(
                            "ms1_missing",
                        )
                    }

                assertEquals(
                    "Atoutia room API returned HTTP 404.",
                    error.message,
                )

                assertEquals(
                    HttpURLConnection.HTTP_NOT_FOUND,
                    error.statusCode,
                )

                assertEquals(
                    "ROOM_NOT_FOUND",
                    error.errorCode,
                )
            },
        )
    }

    @Test
    fun missingStructuredErrorBodyKeepsErrorCodeNull() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange = exchange,
                    statusCode = 500,
                    body =
                        """
                        {
                          "message": "failure"
                        }
                        """.trimIndent(),
                )
            },
            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaRoomApiException::class.java,
                    ) {
                        HttpAtoutiaRoomApi(
                            baseUrl,
                        ).getRoom(
                            "ms1_testroom",
                        )
                    }

                assertEquals(
                    HttpURLConnection.HTTP_INTERNAL_ERROR,
                    error.statusCode,
                )

                assertNull(
                    error.errorCode,
                )
            },
        )
    }

    @Test
    fun rejectsUnexpectedRoomKeys() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange = exchange,
                    statusCode = 200,
                    body =
                        """
                        {
                          "sessionId": "ms1_testroom",
                          "mode": "CASUAL",
                          "revision": 0,
                          "phase": "WAITING",
                          "occupiedSeats": 0,
                          "seats": {
                            "PLAYER_0": false,
                            "PLAYER_1": false,
                            "PLAYER_2": false,
                            "PLAYER_3": false
                          },
                          "adjudication": {},
                          "extra": true
                        }
                        """.trimIndent(),
                )
            },
            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaRoomApiException::class.java,
                    ) {
                        HttpAtoutiaRoomApi(
                            baseUrl,
                        ).getRoom(
                            "ms1_testroom",
                        )
                    }

                assertEquals(
                    "Atoutia room API returned an unexpected room document.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsUnexpectedSeatKeys() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange = exchange,
                    statusCode = 200,
                    body =
                        """
                        {
                          "sessionId": "ms1_testroom",
                          "mode": "CASUAL",
                          "revision": 0,
                          "phase": "WAITING",
                          "occupiedSeats": 0,
                          "seats": {
                            "PLAYER_0": false,
                            "PLAYER_1": false,
                            "PLAYER_2": false
                          },
                          "adjudication": {}
                        }
                        """.trimIndent(),
                )
            },
            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaRoomApiException::class.java,
                    ) {
                        HttpAtoutiaRoomApi(
                            baseUrl,
                        ).getRoom(
                            "ms1_testroom",
                        )
                    }

                assertEquals(
                    "Atoutia room API returned an unexpected seat document.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsOccupiedSeatCountMismatch() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange = exchange,
                    statusCode = 200,
                    body =
                        """
                        {
                          "sessionId": "ms1_testroom",
                          "mode": "CASUAL",
                          "revision": 1,
                          "phase": "WAITING",
                          "occupiedSeats": 2,
                          "seats": {
                            "PLAYER_0": true,
                            "PLAYER_1": false,
                            "PLAYER_2": false,
                            "PLAYER_3": false
                          },
                          "adjudication": {}
                        }
                        """.trimIndent(),
                )
            },
            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaRoomApiException::class.java,
                    ) {
                        HttpAtoutiaRoomApi(
                            baseUrl,
                        ).getRoom(
                            "ms1_testroom",
                        )
                    }

                assertEquals(
                    "Atoutia room API returned an invalid room document.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsInvalidSessionIdBeforeNetworkCall() {
        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                HttpAtoutiaRoomApi(
                    "http://127.0.0.1:1",
                ).getRoom(
                    "drupy",
                )
            }

        assertEquals(
            "Invalid Atoutia room session ID.",
            error.message,
        )
    }

    @Test
    fun rejectsInvalidAccessTokenBeforeNetworkCall() {
        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                HttpAtoutiaRoomApi(
                    "http://127.0.0.1:1",
                ).claimSeat(
                    sessionId =
                        "ms1_testroom",

                    player =
                        PlayerPosition.PLAYER_0,

                    expectedRevision =
                        0,

                    accessToken =
                        "invalid",
                )
            }

        assertEquals(
            "Invalid Atoutia access token.",
            error.message,
        )
    }

    @Test
    fun rejectsNegativeStartRevisionBeforeNetworkCall() {
        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                HttpAtoutiaRoomApi(
                    "http://127.0.0.1:1",
                ).startRoom(
                    sessionId =
                        "ms1_testroom",

                    expectedRevision =
                        -1,

                    accessToken =
                        "atk1_test",
                )
            }

        assertEquals(
            "Expected room revision must be non-negative.",
            error.message,
        )
    }

    private fun withServer(
        handler:
            (
                HttpExchange,
            ) -> Unit,
        block:
            (
                String,
            ) -> Unit,
    ) {
        val server =
            HttpServer.create(
                InetSocketAddress(
                    "127.0.0.1",
                    0,
                ),
                0,
            )

        server.createContext(
            "/",
        ) {
            exchange ->
            handler(
                exchange,
            )
        }

        server.start()

        try {
            val port =
                server.address.port

            block(
                "http://127.0.0.1:$port",
            )
        } finally {
            server.stop(
                0,
            )
        }
    }

    private fun readRequestBody(
        exchange: HttpExchange,
    ): String =
        exchange
            .requestBody
            .bufferedReader(
                Charsets.UTF_8,
            )
            .use {
                it.readText()
            }

    private fun respondWithRoom(
        exchange: HttpExchange,
        statusCode: Int,
        revision: Int,
        occupiedSeats: Int,
        phase: String = "WAITING",
        player0: Boolean = false,
        player1: Boolean = false,
        player2: Boolean = false,
        player3: Boolean = false,
    ) {
        respond(
            exchange = exchange,
            statusCode = statusCode,
            body =
                """
                {
                  "sessionId": "ms1_testroom",
                  "mode": "CASUAL",
                  "revision": $revision,
                  "phase": "$phase",
                  "occupiedSeats": $occupiedSeats,
                  "seats": {
                    "PLAYER_0": $player0,
                    "PLAYER_1": $player1,
                    "PLAYER_2": $player2,
                    "PLAYER_3": $player3
                  },
                  "adjudication": {}
                }
                """.trimIndent(),
        )
    }

    private fun respond(
        exchange: HttpExchange,
        statusCode: Int,
        body: String,
    ) {
        val bytes =
            body.toByteArray(
                Charsets.UTF_8,
            )

        exchange.responseHeaders.add(
            "Content-Type",
            "application/json; charset=utf-8",
        )

        exchange.sendResponseHeaders(
            statusCode,
            bytes.size.toLong(),
        )

        exchange.responseBody.use {
            it.write(
                bytes,
            )
        }
    }

    private fun jsonKeys(
        json: JSONObject,
    ): Set<String> =
        buildSet {
            val iterator =
                json.keys()

            while (
                iterator.hasNext()
            ) {
                add(
                    iterator.next(),
                )
            }
        }
}