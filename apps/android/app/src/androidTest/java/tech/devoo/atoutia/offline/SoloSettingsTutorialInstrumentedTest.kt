package tech.devoo.atoutia.offline

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.network.game.PlayerGameCommand
import tech.devoo.atoutia.ui.theme.AtoutiaTheme
import java.io.File
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/** All disk writes are confined to this test's cache directory; no accounts or backend. */
@RunWith(AndroidJUnit4::class)
class SoloSettingsTutorialInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    private fun landscape() {
        compose.runOnUiThread { compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE }
        compose.waitUntil(5_000) { compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
    }

    private fun waitForTag(tag: String) {
        compose.waitUntil(5_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    private fun waitForSelected(tag: String) {
        compose.waitUntil(5_000) { compose.onAllNodes(hasTestTag(tag) and isSelected()).fetchSemanticsNodes().isNotEmpty() }
    }

    @Test fun settingsSaveAtomicallyRetryFailuresAndReloadWithoutStartingAnyGame() {
        landscape()
        val directory = File(compose.activity.cacheDir, "settings-test-${System.nanoTime()}").also { check(it.mkdirs()) }
        val file = File(directory, "preferences.json")
        val writesFail = AtomicBoolean(false)
        val readsFail = AtomicBoolean(true)
        val starts = AtomicInteger()
        val visible = mutableStateOf(true)
        compose.setContent {
            AtoutiaTheme {
                if (visible.value) GameModeHost(
                    controllerFactory = { starts.incrementAndGet(); error("Settings must not start a runtime") },
                    preferencesLoader = { if (readsFail.get()) throw IOException("Read unavailable"); SoloPreferences.decode(AndroidOfflineSaveStore(file).read()) },
                    preferencesWriter = { if (writesFail.get()) throw IOException("Write unavailable"); AndroidOfflineSaveStore(file).write(it.encode()) },
                    onlineContent = { starts.incrementAndGet(); error("Settings must not start online") },
                )
            }
        }
        try {
            compose.onNodeWithText("Paramètres").assertIsDisplayed().performClick()
            compose.waitUntil(5_000) { compose.onAllNodesWithText("Les réglages solo n’ont pas pu être chargés.").fetchSemanticsNodes().isNotEmpty() }
            compose.onNodeWithText("Les réglages solo n’ont pas pu être chargés.").assertIsDisplayed()
            assertFalse(file.exists())
            readsFail.set(false)
            compose.onNodeWithText("Réessayer").performClick()
            waitForTag("solo-settings")
            compose.onNodeWithTag("solo-pace-NORMAL").performScrollTo().assertIsSelected()
            writesFail.set(true)
            compose.onNodeWithTag("solo-pace-RELAXED").performScrollTo().performClick()
            waitForTag("solo-settings-error")
            compose.onNodeWithTag("solo-settings-error").performScrollTo().assertIsDisplayed()
            compose.onNodeWithTag("solo-pace-NORMAL").performScrollTo().assertIsSelected()
            assertFalse(file.exists())
            writesFail.set(false)
            compose.onNodeWithTag("solo-pace-RELAXED").performScrollTo().performClick()
            waitForSelected("solo-pace-RELAXED")
            compose.onNodeWithTag("solo-confirm-cards").performScrollTo().performClick()
            compose.waitUntil(5_000) { SoloPreferences.decode(AndroidOfflineSaveStore(file).read()).confirmCards }
            val expected = SoloPreferences(SoloPace.RELAXED, true)
            assertEquals(expected, SoloPreferences.decode(AndroidOfflineSaveStore(file).read()))
            compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
            compose.onNodeWithText("Paramètres").performClick()
            waitForTag("solo-settings")
            compose.onNodeWithTag("solo-pace-RELAXED").performScrollTo().assertIsSelected()
            compose.onNodeWithTag("solo-confirm-cards").performScrollTo().assertIsOn()
            // A later failed write must preserve both the committed file and selected value.
            writesFail.set(true)
            compose.onNodeWithTag("solo-pace-FAST").performScrollTo().performClick()
            waitForTag("solo-settings-error")
            compose.onNodeWithTag("solo-settings-error").performScrollTo().assertIsDisplayed()
            assertEquals(expected, SoloPreferences.decode(AndroidOfflineSaveStore(file).read()))
            assertEquals(0, starts.get())
        } finally {
            compose.runOnIdle { visible.value = false }
            directory.deleteRecursively()
        }
    }

    @Test fun tutorialTraversesAllLessonsWithoutReadingOrChangingASavedGame() {
        landscape()
        val starts = AtomicInteger()
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.3f)) {
                AtoutiaTheme {
                    Box(Modifier.requiredSize(640.dp, 320.dp).testTag("learning-viewport")) {
                        GameModeHost(
                            controllerFactory = { starts.incrementAndGet(); error("No game in the tutorial") },
                            statisticsLoader = { error("No statistics read in the tutorial") },
                            preferencesLoader = { error("No preferences read in the tutorial") },
                            preferencesWriter = { error("No preferences write in the tutorial") },
                            onlineContent = { starts.incrementAndGet(); error("No online services in the tutorial") },
                        )
                    }
                }
            }
        }
        val viewport = compose.onNodeWithTag("learning-viewport").getUnclippedBoundsInRoot()
        for (label in listOf("Solo hors ligne", "Jouer en ligne", "Statistiques solo", "Paramètres", "Tutoriel")) {
            val bounds = compose.onNodeWithText(label).assertIsDisplayed().getUnclippedBoundsInRoot()
            assertTrue("Menu choice must be fully visible: $label", bounds.left >= viewport.left && bounds.right <= viewport.right && bounds.top >= viewport.top && bounds.bottom <= viewport.bottom)
        }
        compose.onNodeWithText("Tutoriel").performClick()
        for ((index, lesson) in beloteLessons.withIndex()) {
            compose.onNodeWithTag("tutorial-title").performScrollTo().assertTextEquals(lesson.title)
            compose.onNodeWithTag("tutorial-next").performScrollTo().assertIsNotEnabled()
            compose.onNodeWithTag("tutorial-answer-${(lesson.correct + 1) % 3}").performScrollTo().performClick()
            compose.onNodeWithTag("tutorial-feedback").performScrollTo().assertTextContains("Essaie encore.", substring = true)
            compose.onNodeWithTag("tutorial-next").performScrollTo().assertIsNotEnabled()
            compose.onNodeWithTag("tutorial-answer-${lesson.correct}").performScrollTo().performClick()
            compose.onNodeWithTag("tutorial-next").performScrollTo().assertIsEnabled().performClick()
            if (index == beloteLessons.lastIndex) compose.onNodeWithTag("game-mode-menu").assertIsDisplayed()
        }
        assertEquals(0, starts.get())
        compose.onNodeWithText("Tutoriel").performClick()
        compose.onNodeWithTag("tutorial-title").assertTextEquals(beloteLessons.first().title)
        compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
        compose.onNodeWithTag("game-mode-menu").assertIsDisplayed()
    }

    @Test fun openingSettingsOverOnlineContentPreservesTheExistingScreen() {
        landscape()
        val starts = AtomicInteger()
        val closes = AtomicInteger()
        compose.setContent {
            AtoutiaTheme {
                GameModeHost(initialMode = "ONLINE", controllerFactory = { error("No solo runtime") },
                    onlineContent = { actions ->
                        val instance = remember { starts.incrementAndGet() }
                        DisposableEffect(Unit) { onDispose { closes.incrementAndGet() } }
                        Button(onClick = actions.openSoloSettings) { Text("Online instance $instance") }
                    })
            }
        }
        compose.onNodeWithText("Online instance 1").performClick()
        waitForTag("solo-settings")
        compose.onNodeWithTag("solo-settings").assertIsDisplayed()
        compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
        compose.onNodeWithText("Online instance 1").assertIsDisplayed()
        assertEquals(1, starts.get())
        assertEquals(0, closes.get())
    }

    @Test fun confirmingAndCancellingACardKeepsTheSavedGameUntilTheSingleAcceptedMove() = checkCardPlay(true)
    @Test fun defaultCardPlaySubmitsDirectlyWithoutAConfirmation() = checkCardPlay(false)

    private fun checkCardPlay(confirm: Boolean) {
        landscape()
        val context = compose.activity.applicationContext
        val directory = File(context.cacheDir, "confirm-test-${System.nanoTime()}").also { check(it.mkdirs()) }
        val store = AndroidOfflineSaveStore(File(directory, "solo.json"))
        val settings = AndroidOfflineSaveStore(File(directory, "preferences.json"))
        settings.write(SoloPreferences(SoloPace.RELAXED, confirm).encode())
        val preparing = OfflineSoloController(AndroidOfflineRuntime(context), store) { 37 }
        val initial = try {
            var current = preparing.resumeOrStart()
            val take = current.view.document.snapshot.actions.biddingActions.filterIsInstance<BiddingActionSnapshot.Take>().first()
            current = preparing.human(current.view.revision, PlayerGameCommand.Take(take.suit))
            while (current.view.document.snapshot.actions.mode == PlayerActionMode.WAIT) current = preparing.stepBot(current.view.revision)
            check(current.view.document.snapshot.actions.mode == PlayerActionMode.PLAY_CARD)
            current
        } finally { preparing.close() }
        val card = initial.view.document.snapshot.actions.legalCards.first()
        val before = store.read()
        val humanMoves = AtomicInteger()
        val visible = mutableStateOf(true)
        compose.setContent {
            AtoutiaTheme {
                if (visible.value) GameModeHost(initialMode = "SOLO", controllerFactory = {
                    val runtime = AndroidOfflineRuntime(context)
                    OfflineSoloController(object : OfflineRuntime {
                        override fun request(json: String): String {
                            if (JSONObject(json).getString("method") == "human") humanMoves.incrementAndGet()
                            return runtime.request(json)
                        }
                        override fun close() = runtime.close()
                    }, store) { error("Must restore the existing match") }
                }, preferencesLoader = { SoloPreferences.decode(settings.read()) }, onlineContent = { error("No online services") })
            }
        }
        fun node(card: PlayerCard) = compose.onNodeWithTag("hand-${card.rank.name}-${card.suit.name}", useUnmergedTree = true)
        try {
            compose.waitUntil(20_000) { compose.onAllNodesWithTag("player-hand").fetchSemanticsNodes().isNotEmpty() }
            node(card).assertIsDisplayed().performClick()
            if (confirm) {
                compose.onNodeWithTag("solo-card-confirmation").assertIsDisplayed()
                assertEquals(before, store.read())
                assertEquals(0, humanMoves.get())
                compose.onNodeWithText("Annuler").performClick()
                assertEquals(before, store.read())
                assertEquals(0, humanMoves.get())
                node(card).performClick()
                compose.onNodeWithText("Jouer la carte").performClick()
            }
            compose.waitUntil(10_000) { humanMoves.get() == 1 && store.read() != before }
            compose.onNodeWithTag("solo-card-confirmation").assertDoesNotExist()
            node(card).assertDoesNotExist()
            assertEquals(1, humanMoves.get())
        } finally {
            compose.runOnIdle { visible.value = false }
            directory.deleteRecursively()
        }
    }
}
