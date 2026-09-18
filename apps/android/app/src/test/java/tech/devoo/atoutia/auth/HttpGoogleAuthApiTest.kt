package tech.devoo.atoutia.auth

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.net.InetSocketAddress

class HttpGoogleAuthApiTest {
    @Test
    fun authenticatePostsGoogleIdTokenAndMapsCreatedSession() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/auth/google",
                    exchange.requestURI.path,
                )

                assertGoogleIdTokenRequest(
                    exchange =
                        exchange,

                    expectedIdToken =
                        "google-id-token",
                )

                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    body =
                        """
                        {
                          "token": "atk1_google-access",
                          "accessToken": "atk1_google-access",
                          "refreshToken": "art1_google-refresh",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": null
                          },
                          "accountCreated": true
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val result =
                    HttpGoogleAuthApi(
                        baseUrl,
                    ).authenticate(
                        "google-id-token",
                    )

                assertEquals(
                    AuthSessionTokens(
                        accountId =
                            "acc1_00000000000000000000000000000000",

                        sessionId =
                            "as1_00000000000000000000000000000000",

                        accessToken =
                            "atk1_google-access",

                        refreshToken =
                            "art1_google-refresh",

                        accessExpiresAtMs =
                            901_000L,
                    ),
                    result.session,
                )

                assertTrue(
                    result.accountCreated,
                )
            },
        )
    }

    @Test
    fun authenticateMapsExistingAccountResponse() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    body =
                        """
                        {
                          "token": "atk1_google-access",
                          "accessToken": "atk1_google-access",
                          "refreshToken": "art1_google-refresh",
                          "session": {
                            "sessionId": "as1_11111111111111111111111111111111",
                            "accountId": "acc1_11111111111111111111111111111111",
                            "createdAtMs": 2000,
                            "expiresAtMs": 902000,
                            "revokedAtMs": null
                          },
                          "accountCreated": false
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val result =
                    HttpGoogleAuthApi(
                        baseUrl,
                    ).authenticate(
                        "google-id-token",
                    )

                assertFalse(
                    result.accountCreated,
                )

                assertEquals(
                    "acc1_11111111111111111111111111111111",
                    result.session.accountId,
                )

                assertEquals(
                    "as1_11111111111111111111111111111111",
                    result.session.sessionId,
                )
            },
        )
    }

    @Test
    fun authenticateMapsUnauthorizedToRejectedException() {
        withServer(
            handler = {
                exchange ->
                assertGoogleIdTokenRequest(
                    exchange =
                        exchange,

                    expectedIdToken =
                        "invalid-google-id-token",
                )

                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        401,

                    body =
                        """
                        {
                          "error": "AUTH_PROVIDER_INVALID"
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                assertThrows(
                    GoogleAuthRejectedException::class.java,
                ) {
                    HttpGoogleAuthApi(
                        baseUrl,
                    ).authenticate(
                        "invalid-google-id-token",
                    )
                }
            },
        )
    }

    @Test
    fun authenticateMapsBadRequestToProtocolException() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        400,

                    body =
                        """
                        {
                          "error": "INVALID_REQUEST"
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                assertThrows(
                    GoogleAuthProtocolException::class.java,
                ) {
                    HttpGoogleAuthApi(
                        baseUrl,
                    ).authenticate(
                        "google-id-token",
                    )
                }
            },
        )
    }

    @Test
    fun authenticateMapsUnavailableProviderToUnavailableException() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        503,

                    body =
                        """
                        {
                          "error": "AUTH_PROVIDER_UNAVAILABLE"
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                assertThrows(
                    GoogleAuthUnavailableException::class.java,
                ) {
                    HttpGoogleAuthApi(
                        baseUrl,
                    ).authenticate(
                        "google-id-token",
                    )
                }
            },
        )
    }

    @Test
    fun authenticateTreatsUnexpectedServerStatusAsTransportFailure() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        500,

                    body =
                        """
                        {
                          "error": "INTERNAL_SERVER_ERROR"
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        IOException::class.java,
                    ) {
                        HttpGoogleAuthApi(
                            baseUrl,
                        ).authenticate(
                            "google-id-token",
                        )
                    }

                assertEquals(
                    "Unexpected Atoutia Google authentication response: HTTP 500.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun authenticateRejectsInvalidJson() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    contentType =
                        "application/json; charset=utf-8",

                    body =
                        "{not-valid-json",
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        GoogleAuthProtocolException::class.java,
                    ) {
                        HttpGoogleAuthApi(
                            baseUrl,
                        ).authenticate(
                            "google-id-token",
                        )
                    }

                assertEquals(
                    "Atoutia returned invalid Google authentication JSON.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun authenticateRejectsNonJsonSuccessResponse() {
        withServer(
            handler = {
                exchange ->
                respond(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    contentType =
                        "text/plain; charset=utf-8",

                    body =
                        "not-json",
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        GoogleAuthProtocolException::class.java,
                    ) {
                        HttpGoogleAuthApi(
                            baseUrl,
                        ).authenticate(
                            "google-id-token",
                        )
                    }

                assertEquals(
                    "Atoutia Google authentication response is not JSON.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun authenticateRejectsUnexpectedTopLevelFields() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    body =
                        """
                        {
                          "token": "atk1_google-access",
                          "accessToken": "atk1_google-access",
                          "refreshToken": "art1_google-refresh",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": null
                          },
                          "accountCreated": true,
                          "unexpected": true
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        GoogleAuthProtocolException::class.java,
                    ) {
                        HttpGoogleAuthApi(
                            baseUrl,
                        ).authenticate(
                            "google-id-token",
                        )
                    }

                assertEquals(
                    "Google authentication response has unexpected fields.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun authenticateRejectsUnexpectedSessionFields() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    body =
                        """
                        {
                          "token": "atk1_google-access",
                          "accessToken": "atk1_google-access",
                          "refreshToken": "art1_google-refresh",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": null,
                            "unexpected": true
                          },
                          "accountCreated": true
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        GoogleAuthProtocolException::class.java,
                    ) {
                        HttpGoogleAuthApi(
                            baseUrl,
                        ).authenticate(
                            "google-id-token",
                        )
                    }

                assertEquals(
                    "Google authentication session has unexpected fields.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun authenticateRejectsInconsistentAccessTokenAlias() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    body =
                        """
                        {
                          "token": "atk1_alias",
                          "accessToken": "atk1_access",
                          "refreshToken": "art1_google-refresh",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": null
                          },
                          "accountCreated": true
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        GoogleAuthProtocolException::class.java,
                    ) {
                        HttpGoogleAuthApi(
                            baseUrl,
                        ).authenticate(
                            "google-id-token",
                        )
                    }

                assertEquals(
                    "Atoutia Google authentication token alias does not match accessToken.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun authenticateRejectsRevokedSession() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        201,

                    body =
                        """
                        {
                          "token": "atk1_google-access",
                          "accessToken": "atk1_google-access",
                          "refreshToken": "art1_google-refresh",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": 2000
                          },
                          "accountCreated": true
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        GoogleAuthProtocolException::class.java,
                    ) {
                        HttpGoogleAuthApi(
                            baseUrl,
                        ).authenticate(
                            "google-id-token",
                        )
                    }

                assertEquals(
                    "Atoutia returned an already revoked Google authentication session.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun authenticateRejectsBlankGoogleIdTokenBeforeNetworkCall() {
        assertThrows(
            IllegalArgumentException::class.java,
        ) {
            HttpGoogleAuthApi(
                "http://127.0.0.1:65535",
            ).authenticate(
                "",
            )
        }
    }

    @Test
    fun authenticateRejectsGoogleIdTokenWithSurroundingWhitespace() {
        assertThrows(
            IllegalArgumentException::class.java,
        ) {
            HttpGoogleAuthApi(
                "http://127.0.0.1:65535",
            ).authenticate(
                " google-id-token ",
            )
        }
    }

    private fun assertGoogleIdTokenRequest(
        exchange:
            HttpExchange,

        expectedIdToken:
            String,
    ) {
        assertEquals(
            "application/json; charset=utf-8",
            exchange.requestHeaders
                .getFirst(
                    "Content-Type",
                ),
        )

        assertEquals(
            "application/json",
            exchange.requestHeaders
                .getFirst(
                    "Accept",
                ),
        )

        val body =
            exchange
                .requestBody
                .bufferedReader(
                    Charsets.UTF_8,
                )
                .use {
                    it.readText()
                }

        val json =
            JSONObject(
                body,
            )

        assertEquals(
            setOf(
                "idToken",
            ),
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
            },
        )

        assertEquals(
            expectedIdToken,
            json.getString(
                "idToken",
            ),
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
            block(
                "http://127.0.0.1:${server.address.port}",
            )
        } finally {
            server.stop(
                0,
            )
        }
    }

    private fun respondJson(
        exchange:
            HttpExchange,

        statusCode:
            Int,

        body:
            String,
    ) {
        respond(
            exchange =
                exchange,

            statusCode =
                statusCode,

            contentType =
                "application/json; charset=utf-8",

            body =
                body,
        )
    }

    private fun respond(
        exchange:
            HttpExchange,

        statusCode:
            Int,

        contentType:
            String,

        body:
            String,
    ) {
        val bytes =
            body.toByteArray(
                Charsets.UTF_8,
            )

        exchange.responseHeaders.add(
            "Content-Type",
            contentType,
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
}