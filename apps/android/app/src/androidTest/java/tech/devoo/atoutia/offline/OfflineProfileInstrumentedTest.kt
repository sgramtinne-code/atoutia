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
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.network.game.MatchTeam
import tech.devoo.atoutia.ui.theme.AtoutiaTheme
import java.io.File
import java.util.concurrent.atomic.AtomicInteger

/** Local aggregates are synthetic; the active replay uses the real packaged engine. */
@RunWith(AndroidJUnit4::class)
class OfflineProfileInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    private fun landscape() {
        compose.runOnUiThread { compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE }
        compose.waitUntil(5_000) { compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
    }

    private fun waitForTag(tag: String) {
        compose.waitUntil(5_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    @Test fun existingStatisticsDefineTheProfileWithoutChangingTheActiveReplay() {
        landscape()
        val context = compose.activity.applicationContext
        val directory = File(context.cacheDir, "profile-read-${System.nanoTime()}").also { check(it.mkdirs()) }
        val file = File(directory, "solo.json")
        val store = AndroidOfflineSaveStore(file)
        val preparing = OfflineSoloController(AndroidOfflineRuntime(context), store) { 37 }
        try { preparing.resumeOrStart() } finally { preparing.close() }
        val statistics = OfflineStatistics(2, 3, OfflineMatchSummary(814, 1007, MatchTeam.TEAM_1))
        store.write(OfflineProgress.decode(store.read()).copy(statistics = statistics).encode())
        val before = file.readBytes()
        val starts = AtomicInteger()
        val visible = mutableStateOf(true)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.3f)) {
                AtoutiaTheme {
                    if (visible.value) Box(Modifier.requiredSize(640.dp, 320.dp)) {
                        GameModeHost(controllerFactory = {
                            starts.incrementAndGet()
                            OfflineSoloController(AndroidOfflineRuntime(context), store) { error("The saved game must resume") }
                        }, statisticsLoader = { OfflineProgress.decode(AndroidOfflineSaveStore(file).read()).statistics },
                            onlineContent = { error("No online services in the profile") })
                    }
                }
            }
        }
        try {
            compose.onNodeWithText("Statistiques solo").assertIsDisplayed().performClick()
            compose.onNodeWithText("Mon profil solo").performScrollTo().performClick()
            waitForTag("solo-stage")
            compose.onNodeWithText("Palier 3 · À la table").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Encore 5 parties à terminer").performScrollTo().assertIsDisplayed()
            compose.onNodeWithTag("solo-objective-total").performScrollTo().assertTextEquals("Objectifs accomplis : 3/6")
            compose.onNodeWithTag("solo-goal-first-match").performScrollTo().assertTextContains("Accompli · 1/1")
            compose.onNodeWithTag("solo-goal-ten-wins").performScrollTo().assertTextContains("En cours · 2/10")
            compose.onNodeWithTag("solo-goal-hundred-matches").performScrollTo().assertTextContains("En cours · 5/100")
            assertArrayEquals(before, file.readBytes())
            assertEquals(0, starts.get())
            compose.onNodeWithText("Retour aux statistiques").performScrollTo().performClick()
            waitForTag("offline-statistics-ready")
            compose.onNodeWithText("Parties terminées : 5").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Mon profil solo").performScrollTo().performClick()
            waitForTag("solo-stage")
            compose.onNodeWithText("Palier 3 · À la table").performScrollTo().assertIsDisplayed()
            assertArrayEquals(before, file.readBytes())
            compose.onNodeWithText("Retour aux statistiques").performScrollTo().performClick()
            compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
            compose.onNodeWithText("Solo hors ligne").assertIsDisplayed().performClick()
            compose.waitUntil(20_000) { compose.onAllNodesWithTag("player-hand").fetchSemanticsNodes().isNotEmpty() }
            assertEquals(1, starts.get())
            compose.onNodeWithTag("player-hand").assertIsDisplayed()
            assertArrayEquals(before, file.readBytes())
        } finally {
            compose.runOnIdle { visible.value = false }
            directory.deleteRecursively()
        }
    }

    @Test fun damagedProgressRemainsUntouchedAndRetryCanLoadTheRepairedFixture() {
        landscape()
        val directory = File(compose.activity.cacheDir, "profile-invalid-${System.nanoTime()}").also { check(it.mkdirs()) }
        val file = File(directory, "solo.json")
        val store = AndroidOfflineSaveStore(file)
        store.write("{\"formatVersion\":999}")
        val before = file.readBytes()
        val visible = mutableStateOf(true)
        compose.setContent {
            AtoutiaTheme {
                if (visible.value) GameModeHost(initialMode = "PROFILE", controllerFactory = { error("A profile must not start a game") },
                    statisticsLoader = { OfflineProgress.decode(store.read()).statistics }, onlineContent = { error("No online services") })
            }
        }
        try {
            waitForTag("offline-profile-error")
            compose.onNodeWithTag("solo-stage").assertDoesNotExist()
            assertArrayEquals(before, file.readBytes())
            // Test-only repair, never an application reset or a user's file.
            store.write(OfflineProgress().encode())
            val repaired = file.readBytes()
            compose.onNodeWithText("Réessayer").performScrollTo().performClick()
            waitForTag("solo-stage")
            compose.onNodeWithText("Palier 1 · Découverte").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Encore une partie à terminer").performScrollTo().assertIsDisplayed()
            compose.onNodeWithTag("solo-objective-total").performScrollTo().assertTextEquals("Objectifs accomplis : 0/6")
            compose.onNodeWithTag("solo-goal-first-win").performScrollTo().assertTextContains("En cours · 0/1")
            assertArrayEquals(repaired, file.readBytes())
            compose.onNodeWithText("Retour aux statistiques").performScrollTo().performClick()
            waitForTag("offline-statistics-ready")
            compose.onNodeWithText("Parties terminées : 0").performScrollTo().assertIsDisplayed()
        } finally {
            compose.runOnIdle { visible.value = false }
            directory.deleteRecursively()
        }
    }

    @Test fun maximumCountersShowTheCompletedPathWithBoundedProgressBars() {
        landscape()
        compose.setContent {
            AtoutiaTheme {
                GameModeHost(initialMode = "PROFILE", controllerFactory = { error("No engine") },
                    statisticsLoader = { OfflineStatistics(Long.MAX_VALUE, 0, OfflineMatchSummary(1007, 814, MatchTeam.TEAM_0)) },
                    onlineContent = { error("No online services") })
            }
        }
        waitForTag("solo-stage")
        compose.onNodeWithText("Palier 7 · Cent parties").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Tous les paliers sont atteints. Le compteur continue !").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag("solo-stage-progress").assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo(1f, 0f..1f)))
        compose.onNodeWithTag("solo-objective-total").performScrollTo().assertTextEquals("Objectifs accomplis : 6/6")
        compose.onNodeWithTag("solo-goal-hundred-matches").performScrollTo().assertTextContains("Accompli · 100/100")
    }

    @Test fun onlineProfileAndSettingsWindowsKeepTheSameUnderlyingScreen() {
        landscape()
        val starts = AtomicInteger()
        val closes = AtomicInteger()
        compose.setContent {
            AtoutiaTheme {
                GameModeHost(initialMode = "ONLINE", controllerFactory = { error("No solo engine") }, onlineContent = { actions ->
                    val instance = remember { starts.incrementAndGet() }
                    DisposableEffect(Unit) { onDispose { closes.incrementAndGet() } }
                    androidx.compose.foundation.layout.Column {
                        Text("Online instance $instance")
                        Button(onClick = actions.openSoloProfile) { Text("Ouvrir le profil") }
                        Button(onClick = actions.openSoloSettings) { Text("Ouvrir les réglages") }
                    }
                })
            }
        }
        compose.onNodeWithText("Ouvrir le profil").performClick()
        waitForTag("solo-stage")
        compose.onNodeWithText("Profil solo").assertIsDisplayed()
        compose.onNodeWithText("Fermer le profil").performScrollTo().performClick()
        compose.onNodeWithText("Online instance 1").assertIsDisplayed()
        compose.onNodeWithText("Ouvrir les réglages").performClick()
        waitForTag("solo-settings")
        compose.onNodeWithText("Retour à l’accueil").performScrollTo().performClick()
        compose.onNodeWithText("Online instance 1").assertIsDisplayed()
        assertEquals(1, starts.get())
        assertEquals(0, closes.get())
    }
}
