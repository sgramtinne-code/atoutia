package tech.devoo.atoutia.network.game

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.Closeable
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

interface AtoutiaGameRealtimeSubscription :
    Closeable {
    fun acknowledgeRevision(
        revision:
            Int,
    )
}

class AtoutiaGameRealtimeClient(
    baseUrl:
        String,

    private val webSocketClient:
        WebSocket.Factory =
        OkHttpClient
            .Builder()
            .build(),
    private val executorFactory: () -> ScheduledExecutorService = {
        Executors.newSingleThreadScheduledExecutor { runnable ->
            Thread(runnable, "atoutia-game-realtime").apply { isDaemon = true }
        }
    },
) {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    fun subscribe(
        sessionId:
            String,

        initialRevision:
            Int,

        accessTokenProvider:
            () -> String?,

        onRevisionAvailable:
            (
                Int,
            ) -> Unit,

        onPresence:
            (
                GameRealtimePresence,
            ) -> Unit =
            {},

        onAdjudication:
            (
                GameRealtimeAdjudicationEvent,
            ) -> Unit =
            {},

        onConnectionIssue:
            (
                String,
            ) -> Unit =
            {},
    ): AtoutiaGameRealtimeSubscription {
        require(
            SESSION_ID_PATTERN.matches(
                sessionId,
            ),
        ) {
            "Atoutia realtime session identifier is invalid."
        }

        require(
            initialRevision >=
                0,
        ) {
            "Atoutia realtime initial revision must not be negative."
        }

        return RealtimeSubscription(
            executor = executorFactory(),
            webSocketClient =
                webSocketClient,

            webSocketUrl =
                "$normalizedBaseUrl/ws?sessionId=$sessionId",

            sessionId =
                sessionId,

            initialRevision =
                initialRevision,

            accessTokenProvider =
                accessTokenProvider,

            onRevisionAvailable =
                onRevisionAvailable,

            onPresence =
                onPresence,

            onAdjudication =
                onAdjudication,

            onConnectionIssue =
                onConnectionIssue,
        )
    }

    private class RealtimeSubscription(
        private val executor: ScheduledExecutorService,
        private val webSocketClient:
            WebSocket.Factory,

        private val webSocketUrl:
            String,

        private val sessionId:
            String,

        initialRevision:
            Int,

        private val accessTokenProvider:
            () -> String?,

        private val onRevisionAvailable:
            (
                Int,
            ) -> Unit,

        private val onPresence:
            (
                GameRealtimePresence,
            ) -> Unit,

        private val onAdjudication:
            (
                GameRealtimeAdjudicationEvent,
            ) -> Unit,

        private val onConnectionIssue:
            (
                String,
            ) -> Unit,
    ) : AtoutiaGameRealtimeSubscription {
        private val closed =
            AtomicBoolean(
                false,
            )

        private val socketLock = Any()

        @Volatile
        private var webSocket:
            WebSocket? =
            null

        private var connecting =
            false

        private var reconnectScheduled =
            false

        private var reconnectDelayMs =
            INITIAL_RECONNECT_DELAY_MS

        private var knownRevision =
            initialRevision

        private var lastSignaledRevision =
            initialRevision

        init {
            executeIfActive {
                connect()
            }

            executor.scheduleWithFixedDelay(
                {
                    sendHeartbeat()
                },
                HEARTBEAT_INTERVAL_MS,
                HEARTBEAT_INTERVAL_MS,
                TimeUnit.MILLISECONDS,
            )
        }

        override fun acknowledgeRevision(
            revision:
                Int,
        ) {
            require(
                revision >=
                    0,
            ) {
                "Atoutia realtime acknowledged revision must not be negative."
            }

            executeIfActive {
                if (
                    revision >
                    knownRevision
                ) {
                    knownRevision =
                        revision
                }

                if (
                    revision >
                    lastSignaledRevision
                ) {
                    lastSignaledRevision =
                        revision
                }
            }
        }

        override fun close() {
            if (
                !closed.compareAndSet(
                    false,
                    true,
                )
            ) {
                return
            }

            val activeSocket = synchronized(socketLock) {
                webSocket.also { webSocket = null }
            }
            try {
                activeSocket?.close(NORMAL_CLOSE_CODE, NORMAL_CLOSE_REASON)
            } finally {
                executor.shutdownNow()
            }
        }

        private fun connect() {
            if (
                closed.get() ||
                connecting ||
                webSocket !=
                    null
            ) {
                return
            }

            val accessToken =
                try {
                    accessTokenProvider()
                } catch (
                    error:
                        Exception,
                ) {
                    reportConnectionIssue(
                        error.message
                            ?: "Impossible d’obtenir le jeton Atoutia.",
                    )

                    scheduleReconnect()

                    return
                }

            if (
                accessToken.isNullOrBlank()
            ) {
                reportConnectionIssue(
                    "Aucune session Atoutia active pour la connexion temps réel.",
                )

                scheduleReconnect()

                return
            }

            // Token lookup/refresh may have blocked while the screen was closed.
            if (closed.get()) return

            connecting = true

            val listener =
                object :
                    WebSocketListener() {
                    override fun onOpen(
                        webSocket:
                            WebSocket,

                        response:
                            Response,
                    ) {
                        executeIfActive {
                            if (
                                this@RealtimeSubscription
                                    .webSocket !==
                                webSocket
                            ) {
                                return@executeIfActive
                            }

                            connecting =
                                false

                            reconnectDelayMs =
                                INITIAL_RECONNECT_DELAY_MS
                        }
                    }

                    override fun onMessage(
                        webSocket:
                            WebSocket,

                        text:
                            String,
                    ) {
                        executeIfActive {
                            if (
                                this@RealtimeSubscription
                                    .webSocket !==
                                webSocket
                            ) {
                                return@executeIfActive
                            }

                            handleServerMessage(
                                text,
                            )
                        }
                    }

                    override fun onClosing(
                        webSocket:
                            WebSocket,

                        code:
                            Int,

                        reason:
                            String,
                    ) {
                        webSocket.close(
                            code,
                            reason,
                        )
                    }

                    override fun onClosed(
                        webSocket:
                            WebSocket,

                        code:
                            Int,

                        reason:
                            String,
                    ) {
                        executeIfActive {
                            handleDisconnected(
                                webSocket =
                                    webSocket,

                                message =
                                    if (
                                        code ==
                                            NORMAL_CLOSE_CODE
                                    ) {
                                        null
                                    } else {
                                        "Connexion temps réel Atoutia fermée ($code : $reason)."
                                    },
                            )
                        }
                    }

                    override fun onFailure(
                        webSocket:
                            WebSocket,

                        t:
                            Throwable,

                        response:
                            Response?,
                    ) {
                        executeIfActive {
                            handleDisconnected(
                                webSocket =
                                    webSocket,

                                message =
                                    t.message
                                        ?: "Connexion temps réel Atoutia interrompue.",
                            )
                        }
                    }
                }

            try {
                val request = Request.Builder()
                    .url(webSocketUrl)
                    .header("Authorization", "Bearer $accessToken")
                    .build()
                val createdWebSocket = webSocketClient.newWebSocket(request, listener)
                val retained = synchronized(socketLock) {
                    if (closed.get()) false else {
                        webSocket = createdWebSocket
                        true
                    }
                }
                if (!retained) createdWebSocket.close(NORMAL_CLOSE_CODE, NORMAL_CLOSE_REASON)
            } catch (error: Exception) {
                connecting = false
                if (!closed.get()) {
                    reportConnectionIssue(error.message ?: "Impossible d’ouvrir le temps réel Atoutia.")
                    scheduleReconnect()
                }
            }
        }

        private fun handleServerMessage(
            text:
                String,
        ) {
            val message =
                try {
                    JSONObject(
                        text,
                    )
                } catch (
                    error:
                        Exception,
                ) {
                    reportConnectionIssue(
                        "Message temps réel Atoutia invalide.",
                    )

                    return
                }

            val protocolVersion =
                message.optInt(
                    "protocolVersion",
                    -1,
                )

            if (
                protocolVersion !=
                    REALTIME_PROTOCOL_VERSION
            ) {
                reportConnectionIssue(
                    "Version du protocole temps réel Atoutia non prise en charge.",
                )

                return
            }

            when (
                message.optString(
                    "type",
                )
            ) {
                "SNAPSHOT" -> {
                    handleSnapshotMessage(
                        message,
                    )
                }

                "PRESENCE" -> {
                    handlePresenceMessage(
                        message,
                    )
                }

                "ADJUDICATION" -> {
                    handleAdjudicationMessage(
                        message,
                    )
                }

                "ERROR" -> {
                    val code =
                        message.optString(
                            "code",
                            "UNKNOWN",
                        )

                    reportConnectionIssue(
                        "Erreur temps réel Atoutia : $code.",
                    )
                }

                else -> {
                    reportConnectionIssue(
                        "Type de message temps réel Atoutia non pris en charge.",
                    )
                }
            }
        }

        private fun handleSnapshotMessage(
            message:
                JSONObject,
        ) {
            val snapshot =
                try {
                    message.getJSONObject(
                        "snapshot",
                    )
                } catch (
                    error:
                        Exception,
                ) {
                    reportConnectionIssue(
                        "Snapshot temps réel Atoutia invalide.",
                    )

                    return
                }

            val snapshotSessionId =
                snapshot.optString(
                    "sessionId",
                )

            if (
                snapshotSessionId !=
                    sessionId
            ) {
                reportConnectionIssue(
                    "Snapshot temps réel reçu pour un autre salon.",
                )

                return
            }

            val revision =
                try {
                    snapshot.getInt(
                        "revision",
                    )
                } catch (
                    error:
                        Exception,
                ) {
                    reportConnectionIssue(
                        "Révision temps réel Atoutia invalide.",
                    )

                    return
                }

            if (
                revision <
                    0
            ) {
                reportConnectionIssue(
                    "Révision temps réel Atoutia invalide.",
                )

                return
            }

            if (
                revision <=
                    knownRevision ||
                revision <=
                    lastSignaledRevision
            ) {
                return
            }

            lastSignaledRevision =
                revision

            try {
                onRevisionAvailable(
                    revision,
                )
            } catch (
                error:
                    Exception,
            ) {
                reportConnectionIssue(
                    error.message
                        ?: "Le traitement de la révision temps réel Atoutia a échoué.",
                )
            }
        }

        private fun handlePresenceMessage(
            message:
                JSONObject,
        ) {
            val presence =
                try {
                    GameRealtimeEventParser
                        .parsePresence(
                            message,
                        )
                } catch (
                    error:
                        Exception,
                ) {
                    reportConnectionIssue(
                        error.message
                            ?: "Présence temps réel Atoutia invalide.",
                    )

                    return
                }

            if (
                presence.sessionId !=
                    sessionId
            ) {
                reportConnectionIssue(
                    "Présence temps réel reçue pour un autre salon.",
                )

                return
            }

            try {
                onPresence(
                    presence,
                )
            } catch (
                error:
                    Exception,
            ) {
                reportConnectionIssue(
                    error.message
                        ?: "Le traitement de la présence temps réel Atoutia a échoué.",
                )
            }
        }

        private fun handleAdjudicationMessage(
            message:
                JSONObject,
        ) {
            val event =
                try {
                    GameRealtimeEventParser
                        .parseAdjudication(
                            message,
                        )
                } catch (
                    error:
                        Exception,
                ) {
                    reportConnectionIssue(
                        error.message
                            ?: "Adjudication temps réel Atoutia invalide.",
                    )

                    return
                }

            if (
                event.sessionId !=
                    sessionId
            ) {
                reportConnectionIssue(
                    "Adjudication temps réel reçue pour un autre salon.",
                )

                return
            }

            try {
                onAdjudication(
                    event,
                )
            } catch (
                error:
                    Exception,
            ) {
                reportConnectionIssue(
                    error.message
                        ?: "Le traitement de l’adjudication temps réel Atoutia a échoué.",
                )
            }
        }

        private fun sendHeartbeat() {
            if (
                closed.get() ||
                connecting
            ) {
                return
            }

            val (activeWebSocket, sent) = synchronized(socketLock) {
                if (closed.get()) return
                val active = webSocket ?: return
                active to active.send(HEARTBEAT_MESSAGE)
            }

            if (
                !sent
            ) {
                handleDisconnected(
                    webSocket =
                        activeWebSocket,

                    message =
                        "Le heartbeat temps réel Atoutia n’a pas pu être envoyé.",
                )
            }
        }

        private fun handleDisconnected(
            webSocket:
                WebSocket,

            message:
                String?,
        ) {
            if (
                this.webSocket !==
                    webSocket
            ) {
                return
            }

            this.webSocket =
                null

            connecting =
                false

            lastSignaledRevision =
                knownRevision

            if (
                message !=
                    null
            ) {
                reportConnectionIssue(
                    message,
                )
            }

            scheduleReconnect()
        }

        private fun scheduleReconnect() {
            if (
                closed.get() ||
                reconnectScheduled
            ) {
                return
            }

            reconnectScheduled =
                true

            val delayMs =
                reconnectDelayMs

            reconnectDelayMs =
                (
                    reconnectDelayMs *
                        2
                    ).coerceAtMost(
                    MAX_RECONNECT_DELAY_MS,
                )

            try {
                executor.schedule(
                    {
                        reconnectScheduled = false
                        connect()
                    },
                    delayMs,
                    TimeUnit.MILLISECONDS,
                )
            } catch (error: RejectedExecutionException) {
                reconnectScheduled = false
                if (!closed.get()) throw error
            }
        }

        private fun reportConnectionIssue(
            message:
                String,
        ) {
            if (closed.get()) return

            try {
                onConnectionIssue(
                    message,
                )
            } catch (
                error:
                    Exception,
            ) {
                Unit
            }
        }

        private fun executeIfActive(
            block:
                () -> Unit,
        ) {
            if (
                closed.get()
            ) {
                return
            }

            try {
                executor.execute {
                    if (
                        !closed.get()
                    ) {
                        block()
                    }
                }
            } catch (
                error:
                    RejectedExecutionException,
            ) {
                if (
                    !closed.get()
                ) {
                    throw error
                }
            }
        }

        private companion object {
            const val REALTIME_PROTOCOL_VERSION =
                1

            const val HEARTBEAT_INTERVAL_MS =
                10_000L

            const val INITIAL_RECONNECT_DELAY_MS =
                1_000L

            const val MAX_RECONNECT_DELAY_MS =
                5_000L

            const val NORMAL_CLOSE_CODE =
                1000

            const val NORMAL_CLOSE_REASON =
                "Android game screen closed"

            const val HEARTBEAT_MESSAGE =
                """{"protocolVersion":1,"type":"HEARTBEAT"}"""
        }
    }

    private companion object {
        val SESSION_ID_PATTERN =
            Regex(
                "^ms1_[0-9a-f]{32}$",
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
                "Atoutia realtime base URL must not be empty."
            }

            require(
                trimmed ==
                    value,
            ) {
                "Atoutia realtime base URL must not contain surrounding whitespace."
            }

            require(
                trimmed.startsWith(
                    "http://",
                ) ||
                    trimmed.startsWith(
                        "https://",
                    ),
            ) {
                "Atoutia realtime base URL must use HTTP or HTTPS."
            }

            return trimmed.removeSuffix(
                "/",
            )
        }
    }
}
