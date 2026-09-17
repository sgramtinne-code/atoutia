package tech.devoo.atoutia.auth

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.io.IOException
import java.net.InetSocketAddress

class HttpAuthSessionApiTest {
    @Test
    fun refreshMapsRotatedSessionAndAccessExpiration() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/auth/refresh",
                    exchange.requestURI.path,
                )

                assertRefreshTokenRequest(
                    exchange =
                        exchange,

                    expectedRefreshToken =
                        "art1_old",
                )

                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        200,

                    body =
                        """
                        {
                          "token": "atk1_new",
                          "accessToken": "atk1_new",
                          "refreshToken": "art1_new",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": null
                          }
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val result =
                    HttpAuthSessionApi(
                        baseUrl,
                    ).refresh(
                        "art1_old",
                    )

                assertEquals(
                    AuthSessionTokens(
                        accountId =
                            "acc1_00000000000000000000000000000000",

                        sessionId =
                            "as1_00000000000000000000000000000000",

                        accessToken =
                            "atk1_new",

                        refreshToken =
                            "art1_new",

                        accessExpiresAtMs =
                            901_000L,
                    ),
                    result,
                )
            },
        )
    }

    @Test
    fun refreshMapsUnauthorizedToRejectedException() {
        withServer(
            handler = {
                exchange ->
                assertRefreshTokenRequest(
                    exchange =
                        exchange,

                    expectedRefreshToken =
                        "art1_old",
                )

                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        401,

                    body =
                        """
                        {
                          "error": "AUTH_REFRESH_INVALID"
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                assertThrows(
                    AuthSessionRejectedException::class.java,
                ) {
                    HttpAuthSessionApi(
                        baseUrl,
                    ).refresh(
                        "art1_old",
                    )
                }
            },
        )
    }

    @Test
    fun refreshRejectsInconsistentTokenAlias() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        200,

                    body =
                        """
                        {
                          "token": "atk1_alias",
                          "accessToken": "atk1_access",
                          "refreshToken": "art1_new",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": null
                          }
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AuthSessionProtocolException::class.java,
                    ) {
                        HttpAuthSessionApi(
                            baseUrl,
                        ).refresh(
                            "art1_old",
                        )
                    }

                assertEquals(
                    "Atoutia backend returned inconsistent access tokens.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun refreshRejectsUnexpectedFields() {
        withServer(
            handler = {
                exchange ->
                respondJson(
                    exchange =
                        exchange,

                    statusCode =
                        200,

                    body =
                        """
                        {
                          "token": "atk1_new",
                          "accessToken": "atk1_new",
                          "refreshToken": "art1_new",
                          "session": {
                            "sessionId": "as1_00000000000000000000000000000000",
                            "accountId": "acc1_00000000000000000000000000000000",
                            "createdAtMs": 1000,
                            "expiresAtMs": 901000,
                            "revokedAtMs": null
                          },
                          "unexpected": true
                        }
                        """.trimIndent(),
                )
            },

            block = {
                baseUrl ->
                val error =
                    assertThrows(
                        AuthSessionProtocolException::class.java,
                    ) {
                        HttpAuthSessionApi(
                            baseUrl,
                        ).refresh(
                            "art1_old",
                        )
                    }

                assertEquals(
                    "Atoutia backend returned an unexpected refresh document.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun refreshTreatsServerFailureAsTransportFailure() {
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
                        HttpAuthSessionApi(
                            baseUrl,
                        ).refresh(
                            "art1_old",
                        )
                    }

                assertEquals(
                    "Atoutia authentication backend returned HTTP 503.",
                    error.message,
                )
            },
        )
    }

    @Test
    fun logoutPostsRefreshTokenAndAcceptsNoContent() {
        withServer(
            handler = {
                exchange ->
                assertEquals(
                    "POST",
                    exchange.requestMethod,
                )

                assertEquals(
                    "/api/v1/auth/logout",
                    exchange.requestURI.path,
                )

                assertRefreshTokenRequest(
                    exchange =
                        exchange,

                    expectedRefreshToken =
                        "art1_logout",
                )

                exchange.sendResponseHeaders(
                    204,
                    -1,
                )

                exchange.close()
            },

            block = {
                baseUrl ->
                HttpAuthSessionApi(
                    baseUrl,
                ).logout(
                    "art1_logout",
                )
            },
        )
    }

    @Test
    fun logoutRejectsUnexpectedHttpStatus() {
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
                        HttpAuthSessionApi(
                            baseUrl,
                        ).logout(
                            "art1_logout",
                        )
                    }

                assertEquals(
                    "Atoutia authentication backend returned HTTP 500.",
                    error.message,
                )
            },
        )
    }

    private fun assertRefreshTokenRequest(
        exchange:
            HttpExchange,

        expectedRefreshToken:
            String,
    ) {
        assertEquals(
            "application/json; charset=utf-8",
            exchange.requestHeaders
                .getFirst(
                    "Content-Type",
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
                "refreshToken",
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
            expectedRefreshToken,
            json.getString(
                "refreshToken",
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
}