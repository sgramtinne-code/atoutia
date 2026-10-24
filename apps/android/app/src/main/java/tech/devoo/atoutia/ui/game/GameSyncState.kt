package tech.devoo.atoutia.ui.game

import tech.devoo.atoutia.network.game.GameRealtimeStatus
import tech.devoo.atoutia.network.game.PlayerActionMode

/** Snapshot sync is separate from card/bid submission and server player presence. */
data class GameSyncState(
    val connection: GameRealtimeStatus = GameRealtimeStatus.CONNECTING,
    val refreshing: Boolean = false,
    val refreshFailed: Boolean = false,
    val revisionBehind: Boolean = false,
) {
    val canRetry: Boolean
        get() = refreshFailed || connection == GameRealtimeStatus.RECONNECTING ||
            connection == GameRealtimeStatus.ERROR

    val label: String
        get() = when {
            connection == GameRealtimeStatus.RECONNECTING -> "Reconnexion…"
            connection == GameRealtimeStatus.ERROR -> "Connexion perturbée"
            refreshing && (refreshFailed || revisionBehind) -> "Actualisation…"
            refreshFailed -> "Actualisation impossible"
            revisionBehind -> "Mise à jour…"
            connection == GameRealtimeStatus.CONNECTING -> "Connexion…"
            else -> "En direct"
        }

    fun needsPolling(mode: PlayerActionMode, completed: Boolean): Boolean =
        !completed && (mode == PlayerActionMode.WAIT ||
            connection != GameRealtimeStatus.CONNECTED || refreshFailed || revisionBehind)
}

/** Main-thread gate shared by realtime, polling and the retry button for one screen. */
class GameRefreshGate {
    var active: Boolean = true
        private set
    private var serial = 0L
    private var request: Long? = null

    fun begin(): Long? {
        if (!active || request != null) return null
        return (++serial).also { request = it }
    }

    fun complete(ticket: Long): Boolean {
        if (!active || request != ticket) return false
        request = null
        return true
    }

    fun close() {
        active = false
        request = null
    }
}
