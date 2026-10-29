package tech.devoo.atoutia.offline

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.MatchTeam
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerGameCommand
import tech.devoo.atoutia.ui.theme.AtoutiaTheme
import java.io.File

/** Only synthetic saves in unique cache directories; real packaged JavaScript policies. */
@RunWith(AndroidJUnit4::class)
class OfflineBotStylesInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private fun landscape() {
        compose.runOnUiThread { compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE }
        compose.waitUntil(5_000) { compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
    }
    private fun waitForTag(tag: String) {
        compose.waitUntil(10_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }
    private fun waitForSelection(tag: String) {
        compose.waitUntil(5_000) { compose.onAllNodes(hasTestTag(tag) and isSelected()).fetchSemanticsNodes().isNotEmpty() }
    }

    @Test fun variedBotsCompleteAndResumeARealMatchWithoutChangingItsSavedPolicy() {
        val context = compose.activity.applicationContext
        val directory = File(context.cacheDir, "styled-match-${System.nanoTime()}").also { check(it.mkdirs()) }
        val store = AndroidOfflineSaveStore(File(directory, "solo.json"))
        fun open() = OfflineSoloController(AndroidOfflineRuntime(context), store) { 37 }
        var controller = open()
        try {
            var result = controller.resumeOrStart(SoloBotTable.MIXED.policy)
            for (step in 0 until 2000) {
                assertFalse(result.saveFailed)
                assertEquals(SoloBotTable.MIXED, result.botTable)
                if (step == 12) {
                    val before = result.view
                    controller.close()
                    controller = open()
                    result = controller.resumeOrStart(SoloBotTable.BOLD.policy)
                    assertEquals(before, result.view)
                    assertEquals(SoloBotTable.MIXED, result.botTable)
                }
                val actions = result.view.document.snapshot.actions
                if (actions.mode == PlayerActionMode.MATCH_FINISHED) break
                result = when (actions.mode) {
                    PlayerActionMode.BID -> controller.human(result.view.revision,
                        PlayerGameCommand.Take(actions.biddingActions.filterIsInstance<BiddingActionSnapshot.Take>().first().suit))
                    PlayerActionMode.PLAY_CARD -> controller.human(result.view.revision, PlayerGameCommand.PlayCard(actions.legalCards.first()))
                    else -> controller.stepBot(result.view.revision)
                }
            }
            assertTrue(result.view.document.snapshot.match.publicMatch.score.completed)
            assertEquals(1L, result.statistics.completed)
            assertEquals("varied-v1", JSONObject(OfflineProgress.decode(store.read()).engineSave!!).getString("botPolicy"))
            assertEquals(result.statistics, controller.snapshot().statistics)
            controller.close()
            controller = open()
            val resumed = controller.resumeOrStart(SoloBotTable.CAREFUL.policy)
            assertEquals(result.view, resumed.view)
            assertEquals(SoloBotTable.MIXED, resumed.botTable)
            val next = controller.startNew(SoloBotTable.CAREFUL.policy)
            assertEquals(SoloBotTable.CAREFUL, next.botTable)
            assertEquals(result.statistics, next.statistics)
        } finally { controller.close(); directory.deleteRecursively() }
    }

    @Test fun aFutureChoiceKeepsOriginalBotsUntilNewGameConfirmationAndPreservesStatistics() {
        landscape()
        val context = compose.activity.applicationContext
        val directory = File(context.cacheDir, "styled-ui-${System.nanoTime()}").also { check(it.mkdirs()) }
        val store = AndroidOfflineSaveStore(File(directory, "solo.json"))
        val preferences = AndroidOfflineSaveStore(File(directory, "preferences.json"))
        preferences.write("{\"formatVersion\":1,\"pace\":\"NORMAL\",\"confirmCards\":false}")
        val preparing = OfflineSoloController(AndroidOfflineRuntime(context), store) { 37 }
        try { preparing.resumeOrStart() } finally { preparing.close() }
        val totals = OfflineStatistics(2, 1, OfflineMatchSummary(1001, 814, MatchTeam.TEAM_0))
        store.write(OfflineProgress.decode(store.read()).copy(statistics = totals).encode())
        val before = store.read()
        val visible = mutableStateOf(true)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.3f)) {
                AtoutiaTheme {
                    if (visible.value) Box(Modifier.requiredSize(640.dp, 360.dp)) {
                        GameModeHost(controllerFactory = { OfflineSoloController(AndroidOfflineRuntime(context), store) { 91 } },
                            preferencesLoader = { SoloPreferences.decode(preferences.read()) },
                            preferencesWriter = { preferences.write(it.encode()) }, onlineContent = { error("No online services") })
                    }
                }
            }
        }
        try {
            compose.onNodeWithText("Paramètres").performClick()
            waitForTag("solo-settings")
            compose.onNodeWithTag("solo-bots-CLASSIC").performScrollTo().assertIsSelected()
            compose.onNodeWithTag("solo-bots-MIXED").performScrollTo().performClick()
            compose.waitUntil(5_000) { SoloPreferences.decode(preferences.read()).botTable == SoloBotTable.MIXED }
            waitForSelection("solo-bots-MIXED")
            compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
            assertEquals(before, store.read())
            compose.onNodeWithText("Solo hors ligne").performClick()
            waitForTag("solo-active-bots")
            compose.onNodeWithTag("solo-active-bots").performScrollTo().assertTextEquals("PNJ actuels : D’origine")
            assertEquals(before, store.read())
            compose.onNodeWithTag("player-hand").assertIsDisplayed()
            compose.onNodeWithTag("solo-new-game").performScrollTo().performClick()
            compose.onNodeWithText("Annuler").performClick()
            assertEquals(before, store.read())
            compose.onNodeWithTag("solo-active-bots").assertTextEquals("PNJ actuels : D’origine")
            compose.onNodeWithTag("solo-new-game").performScrollTo().performClick()
            compose.onNodeWithText("Nouvelle partie").performClick()
            compose.waitUntil(10_000) { OfflineProgress.decode(store.read()).engineSave?.let { JSONObject(it).getString("botPolicy") == "varied-v1" } == true }
            compose.onNodeWithTag("solo-active-bots").performScrollTo().assertTextEquals("PNJ actuels : Variés")
            compose.onNodeWithTag("player-hand").assertIsDisplayed()
            val after = OfflineProgress.decode(store.read())
            assertEquals(totals, after.statistics)
            assertEquals(91, JSONObject(after.engineSave!!).getJSONObject("replay").getInt("baseSeed"))
        } finally {
            compose.runOnIdle { visible.value = false }
            directory.deleteRecursively()
        }
    }

    @Test fun allTablesPersistAndLegacyPreferencesKeepPaceAndCardConfirmation() {
        landscape()
        val directory = File(compose.activity.cacheDir, "styled-preferences-${System.nanoTime()}").also { check(it.mkdirs()) }
        val store = AndroidOfflineSaveStore(File(directory, "preferences.json"))
        store.write("{\"formatVersion\":1,\"pace\":\"FAST\",\"confirmCards\":true}")
        val visible = mutableStateOf(true)
        compose.setContent {
            AtoutiaTheme {
                if (visible.value) GameModeHost(initialMode = "SETTINGS", controllerFactory = { error("No engine in settings") },
                    preferencesLoader = { SoloPreferences.decode(store.read()) }, preferencesWriter = { store.write(it.encode()) },
                    onlineContent = { error("No online services") })
            }
        }
        try {
            waitForTag("solo-settings")
            compose.onNodeWithTag("solo-bots-CLASSIC").performScrollTo().assertIsSelected()
            compose.onNodeWithTag("solo-pace-FAST").performScrollTo().assertIsSelected()
            compose.onNodeWithTag("solo-confirm-cards").performScrollTo().assertIsOn()
            for (table in SoloBotTable.entries) {
                compose.onNodeWithTag("solo-bots-${table.name}").performScrollTo().performClick()
                compose.waitUntil(5_000) { SoloPreferences.decode(store.read()).botTable == table }
                waitForSelection("solo-bots-${table.name}")
                compose.onNodeWithTag("solo-bots-${table.name}").assertIsSelected()
                assertEquals(SoloPreferences(SoloPace.FAST, true, table), SoloPreferences.decode(store.read()))
                assertEquals(2, JSONObject(store.read()!!).getInt("formatVersion"))
            }
        } finally {
            compose.runOnIdle { visible.value = false }
            directory.deleteRecursively()
        }
    }
}
