package tech.devoo.atoutia.network.realtime

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

class AtoutiaRealtimeClient(
    baseUrl: String,
    private val parser: RealtimeMessageParser =
        RealtimeMessageParser(),
    private val httpClient: OkHttpClient =
        OkHttpClient(),
) : AtoutiaRealtimeApi {
    private val webSocketBaseUrl =
        normalizeWebSocketBaseUrl(
            baseUrl,
        )

    override fun connect(
        sessionId: String,
        accessToken: String,
        listener: AtoutiaRealtimeApi.Listener,
    ): AtoutiaRealtimeConnection {
        val normalizedSessionId =
            validateSessionId(
                sessionId,
            )

        val normalizedAccessToken =
            validateAccessToken(
                accessToken,
            )

        val request =
            Request.Builder()
                .url(
                    "$webSocketBaseUrl/ws?sessionId=$normalizedSessionId",
                )
                .header(
                    "Authorization",
                    "Bearer $normalizedAccessToken",
                )
                .build()

        val scheduler =
            Executors
                .newSingleThreadScheduledExecutor()

        val socketListener =
            SocketListener(
                parser = parser,
                scheduler = scheduler,
                listener = listener,
            )

        val socket =
            httpClient.newWebSocket(
                request,
                socketListener,
            )

        return Connection(
            socket = socket,
            scheduler = scheduler,
            stopHeartbeat = {
                socketListener.stopHeartbeat()
            },
        )
    }

    private class Connection(
        private val socket: WebSocket,
        private val scheduler: ScheduledExecutorService,
        private val stopHeartbeat: () -> Unit,
    ) : AtoutiaRealtimeConnection {
        override fun close() {
            stopHeartbeat()

            socket.close(
                NORMAL_CLOSE_CODE,
                NORMAL_CLOSE_REASON,
            )

            scheduler.shutdownNow()
        }
    }

    private class SocketListener(
        private val parser: RealtimeMessageParser,
        private val scheduler: ScheduledExecutorService,
        private val listener: AtoutiaRealtimeApi.Listener,
    ) : WebSocketListener() {
        private var heartbeatFuture:
            ScheduledFuture<*>? =
            null

        override fun onOpen(
            webSocket: WebSocket,
            response: Response,
        ) {
            listener.onConnected()

            startHeartbeat(
                webSocket,
            )
        }

        override fun onMessage(
            webSocket: WebSocket,
            text: String,
        ) {
            try {
                listener.onEvent(
                    parser.parse(
                        text,
                    ),
                )
            } catch (
                error: Throwable,
            ) {
                listener.onFailure(
                    error,
                )
            }
        }

        override fun onClosing(
            webSocket: WebSocket,
            code: Int,
            reason: String,
        ) {
            stopHeartbeat()

            webSocket.close(
                code,
                reason,
            )
        }

        override fun onClosed(
            webSocket: WebSocket,
            code: Int,
            reason: String,
        ) {
            stopHeartbeat()

            listener.onDisconnected(
                code,
                reason,
            )
        }

        override fun onFailure(
            webSocket: WebSocket,
            t: Throwable,
            response: Response?,
        ) {
            stopHeartbeat()

            listener.onFailure(
                t,
            )
        }

        private fun startHeartbeat(
            webSocket: WebSocket,
        ) {
            stopHeartbeat()

            heartbeatFuture =
                scheduler.scheduleAtFixedRate(
                    {
                        webSocket.send(
                            HEARTBEAT_MESSAGE,
                        )
                    },
                    HEARTBEAT_INTERVAL_SECONDS,
                    HEARTBEAT_INTERVAL_SECONDS,
                    TimeUnit.SECONDS,
                )
        }

        fun stopHeartbeat() {
            heartbeatFuture
                ?.cancel(
                    true,
                )

            heartbeatFuture =
                null
        }
    }

    private companion object {
        const val NORMAL_CLOSE_CODE =
            1000

        const val NORMAL_CLOSE_REASON =
            "Android client closed"

        const val HEARTBEAT_INTERVAL_SECONDS =
            10L

        val HEARTBEAT_MESSAGE =
            JSONObject()
                .put(
                    "protocolVersion",
                    1,
                )
                .put(
                    "type",
                    "HEARTBEAT",
                )
                .toString()

        fun normalizeWebSocketBaseUrl(
            value: String,
        ): String {
            val trimmed =
                value.trim()

            require(
                trimmed.isNotBlank(),
            ) {
                "Atoutia realtime base URL must not be blank."
            }

            require(
                trimmed == value,
            ) {
                "Atoutia realtime base URL must not contain surrounding whitespace."
            }

            return when {
                trimmed.startsWith(
                    "http://",
                ) ->
                    "ws://" +
                        trimmed
                            .removePrefix(
                                "http://",
                            )
                            .removeSuffix(
                                "/",
                            )

                trimmed.startsWith(
                    "https://",
                ) ->
                    "wss://" +
                        trimmed
                            .removePrefix(
                                "https://",
                            )
                            .removeSuffix(
                                "/",
                            )

                trimmed.startsWith(
                    "ws://",
                ) ||
                    trimmed.startsWith(
                        "wss://",
                    ) ->
                    trimmed.removeSuffix(
                        "/",
                    )

                else ->
                    throw IllegalArgumentException(
                        "Atoutia realtime base URL must use HTTP, HTTPS, WS or WSS.",
                    )
            }
        }

        fun validateSessionId(
            value: String,
        ): String {
            require(
                value.isNotBlank() &&
                    value == value.trim() &&
                    value.startsWith(
                        "ms1_",
                    )
            ) {
                "Invalid Atoutia realtime session ID."
            }

            return value
        }

        fun validateAccessToken(
            value: String,
        ): String {
            require(
                value.isNotBlank() &&
                    value == value.trim() &&
                    value.startsWith(
                        "atk1_",
                    ) &&
                    value.none {
                        it.isWhitespace()
                    }
            ) {
                "Invalid Atoutia realtime access token."
            }

            return value
        }
    }
}