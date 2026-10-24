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
    private val httpClient: WebSocket.Factory =
        OkHttpClient(),
    private val schedulerFactory: () -> ScheduledExecutorService = {
        Executors.newSingleThreadScheduledExecutor { runnable ->
            Thread(runnable, "atoutia-lobby-realtime").apply { isDaemon = true }
        }
    },
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

        val scheduler = schedulerFactory()

        val connection = Connection(parser, scheduler, listener)
        try {
            connection.attach(httpClient.newWebSocket(request, connection))
            return connection
        } catch (error: Throwable) {
            connection.close()
            throw error
        }
    }

    private enum class ConnectionState { ACTIVE, CLOSING, TERMINATED, LOCALLY_CLOSED }

    private class Connection(
        private val parser: RealtimeMessageParser,
        private val scheduler: ScheduledExecutorService,
        private val listener: AtoutiaRealtimeApi.Listener,
    ) : WebSocketListener(), AtoutiaRealtimeConnection {
        private val lock = Any()
        private var state = ConnectionState.ACTIVE
        private var socket: WebSocket? = null
        private var heartbeatFuture: ScheduledFuture<*>? = null

        fun attach(created: WebSocket) {
            val retained = synchronized(lock) {
                if (state == ConnectionState.ACTIVE) {
                    socket = created
                    true
                } else false
            }
            if (!retained) created.close(NORMAL_CLOSE_CODE, NORMAL_CLOSE_REASON)
        }

        override fun close() {
            val activeSocket = synchronized(lock) {
                if (state == ConnectionState.LOCALLY_CLOSED || state == ConnectionState.TERMINATED) return
                state = ConnectionState.LOCALLY_CLOSED
                stopWork()
                socket.also { socket = null }
            }
            activeSocket?.close(NORMAL_CLOSE_CODE, NORMAL_CLOSE_REASON)
        }

        override fun onOpen(webSocket: WebSocket, response: Response) {
            if (!isActive()) {
                webSocket.close(NORMAL_CLOSE_CODE, NORMAL_CLOSE_REASON)
                return
            }
            try {
                listener.onConnected()
            } catch (error: Throwable) {
                close()
                throw error
            }
            // onConnected may close the connection; close may also race this callback.
            synchronized(lock) {
                if (state != ConnectionState.ACTIVE) return
                heartbeatFuture = scheduler.scheduleWithFixedDelay(
                    {
                        synchronized(lock) {
                            if (state == ConnectionState.ACTIVE) webSocket.send(HEARTBEAT_MESSAGE)
                        }
                    },
                    HEARTBEAT_INTERVAL_SECONDS,
                    HEARTBEAT_INTERVAL_SECONDS,
                    TimeUnit.SECONDS,
                )
            }
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            if (!isActive()) return
            try {
                listener.onEvent(parser.parse(text))
            } catch (error: Throwable) {
                if (isActive()) listener.onFailure(error)
            }
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            val reply = synchronized(lock) {
                if (state == ConnectionState.ACTIVE) {
                    state = ConnectionState.CLOSING
                    stopWork()
                    true
                } else false
            }
            if (reply) webSocket.close(code, reason)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            if (terminate()) listener.onDisconnected(code, reason)
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            if (terminate()) listener.onFailure(t)
        }

        private fun isActive() = synchronized(lock) { state == ConnectionState.ACTIVE }

        private fun terminate(): Boolean = synchronized(lock) {
            if (state == ConnectionState.LOCALLY_CLOSED || state == ConnectionState.TERMINATED) {
                false
            } else {
                state = ConnectionState.TERMINATED
                socket = null
                stopWork()
                true
            }
        }

        // Called with lock held, on every local or remote terminal path.
        private fun stopWork() {
            heartbeatFuture?.cancel(true)
            heartbeatFuture = null
            scheduler.shutdownNow()
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
