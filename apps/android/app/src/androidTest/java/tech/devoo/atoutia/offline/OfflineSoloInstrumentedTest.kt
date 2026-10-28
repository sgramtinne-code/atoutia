package tech.devoo.atoutia.offline

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.material3.Text
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerGameCommand
import tech.devoo.atoutia.ui.theme.AtoutiaTheme
import java.io.File
import java.util.concurrent.atomic.AtomicInteger

/** Real packaged JS engine, no backend/account; files are confined to a temporary test directory. */
@RunWith(AndroidJUnit4::class)
class OfflineSoloInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun completeMatchResumesFromAtomicFileWithThePackagedEngine() {
        val context = compose.activity.applicationContext
        val directory = File(context.cacheDir, "solo-test-${System.nanoTime()}").also { check(it.mkdirs()) }
        val store = AndroidOfflineSaveStore(File(directory, "solo.json"))
        fun open() = OfflineSoloController(AndroidOfflineRuntime(context), store) { 37 }
        var controller = open()
        try {
            var result = controller.resumeOrStart()
            var completed = false
            for (step in 0 until 2000) {
                assertFalse("Every accepted action must save", result.saveFailed)
                if (step == 12) {
                    val before = result.view
                    controller.close()
                    controller = open()
                    result = controller.resumeOrStart()
                    assertEquals(before, result.view)
                }
                val actions = result.view.document.snapshot.actions
                if (actions.mode == PlayerActionMode.MATCH_FINISHED) { completed = true; break }
                result = when (actions.mode) {
                    PlayerActionMode.BID -> controller.human(result.view.revision,
                        PlayerGameCommand.Take(actions.biddingActions.filterIsInstance<BiddingActionSnapshot.Take>().first().suit))
                    PlayerActionMode.PLAY_CARD -> controller.human(result.view.revision,
                        PlayerGameCommand.PlayCard(actions.legalCards.first()))
                    else -> controller.stepBot(result.view.revision)
                }
            }
            assertTrue("1000-point local match must complete", completed)
            val score = result.view.document.snapshot.match.publicMatch.score
            assertTrue(score.completed)
            assertNotNull(score.winner)
            assertTrue(maxOf(score.scores.team0, score.scores.team1) >= 1000)
            controller.close()
            controller = open()
            assertEquals(result.view, controller.resumeOrStart().view)
        } finally {
            controller.close()
            directory.deleteRecursively()
        }
    }

    @Test fun soloEntryPlaysAndResumesWithoutConstructingOnlineServices() {
        compose.runOnUiThread { compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE }
        compose.waitUntil(5_000) { compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
        val onlineStarts = AtomicInteger()
        val closes = AtomicInteger()
        val context = compose.activity.applicationContext
        val store = object : OfflineSaveStore {
            @Volatile var value: String? = null
            override fun read() = value
            override fun write(save: String) { value = save }
        }
        compose.setContent {
            AtoutiaTheme {
                GameModeHost(controllerFactory = {
                    val runtime = AndroidOfflineRuntime(context)
                    val counted = object : OfflineRuntime {
                        override fun request(json: String) = runtime.request(json)
                        override fun close() { closes.incrementAndGet(); runtime.close() }
                    }
                    OfflineSoloController(counted, store) { 37 }
                }, onlineContent = { onlineStarts.incrementAndGet(); Text("ONLINE TEST") })
            }
        }
        compose.onNodeWithText("Solo hors ligne").performScrollTo().performClick()
        compose.waitUntil(20_000) { store.value != null }
        compose.onNodeWithTag("player-hand").assertIsDisplayed()
        compose.onNode(hasText("Prendre à", substring = true)).performScrollTo().performClick()
        compose.waitUntil(10_000) { store.value?.let { JSONObject(it).getJSONObject("replay").getJSONArray("history").length() == 1 } == true }
        val save = store.value
        compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
        compose.waitUntil(5_000) { closes.get() == 1 }
        assertEquals(0, onlineStarts.get())
        compose.onNodeWithText("Solo hors ligne").performScrollTo().performClick()
        compose.waitUntil(20_000) { compose.onAllNodesWithTag("player-hand").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("player-hand").assertIsDisplayed()
        assertEquals(save, store.value)
        compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
        compose.waitUntil(5_000) { closes.get() == 2 }
        compose.onNodeWithText("Jouer en ligne").performScrollTo().performClick()
        compose.onNodeWithText("ONLINE TEST").assertIsDisplayed()
        assertTrue(onlineStarts.get() > 0)
    }
}
