package tech.devoo.atoutia.offline

import org.junit.Assert.*
import org.junit.Test
import tech.devoo.atoutia.network.game.MatchTeam

class SoloProfileTest {
    private fun stats(wins: Long, losses: Long) = OfflineStatistics(wins, losses,
        if (wins + losses == 0L) null else if (wins > 0) OfflineMatchSummary(1001, 814, MatchTeam.TEAM_0)
        else OfflineMatchSummary(814, 1001, MatchTeam.TEAM_1))

    @Test fun emptyProfileStartsAtDiscoveryWithoutAnyCompletedObjective() {
        val profile = SoloProfile.from(OfflineStatistics())
        assertEquals(1, profile.stage.number)
        assertEquals("Découverte", profile.stage.title)
        assertEquals(1L, profile.remaining)
        assertEquals(0f, profile.stageFraction, 0f)
        assertEquals(6, profile.objectives.size)
        assertTrue(profile.objectives.all { !it.reached && it.current == 0L && it.fraction == 0f })
    }

    @Test fun eachStageStartsAtItsThresholdAndProgressStaysInsideTheCurrentInterval() {
        val thresholds = listOf(0L, 1L, 5L, 10L, 25L, 50L, 100L)
        for (number in thresholds.indices) {
            val begin = thresholds[number]
            val profile = SoloProfile.from(stats(0, begin))
            assertEquals(number + 1, profile.stage.number)
            assertEquals(begin, profile.stage.requiredMatches)
            assertEquals(if (number == thresholds.lastIndex) 1f else 0f, profile.stageFraction, 0f)
            val next = thresholds.getOrNull(number + 1)
            if (next == null) {
                assertNull(profile.nextStage)
                assertNull(profile.remaining)
            } else {
                assertEquals(next - begin, profile.remaining)
                val before = SoloProfile.from(stats(0, next - 1))
                assertEquals(number + 1, before.stage.number)
                assertEquals(1L, before.remaining)
                assertTrue(before.stageFraction >= 0f && before.stageFraction < 1f)
            }
        }
    }

    @Test fun completedGamesAndTeamWinsAdvanceDifferentObjectives() {
        val profile = SoloProfile.from(stats(1, 4))
        assertEquals(3, profile.stage.number)
        assertEquals(5L, profile.remaining)
        assertEquals(3, profile.objectives.count { it.reached })
        val goals = profile.objectives.associateBy { it.id }
        assertEquals(1L, goals.getValue("first-match").displayed)
        assertEquals(5L, goals.getValue("five-matches").displayed)
        assertEquals(1L, goals.getValue("ten-wins").current)
        assertFalse(goals.getValue("ten-wins").reached)
        assertEquals(5L, goals.getValue("twenty-five-matches").current)
        assertEquals(0.2f, goals.getValue("twenty-five-matches").fraction, 0f)
        assertEquals(0, SoloProfile.from(stats(0, 10)).objectives.filter { it.id.contains("win") }.count { it.reached })
    }

    @Test fun maximumDurableCountersHaveFiniteClampedProgressWithoutOverflow() {
        val profile = SoloProfile.from(stats(Long.MAX_VALUE, 0))
        assertEquals(7, profile.stage.number)
        assertNull(profile.nextStage)
        assertEquals(1f, profile.stageFraction, 0f)
        assertTrue(profile.objectives.all { it.reached && it.displayed == it.target && it.fraction == 1f })
    }

    @Test fun existingSavesAlreadyDefineTheProfileAndAResumeOrNewGameCannotAwardAgain() {
        fun frame(name: String) = OfflineFrame.parse(javaClass.getResource("/offline/$name.json")!!.readText())
        val legacy = frame("bid").save
        var progress = OfflineProgress.decode(legacy)
        assertEquals(1, SoloProfile.from(progress.statistics).stage.number)
        progress = progress.accept(frame("won"), newGame = false)
        val won = SoloProfile.from(progress.statistics)
        assertEquals(2, won.stage.number)
        assertEquals(2, won.objectives.count { it.reached })
        assertEquals(won, SoloProfile.from(progress.accept(frame("won"), false).statistics))
        assertEquals(won, SoloProfile.from(OfflineProgress.decode(progress.encode()).statistics))
        progress = progress.accept(frame("bid"), newGame = true)
        assertEquals(won, SoloProfile.from(progress.statistics))
        progress = progress.accept(frame("lost"), newGame = false)
        assertEquals(2L, progress.statistics.completed)
        assertEquals(3L, SoloProfile.from(progress.statistics).remaining)
        assertEquals(1L, SoloProfile.from(progress.statistics).objectives.first { it.id == "ten-wins" }.current)
    }
}
