package tech.devoo.atoutia.offline

import org.json.JSONObject
import tech.devoo.atoutia.network.game.PlayerClientSnapshotDocument
import tech.devoo.atoutia.network.game.PlayerGameCommand
import tech.devoo.atoutia.network.game.PlayerSnapshotJson
import tech.devoo.atoutia.network.room.PlayerPosition
import tech.devoo.atoutia.ui.game.GameViewState
import java.util.concurrent.atomic.AtomicBoolean

internal interface OfflineRuntime : AutoCloseable {
    /** Called from a single IO worker; never from the UI thread. */
    fun request(json: String): String
}

internal interface OfflineSaveStore {
    fun read(): String?
    fun write(save: String)
}

internal data class OfflineFrame(val revision: Int, val document: PlayerClientSnapshotDocument, val save: String) {
    companion object {
        fun parse(text: String): OfflineFrame {
            require(text.length <= 4 * 1024 * 1024) { "Offline response is too large." }
            val json = JSONObject(text)
            val revision = json.getInt("revision")
            require(revision >= 0)
            val document = PlayerSnapshotJson.parseDocument(json.getJSONObject("document").toString())
            require(document.snapshot.match.player == PlayerPosition.PLAYER_0)
            val save = json.getString("save")
            require(save.length <= 2 * 1024 * 1024)
            return OfflineFrame(revision, document, save)
        }
    }
}

internal data class OfflineUpdate(val view: GameViewState, val saveFailed: Boolean, val statistics: OfflineStatistics)

/** Coordinates only the local runtime/file. It never constructs an account or HTTP API. */
internal class OfflineSoloController(
    private val runtime: OfflineRuntime,
    private val store: OfflineSaveStore,
    private val nextSeed: () -> Int,
) : AutoCloseable {
    private val closed = AtomicBoolean(false)
    private var progress: OfflineProgress? = null
    private fun loadProgress(): OfflineProgress = progress ?: OfflineProgress.decode(store.read()).also { progress = it }

    private fun execute(input: JSONObject, newGame: Boolean = false): OfflineUpdate {
        check(!closed.get()) { "Offline controller is closed." }
        val before = loadProgress()
        val frame = OfflineFrame.parse(runtime.request(input.toString()))
        check(!closed.get()) { "Offline controller was closed during the request." }
        val updated = before.accept(frame, newGame)
        progress = updated
        // A command may already have been applied: a save failure must not replay it.
        val saveFailed = try { store.write(updated.encode()); false } catch (_: Exception) { true }
        return OfflineUpdate(GameViewState(frame.revision, PlayerPosition.PLAYER_0, frame.document), saveFailed, updated.statistics)
    }

    fun resumeOrStart(): OfflineUpdate {
        val save = loadProgress().engineSave
        return if (save == null) startNew() else execute(JSONObject().put("method", "restore").put("save", save))
    }

    fun startNew(): OfflineUpdate = execute(JSONObject().put("method", "start").put("seed", nextSeed()), newGame = true)
    fun snapshot(): OfflineUpdate = execute(JSONObject().put("method", "snapshot"))
    fun stepBot(revision: Int): OfflineUpdate = execute(JSONObject().put("method", "bot").put("revision", revision))

    fun human(revision: Int, command: PlayerGameCommand): OfflineUpdate {
        val payload = when (command) {
            PlayerGameCommand.Pass -> JSONObject().put("type", "PASS")
            is PlayerGameCommand.Take -> JSONObject().put("type", "TAKE").put("suit", command.suit.name)
            is PlayerGameCommand.PlayCard -> JSONObject().put("type", "PLAY_CARD").put("card", JSONObject().put("suit", command.card.suit.name).put("rank", command.card.rank.name))
        }
        return execute(JSONObject().put("method", "human").put("revision", revision).put("command", payload))
    }

    override fun close() {
        if (closed.compareAndSet(false, true)) runtime.close()
    }
}
