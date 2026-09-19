package tech.devoo.atoutia.network.room

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI

class HttpAtoutiaRoomApi(
    baseUrl:
        String,
) : AtoutiaRoomApi {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    override fun createRoom(
        mode:
            MatchMode?,
    ): LiveRoomSummary {
        val body =
            JSONObject().apply {
                if (
                    mode !=
                    null
                ) {
                    put(
                        "mode",
                        mode.name,
                    )
                }
            }

        return executeRoomRequest(
            method =
                "POST",

            path =
                "/api/v1/rooms",

            expectedStatus =
                HttpURLConnection.HTTP_CREATED,

            requestBody =
                body,

            accessToken =
                null,
        )
    }

    override fun getRoom(
        sessionId:
            String,
    ): LiveRoomSummary {
        val normalizedSessionId =
            validateSessionId(
                sessionId,
            )

        return executeRoomRequest(
            method =
                "GET",

            path =
                "/api/v1/rooms/$normalizedSessionId",

            expectedStatus =
                HttpURLConnection.HTTP_OK,

            requestBody =
                null,

            accessToken =
                null,
        )
    }

    override fun claimSeat(
        sessionId:
            String,

        player:
            PlayerPosition,

        expectedRevision:
            Int,

        accessToken:
            String,
    ): LiveRoomSummary {
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

        val normalizedAccessToken =
            validateAccessToken(
                accessToken,
            )

        val body =
            JSONObject()
                .put(
                    "player",
                    player.name,
                )
                .put(
                    "expectedRevision",
                    expectedRevision,
                )

        return executeRoomRequest(
            method =
                "POST",

            path =
                "/api/v1/rooms/$normalizedSessionId/seats",

            expectedStatus =
                HttpURLConnection.HTTP_OK,

            requestBody =
                body,

            accessToken =
                normalizedAccessToken,
        )
    }

    private fun executeRoomRequest(
        method:
            String,

        path:
            String,

        expectedStatus:
            Int,

        requestBody:
            JSONObject?,

        accessToken:
            String?,
    ): LiveRoomSummary {
        val connection =
            URI(
                "$normalizedBaseUrl$path",
            )
                .toURL()
                .openConnection() as
                HttpURLConnection

        try {
            connection.requestMethod =
                method

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

            if (
                accessToken !=
                null
            ) {
                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $accessToken",
                )
            }

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
                    expectedStatus
            ) {
                throw AtoutiaRoomApiException(
                    "Atoutia room API returned HTTP $responseCode.",
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
                throw AtoutiaRoomApiException(
                    "Atoutia room API returned an unexpected content type.",
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

            return parseRoomSummary(
                responseBody,
            )
        } catch (
            error:
                AtoutiaRoomApiException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaRoomApiException(
                "Unable to contact Atoutia room API.",
                error,
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun parseRoomSummary(
        body:
            String,
    ): LiveRoomSummary {
        try {
            val json =
                JSONObject(
                    body,
                )

            requireExactKeys(
                json =
                    json,

                expectedKeys =
                    EXPECTED_ROOM_KEYS,

                errorMessage =
                    "Atoutia room API returned an unexpected room document.",
            )

            val seatsJson =
                json.getJSONObject(
                    "seats",
                )

            requireExactKeys(
                json =
                    seatsJson,

                expectedKeys =
                    EXPECTED_SEAT_KEYS,

                errorMessage =
                    "Atoutia room API returned an unexpected seat document.",
            )

            val adjudication =
                json.getJSONObject(
                    "adjudication",
                )

            val mode =
                try {
                    MatchMode.valueOf(
                        json.getString(
                            "mode",
                        ),
                    )
                } catch (
                    error:
                        IllegalArgumentException,
                ) {
                    throw AtoutiaRoomApiException(
                        "Atoutia room API returned an unsupported match mode.",
                        error,
                    )
                }

            return LiveRoomSummary(
                sessionId =
                    json.getString(
                        "sessionId",
                    ),

                mode =
                    mode,

                revision =
                    json.getInt(
                        "revision",
                    ),

                phase =
                    json.getString(
                        "phase",
                    ),

                occupiedSeats =
                    json.getInt(
                        "occupiedSeats",
                    ),

                seats =
                    LiveRoomSeats(
                        player0 =
                            seatsJson.getBoolean(
                                "PLAYER_0",
                            ),

                        player1 =
                            seatsJson.getBoolean(
                                "PLAYER_1",
                            ),

                        player2 =
                            seatsJson.getBoolean(
                                "PLAYER_2",
                            ),

                        player3 =
                            seatsJson.getBoolean(
                                "PLAYER_3",
                            ),
                    ),

                adjudicationJson =
                    adjudication.toString(),
            )
        } catch (
            error:
                AtoutiaRoomApiException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaRoomApiException(
                "Atoutia room API returned an invalid room document.",
                error,
            )
        }
    }

    private fun requireExactKeys(
        json:
            JSONObject,

        expectedKeys:
            Set<String>,

        errorMessage:
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
            throw AtoutiaRoomApiException(
                errorMessage,
            )
        }
    }

    private companion object {
        const val CONNECT_TIMEOUT_MS =
            3_000

        const val READ_TIMEOUT_MS =
            5_000

        val EXPECTED_ROOM_KEYS =
            setOf(
                "sessionId",
                "mode",
                "revision",
                "phase",
                "occupiedSeats",
                "seats",
                "adjudication",
            )

        val EXPECTED_SEAT_KEYS =
            setOf(
                "PLAYER_0",
                "PLAYER_1",
                "PLAYER_2",
                "PLAYER_3",
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
                "Atoutia room API base URL must not be empty."
            }

            require(
                trimmed ==
                    value,
            ) {
                "Atoutia room API base URL must not contain surrounding whitespace."
            }

            require(
                trimmed.startsWith(
                    "http://",
                ) ||
                    trimmed.startsWith(
                        "https://",
                    ),
            ) {
                "Atoutia room API base URL must use HTTP or HTTPS."
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