package tech.devoo.atoutia.network.game

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.json.JSONArray
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
                val result =
                    HttpAtoutiaGameApi(
                        baseUrl,
                    ).getPlayerSnapshot(
                        sessionId =
                            "ms1_testroom",

                        accessToken =
                            "atk1_snapshot_access_token",
                    )

                assertEquals(
                    5,
                    result.revision,
                )

                assertEquals(
                    "IN_PROGRESS",
                    result.phase,
                )

                val document =
                    result.document

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
                    5,
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
                    document
                        .snapshot
                        .match
                        .publicMatch

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
    fun submitsAuthenticatedPassCommand() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom/commands",
                    exchange.requestURI.path,
                )

                assertEquals(
                    "Bearer atk1_command_access_token",
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                assertTrue(
                    exchange
                        .requestHeaders
                        .getFirst(
                            "Content-Type",
                        )
                        .startsWith(
                            "application/json",
                        ),
                )

                val requestBody =
                    readRequestBody(
                        exchange,
                    )

                val root =
                    JSONObject(
                        requestBody,
                    )

                assertEquals(
                    setOf(
                        "document",
                    ),
                    keysOf(
                        root,
                    ),
                )

                assertFalse(
                    root.has(
                        "participantId",
                    ),
                )

                val document =
                    root.getJSONObject(
                        "document",
                    )

                assertEquals(
                    setOf(
                        "formatVersion",
                        "engineVersion",
                        "sessionId",
                        "expectedRevision",
                        "command",
                    ),
                    keysOf(
                        document,
                    ),
                )

                assertEquals(
                    1,
                    document.getInt(
                        "formatVersion",
                    ),
                )

                assertEquals(
                    "0.1.0",
                    document.getString(
                        "engineVersion",
                    ),
                )

                assertEquals(
                    "ms1_testroom",
                    document.getString(
                        "sessionId",
                    ),
                )

                assertEquals(
                    5,
                    document.getInt(
                        "expectedRevision",
                    ),
                )

                assertFalse(
                    document.has(
                        "player",
                    ),
                )

                assertFalse(
                    document.has(
                        "participantId",
                    ),
                )

                val command =
                    document.getJSONObject(
                        "command",
                    )

                assertEquals(
                    setOf(
                        "type",
                    ),
                    keysOf(
                        command,
                    ),
                )

                assertEquals(
                    "PASS",
                    command.getString(
                        "type",
                    ),
                )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        waitingSnapshotBody(
                            revision =
                                6,

                            biddingPlayer =
                                "PLAYER_1",
                        ),
                )
            },
            block = {
                baseUrl ->
                val result =
                    HttpAtoutiaGameApi(
                        baseUrl,
                    ).submitCommand(
                        sessionId =
                            "ms1_testroom",

                        expectedRevision =
                            5,

                        engineVersion =
                            "0.1.0",

                        command =
                            PlayerGameCommand.Pass,

                        accessToken =
                            "atk1_command_access_token",
                    )

                assertEquals(
                    6,
                    result.revision,
                )

                assertEquals(
                    "IN_PROGRESS",
                    result.phase,
                )

                assertEquals(
                    PlayerActionMode.WAIT,
                    result
                        .document
                        .snapshot
                        .actions
                        .mode,
                )

                assertEquals(
                    PlayerPosition.PLAYER_1,
                    result
                        .document
                        .snapshot
                        .match
                        .publicMatch
                        .biddingPlayer,
                )
            },
        )
    }

    @Test
    fun submitsAuthenticatedTakeCommand() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/rooms/ms1_testroom/commands",
                    exchange.requestURI.path,
                )

                val root =
                    JSONObject(
                        readRequestBody(
                            exchange,
                        ),
                    )

                assertFalse(
                    root.has(
                        "participantId",
                    ),
                )

                val document =
                    root.getJSONObject(
                        "document",
                    )

                assertFalse(
                    document.has(
                        "player",
                    ),
                )

                assertFalse(
                    document.has(
                        "participantId",
                    ),
                )

                val command =
                    document.getJSONObject(
                        "command",
                    )

                assertEquals(
                    setOf(
                        "type",
                        "suit",
                    ),
                    keysOf(
                        command,
                    ),
                )

                assertEquals(
                    "TAKE",
                    command.getString(
                        "type",
                    ),
                )

                assertEquals(
                    "HEARTS",
                    command.getString(
                        "suit",
                    ),
                )

                assertFalse(
                    command.has(
                        "player",
                    ),
                )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        validSnapshotBody(
                            revision =
                                6,
                        ),
                )
            },
            block = {
                baseUrl ->
                val result =
                    HttpAtoutiaGameApi(
                        baseUrl,
                    ).submitCommand(
                        sessionId =
                            "ms1_testroom",

                        expectedRevision =
                            5,

                        engineVersion =
                            "0.1.0",

                        command =
                            PlayerGameCommand.Take(
                                suit =
                                    CardSuit.HEARTS,
                            ),

                        accessToken =
                            "atk1_command_access_token",
                    )

                assertEquals(
                    6,
                    result.revision,
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
    fun exposesStructuredRevisionMismatchFromCommand() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "/api/v1/rooms/ms1_testroom/commands",
                    exchange.requestURI.path,
                )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_CONFLICT,

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
                        AtoutiaGameApiException::class.java,
                    ) {
                        HttpAtoutiaGameApi(
                            baseUrl,
                        ).submitCommand(
                            sessionId =
                                "ms1_testroom",

                            expectedRevision =
                                5,

                            engineVersion =
                                "0.1.0",

                            command =
                                PlayerGameCommand.Pass,

                            accessToken =
                                "atk1_command_access_token",
                        )
                    }

                assertEquals(
                    "Atoutia game API returned HTTP 409.",
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
    fun rejectsUnexpectedRootKeys() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                json.put(
                    "extra",
                    true,
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
                    "Atoutia game API returned an unexpected live match snapshot document.",
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
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                json.put(
                    "formatVersion",
                    999,
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
                    "Atoutia game API returned an unsupported live match snapshot format.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsSnapshotForAnotherRoom() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                json.put(
                    "sessionId",
                    "ms1_anotherroom",
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
                    "Atoutia game API returned a snapshot for another room.",
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
                        "game",
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
    fun rejectsPlayerIdentityMismatchInsideGameSnapshot() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                json
                    .getJSONObject(
                        "game",
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
    fun rejectsRoomAndGamePlayerIdentityMismatch() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                json.put(
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
                    "Atoutia game API returned inconsistent room and game player identities.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsDuplicateSeatSnapshots() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validSnapshotBody(),
                    )

                val seats =
                    json.getJSONArray(
                        "seats",
                    )

                seats
                    .getJSONObject(
                        3,
                    )
                    .put(
                        "player",
                        "PLAYER_2",
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
                    "Atoutia game API returned duplicate player seat snapshots.",
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

    @Test
    fun rejectsNegativeExpectedRevisionBeforeNetworkCall() {
        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                HttpAtoutiaGameApi(
                    "http://127.0.0.1:1",
                ).submitCommand(
                    sessionId =
                        "ms1_testroom",

                    expectedRevision =
                        -1,

                    engineVersion =
                        "0.1.0",

                    command =
                        PlayerGameCommand.Pass,

                    accessToken =
                        "atk1_test",
                )
            }

        assertEquals(
            "Expected room revision must be non-negative.",
            error.message,
        )
    }

    @Test
    fun rejectsBlankEngineVersionBeforeNetworkCall() {
        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                HttpAtoutiaGameApi(
                    "http://127.0.0.1:1",
                ).submitCommand(
                    sessionId =
                        "ms1_testroom",

                    expectedRevision =
                        5,

                    engineVersion =
                        " ",

                    command =
                        PlayerGameCommand.Pass,

                    accessToken =
                        "atk1_test",
                )
            }

        assertEquals(
            "Atoutia engine version must not be blank.",
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
            output ->
            output.write(
                bytes,
            )
        }
    }

    private fun keysOf(
        json:
            JSONObject,
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

    private fun validSnapshotBody(
        revision:
            Int = 5,
    ): String =
        """
        {
          "formatVersion": 1,
          "engineVersion": "0.1.0",
          "sessionId": "ms1_testroom",
          "revision": $revision,
          "phase": "IN_PROGRESS",
          "player": "PLAYER_0",
          "seats": [
            {
              "player": "PLAYER_0",
              "occupied": true
            },
            {
              "player": "PLAYER_1",
              "occupied": true
            },
            {
              "player": "PLAYER_2",
              "occupied": true
            },
            {
              "player": "PLAYER_3",
              "occupied": true
            }
          ],
          "game": {
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
                },
                {
                  "suit": "DIAMONDS",
                  "rank": "KING"
                },
                {
                  "suit": "SPADES",
                  "rank": "NINE"
                },
                {
                  "suit": "HEARTS",
                  "rank": "EIGHT"
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

    private fun waitingSnapshotBody(
        revision:
            Int,

        biddingPlayer:
            String,
    ): String {
        val json =
            JSONObject(
                validSnapshotBody(
                    revision =
                        revision,
                ),
            )

        val game =
            json.getJSONObject(
                "game",
            )

        game
            .getJSONObject(
                "match",
            )
            .getJSONObject(
                "public",
            )
            .put(
                "biddingPlayer",
                biddingPlayer,
            )

        game
            .getJSONObject(
                "actions",
            )
            .put(
                "mode",
                "WAIT",
            )
            .put(
                "biddingActions",
                JSONArray(),
            )
            .put(
                "legalCards",
                JSONArray(),
            )

        return json.toString()
    }
}