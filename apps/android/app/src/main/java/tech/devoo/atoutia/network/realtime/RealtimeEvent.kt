package tech.devoo.atoutia.network.realtime

sealed interface RealtimeEvent {
    data class Snapshot(
        val sessionId: String,
        val revision: Int,
    ) : RealtimeEvent

    data class Presence(
        val sessionId: String,
    ) : RealtimeEvent

    data class Adjudication(
        val sessionId: String,
    ) : RealtimeEvent

    data class ServerError(
        val code: String,
    ) : RealtimeEvent
}