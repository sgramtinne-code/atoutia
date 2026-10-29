package tech.devoo.atoutia.offline

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import tech.devoo.atoutia.network.game.MatchTeam
import java.io.IOException

class OfflineProgressTest {
    private fun fixture(name: String) = javaClass.getResource("/offline/$name.json")!!.readText()
    private fun frame(name: String) = OfflineFrame.parse(fixture(name))
    private class Runtime(var output: String) : OfflineRuntime {
        val requests = mutableListOf<JSONObject>()
        override fun request(json: String): String { requests.add(JSONObject(json)); return output }
        override fun close() = Unit
    }
    private class Store(var value: String? = null) : OfflineSaveStore {
        var fail = false
        var writes = 0
        override fun read() = value
        override fun write(save: String) {
            if (fail) throw IOException("Full")
            writes++
            value = save
        }
    }

    @Test fun legacyActiveSaveMigratesOnlyAfterTheRuntimeAcceptsItsReplay() {
        val legacy = frame("playing").save
        val store = Store(legacy)
        assertEquals(OfflineStatistics(), OfflineProgress.decode(store.read()).statistics)
        assertEquals(0, store.writes)
        val runtime = Runtime(fixture("playing"))
        val result = OfflineSoloController(runtime, store) { error("Must resume") }.resumeOrStart()
        assertEquals("restore", runtime.requests.single().getString("method"))
        assertEquals(legacy, runtime.requests.single().getString("save"))
        assertEquals(1, result.view.revision)
        assertEquals(0L, result.statistics.completed)
        val persisted = OfflineProgress.decode(store.value)
        assertEquals(legacy, persisted.engineSave)
        assertFalse(persisted.resultRecorded)
        assertEquals(2, JSONObject(store.value!!).getInt("formatVersion"))
    }

    @Test fun legacyCompletedSaveIsCountedOnceWhenOpened() {
        val store = Store(frame("won").save)
        fun open() = OfflineSoloController(Runtime(fixture("won")), store) { error("Must resume") }
        assertEquals(1L, open().resumeOrStart().statistics.wins)
        assertEquals(1L, open().resumeOrStart().statistics.completed)
        assertTrue(OfflineProgress.decode(store.value).resultRecorded)
    }

    @Test fun snapshotsAndReopeningAFinishedGameDoNotCountItAgain() {
        val store = Store()
        val runtime = Runtime(fixture("bid"))
        val controller = OfflineSoloController(runtime, store) { 37 }
        assertEquals(0L, controller.resumeOrStart().statistics.completed)
        runtime.output = fixture("won")
        val finished = controller.snapshot().statistics
        assertEquals(1L, finished.wins)
        assertEquals(0L, finished.losses)
        assertEquals(MatchTeam.TEAM_0, finished.lastResult!!.winner)
        assertEquals(finished, controller.snapshot().statistics)
        controller.close()
        assertEquals(finished, OfflineSoloController(Runtime(fixture("won")), store) { 37 }.resumeOrStart().statistics)
    }

    @Test fun aNewMatchKeepsTotalsAndItsLossIsASecondResult() {
        val runtime = Runtime(fixture("won"))
        val store = Store(frame("won").save)
        val controller = OfflineSoloController(runtime, store) { 37 }
        controller.resumeOrStart()
        runtime.output = fixture("bid")
        assertEquals(1L, controller.startNew().statistics.completed)
        assertFalse(OfflineProgress.decode(store.value).resultRecorded)
        runtime.output = fixture("lost")
        val stats = controller.snapshot().statistics
        assertEquals(2L, stats.completed)
        assertEquals(1L, stats.wins)
        assertEquals(1L, stats.losses)
        assertEquals(MatchTeam.TEAM_1, stats.lastResult!!.winner)
        assertEquals(frame("lost").document.snapshot.match.publicMatch.score.scores.team1, stats.lastResult.team1)
    }

    @Test fun retryingAFailedCompletionWriteSavesTheSameSingleResult() {
        val runtime = Runtime(fixture("bid"))
        val store = Store()
        val controller = OfflineSoloController(runtime, store) { 37 }
        controller.resumeOrStart()
        store.fail = true
        runtime.output = fixture("won")
        val failed = controller.snapshot()
        assertTrue(failed.saveFailed)
        assertEquals(1L, failed.statistics.completed)
        assertEquals(0L, OfflineProgress.decode(store.value).statistics.completed)
        store.fail = false
        val retried = controller.snapshot()
        assertFalse(retried.saveFailed)
        assertEquals(failed.statistics, retried.statistics)
        assertEquals(listOf("start", "snapshot", "snapshot"), runtime.requests.map { it.getString("method") })
        assertEquals(1L, OfflineSoloController(Runtime(fixture("won")), store) { 37 }.resumeOrStart().statistics.completed)
    }

    @Test fun reopeningAfterAnUnwrittenFinishDoesNotCreateAnExtraResult() {
        val store = Store()
        val runtime = Runtime(fixture("bid"))
        val first = OfflineSoloController(runtime, store) { 37 }
        first.resumeOrStart()
        val committed = store.value
        store.fail = true
        runtime.output = fixture("won")
        assertEquals(1L, first.snapshot().statistics.completed)
        first.close()
        assertEquals(committed, store.value)
        store.fail = false
        val reopenedRuntime = Runtime(fixture("bid"))
        val reopened = OfflineSoloController(reopenedRuntime, store) { 37 }
        assertEquals(0L, reopened.resumeOrStart().statistics.completed)
        reopenedRuntime.output = fixture("won")
        assertEquals(1L, reopened.snapshot().statistics.completed)
        assertEquals(1L, reopened.snapshot().statistics.completed)
    }

    @Test fun invalidProgressCannotOverwriteTheSavedFileOrStartTheRuntime() {
        val empty = OfflineProgress(engineSave = frame("bid").save).encode()
        val invalid = listOf(
            JSONObject(empty).put("formatVersion", 3).toString(),
            JSONObject(empty).put("resultRecorded", "false").toString(),
            JSONObject(empty).put("extra", true).toString(),
            empty.replace("\"wins\":0", "\"wins\":-1"),
            empty.replace("\"wins\":0", "\"wins\":1.5"),
            empty.replace("\"wins\":0", "\"wins\":\"0\""),
        )
        for (value in invalid) {
            val store = Store(value)
            val runtime = Runtime(fixture("bid"))
            val controller = OfflineSoloController(runtime, store) { 37 }
            assertThrows(Exception::class.java) { controller.resumeOrStart() }
            assertThrows(Exception::class.java) { controller.startNew() }
            assertEquals(value, store.value)
            assertEquals(0, store.writes)
            assertTrue(runtime.requests.isEmpty())
        }
        assertThrows(IllegalArgumentException::class.java) {
            OfflineStatistics(Long.MAX_VALUE, 1L, OfflineMatchSummary(1001, 1002, MatchTeam.TEAM_1))
        }
    }

    @Test fun aCountedCheckpointMustMatchTheRestoredGame() {
        val won = frame("won")
        val checkpoint = OfflineProgress().accept(won, newGame = false).encode()
        for (name in listOf("bid", "lost")) {
            val store = Store(checkpoint)
            assertThrows(IllegalArgumentException::class.java) {
                OfflineSoloController(Runtime(fixture(name)), store) { 37 }.resumeOrStart()
            }
            assertEquals(checkpoint, store.value)
            assertEquals(0, store.writes)
        }
    }
}
