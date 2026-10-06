package tech.devoo.atoutia.network.history

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI

class HttpAtoutiaMatchHistoryApi(
    baseUrl:
        String,
) : AtoutiaMatchHistoryApi {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    override fun getHistory(
        accessToken:
            String,

        limit:
            Int,
    ): MatchHistoryResponse {
        val normalizedAccessToken =
            validateAccessToken(
                accessToken,
            )

        require(
            limit in
                MIN_HISTORY_LIMIT..
                MAX_HISTORY_LIMIT,
        ) {
            "Atoutia match history limit must be between 1 and 100."
        }

        val connection =
            URI(
                "$normalizedBaseUrl/api/v1/matches/history?limit=$limit",
            )
                .toURL()
                .openConnection() as HttpURLConnection

        try {
            connection.requestMethod =
                "GET"

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
                "Bearer $normalizedAccessToken",
            )

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

                throw AtoutiaMatchHistoryApiException(
                    message =
                        "Atoutia match history API returned HTTP $responseCode.",

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
                throw AtoutiaMatchHistoryApiException(
                    "Atoutia match history API returned an unexpected content type.",
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

            return parseHistoryResponse(
                responseBody,
            )
        } catch (
            error:
                AtoutiaMatchHistoryApiException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaMatchHistoryApiException(
                message =
                    "Unable to contact Atoutia match history API.",

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

    private fun parseHistoryResponse(
        body:
            String,
    ): MatchHistoryResponse {
        try {
            val json =
                JSONObject(
                    body,
                )

            requireExactKeys(
                json =
                    json,

                expectedKeys =
                    EXPECTED_RESPONSE_KEYS,

                errorMessage =
                    "Atoutia match history API returned an unexpected history document.",
            )

            val formatVersion =
                requireInt(
                    json =
                        json,

                    key =
                        "formatVersion",
                )

            if (
                formatVersion !=
                    SUPPORTED_HISTORY_FORMAT_VERSION
            ) {
                throw AtoutiaMatchHistoryApiException(
                    "Atoutia match history API returned an unsupported history format.",
                )
            }

            val entries =
                parseEntries(
                    json.getJSONArray(
                        "entries",
                    ),
                )

            return MatchHistoryResponse(
                formatVersion =
                    formatVersion,

                entries =
                    entries,
            )
        } catch (
            error:
                AtoutiaMatchHistoryApiException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaMatchHistoryApiException(
                message =
                    "Atoutia match history API returned an invalid history document.",

                cause =
                    error,
            )
        }
    }

    private fun parseEntries(
        array:
            JSONArray,
    ): List<MatchHistoryEntry> {
        val entries =
            ArrayList<
                MatchHistoryEntry
            >(
                array.length(),
            )

        for (
            index in
                0 until array.length()
        ) {
            val value =
                array.get(
                    index,
                )

            if (
                value !is
                    JSONObject
            ) {
                throw AtoutiaMatchHistoryApiException(
                    "Atoutia match history API returned an invalid history entry.",
                )
            }

            entries.add(
                parseEntry(
                    value,
                ),
            )
        }

        return entries.toList()
    }

    private fun parseEntry(
        json:
            JSONObject,
    ): MatchHistoryEntry {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_ENTRY_KEYS,

            errorMessage =
                "Atoutia match history API returned an unexpected history entry.",
        )

        val formatVersion =
            requireInt(
                json =
                    json,

                key =
                    "formatVersion",
            )

        if (
            formatVersion !=
                SUPPORTED_ENTRY_FORMAT_VERSION
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an unsupported history entry format.",
            )
        }

        val sessionId =
            requireSessionId(
                json =
                    json,

                key =
                    "sessionId",
            )

        val mode =
            parseMode(
                json =
                    json,

                key =
                    "mode",
            )

        val completedAtMs =
            requireLong(
                json =
                    json,

                key =
                    "completedAtMs",
            )

        if (
            completedAtMs <
                0L
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid completion timestamp.",
            )
        }

        val completion =
            parseCompletion(
                json =
                    json,

                key =
                    "completion",
            )

        val outcome =
            parseOutcome(
                json =
                    json,

                key =
                    "outcome",
            )

        val score =
            if (
                json.isNull(
                    "score",
                )
            ) {
                null
            } else {
                parseScore(
                    json.getJSONObject(
                        "score",
                    ),
                )
            }

        val forfeit =
            if (
                json.isNull(
                    "forfeit",
                )
            ) {
                null
            } else {
                parseForfeit(
                    json.getJSONObject(
                        "forfeit",
                    ),
                )
            }

        validateCompletionShape(
            completion =
                completion,

            outcome =
                outcome,

            score =
                score,

            forfeit =
                forfeit,
        )

        return MatchHistoryEntry(
            formatVersion =
                formatVersion,

            sessionId =
                sessionId,

            mode =
                mode,

            completedAtMs =
                completedAtMs,

            completion =
                completion,

            outcome =
                outcome,

            score =
                score,

            forfeit =
                forfeit,
        )
    }

    private fun parseScore(
        json:
            JSONObject,
    ): MatchHistoryScore {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_SCORE_KEYS,

            errorMessage =
                "Atoutia match history API returned an unexpected history score.",
        )

        val targetScore =
            requireInt(
                json =
                    json,

                key =
                    "targetScore",
            )

        val ownTeam =
            requireInt(
                json =
                    json,

                key =
                    "ownTeam",
            )

        val opponentTeam =
            requireInt(
                json =
                    json,

                key =
                    "opponentTeam",
            )

        if (
            targetScore <=
                0 ||
            ownTeam <
                0 ||
            opponentTeam <
                0
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid history score.",
            )
        }

        return MatchHistoryScore(
            targetScore =
                targetScore,

            ownTeam =
                ownTeam,

            opponentTeam =
                opponentTeam,
        )
    }

    private fun parseForfeit(
        json:
            JSONObject,
    ): MatchHistoryForfeit {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_FORFEIT_KEYS,

            errorMessage =
                "Atoutia match history API returned an unexpected forfeit document.",
        )

        val reason =
            parseForfeitReason(
                json =
                    json,

                key =
                    "reason",
            )

        val byOwnTeam =
            requireBoolean(
                json =
                    json,

                key =
                    "byOwnTeam",
            )

        val bySelf =
            requireBoolean(
                json =
                    json,

                key =
                    "bySelf",
            )

        if (
            bySelf &&
            !byOwnTeam
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned inconsistent forfeit metadata.",
            )
        }

        return MatchHistoryForfeit(
            reason =
                reason,

            byOwnTeam =
                byOwnTeam,

            bySelf =
                bySelf,
        )
    }

    private fun validateCompletionShape(
        completion:
            MatchHistoryCompletion,

        outcome:
            MatchHistoryOutcome,

        score:
            MatchHistoryScore?,

        forfeit:
            MatchHistoryForfeit?,
    ) {
        when (
            completion
        ) {
            MatchHistoryCompletion.NORMAL -> {
                if (
                    score ==
                        null ||
                    forfeit !=
                        null
                ) {
                    throw AtoutiaMatchHistoryApiException(
                        "Atoutia match history API returned inconsistent normal completion data.",
                    )
                }
            }

            MatchHistoryCompletion.FORFEIT -> {
                if (
                    score !=
                        null ||
                    forfeit ==
                        null
                ) {
                    throw AtoutiaMatchHistoryApiException(
                        "Atoutia match history API returned inconsistent forfeit completion data.",
                    )
                }

                val expectedOwnTeamForfeit =
                    outcome ==
                        MatchHistoryOutcome.LOSS

                if (
                    forfeit.byOwnTeam !=
                        expectedOwnTeamForfeit
                ) {
                    throw AtoutiaMatchHistoryApiException(
                        "Atoutia match history API returned inconsistent forfeit outcome.",
                    )
                }
            }
        }
    }

    private fun parseMode(
        json:
            JSONObject,

        key:
            String,
    ): MatchHistoryMode {
        val value =
            requireString(
                json =
                    json,

                key =
                    key,
            )

        return try {
            MatchHistoryMode.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw AtoutiaMatchHistoryApiException(
                message =
                    "Atoutia match history API returned an unsupported match mode.",

                cause =
                    error,
            )
        }
    }

    private fun parseCompletion(
        json:
            JSONObject,

        key:
            String,
    ): MatchHistoryCompletion {
        val value =
            requireString(
                json =
                    json,

                key =
                    key,
            )

        return try {
            MatchHistoryCompletion.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw AtoutiaMatchHistoryApiException(
                message =
                    "Atoutia match history API returned an unsupported completion type.",

                cause =
                    error,
            )
        }
    }

    private fun parseOutcome(
        json:
            JSONObject,

        key:
            String,
    ): MatchHistoryOutcome {
        val value =
            requireString(
                json =
                    json,

                key =
                    key,
            )

        return try {
            MatchHistoryOutcome.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw AtoutiaMatchHistoryApiException(
                message =
                    "Atoutia match history API returned an unsupported match outcome.",

                cause =
                    error,
            )
        }
    }

    private fun parseForfeitReason(
        json:
            JSONObject,

        key:
            String,
    ): MatchHistoryForfeitReason {
        val value =
            requireString(
                json =
                    json,

                key =
                    key,
            )

        return try {
            MatchHistoryForfeitReason.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw AtoutiaMatchHistoryApiException(
                message =
                    "Atoutia match history API returned an unsupported forfeit reason.",

                cause =
                    error,
            )
        }
    }

    private fun requireSessionId(
        json:
            JSONObject,

        key:
            String,
    ): String {
        val value =
            requireString(
                json =
                    json,

                key =
                    key,
            )

        if (
            value.isBlank() ||
            value !=
                value.trim() ||
            !value.startsWith(
                "ms1_",
            ) ||
            value.contains(
                "/",
            ) ||
            value.contains(
                "?",
            ) ||
            value.contains(
                "#",
            )
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid session ID.",
            )
        }

        return value
    }

    private fun requireString(
        json:
            JSONObject,

        key:
            String,
    ): String {
        val value =
            json.get(
                key,
            )

        if (
            value !is
                String
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid string field.",
            )
        }

        return value
    }

    private fun requireBoolean(
        json:
            JSONObject,

        key:
            String,
    ): Boolean {
        val value =
            json.get(
                key,
            )

        if (
            value !is
                Boolean
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid boolean field.",
            )
        }

        return value
    }

    private fun requireInt(
        json:
            JSONObject,

        key:
            String,
    ): Int {
        val value =
            json.get(
                key,
            )

        if (
            value !is
                Number
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid integer field.",
            )
        }

        val doubleValue =
            value.toDouble()

        if (
            !doubleValue.isFinite() ||
            doubleValue %
                1.0 !=
                0.0 ||
            doubleValue <
                Int.MIN_VALUE.toDouble() ||
            doubleValue >
                Int.MAX_VALUE.toDouble()
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid integer field.",
            )
        }

        return doubleValue.toInt()
    }

    private fun requireLong(
        json:
            JSONObject,

        key:
            String,
    ): Long {
        val value =
            json.get(
                key,
            )

        if (
            value !is
                Number
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid long field.",
            )
        }

        val doubleValue =
            value.toDouble()

        if (
            !doubleValue.isFinite() ||
            doubleValue %
                1.0 !=
                0.0 ||
            doubleValue <
                -MAX_SAFE_INTEGER.toDouble() ||
            doubleValue >
                MAX_SAFE_INTEGER.toDouble()
        ) {
            throw AtoutiaMatchHistoryApiException(
                "Atoutia match history API returned an invalid long field.",
            )
        }

        return value.toLong()
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
            throw AtoutiaMatchHistoryApiException(
                errorMessage,
            )
        }
    }

    private companion object {
        const val CONNECT_TIMEOUT_MS =
            3_000

        const val READ_TIMEOUT_MS =
            5_000

        const val MIN_HISTORY_LIMIT =
            1

        const val MAX_HISTORY_LIMIT =
            100

        const val MAX_SAFE_INTEGER =
            9_007_199_254_740_991L

        const val SUPPORTED_HISTORY_FORMAT_VERSION =
            1

        const val SUPPORTED_ENTRY_FORMAT_VERSION =
            1

        val EXPECTED_RESPONSE_KEYS =
            setOf(
                "formatVersion",
                "entries",
            )

        val EXPECTED_ENTRY_KEYS =
            setOf(
                "formatVersion",
                "sessionId",
                "mode",
                "completedAtMs",
                "completion",
                "outcome",
                "score",
                "forfeit",
            )

        val EXPECTED_SCORE_KEYS =
            setOf(
                "targetScore",
                "ownTeam",
                "opponentTeam",
            )

        val EXPECTED_FORFEIT_KEYS =
            setOf(
                "reason",
                "byOwnTeam",
                "bySelf",
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
                "Atoutia match history API base URL must not be empty."
            }

            require(
                trimmed ==
                    value,
            ) {
                "Atoutia match history API base URL must not contain surrounding whitespace."
            }

            require(
                trimmed.startsWith(
                    "http://",
                ) ||
                    trimmed.startsWith(
                        "https://",
                    ),
            ) {
                "Atoutia match history API base URL must use HTTP or HTTPS."
            }

            return trimmed.removeSuffix(
                "/",
            )
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
