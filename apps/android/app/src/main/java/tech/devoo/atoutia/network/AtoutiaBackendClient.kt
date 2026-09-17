package tech.devoo.atoutia.network

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI

class AtoutiaBackendClient(
    baseUrl:
        String,
) {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    fun checkHealth():
        BackendHealth {
        val connection =
            URI(
                "$normalizedBaseUrl/health",
            )
                .toURL()
                .openConnection() as
                HttpURLConnection

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

            val responseCode =
                connection.responseCode

            if (
                responseCode !=
                    HttpURLConnection.HTTP_OK
            ) {
                throw AtoutiaBackendException(
                    "Atoutia backend returned HTTP $responseCode.",
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
                throw AtoutiaBackendException(
                    "Atoutia backend returned an unexpected content type.",
                )
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

            return parseHealth(
                body,
            )
        } catch (
            error:
                AtoutiaBackendException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaBackendException(
                "Unable to contact Atoutia backend.",
                error,
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun parseHealth(
        body:
            String,
    ): BackendHealth {
        try {
            val json =
                JSONObject(
                    body,
                )

            val keys =
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
                keys !=
                    EXPECTED_HEALTH_KEYS
            ) {
                throw AtoutiaBackendException(
                    "Atoutia backend returned an unexpected health document.",
                )
            }

            return BackendHealth(
                status =
                    json.getString(
                        "status",
                    ),

                service =
                    json.getString(
                        "service",
                    ),

                engineVersion =
                    json.getString(
                        "engineVersion",
                    ),

                liveRooms =
                    json.getInt(
                        "liveRooms",
                    ),
            )
        } catch (
            error:
                AtoutiaBackendException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaBackendException(
                "Atoutia backend returned an invalid health document.",
                error,
            )
        }
    }

    private companion object {
        const val CONNECT_TIMEOUT_MS =
            3_000

        const val READ_TIMEOUT_MS =
            5_000

        val EXPECTED_HEALTH_KEYS =
            setOf(
                "status",
                "service",
                "engineVersion",
                "liveRooms",
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
    }
}

class AtoutiaBackendException(
    message:
        String,

    cause:
        Throwable? =
            null,
) : Exception(
    message,
    cause,
)