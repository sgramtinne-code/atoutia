package tech.devoo.atoutia.network

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.net.InetSocketAddress

class AtoutiaBackendClientTest {
    @Test
    fun readsValidHealthDocument() {
        withServer(
            statusCode =
                200,

            contentType =
                "application/json; charset=utf-8",

            body =
                """
                {
                  "status": "ok",
                  "service": "@atoutia/backend",
                  "engineVersion": "0.1.0",
                  "liveRooms": 3
                }
                """.trimIndent(),
        ) {
            baseUrl ->
            val health =
                AtoutiaBackendClient(
                    baseUrl,
                ).checkHealth()

            assertEquals(
                BackendHealth(
                    status =
                        "ok",

                    service =
                        "@atoutia/backend",

                    engineVersion =
                        "0.1.0",

                    liveRooms =
                        3,
                ),
                health,
            )
        }
    }

    @Test
    fun rejectsUnexpectedHttpStatus() {
        withServer(
            statusCode =
                503,

            contentType =
                "application/json",

            body =
                """
                {
                  "error": "UNAVAILABLE"
                }
                """.trimIndent(),
        ) {
            baseUrl ->
            val error =
                assertThrows(
                    AtoutiaBackendException::class.java,
                ) {
                    AtoutiaBackendClient(
                        baseUrl,
                    ).checkHealth()
                }

            assertEquals(
                "Atoutia backend returned HTTP 503.",
                error.message,
            )
        }
    }

    @Test
    fun rejectsUnexpectedContentType() {
        withServer(
            statusCode =
                200,

            contentType =
                "text/plain",

            body =
                "ok",
        ) {
            baseUrl ->
            val error =
                assertThrows(
                    AtoutiaBackendException::class.java,
                ) {
                    AtoutiaBackendClient(
                        baseUrl,
                    ).checkHealth()
                }

            assertEquals(
                "Atoutia backend returned an unexpected content type.",
                error.message,
            )
        }
    }

    @Test
    fun rejectsUnexpectedHealthKeys() {
        withServer(
            statusCode =
                200,

            contentType =
                "application/json",

            body =
                """
                {
                  "status": "ok",
                  "service": "@atoutia/backend",
                  "engineVersion": "0.1.0",
                  "liveRooms": 0,
                  "extra": true
                }
                """.trimIndent(),
        ) {
            baseUrl ->
            val error =
                assertThrows(
                    AtoutiaBackendException::class.java,
                ) {
                    AtoutiaBackendClient(
                        baseUrl,
                    ).checkHealth()
                }

            assertEquals(
                "Atoutia backend returned an unexpected health document.",
                error.message,
            )
        }
    }

    @Test
    fun rejectsInvalidBackendIdentity() {
        withServer(
            statusCode =
                200,

            contentType =
                "application/json",

            body =
                """
                {
                  "status": "ok",
                  "service": "other",
                  "engineVersion": "0.1.0",
                  "liveRooms": 0
                }
                """.trimIndent(),
        ) {
            baseUrl ->
            val error =
                assertThrows(
                    AtoutiaBackendException::class.java,
                ) {
                    AtoutiaBackendClient(
                        baseUrl,
                    ).checkHealth()
                }

            assertEquals(
                "Atoutia backend returned an invalid health document.",
                error.message,
            )
        }
    }

    private fun withServer(
        statusCode:
            Int,

        contentType:
            String,

        body:
            String,

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
            "/health",
        ) {
            exchange ->
            handleResponse(
                exchange =
                    exchange,

                statusCode =
                    statusCode,

                contentType =
                    contentType,

                body =
                    body,
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

    private fun handleResponse(
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