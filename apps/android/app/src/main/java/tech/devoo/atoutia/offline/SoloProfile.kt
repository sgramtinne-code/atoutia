package tech.devoo.atoutia.offline

internal data class SoloStage(val number: Int, val title: String, val requiredMatches: Long)

internal data class SoloObjectiveProgress(val id: String, val title: String, val current: Long, val target: Long) {
    val reached: Boolean get() = current >= target
    val displayed: Long get() = current.coerceAtMost(target)
    val fraction: Float get() = displayed.toFloat() / target.toFloat()
}

/** Read-only activity milestones, derived from the existing durable totals. No new reward ledger. */
internal data class SoloProfile(
    val stage: SoloStage,
    val nextStage: SoloStage?,
    val completed: Long,
    val objectives: List<SoloObjectiveProgress>,
) {
    val remaining: Long? get() = nextStage?.let { it.requiredMatches - completed }
    val stageFraction: Float get() = nextStage?.let {
        (completed - stage.requiredMatches).toFloat() / (it.requiredMatches - stage.requiredMatches).toFloat()
    } ?: 1f

    companion object {
        private val stages = listOf(
            SoloStage(1, "Découverte", 0),
            SoloStage(2, "Premiers plis", 1),
            SoloStage(3, "À la table", 5),
            SoloStage(4, "Rendez-vous belote", 10),
            SoloStage(5, "Habitué du solo", 25),
            SoloStage(6, "Fidèle au poste", 50),
            SoloStage(7, "Cent parties", 100),
        )

        fun from(statistics: OfflineStatistics): SoloProfile {
            val index = stages.indexOfLast { statistics.completed >= it.requiredMatches }
            return SoloProfile(stages[index], stages.getOrNull(index + 1), statistics.completed, listOf(
                SoloObjectiveProgress("first-match", "Première partie terminée", statistics.completed, 1),
                SoloObjectiveProgress("first-win", "Première victoire en équipe", statistics.wins, 1),
                SoloObjectiveProgress("five-matches", "Cinq parties terminées", statistics.completed, 5),
                SoloObjectiveProgress("ten-wins", "Dix victoires en équipe", statistics.wins, 10),
                SoloObjectiveProgress("twenty-five-matches", "Vingt-cinq parties terminées", statistics.completed, 25),
                SoloObjectiveProgress("hundred-matches", "Cent parties terminées", statistics.completed, 100),
            ))
        }
    }
}
