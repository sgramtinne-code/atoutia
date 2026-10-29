package tech.devoo.atoutia.offline

import org.json.JSONObject
import tech.devoo.atoutia.network.game.MatchTeam

internal data class OfflineMatchSummary(val team0: Int, val team1: Int, val winner: MatchTeam) {
    init { require(team0 >= 0 && team1 >= 0) }
}

internal data class OfflineStatistics(
    val wins: Long = 0,
    val losses: Long = 0,
    val lastResult: OfflineMatchSummary? = null,
) {
    init {
        require(wins >= 0 && losses >= 0 && wins <= Long.MAX_VALUE - losses)
        require((wins + losses == 0L) == (lastResult == null))
        if (lastResult != null) require(if (lastResult.winner == MatchTeam.TEAM_0) wins > 0 else losses > 0)
    }
    val completed: Long get() = wins + losses

    fun record(result: OfflineMatchSummary): OfflineStatistics = if (result.winner == MatchTeam.TEAM_0) {
        copy(wins = Math.addExact(wins, 1L), lastResult = result)
    } else {
        copy(losses = Math.addExact(losses, 1L), lastResult = result)
    }
}

/** One atomic document owns the current replay and its statistics checkpoint. */
internal data class OfflineProgress(
    val engineSave: String? = null,
    val resultRecorded: Boolean = false,
    val statistics: OfflineStatistics = OfflineStatistics(),
) {
    init {
        require(engineSave == null || engineSave.length <= MAX_ENGINE_SAVE_LENGTH)
        require(!resultRecorded || (engineSave != null && statistics.completed > 0))
    }

    fun accept(frame: OfflineFrame, newGame: Boolean): OfflineProgress {
        val score = frame.document.snapshot.match.publicMatch.score
        val recorded = !newGame && resultRecorded
        val result = if (score.completed) OfflineMatchSummary(
            score.scores.team0, score.scores.team1, requireNotNull(score.winner),
        ) else null
        if (recorded) require(result != null && result == statistics.lastResult) {
            "Offline result checkpoint does not match the replay."
        }
        return OfflineProgress(
            engineSave = frame.save,
            resultRecorded = result != null,
            statistics = if (!recorded && result != null) statistics.record(result) else statistics,
        )
    }

    fun encode(): String {
        val result = statistics.lastResult?.let {
            JSONObject().put("team0", it.team0).put("team1", it.team1).put("winner", it.winner.name)
        }
        return JSONObject().put("formatVersion", 2)
            .put("engineSave", engineSave ?: JSONObject.NULL)
            .put("resultRecorded", resultRecorded)
            .put("statistics", JSONObject().put("wins", statistics.wins).put("losses", statistics.losses)
                .put("lastResult", result ?: JSONObject.NULL))
            .toString()
    }

    companion object {
        const val MAX_FILE_BYTES = 4 * 1024 * 1024
        private const val MAX_ENGINE_SAVE_LENGTH = 2 * 1024 * 1024

        fun decode(text: String?): OfflineProgress {
            if (text == null) return OfflineProgress()
            require(text.toByteArray(Charsets.UTF_8).size <= MAX_FILE_BYTES)
            val json = JSONObject(text)
            val version = integer(json, "formatVersion")
            if (version == 1L) {
                // Existing APKs saved the engine document directly. Validate its replay in the runtime.
                keys(json, setOf("formatVersion", "botPolicy", "replay"))
                require(json.get("botPolicy") is String && json.get("replay") is JSONObject)
                return OfflineProgress(engineSave = text)
            }
            require(version == 2L) { "Unsupported offline progress version." }
            keys(json, setOf("formatVersion", "engineSave", "resultRecorded", "statistics"))
            val rawSave = json.get("engineSave")
            require(rawSave == JSONObject.NULL || rawSave is String)
            val recorded = json.get("resultRecorded")
            require(recorded is Boolean)
            val stats = json.getJSONObject("statistics")
            keys(stats, setOf("wins", "losses", "lastResult"))
            val last = if (stats.isNull("lastResult")) null else stats.getJSONObject("lastResult").let {
                keys(it, setOf("team0", "team1", "winner"))
                val team0 = integer(it, "team0")
                val team1 = integer(it, "team1")
                require(team0 in 0L..Int.MAX_VALUE.toLong() && team1 in 0L..Int.MAX_VALUE.toLong())
                val winner = it.get("winner")
                require(winner is String)
                OfflineMatchSummary(team0.toInt(), team1.toInt(), MatchTeam.valueOf(winner))
            }
            return OfflineProgress(
                if (rawSave == JSONObject.NULL) null else rawSave as String,
                recorded,
                OfflineStatistics(integer(stats, "wins"), integer(stats, "losses"), last),
            )
        }

        private fun keys(json: JSONObject, expected: Set<String>) {
            require(json.keys().asSequence().toSet() == expected) { "Invalid offline progress fields." }
        }

        private fun integer(json: JSONObject, key: String): Long {
            val value = json.get(key)
            require(value is Int || value is Long) { "Invalid offline integer: $key" }
            return (value as Number).toLong()
        }
    }
}
