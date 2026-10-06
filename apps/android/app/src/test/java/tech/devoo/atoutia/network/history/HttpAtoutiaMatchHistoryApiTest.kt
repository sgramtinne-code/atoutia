package tech.devoo.atoutia.network.history

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.HttpURLConnection
import java.net.InetSocketAddress

class HttpAtoutiaMatchHistoryApiTest {
    @Test
    fun readsAuthenticatedHistoryUsingDefaultLimit() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "GET",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/matches/history",
                    exchange.requestURI.path,
                )

                assertEquals(
                    "limit=20",
                    exchange.requestURI.rawQuery,
                )

                assertEquals(
                    "Bearer atk1_history_access_token",
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                assertEquals(
                    "application/json",
                    exchange.requestHeaders.getFirst(
                        "Accept",
                    ),
                )

                assertTrue(
                    readRequestBody(
                        exchange,
                    ).isBlank(),
                )

                respond(
                    exchange =
                        exchange,

                    statusCode =
                        HttpURLConnection.HTTP_OK,

                    body =
                        validHistoryBody(),
                )
            },
            block = {
                baseUrl ->
                val result =
                    HttpAtoutiaMatchHistoryApi(
                        baseUrl,
                    ).getHistory(
                        accessToken =
                            "atk1_history_access_token",
                    )

                assertEquals(
                    1,
                    result.formatVersion,
                )

                assertEquals(
                    2,
                    result.entries.size,
                )

                val normal =
                    result.entries[0]

                assertEquals(
                    1,
                    normal.formatVersion,
                )

                assertEquals(
                    "ms1_00000000000000000000000000000021",
                    normal.sessionId,
                )

                assertEquals(
                    MatchHistoryMode.CASUAL,
                    normal.mode,
                )

                assertEquals(
                    1_700_000_000_000L,
                    normal.completedAtMs,
                )

                assertEquals(
                    MatchHistoryCompletion.NORMAL,
                    normal.completion,
                )

                assertEquals(
                    MatchHistoryOutcome.WIN,
                    normal.outcome,
                )

                assertEquals(
                    1_000,
                    normal.score?.targetScore,
                )

                assertEquals(
                    1_025,
                    normal.score?.ownTeam,
                )

                assertEquals(
                    840,
                    normal.score?.opponentTeam,
                )

                assertNull(
                    normal.forfeit,
                )

                val forfeit =
                    result.entries[1]

                assertEquals(
                    "ms1_00000000000000000000000000000022",
                    forfeit.sessionId,
                )

                assertEquals(
                    MatchHistoryMode.RANKED,
                    forfeit.mode,
                )

                assertEquals(
                    1_700_000_100_000L,
                    forfeit.completedAtMs,
                )

                assertEquals(
                    MatchHistoryCompletion.FORFEIT,
                    forfeit.completion,
                )

                assertEquals(
                    MatchHistoryOutcome.LOSS,
                    forfeit.outcome,
                )

                assertNull(
                    forfeit.score,
                )

                assertEquals(
                    MatchHistoryForfeitReason.PLAYER_ABSENCE,
                    forfeit.forfeit?.reason,
                )

                assertEquals(
                    true,
                    forfeit.forfeit?.byOwnTeam,
                )

                assertEquals(
                    false,
                    forfeit.forfeit?.bySelf,
                )
            },
        )
    }

    @Test
    fun appliesExplicitHistoryLimit() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "GET",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/matches/history",
                    exchange.requestURI.path,
                )

                assertEquals(
                    "limit=1",
                    exchange.requestURI.rawQuery,
                )

                assertEquals(
                    "Bearer atk1_limit_access_token",
                    exchange.requestHeaders.getFirst(
                        "Authorization",
                    ),
                )

                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                val firstEntry =
                    json
                        .getJSONArray(
                            "entries",
                        )
                        .getJSONObject(
                            0,
                        )

                json.put(
                    "entries",
                    JSONArray()
                        .put(
                            firstEntry,
                        ),
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
                val result =
                    HttpAtoutiaMatchHistoryApi(
                        baseUrl,
                    ).getHistory(
                        accessToken =
                            "atk1_limit_access_token",

                        limit =
                            1,
                    )

                assertEquals(
                    1,
                    result.entries.size,
                )

                assertEquals(
                    "ms1_00000000000000000000000000000021",
                    result.entries[0].sessionId,
                )
            },
        )
    }

    @Test
    fun acceptsEmptyHistory() {
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
                          "entries": []
                        }
                        """.trimIndent(),
                )
            },
            block = {
                baseUrl ->
                val result =
                    HttpAtoutiaMatchHistoryApi(
                        baseUrl,
                    ).getHistory(
                        accessToken =
                            "atk1_empty_history_token",
                    )

                assertTrue(
                    result.entries.isEmpty(),
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
                    "Bearer atk1_expired_history_token",
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_expired_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned HTTP 401.",
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
    fun rejectsInvalidHistoryLimitsBeforeSendingRequest() {
        val api =
            HttpAtoutiaMatchHistoryApi(
                "http://127.0.0.1:1",
            )

        val zeroError =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                api.getHistory(
                    accessToken =
                        "atk1_limit_token",

                    limit =
                        0,
                )
            }

        assertEquals(
            "Atoutia match history limit must be between 1 and 100.",
            zeroError.message,
        )

        val tooLargeError =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                api.getHistory(
                    accessToken =
                        "atk1_limit_token",

                    limit =
                        101,
                )
            }

        assertEquals(
            "Atoutia match history limit must be between 1 and 100.",
            tooLargeError.message,
        )
    }

    @Test
    fun rejectsUnexpectedRootKeys() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json.put(
                    "participantId",
                    "must-not-be-exposed",
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned an unexpected history document.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsUnsupportedHistoryFormatVersion() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned an unsupported history format.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsUnsupportedEntryFormatVersion() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        0,
                    )
                    .put(
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned an unsupported history entry format.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsUnexpectedScoreKeys() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        0,
                    )
                    .getJSONObject(
                        "score",
                    )
                    .put(
                        "TEAM_0",
                        1_025,
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned an unexpected history score.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsNormalCompletionWithoutScore() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        0,
                    )
                    .put(
                        "score",
                        JSONObject.NULL,
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned inconsistent normal completion data.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsForfeitCompletionWithScore() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        1,
                    )
                    .put(
                        "score",
                        JSONObject()
                            .put(
                                "targetScore",
                                1_000,
                            )
                            .put(
                                "ownTeam",
                                500,
                            )
                            .put(
                                "opponentTeam",
                                600,
                            ),
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned inconsistent forfeit completion data.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsForfeitOutcomeInconsistentWithOwnTeam() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        1,
                    )
                    .put(
                        "outcome",
                        "WIN",
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned inconsistent forfeit outcome.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsSelfForfeitOutsideOwnTeam() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                val entry =
                    json
                        .getJSONArray(
                            "entries",
                        )
                        .getJSONObject(
                            1,
                        )

                entry.put(
                    "outcome",
                    "WIN",
                )

                entry
                    .getJSONObject(
                        "forfeit",
                    )
                    .put(
                        "byOwnTeam",
                        false,
                    )
                    .put(
                        "bySelf",
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned inconsistent forfeit metadata.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsNegativeCompletionTimestamp() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        0,
                    )
                    .put(
                        "completedAtMs",
                        -1,
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned an invalid completion timestamp.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun rejectsUnsupportedMatchMode() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        0,
                    )
                    .put(
                        "mode",
                        "TOURNAMENT",
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_history_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned an unsupported match mode.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun acceptsMaximumSafeIntegerCompletionTimestamp() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        0,
                    )
                    .put(
                        "completedAtMs",
                        9_007_199_254_740_991L,
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
                val result =
                    HttpAtoutiaMatchHistoryApi(
                        baseUrl,
                    ).getHistory(
                        accessToken =
                            "atk1_safe_integer_token",
                    )

                assertEquals(
                    9_007_199_254_740_991L,
                    result.entries[0].completedAtMs,
                )
            },
        )
    }

    @Test
    fun rejectsCompletionTimestampAboveMaximumSafeInteger() {
        withServer(
            handler = {
                exchange ->
                val json =
                    JSONObject(
                        validHistoryBody(),
                    )

                json
                    .getJSONArray(
                        "entries",
                    )
                    .getJSONObject(
                        0,
                    )
                    .put(
                        "completedAtMs",
                        9_007_199_254_740_992L,
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
                        AtoutiaMatchHistoryApiException::class.java,
                    ) {
                        HttpAtoutiaMatchHistoryApi(
                            baseUrl,
                        ).getHistory(
                            accessToken =
                                "atk1_unsafe_integer_token",
                        )
                    }

                assertEquals(
                    "Atoutia match history API returned an invalid long field.",
                    error.message,
                )
            },
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

    private fun validHistoryBody():
        String =
        """
        {
          "formatVersion": 1,
          "entries": [
            {
              "formatVersion": 1,
              "sessionId": "ms1_00000000000000000000000000000021",
              "mode": "CASUAL",
              "completedAtMs": 1700000000000,
              "completion": "NORMAL",
              "outcome": "WIN",
              "score": {
                "targetScore": 1000,
                "ownTeam": 1025,
                "opponentTeam": 840
              },
              "forfeit": null
            },
            {
              "formatVersion": 1,
              "sessionId": "ms1_00000000000000000000000000000022",
              "mode": "RANKED",
              "completedAtMs": 1700000100000,
              "completion": "FORFEIT",
              "outcome": "LOSS",
              "score": null,
              "forfeit": {
                "reason": "PLAYER_ABSENCE",
                "byOwnTeam": true,
                "bySelf": false
              }
            }
          ]
        }
        """.trimIndent()
}
