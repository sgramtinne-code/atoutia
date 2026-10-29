package tech.devoo.atoutia.offline

import org.json.JSONObject

/** Presentation only: these delays never change the engine, legal moves or bot policy. */
internal enum class SoloPace(val label: String, val delayMillis: Long) {
    RELAXED("Tranquille", 900),
    NORMAL("Normal", 350),
    FAST("Rapide", 150),
}

internal data class SoloPreferences(
    val pace: SoloPace = SoloPace.NORMAL,
    val confirmCards: Boolean = false,
) {
    fun encode(): String = JSONObject().put("formatVersion", 1)
        .put("pace", pace.name).put("confirmCards", confirmCards).toString()

    companion object {
        fun decode(text: String?): SoloPreferences {
            if (text == null) return SoloPreferences()
            require(text.length <= 1024) { "Solo preferences are too large." }
            val json = JSONObject(text)
            require(json.keys().asSequence().toSet() == setOf("formatVersion", "pace", "confirmCards"))
            require(json.get("formatVersion") == 1)
            val pace = json.get("pace")
            val confirm = json.get("confirmCards")
            require(pace is String && confirm is Boolean)
            return SoloPreferences(SoloPace.valueOf(pace), confirm)
        }
    }
}
