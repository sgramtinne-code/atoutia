package tech.devoo.atoutia.offline

import org.json.JSONObject

/** Presentation only: these delays never change the engine, legal moves or bot policy. */
internal enum class SoloPace(val label: String, val delayMillis: Long) {
    RELAXED("Tranquille", 900),
    NORMAL("Normal", 350),
    FAST("Rapide", 150),
}

internal enum class SoloBotTable(val label: String, val policy: String, val description: String) {
    MIXED("Variés", "varied-v1", "Joueur 2 prudent · Joueur 3 solidaire · Joueur 4 audacieux"),
    CAREFUL("Prudents", "careful-v1", "Ils prennent moins de risques et économisent leurs atouts."),
    BOLD("Audacieux", "bold-v1", "Ils prennent plus facilement et cherchent à attaquer les plis."),
    CLASSIC("D’origine", "starter-v1", "Le comportement des premiers PNJ solo."),
    ;

    companion object {
        fun fromPolicy(policy: String): SoloBotTable = entries.firstOrNull { it.policy == policy }
            ?: throw IllegalArgumentException("Unsupported offline bot policy.")
    }
}

internal data class SoloPreferences(
    val pace: SoloPace = SoloPace.NORMAL,
    val confirmCards: Boolean = false,
    val botTable: SoloBotTable = SoloBotTable.MIXED,
) {
    fun encode(): String = JSONObject().put("formatVersion", 2)
        .put("pace", pace.name).put("confirmCards", confirmCards).put("botTable", botTable.name).toString()

    companion object {
        fun decode(text: String?): SoloPreferences {
            if (text == null) return SoloPreferences()
            require(text.length <= 1024) { "Solo preferences are too large." }
            val json = JSONObject(text)
            val version = json.get("formatVersion")
            require(version == 1 || version == 2)
            require(json.keys().asSequence().toSet() == if (version == 1) setOf("formatVersion", "pace", "confirmCards")
                else setOf("formatVersion", "pace", "confirmCards", "botTable"))
            val pace = json.get("pace")
            val confirm = json.get("confirmCards")
            require(pace is String && confirm is Boolean)
            val table = if (version == 1) SoloBotTable.CLASSIC else {
                val value = json.get("botTable")
                require(value is String)
                SoloBotTable.valueOf(value)
            }
            return SoloPreferences(SoloPace.valueOf(pace), confirm, table)
        }
    }
}
