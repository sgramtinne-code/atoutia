package tech.devoo.atoutia.offline

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import tech.devoo.atoutia.network.game.AtoutiaGameApiException
import tech.devoo.atoutia.network.game.PlayerGameCommand
import java.io.IOException

class OfflineSoloControllerTest {
    private fun fixture(name: String) = javaClass.getResource("/offline/$name.json")!!.readText()
    private class Runtime(var output: String) : OfflineRuntime {
        val requests = mutableListOf<JSONObject>()
        var closed = 0
        override fun request(json: String): String { requests.add(JSONObject(json)); return output }
        override fun close() { closed++ }
    }
    private class Store(var value: String? = null) : OfflineSaveStore {
        var fail = false
        override fun read() = value
        override fun write(save: String) { if (fail) throw IOException("Full"); value = save }
    }

    @Test fun startsWithoutAccountAndResumesExistingReplay() {
        val runtime = Runtime(fixture("bid"))
        val store = Store()
        val first = OfflineSoloController(runtime, store) { 37 }.resumeOrStart()
        assertEquals(0, first.view.revision)
        assertFalse(first.saveFailed)
        assertEquals("start", runtime.requests.single().getString("method"))
        assertEquals(37, runtime.requests.single().getInt("seed"))
        val save = OfflineProgress.decode(store.value).engineSave
        val secondRuntime = Runtime(fixture("bid"))
        val second = OfflineSoloController(secondRuntime, store) { error("Must resume") }.resumeOrStart()
        assertEquals(first, second)
        assertEquals("restore", secondRuntime.requests.single().getString("method"))
        assertEquals(save, secondRuntime.requests.single().getString("save"))
    }

    @Test fun sendsOnlyTheChosenCommandAndExpectedRevision() {
        val runtime = Runtime(fixture("playing"))
        val controller = OfflineSoloController(runtime, Store()) { 37 }
        val playing = controller.snapshot()
        val card = playing.view.document.snapshot.actions.legalCards.first()
        runtime.output = fixture("wait")
        val next = controller.human(playing.view.revision, PlayerGameCommand.PlayCard(card))
        val request = runtime.requests.last()
        assertEquals("human", request.getString("method"))
        assertEquals(playing.view.revision, request.getInt("revision"))
        assertEquals("PLAY_CARD", request.getJSONObject("command").getString("type"))
        assertEquals(card.rank.name, request.getJSONObject("command").getJSONObject("card").getString("rank"))
        assertEquals(playing.view.revision + 1, next.view.revision)
    }

    @Test fun failedSaveKeepsAcceptedActionAndRetryDoesNotResubmitIt() {
        val runtime = Runtime(fixture("playing"))
        val store = Store().also { it.fail = true }
        val controller = OfflineSoloController(runtime, store) { 37 }
        val accepted = controller.human(0, PlayerGameCommand.Pass)
        assertEquals(1, accepted.view.revision)
        assertTrue(accepted.saveFailed)
        store.fail = false
        val saved = controller.snapshot()
        assertFalse(saved.saveFailed)
        assertEquals(accepted.view, saved.view)
        assertEquals(listOf("human", "snapshot"), runtime.requests.map { it.getString("method") })
        assertNotNull(store.value)
    }

    @Test fun closingIsIdempotentAndPreventsFurtherRuntimeCalls() {
        val runtime = Runtime(fixture("bid"))
        val controller = OfflineSoloController(runtime, Store()) { 37 }
        controller.close()
        controller.close()
        assertEquals(1, runtime.closed)
        assertThrows(IllegalStateException::class.java) { controller.startNew() }
        assertTrue(runtime.requests.isEmpty())
    }

    @Test fun sharedParserRejectsDuplicateCardsInLocalSnapshots() {
        val json = JSONObject(fixture("playing"))
        val hand = json.getJSONObject("document").getJSONObject("snapshot").getJSONObject("match").getJSONArray("hand")
        hand.put(hand.getJSONObject(0))
        assertThrows(AtoutiaGameApiException::class.java) { OfflineFrame.parse(json.toString()) }
    }

    @Test fun sharedParserRejectsPrivateEngineDataAndInvalidFrames() {
        val json = JSONObject(fixture("bid"))
        json.getJSONObject("document").put("history", "private")
        assertThrows(AtoutiaGameApiException::class.java) { OfflineFrame.parse(json.toString()) }
        assertThrows(IllegalArgumentException::class.java) { OfflineFrame.parse(JSONObject(fixture("bid")).put("revision", -1).toString()) }
    }

    @Test fun aFreshGameUsesTheRequestedTableAndReturnsItsActivePolicy() {
        val runtime = Runtime(fixture("varied-bid"))
        val store = Store()
        val controller = OfflineSoloController(runtime, store) { 37 }
        val result = controller.resumeOrStart(SoloBotTable.MIXED.policy)
        assertEquals("varied-v1", runtime.requests.single().getString("botPolicy"))
        assertEquals(SoloBotTable.MIXED, result.botTable)
        assertEquals("varied-v1", JSONObject(OfflineProgress.decode(store.value).engineSave!!).getString("botPolicy"))
    }

    @Test fun resumingIgnoresAFuturePreferenceButAnExplicitNewGameCanChangeTheTable() {
        val runtime = Runtime(fixture("bid"))
        val saved = OfflineFrame.parse(fixture("bid")).save
        val store = Store(saved)
        val controller = OfflineSoloController(runtime, store) { 37 }
        val resumed = controller.resumeOrStart(SoloBotTable.BOLD.policy)
        assertEquals("restore", runtime.requests.single().getString("method"))
        assertFalse(runtime.requests.single().has("botPolicy"))
        assertEquals(SoloBotTable.CLASSIC, resumed.botTable)
        runtime.output = fixture("bold-bid")
        val started = controller.startNew(SoloBotTable.BOLD.policy)
        assertEquals("bold-v1", runtime.requests.last().getString("botPolicy"))
        assertEquals(SoloBotTable.BOLD, started.botTable)
        assertEquals(resumed.statistics, started.statistics)
    }

    @Test fun anUnknownPolicyInARuntimeFrameCannotOverwriteProgress() {
        val json = JSONObject(fixture("bid"))
        val save = JSONObject(json.getString("save")).put("botPolicy", "unknown-v1").toString()
        json.put("save", save)
        val original = OfflineFrame.parse(fixture("bid")).save
        val store = Store(original)
        assertThrows(IllegalArgumentException::class.java) {
            OfflineSoloController(Runtime(json.toString()), store) { 37 }.resumeOrStart()
        }
        assertEquals(original, store.value)
    }
}
