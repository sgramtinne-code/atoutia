package tech.devoo.atoutia.network.game

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI

class HttpAtoutiaGameApi(
    baseUrl:
        String,
) : AtoutiaGameApi {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    override fun getPlayerSnapshot(
        sessionId:
            String,

        accessToken:
            String,
    ): PlayerGameSnapshot {
        val normalizedSessionId =
            validateSessionId(
                sessionId,
            )

        val normalizedAccessToken =
            validateAccessToken(
                accessToken,
            )

        return executePlayerSnapshotRequest(
            path =
                "/api/v1/rooms/$normalizedSessionId/snapshot",

            expectedSessionId =
                normalizedSessionId,

            accessToken =
                normalizedAccessToken,

            requestBody =
                null,
        )
    }

    override fun submitCommand(
        sessionId:
            String,

        expectedRevision:
            Int,

        engineVersion:
            String,

        command:
            PlayerGameCommand,

        accessToken:
            String,
    ): PlayerGameSnapshot {
        val normalizedSessionId =
            validateSessionId(
                sessionId,
            )

        require(
            expectedRevision >=
                0,
        ) {
            "Expected room revision must be non-negative."
        }

        val normalizedEngineVersion =
            validateEngineVersion(
                engineVersion,
            )

        val normalizedAccessToken =
            validateAccessToken(
                accessToken,
            )

        val commandJson =
            when (
                command
            ) {
                PlayerGameCommand.Pass ->
                    JSONObject()
                        .put(
                            "type",
                            "PASS",
                        )

                is PlayerGameCommand.Take ->
                    JSONObject()
                        .put(
                            "type",
                            "TAKE",
                        )
                        .put(
                            "suit",
                            command.suit.name,
                        )

                is PlayerGameCommand.PlayCard ->
                    JSONObject()
                        .put(
                            "type",
                            "PLAY_CARD",
                        )
                        .put(
                            "card",
                            JSONObject()
                                .put(
                                    "suit",
                                    command.card.suit.name,
                                )
                                .put(
                                    "rank",
                                    command.card.rank.name,
                                ),
                        )
            }

        val documentJson =
            JSONObject()
                .put(
                    "formatVersion",
                    SUPPORTED_LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION,
                )
                .put(
                    "engineVersion",
                    normalizedEngineVersion,
                )
                .put(
                    "sessionId",
                    normalizedSessionId,
                )
                .put(
                    "expectedRevision",
                    expectedRevision,
                )
                .put(
                    "command",
                    commandJson,
                )

        val requestBody =
            JSONObject()
                .put(
                    "document",
                    documentJson,
                )

        return executePlayerSnapshotRequest(
            path =
                "/api/v1/rooms/$normalizedSessionId/commands",

            expectedSessionId =
                normalizedSessionId,

            accessToken =
                normalizedAccessToken,

            requestBody =
                requestBody,
        )
    }

    private fun executePlayerSnapshotRequest(
        path:
            String,

        expectedSessionId:
            String,

        accessToken:
            String,

        requestBody:
            JSONObject?,
    ): PlayerGameSnapshot {
        val connection =
            URI(
                "$normalizedBaseUrl$path",
            )
                .toURL()
                .openConnection() as HttpURLConnection

        try {
            connection.requestMethod =
                "POST"

            connection.connectTimeout =
                CONNECT_TIMEOUT_MS

            connection.readTimeout =
                READ_TIMEOUT_MS

            connection.useCaches =
                false

            connection.setRequestProperty(
                "Accept",
                "application/json",
            )

            connection.setRequestProperty(
                "Authorization",
                "Bearer $accessToken",
            )

            if (
                requestBody !=
                    null
            ) {
                val bytes =
                    requestBody
                        .toString()
                        .toByteArray(
                            Charsets.UTF_8,
                        )

                connection.doOutput =
                    true

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json; charset=utf-8",
                )

                connection.setFixedLengthStreamingMode(
                    bytes.size,
                )

                connection.outputStream.use {
                    output ->
                    output.write(
                        bytes,
                    )
                }
            }

            val responseCode =
                connection.responseCode

            if (
                responseCode !=
                HttpURLConnection.HTTP_OK
            ) {
                val errorCode =
                    readApiErrorCode(
                        connection,
                    )

                throw AtoutiaGameApiException(
                    message =
                        "Atoutia game API returned HTTP $responseCode.",

                    statusCode =
                        responseCode,

                    errorCode =
                        errorCode,
                )
            }

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
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an unexpected content type.",
                )
            }

            val responseBody =
                connection
                    .inputStream
                    .bufferedReader(
                        Charsets.UTF_8,
                    )
                    .use {
                        it.readText()
                    }

            return PlayerSnapshotJson.parseLiveMatchRoomSnapshotDocument(
                body =
                    responseBody,

                expectedSessionId =
                    expectedSessionId,
            )
        } catch (
            error:
                AtoutiaGameApiException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaGameApiException(
                message =
                    "Unable to contact Atoutia game API.",

                cause =
                    error,
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun readApiErrorCode(
        connection:
            HttpURLConnection,
    ): String? {
        val errorStream =
            connection.errorStream
                ?: return null

        val responseBody =
            try {
                errorStream
                    .bufferedReader(
                        Charsets.UTF_8,
                    )
                    .use {
                        it.readText()
                    }
            } catch (
                error:
                    Exception,
            ) {
                return null
            }

        if (
            responseBody.isBlank()
        ) {
            return null
        }

        return try {
            val json =
                JSONObject(
                    responseBody,
                )

            val error =
                json.opt(
                    "error",
                )

            if (
                error is String &&
                error.isNotBlank()
            ) {
                error
            } else {
                null
            }
        } catch (
            error:
                Exception,
        ) {
            null
        }
    }

    private companion object {
        const val CONNECT_TIMEOUT_MS =
            3_000

        const val READ_TIMEOUT_MS =
            5_000

        const val SUPPORTED_LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION =
            1

        fun normalizeBaseUrl(
            value:
                String,
        ): String {
            val trimmed =
                value.trim()

            require(
                trimmed.isNotEmpty(),
            ) {
                "Atoutia game API base URL must not be empty."
            }

            require(
                trimmed ==
                    value,
            ) {
                "Atoutia game API base URL must not contain surrounding whitespace."
            }

            require(
                trimmed.startsWith(
                    "http://",
                ) ||
                    trimmed.startsWith(
                        "https://",
                    ),
            ) {
                "Atoutia game API base URL must use HTTP or HTTPS."
            }

            return trimmed.removeSuffix(
                "/",
            )
        }

        fun validateSessionId(
            value:
                String,
        ): String {
            require(
                value.isNotBlank(),
            ) {
                "Atoutia room session ID must not be blank."
            }

            require(
                value ==
                    value.trim(),
            ) {
                "Atoutia room session ID must not contain surrounding whitespace."
            }

            require(
                value.startsWith(
                    "ms1_",
                ),
            ) {
                "Invalid Atoutia room session ID."
            }

            require(
                !value.contains(
                    "/",
                ) &&
                    !value.contains(
                        "?",
                    ) &&
                    !value.contains(
                        "#",
                    ),
            ) {
                "Atoutia room session ID contains invalid URL characters."
            }

            return value
        }

        fun validateEngineVersion(
            value:
                String,
        ): String {
            require(
                value.isNotBlank(),
            ) {
                "Atoutia engine version must not be blank."
            }

            require(
                value ==
                    value.trim(),
            ) {
                "Atoutia engine version must not contain surrounding whitespace."
            }

            require(
                value.none {
                    it.isWhitespace()
                },
            ) {
                "Invalid Atoutia engine version."
            }

            return value
        }

        fun validateAccessToken(
            value:
                String,
        ): String {
            require(
                value.isNotBlank(),
            ) {
                "Atoutia access token must not be blank."
            }

            require(
                value ==
                    value.trim(),
            ) {
                "Atoutia access token must not contain surrounding whitespace."
            }

            require(
                value.startsWith(
                    "atk1_",
                ),
            ) {
                "Invalid Atoutia access token."
            }

            require(
                value.none {
                    it.isWhitespace()
                },
            ) {
                "Invalid Atoutia access token."
            }

            return value
        }
    }
}
