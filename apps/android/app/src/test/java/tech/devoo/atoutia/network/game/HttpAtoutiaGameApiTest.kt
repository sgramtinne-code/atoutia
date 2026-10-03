package tech.devoo.atoutia.network.game

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tech.devoo.atoutia.network.room.PlayerPosition
import java.net.HttpURLConnection
import java.net.InetSocketAddress

class HttpAtoutiaGameApiTest {
    @Test
    fun readsAuthenticatedPlayerSnapshot() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom/snapshot",
                    exchange.requestURI.path,
                )

                assertEquals(
                    "Bearer atk1_snapshot_access_token",
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                val requestBody =
                    readRequestBody(
                        exchange,
                    )

                assertTrue(
                    requestBody.isBlank(),
                )

                assertFalse(
                    requestBody.contains(
                        "participantId",
                    ),
                )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        validSnapshotBody(),
                )
            },

            block = {
                baseUrl ->
                val document =
                    HttpAtoutiaGameApi(
                        baseUrl,
                    ).getPlayerSnapshot(
                        sessionId =
                            "ms1_testroom",

                        accessToken =
                            "atk1_snapshot_access_token",
                    )

                assertEquals(
                    1,
                    document.formatVersion,
                )

                assertEquals(
                    "0.1.0",
                    document.engineVersion,
                )

                assertEquals(
                    PlayerPosition.PLAYER_0,
                    document.snapshot.match.player,
                )

                assertEquals(
                    2,
                    document.snapshot.match.hand.size,
                )

                assertEquals(
                    CardSuit.HEARTS,
                    document.snapshot.match
                        .hand[0]
                        .suit,
                )

                assertEquals(
                    CardRank.ACE,
                    document.snapshot.match
                        .hand[0]
                        .rank,
                )

                assertTrue(
                    document.snapshot.match
                        .legalCards
                        .isEmpty(),
                )

                val publicMatch =
                    document.snapshot.match.publicMatch

                assertEquals(
                    1,
                    publicMatch.dealNumber,
                )

                assertEquals(
                    PlayerPosition.PLAYER_3,
                    publicMatch.dealer,
                )

                assertEquals(
                    DealPhase.BIDDING,
                    publicMatch.phase,
                )

                assertEquals(
                    1000,
                    publicMatch.score.targetScore,
                )

                assertEquals(
                    0,
                    publicMatch.score.scores.team0,
                )

                assertEquals(
                    0,
                    publicMatch.score.scores.team1,
                )

                assertFalse(
                    publicMatch.score.completed,
                )

                assertNull(
                    publicMatch.score.winner,
                )

                assertEquals(
                    PlayerPosition.PLAYER_0,
                    publicMatch.biddingPlayer,
                )

                assertNull(
                    publicMatch.taker,
                )

                assertNull(
                    publicMatch.trumpSuit,
                )

                assertEquals(
                    CardSuit.HEARTS,
                    publicMatch.turnUpCard.suit,
                )

                assertEquals(
                    CardRank.JACK,
                    publicMatch.turnUpCard.rank,
                )

                assertNull(
                    publicMatch.currentTrick,
                )

                val actions =
                    document.snapshot.actions

                assertEquals(
                    PlayerPosition.PLAYER_0,
                    actions.player,
                )

                assertEquals(
                    PlayerActionMode.BID,
                    actions.mode,
                )

                assertEquals(
                    2,
                    actions.biddingActions.size,
                )

                assertTrue(
                    actions.biddingActions[0] is
                        BiddingActionSnapshot.Pass,
                )

                assertEquals(
                    PlayerPosition.PLAYER_0,
                    actions.biddingActions[0].player,
                )

                val take =
                    actions.biddingActions[1] as
                        BiddingActionSnapshot.Take

                assertEquals(
                    PlayerPosition.PLAYER_0,
                    take.player,
                )

                assertEquals(
                    CardSuit.HEARTS,
                    take.suit,
                )

                assertTrue(
                    actions.legalCards.isEmpty(),
                )
            },
        )
    }

    @Test
    fun exposesStructuredAuthInvalidError() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom/snapshot",
                    exchange.requestURI.path,
                )

                assertEquals(
                    "Bearer atk1_expired_access_token",
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_UNAUTHORIZED,

                    body =
                        """
                        {
                          "error": "AUTH_INVALID"
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaGameApiException::class.java,
                    ) {
                        HttpAtoutiaGameApi(
                            baseUrl,
                        ).getPlayerSnapshot(
                            sessionId =
                                "ms1_testroom",

                            accessToken =
                                "atk1_expired_access_token",
                        )
                    }

                assertEquals(
                    "Atoutia game API returned HTTP 401.",
                    error.message,
                )

                assertEquals(
                    HttpURLConnection.HTTP_UNAUTHORIZED,
                    error.statusCode,
                )

                assertEquals(
                    "AUTH_INVALID",
                    error.errorCode,
                )
            },
        )
    }

    @Test
    fun rejectsUnexpectedRootKeys() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        """
                        {
                          "formatVersion": 1,
                          "engineVersion": "0.1.0",
                          "snapshot": {
                            "match": {
                              "public": {
                                "dealNumber": 1,
                                "dealer": "PLAYER_3",
                                "phase": "BIDDING",
                                "score": {
                                  "targetScore": 1000,
                                  "scores": {
                                    "TEAM_0": 0,
                                    "TEAM_1": 0
                                  },
                                  "completed": false,
                                  "winner": null
                                },
                                "biddingPlayer": "PLAYER_0",
                                "taker": null,
                                "trumpSuit": null,
                                "turnUpCard": {
                                  "suit": "HEARTS",
                                  "rank": "JACK"
                                },
                                "currentTrick": null
                              },
                              "player": "PLAYER_0",
                              "hand": [],
                              "legalCards": []
                            },
                            "actions": {
                              "player": "PLAYER_0",
                              "mode": "WAIT",
                              "biddingActions": [],
                              "legalCards": []
                            }
                          },
                          "extra": true
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaGameApiException::class.java,
                    ) {
                        HttpAtoutiaGameApi(
                            baseUrl,
                        ).getPlayerSnapshot(
                            sessionId =
                                "ms1_testroom",

                            accessToken =
                                "atk1_snapshot_access_token",
                        )
                    }

                assertEquals(
                    "Atoutia game API returned an unexpected player snapshot document.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsUnsupportedSnapshotFormatVersion() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        validSnapshotBody()
                            .replace(
                                "\"formatVersion\": 1",
                                "\"formatVersion\": 999",
                            ),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaGameApiException::class.java,
                    ) {
                        HttpAtoutiaGameApi(
                            baseUrl,
                        ).getPlayerSnapshot(
                            sessionId =
                                "ms1_testroom",

                            accessToken =
                                "atk1_snapshot_access_token",
                        )
                    }

                assertEquals(
                    "Atoutia game API returned an unsupported player snapshot format.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsUnsupportedCardSuit() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                json
                    .getJSONObject(
                        "snapshot",
                    )
                    .getJSONObject(
                        "match",
                    )
                    .getJSONObject(
                        "public",
                    )
                    .getJSONObject(
                        "turnUpCard",
                    )
                    .put(
                        "suit",
                        "STARS",
                    )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        json.toString(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaGameApiException::class.java,
                    ) {
                        HttpAtoutiaGameApi(
                            baseUrl,
                        ).getPlayerSnapshot(
                            sessionId =
                                "ms1_testroom",

                            accessToken =
                                "atk1_snapshot_access_token",
                        )
                    }

                assertEquals(
                    "Atoutia game API returned an unsupported card suit.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsPlayerIdentityMismatch() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                json
                    .getJSONObject(
                        "snapshot",
                    )
                    .getJSONObject(
                        "actions",
                    )
                    .put(
                        "player",
                        "PLAYER_1",
                    )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        json.toString(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AtoutiaGameApiException::class.java,
                    ) {
                        HttpAtoutiaGameApi(
                            baseUrl,
                        ).getPlayerSnapshot(
                            sessionId =
                                "ms1_testroom",

                            accessToken =
                                "atk1_snapshot_access_token",
                        )
                    }

                assertEquals(
                    "Atoutia game API returned inconsistent player identities.",
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
                HttpAtoutiaGameApi(
                    "http://127.0.0.1:1",
                ).getPlayerSnapshot(
                    sessionId =
                        "drupy",

                    accessToken =
                        "atk1_test",
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
                HttpAtoutiaGameApi(
                    "http://127.0.0.1:1",
                ).getPlayerSnapshot(
                    sessionId =
                        "ms1_testroom",

                    accessToken =
                        "invalid",
                )
            }

        assertEquals(
            "Invalid Atoutia access token.",
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
        exchange:
            HttpExchange,
    ): String =
        exchange
            .requestBody
            .bufferedReader(
                Charsets.UTF_8,
            )
            .use {
                it.readText()
            }

    private fun respond(
        exchange:
            HttpExchange,

        statusCode:
            Int,

        body:
            String,
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

    private fun validSnapshotBody():
        String =
        """
        {
          "formatVersion": 1,
          "engineVersion": "0.1.0",
          "snapshot": {
            "match": {
              "public": {
                "dealNumber": 1,
                "dealer": "PLAYER_3",
                "phase": "BIDDING",
                "score": {
                  "targetScore": 1000,
                  "scores": {
                    "TEAM_0": 0,
                    "TEAM_1": 0
                  },
                  "completed": false,
                  "winner": null
                },
                "biddingPlayer": "PLAYER_0",
                "taker": null,
                "trumpSuit": null,
                "turnUpCard": {
                  "suit": "HEARTS",
                  "rank": "JACK"
                },
                "currentTrick": null
              },
              "player": "PLAYER_0",
              "hand": [
                {
                  "suit": "HEARTS",
                  "rank": "ACE"
                },
                {
                  "suit": "CLUBS",
                  "rank": "SEVEN"
                }
              ],
              "legalCards": []
            },
            "actions": {
              "player": "PLAYER_0",
              "mode": "BID",
              "biddingActions": [
                {
                  "type": "PASS",
                  "player": "PLAYER_0"
                },
                {
                  "type": "TAKE",
                  "player": "PLAYER_0",
                  "suit": "HEARTS"
                }
              ],
              "legalCards": []
            }
          }
        }
        """.trimIndent()
}