package tech.devoo.atoutia.auth

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI

class HttpAuthSessionApi(
    baseUrl:
        String,
) : AuthSessionApi {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    override fun refresh(
        refreshToken:
            String,
    ): AuthSessionTokens {
        requireValidRefreshToken(
            refreshToken,
        )

        val connection =
            openPostConnection(
                path =
                    "/api/v1/auth/refresh",
            )

        try {
            writeRefreshTokenBody(
                connection =
                    connection,

                refreshToken =
                    refreshToken,
            )

            val responseCode =
                connection.responseCode

            if (
                responseCode ==
                    HttpURLConnection.HTTP_UNAUTHORIZED
            ) {
                throw AuthSessionRejectedException()
            }

            if (
                responseCode !=
                    HttpURLConnection.HTTP_OK
            ) {
                throw IOException(
                    "Atoutia authentication backend returned HTTP $responseCode.",
                )
            }

            requireJsonContentType(
                connection,
            )

            val body =
                readResponseBody(
                    connection,
                )

            return parseRefreshResponse(
                body,
            )
        } catch (
            error:
                AuthSessionRejectedException,
        ) {
            throw error
        } catch (
            error:
                AuthSessionProtocolException,
        ) {
            throw error
        } catch (
            error:
                IOException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw IOException(
                "Unable to contact Atoutia authentication backend.",
                error,
            )
        } finally {
            connection.disconnect()
        }
    }

    override fun logout(
        refreshToken:
            String,
    ) {
        requireValidRefreshToken(
            refreshToken,
        )

        val connection =
            openPostConnection(
                path =
                    "/api/v1/auth/logout",
            )

        try {
            writeRefreshTokenBody(
                connection =
                    connection,

                refreshToken =
                    refreshToken,
            )

            val responseCode =
                connection.responseCode

            if (
                responseCode !=
                    HttpURLConnection.HTTP_NO_CONTENT
            ) {
                throw IOException(
                    "Atoutia authentication backend returned HTTP $responseCode.",
                )
            }
        } catch (
            error:
                IOException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw IOException(
                "Unable to contact Atoutia authentication backend.",
                error,
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

    private fun writeRefreshTokenBody(
        connection:
            HttpURLConnection,

        refreshToken:
            String,
    ) {
        val body =
            JSONObject()
                .put(
                    "refreshToken",
                    refreshToken,
                )
                .toString()

        val bytes =
            body.toByteArray(
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

    private fun parseRefreshResponse(
        body:
            String,
    ): AuthSessionTokens {
        try {
            val json =
                JSONObject(
                    body,
                )

            if (
                jsonKeys(
                    json,
                ) !=
                    EXPECTED_REFRESH_KEYS
            ) {
                throw AuthSessionProtocolException(
                    "Atoutia backend returned an unexpected refresh document.",
                )
            }

            val tokenAlias =
                json.getString(
                    "token",
                )

            val accessToken =
                json.getString(
                    "accessToken",
                )

            if (
                tokenAlias !=
                    accessToken
            ) {
                throw AuthSessionProtocolException(
                    "Atoutia backend returned inconsistent access tokens.",
                )
            }

            val session =
                json.getJSONObject(
                    "session",
                )

            if (
                jsonKeys(
                    session,
                ) !=
                    EXPECTED_SESSION_KEYS
            ) {
                throw AuthSessionProtocolException(
                    "Atoutia backend returned an unexpected session document.",
                )
            }

            if (
                !session.isNull(
                    "revokedAtMs",
                )
            ) {
                throw AuthSessionProtocolException(
                    "Atoutia backend returned a revoked authentication session.",
                )
            }

            return AuthSessionTokens(
                accountId =
                    session.getString(
                        "accountId",
                    ),

                sessionId =
                    session.getString(
                        "sessionId",
                    ),

                accessToken =
                    accessToken,

                refreshToken =
                    json.getString(
                        "refreshToken",
                    ),

                accessExpiresAtMs =
                    session.getLong(
                        "expiresAtMs",
                    ),
            )
        } catch (
            error:
                AuthSessionProtocolException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AuthSessionProtocolException(
                "Atoutia backend returned an invalid refresh document.",
                error,
            )
        }
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
            throw AuthSessionProtocolException(
                "Atoutia backend returned an unexpected content type.",
            )
        }
    }

    private fun readResponseBody(
        connection:
            HttpURLConnection,
    ): String =
        connection
            .inputStream
            .bufferedReader(
                Charsets.UTF_8,
            )
            .use {
                it.readText()
            }

    private fun jsonKeys(
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

    private companion object {
        const val CONNECT_TIMEOUT_MS =
            3_000

        const val READ_TIMEOUT_MS =
            5_000

        val EXPECTED_REFRESH_KEYS =
            setOf(
                "token",
                "accessToken",
                "refreshToken",
                "session",
            )

        val EXPECTED_SESSION_KEYS =
            setOf(
                "sessionId",
                "accountId",
                "createdAtMs",
                "expiresAtMs",
                "revokedAtMs",
            )

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

        fun requireValidRefreshToken(
            value:
                String,
        ) {
            require(
                value.isNotBlank() &&
                    value ==
                    value.trim() &&
                    value.startsWith(
                        "art1_",
                    ),
            ) {
                "Invalid Atoutia refresh token."
            }
        }
    }
}