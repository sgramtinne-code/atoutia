package tech.devoo.atoutia.auth

import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI

class HttpGoogleAuthApi(
    baseUrl:
        String,
) : GoogleAuthApi {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    override fun authenticate(
        idToken:
            String,
    ): GoogleAuthResult {
        val normalizedIdToken =
            normalizeIdToken(
                idToken,
            )

        val connection =
            openConnection()

        try {
            writeRequest(
                connection =
                    connection,

                idToken =
                    normalizedIdToken,
            )

            return when (
                val responseCode =
                    connection.responseCode
            ) {
                HttpURLConnection.HTTP_CREATED ->
                    parseSuccessResponse(
                        connection,
                    )

                HttpURLConnection.HTTP_UNAUTHORIZED ->
                    throw GoogleAuthRejectedException(
                        "Google identity proof was rejected by Atoutia.",
                    )

                HttpURLConnection.HTTP_UNAVAILABLE ->
                    throw GoogleAuthUnavailableException(
                        "Google authentication is unavailable on the Atoutia backend.",
                    )

                HttpURLConnection.HTTP_BAD_REQUEST ->
                    throw GoogleAuthProtocolException(
                        "Atoutia rejected the Google authentication request.",
                    )

                else ->
                    throw IOException(
                        "Unexpected Atoutia Google authentication response: HTTP $responseCode.",
                    )
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun openConnection():
        HttpURLConnection {
        val connection =
            URI(
                "$normalizedBaseUrl/api/v1/auth/google",
            )
                .toURL()
                .openConnection() as
                HttpURLConnection

        connection.requestMethod =
            "POST"

        connection.connectTimeout =
            CONNECT_TIMEOUT_MS

        connection.readTimeout =
            READ_TIMEOUT_MS

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

    private fun writeRequest(
        connection:
            HttpURLConnection,

        idToken:
            String,
    ) {
        val body =
            JSONObject()
                .put(
                    "idToken",
                    idToken,
                )
                .toString()
                .toByteArray(
                    Charsets.UTF_8,
                )

        connection.setFixedLengthStreamingMode(
            body.size,
        )

        connection.outputStream.use {
            it.write(
                body,
            )
        }
    }

    private fun parseSuccessResponse(
        connection:
            HttpURLConnection,
    ): GoogleAuthResult {
        requireJsonContentType(
            connection,
        )

        val body =
            connection
                .inputStream
                .bufferedReader(
                    Charsets.UTF_8,
                )
                .use {
                    it.readText()
                }

        val json =
            try {
                JSONObject(
                    body,
                )
            } catch (
                error:
                    JSONException,
            ) {
                throw GoogleAuthProtocolException(
                    "Atoutia returned invalid Google authentication JSON.",
                )
            }

        requireExactKeys(
            json =
                json,

            expectedKeys =
                setOf(
                    "token",
                    "accessToken",
                    "refreshToken",
                    "session",
                    "accountCreated",
                ),

            description =
                "Google authentication response",
        )

        val token =
            json.requireString(
                key =
                    "token",

                description =
                    "Google authentication response",
            )

        val accessToken =
            json.requireString(
                key =
                    "accessToken",

                description =
                    "Google authentication response",
            )

        if (
            token !=
            accessToken
        ) {
            throw GoogleAuthProtocolException(
                "Atoutia Google authentication token alias does not match accessToken.",
            )
        }

        val refreshToken =
            json.requireString(
                key =
                    "refreshToken",

                description =
                    "Google authentication response",
            )

        val accountCreated =
            json.requireBoolean(
                key =
                    "accountCreated",

                description =
                    "Google authentication response",
            )

        val sessionJson =
            try {
                json.getJSONObject(
                    "session",
                )
            } catch (
                error:
                    JSONException,
            ) {
                throw GoogleAuthProtocolException(
                    "Atoutia Google authentication response has an invalid session.",
                )
            }

        requireExactKeys(
            json =
                sessionJson,

            expectedKeys =
                setOf(
                    "sessionId",
                    "accountId",
                    "createdAtMs",
                    "expiresAtMs",
                    "revokedAtMs",
                ),

            description =
                "Google authentication session",
        )

        if (
            !sessionJson.isNull(
                "revokedAtMs",
            )
        ) {
            throw GoogleAuthProtocolException(
                "Atoutia returned an already revoked Google authentication session.",
            )
        }

        val accountId =
            sessionJson.requireString(
                key =
                    "accountId",

                description =
                    "Google authentication session",
            )

        val sessionId =
            sessionJson.requireString(
                key =
                    "sessionId",

                description =
                    "Google authentication session",
            )

        val expiresAtMs =
            sessionJson.requireLong(
                key =
                    "expiresAtMs",

                description =
                    "Google authentication session",
            )

        val session =
            try {
                AuthSessionTokens(
                    accountId =
                        accountId,

                    sessionId =
                        sessionId,

                    accessToken =
                        accessToken,

                    refreshToken =
                        refreshToken,

                    accessExpiresAtMs =
                        expiresAtMs,
                )
            } catch (
                error:
                    IllegalArgumentException,
            ) {
                throw GoogleAuthProtocolException(
                    "Atoutia returned invalid Google authentication session tokens.",
                )
            }

        return GoogleAuthResult(
            session =
                session,

            accountCreated =
                accountCreated,
        )
    }

    private fun requireJsonContentType(
        connection:
            HttpURLConnection,
    ) {
        val contentType =
            connection.contentType
                ?.lowercase()

        if (
            contentType ==
            null ||
            !contentType.startsWith(
                "application/json",
            )
        ) {
            throw GoogleAuthProtocolException(
                "Atoutia Google authentication response is not JSON.",
            )
        }
    }

    private companion object {
        const val CONNECT_TIMEOUT_MS =
            3_000

        const val READ_TIMEOUT_MS =
            5_000

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

        fun normalizeIdToken(
            value:
                String,
        ): String {
            val trimmed =
                value.trim()

            require(
                trimmed.isNotEmpty(),
            ) {
                "Google ID token must not be empty."
            }

            require(
                trimmed ==
                value,
            ) {
                "Google ID token must not contain surrounding whitespace."
            }

            return trimmed
        }
    }
}

private fun requireExactKeys(
    json:
        JSONObject,

    expectedKeys:
        Set<String>,

    description:
        String,
) {
    val actualKeys =
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

    if (
        actualKeys !=
        expectedKeys
    ) {
        throw GoogleAuthProtocolException(
            "$description has unexpected fields.",
        )
    }
}

private fun JSONObject.requireString(
    key:
        String,

    description:
        String,
): String {
    val value =
        try {
            getString(
                key,
            )
        } catch (
            error:
                JSONException,
        ) {
            throw GoogleAuthProtocolException(
                "$description has an invalid $key.",
            )
        }

    if (
        value.isBlank() ||
        value !=
        value.trim()
    ) {
        throw GoogleAuthProtocolException(
            "$description has an invalid $key.",
        )
    }

    return value
}

private fun JSONObject.requireBoolean(
    key:
        String,

    description:
        String,
): Boolean {
    return try {
        getBoolean(
            key,
        )
    } catch (
        error:
            JSONException,
    ) {
        throw GoogleAuthProtocolException(
            "$description has an invalid $key.",
        )
    }
}

private fun JSONObject.requireLong(
    key:
        String,

    description:
        String,
): Long {
    return try {
        getLong(
            key,
        )
    } catch (
        error:
            JSONException,
    ) {
        throw GoogleAuthProtocolException(
            "$description has an invalid $key.",
        )
    }
}