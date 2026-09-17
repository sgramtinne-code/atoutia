package tech.devoo.atoutia.auth

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import tech.devoo.atoutia.BuildConfig
import java.net.HttpURLConnection
import java.net.URI

class HttpAuthSessionApiInstrumentedTest {
    @Test
    fun realBackendRefreshReplayAndLogoutFlow() {
        val bootstrap =
            LocalBootstrapClient(
                BuildConfig.ATOUTIA_API_BASE_URL,
            )

        val accountId =
            bootstrap.createAccount()

        val firstSession =
            bootstrap.createSession(
                accountId,
            )

        val authApi =
            HttpAuthSessionApi(
                BuildConfig.ATOUTIA_API_BASE_URL,
            )

        val refreshed =
            authApi.refresh(
                firstSession.refreshToken,
            )

        assertEquals(
            firstSession.accountId,
            refreshed.accountId,
        )

        assertEquals(
            firstSession.sessionId,
            refreshed.sessionId,
        )

        assertNotEquals(
            firstSession.accessToken,
            refreshed.accessToken,
        )

        assertNotEquals(
            firstSession.refreshToken,
            refreshed.refreshToken,
        )

        assertTrue(
            refreshed.accessExpiresAtMs >
                firstSession.accessExpiresAtMs,
        )

        assertRefreshRejected {
            authApi.refresh(
                firstSession.refreshToken,
            )
        }

        assertRefreshRejected {
            authApi.refresh(
                refreshed.refreshToken,
            )
        }

        val logoutSession =
            bootstrap.createSession(
                accountId,
            )

        authApi.logout(
            logoutSession.refreshToken,
        )

        assertRefreshRejected {
            authApi.refresh(
                logoutSession.refreshToken,
            )
        }
    }

    private fun assertRefreshRejected(
        block:
            () -> Unit,
    ) {
        try {
            block()

            fail(
                "Expected Atoutia refresh rejection.",
            )
        } catch (
            error:
                AuthSessionRejectedException,
        ) {
            assertTrue(
                error.message
                    ?.isNotBlank() ==
                    true,
            )
        }
    }

    private class LocalBootstrapClient(
        baseUrl:
            String,
    ) {
        private val normalizedBaseUrl =
            normalizeBaseUrl(
                baseUrl,
            )

        fun createAccount():
            String {
            val connection =
                openPostConnection(
                    "/api/v1/auth/accounts",
                )

            try {
                writeJsonBody(
                    connection =
                        connection,

                    body =
                        JSONObject(),
                )

                val responseCode =
                    connection.responseCode

                check(
                    responseCode ==
                        HttpURLConnection.HTTP_CREATED,
                ) {
                    "Unable to create local Atoutia test account: HTTP $responseCode."
                }

                val json =
                    readJsonResponse(
                        connection,
                    )

                val accountId =
                    json.getString(
                        "accountId",
                    )

                check(
                    accountId.startsWith(
                        "acc1_",
                    ),
                ) {
                    "Invalid Atoutia test account id."
                }

                return accountId
            } finally {
                connection.disconnect()
            }
        }

        fun createSession(
            accountId:
                String,
        ): AuthSessionTokens {
            check(
                accountId.startsWith(
                    "acc1_",
                ),
            ) {
                "Invalid Atoutia account id."
            }

            val connection =
                openPostConnection(
                    "/api/v1/auth/sessions",
                )

            try {
                writeJsonBody(
                    connection =
                        connection,

                    body =
                        JSONObject()
                            .put(
                                "accountId",
                                accountId,
                            ),
                )

                val responseCode =
                    connection.responseCode

                check(
                    responseCode ==
                        HttpURLConnection.HTTP_CREATED,
                ) {
                    "Unable to create local Atoutia test session: HTTP $responseCode."
                }

                val json =
                    readJsonResponse(
                        connection,
                    )

                val accessToken =
                    json.getString(
                        "accessToken",
                    )

                check(
                    json.getString(
                        "token",
                    ) ==
                        accessToken,
                ) {
                    "Atoutia token alias does not match access token."
                }

                val refreshToken =
                    json.getString(
                        "refreshToken",
                    )

                val session =
                    json.getJSONObject(
                        "session",
                    )

                check(
                    session.getString(
                        "accountId",
                    ) ==
                        accountId,
                ) {
                    "Atoutia session account id does not match."
                }

                check(
                    session.isNull(
                        "revokedAtMs",
                    ),
                ) {
                    "Atoutia test session is already revoked."
                }

                return AuthSessionTokens(
                    accountId =
                        accountId,

                    sessionId =
                        session.getString(
                            "sessionId",
                        ),

                    accessToken =
                        accessToken,

                    refreshToken =
                        refreshToken,

                    accessExpiresAtMs =
                        session.getLong(
                            "expiresAtMs",
                        ),
                )
            } finally {
                connection.disconnect()
            }
        }

        private fun openPostConnection(
            path:
                String,
        ): HttpURLConnection {
            val connection =
                URI(
                    "$normalizedBaseUrl$path",
                )
                    .toURL()
                    .openConnection() as
                    HttpURLConnection

            connection.requestMethod =
                "POST"

            connection.connectTimeout =
                3_000

            connection.readTimeout =
                5_000

            connection.useCaches =
                false

            connection.doOutput =
                true

            connection.setRequestProperty(
                "Accept",
                "application/json",
            )

            connection.setRequestProperty(
                "Content-Type",
                "application/json; charset=utf-8",
            )

            return connection
        }

        private fun writeJsonBody(
            connection:
                HttpURLConnection,

            body:
                JSONObject,
        ) {
            val bytes =
                body
                    .toString()
                    .toByteArray(
                        Charsets.UTF_8,
                    )

            connection.setFixedLengthStreamingMode(
                bytes.size,
            )

            connection.outputStream.use {
                it.write(
                    bytes,
                )
            }
        }

        private fun readJsonResponse(
            connection:
                HttpURLConnection,
        ): JSONObject {
            val contentType =
                connection.contentType
                    ?.lowercase()

            check(
                contentType !=
                    null &&
                    contentType.startsWith(
                        "application/json",
                    ),
            ) {
                "Atoutia backend returned an unexpected content type."
            }

            val body =
                connection
                    .inputStream
                    .bufferedReader(
                        Charsets.UTF_8,
                    )
                    .use {
                        it.readText()
                    }

            return JSONObject(
                body,
            )
        }

        private companion object {
            fun normalizeBaseUrl(
                value:
                    String,
            ): String {
                val trimmed =
                    value.trim()

                require(
                    trimmed.isNotEmpty(),
                ) {
                    "Atoutia backend base URL must not be empty."
                }

                require(
                    trimmed ==
                        value,
                ) {
                    "Atoutia backend base URL must not contain surrounding whitespace."
                }

                require(
                    trimmed.startsWith(
                        "http://",
                    ) ||
                        trimmed.startsWith(
                            "https://",
                        ),
                ) {
                    "Atoutia backend base URL must use HTTP or HTTPS."
                }

                return trimmed.removeSuffix(
                    "/",
                )
            }
        }
    }
}