package tech.devoo.atoutia.offline

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.junit4.StateRestorationTester
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.AtoutiaApp
import tech.devoo.atoutia.BackendCheckState
import tech.devoo.atoutia.GoogleSignInResult
import tech.devoo.atoutia.auth.AuthStartupState
import tech.devoo.atoutia.network.game.MatchTeam
import tech.devoo.atoutia.network.room.ActiveRoomSessionRecoveryResult
import tech.devoo.atoutia.ui.theme.AtoutiaTheme
import java.io.File

/** Real app routing and packaged solo engine; online replies and files are isolated fixtures. */
@RunWith(AndroidJUnit4::class)
class OnlineModeExitInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val authenticated = AuthStartupState.Authenticated(
        "acc1_00000000000000000000000000000001", "as1_00000000000000000000000000000001")

    private class Services(var auth: AuthStartupState? = AuthStartupState.TemporarilyUnavailable("Connexion indisponible.")) {
        val authReplies = mutableListOf<(AuthStartupState) -> Unit>()
        val healthReplies = mutableListOf<(BackendCheckState) -> Unit>()
        var roomRestores = 0
        var clears = 0
        var signOuts = 0
    }

    @Composable private fun Online(services: Services, actions: OnlineModeActions) {
        AtoutiaApp(
            onOpenModes = actions.openModes,
            onOpenSoloSettings = actions.openSoloSettings,
            onOpenSoloProfile = actions.openSoloProfile,
            checkBackend = { services.healthReplies.add(it) },
            restoreAuth = { reply -> services.authReplies.add(reply); services.auth?.let(reply) },
            restoreActiveRoomSession = { _, reply -> services.roomRestores++; reply(ActiveRoomSessionRecoveryResult.None) },
            rememberActiveRoomSession = { _, _ -> error("No room to save") },
            clearActiveRoomSession = { services.clears++ },
            signInWithGoogle = { reply ->
                services.auth = authenticated
                reply(GoogleSignInResult.Authenticated(authenticated.accountId, authenticated.sessionId, false))
            },
            signOut = { services.signOuts++; error("Navigation must not sign out") },
            loadMatchHistory = { error("No history request") },
            createPrivateRoom = { error("No room creation") },
            joinRoom = { _, _ -> error("No room join") },
            startRoom = { _, _ -> error("No match start") },
            loadGameSession = { _, _ -> error("No game load") },
            refreshGameSession = { _, _ -> error("No game refresh") },
            subscribeGameRealtime = { _, _, _, _, _ -> error("No realtime subscription") },
            submitBiddingAction = { _, _, _ -> error("No bidding") },
            submitPlayCard = { _, _, _ -> error("No card submission") },
            leaveRoom = { _, _ -> error("Navigation must not leave a room") },
        )
    }

    private fun landscape() {
        compose.runOnUiThread { compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE }
        compose.waitUntil(5_000) { compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
    }

    private fun waitForTag(tag: String) {
        compose.waitUntil(10_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    @Composable private fun SmallScreen(content: @Composable () -> Unit) {
        val density = LocalDensity.current
        CompositionLocalProvider(LocalDensity provides Density(density.density, 1.3f)) {
            AtoutiaTheme { Box(Modifier.requiredSize(640.dp, 320.dp)) { content() } }
        }
    }

    @Test fun unavailableRememberedOnlineCanReturnToModesAndResumeTheUntouchedSolo() {
        landscape()
        val context = compose.activity.applicationContext
        val directory = File(context.cacheDir, "online-exit-${System.nanoTime()}").also { check(it.mkdirs()) }
        val store = AndroidOfflineSaveStore(File(directory, "solo.json"))
        val preparing = OfflineSoloController(AndroidOfflineRuntime(context), store) { 37 }
        try { preparing.resumeOrStart() } finally { preparing.close() }
        val totals = OfflineStatistics(2, 1, OfflineMatchSummary(1001, 814, MatchTeam.TEAM_0))
        store.write(OfflineProgress.decode(store.read()).copy(statistics = totals).encode())
        val before = store.read()
        val services = Services()
        val modes = mutableListOf<String>()
        val visible = mutableStateOf(true)
        var soloOpens = 0
        compose.setContent {
            SmallScreen {
                if (visible.value) GameModeHost(initialMode = "ONLINE", onModeChanged = { modes.add(it) },
                    controllerFactory = { soloOpens++; OfflineSoloController(AndroidOfflineRuntime(context), store) { error("Resume only") } },
                    onlineContent = { Online(services, it) })
            }
        }
        try {
            compose.onNodeWithText("Session temporairement indisponible").performScrollTo().assertIsDisplayed()
            val exitBounds = compose.onNodeWithTag("online-mode-menu").assertIsDisplayed().fetchSemanticsNode().boundsInRoot
            compose.onNodeWithText("Tester le backend").performScrollTo().assertIsDisplayed().performClick()
            compose.runOnIdle { services.healthReplies.single()(BackendCheckState.Failed("Serveur indisponible.")) }
            compose.onNodeWithText("Backend inaccessible").performScrollTo().assertIsDisplayed()
            assertEquals(exitBounds, compose.onNodeWithTag("online-mode-menu").assertIsDisplayed().fetchSemanticsNode().boundsInRoot)
            compose.onNodeWithTag("online-mode-menu").performClick()
            compose.onNodeWithTag("game-mode-menu").assertIsDisplayed()
            assertEquals(listOf("MENU"), modes)
            assertEquals(before, store.read())
            assertEquals(0, soloOpens)
            compose.onNodeWithText("Solo hors ligne").assertIsDisplayed().performClick()
            waitForTag("player-hand")
            compose.onNodeWithTag("player-hand").assertIsDisplayed()
            assertEquals(1, soloOpens)
            assertEquals(before, store.read())
            assertEquals(totals, OfflineProgress.decode(store.read()).statistics)
            assertEquals(0, services.roomRestores)
            assertEquals(0, services.clears)
            assertEquals(0, services.signOuts)
        } finally {
            compose.runOnIdle { visible.value = false }
            compose.waitForIdle()
            directory.deleteRecursively()
        }
    }

    @Test fun exitDuringLoadingRejectsOldAuthAndBackendRepliesEvenAfterOnlineReopens() {
        landscape()
        val services = Services(null)
        compose.setContent {
            SmallScreen { GameModeHost(initialMode = "ONLINE", controllerFactory = { error("No solo opened") },
                onlineContent = { Online(services, it) }) }
        }
        compose.onNodeWithText("Tester le backend").performScrollTo().performClick()
        compose.onNodeWithTag("online-mode-menu").assertIsEnabled().assertIsDisplayed().performClick()
        compose.onNodeWithTag("game-mode-menu").assertIsDisplayed()
        compose.runOnIdle {
            services.authReplies[0](authenticated)
            services.healthReplies[0](BackendCheckState.Failed("Ancienne réponse"))
            assertEquals(0, services.roomRestores)
        }
        compose.onNodeWithTag("game-mode-menu").assertIsDisplayed()
        compose.onNodeWithText("Jouer en ligne").performClick()
        compose.runOnIdle {
            assertEquals(2, services.authReplies.size)
            services.authReplies[0](authenticated)
            assertEquals(0, services.roomRestores)
            services.authReplies[1](AuthStartupState.TemporarilyUnavailable("Nouvelle réponse"))
        }
        compose.onNodeWithText("Nouvelle réponse").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Ancienne réponse").assertDoesNotExist()
        compose.onNodeWithTag("online-mode-menu").assertIsDisplayed()
    }

    @Test fun signedOutAndAuthenticatedHomeReturnWithoutSigningOutOrClearingTheSavedRoom() {
        landscape()
        val services = Services(AuthStartupState.SignedOut)
        compose.setContent {
            SmallScreen { GameModeHost(initialMode = "ONLINE", controllerFactory = { error("No solo opened") },
                onlineContent = { Online(services, it) }) }
        }
        compose.onNodeWithText("Continuer avec Google").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag("online-mode-menu").assertIsDisplayed().performClick()
        compose.onNodeWithText("Jouer en ligne").performClick()
        compose.onNodeWithText("Continuer avec Google").performScrollTo().performClick()
        compose.onNodeWithText("Prêt à jouer ?").performScrollTo().assertIsDisplayed()
        val before = compose.onNodeWithTag("online-mode-menu").assertIsDisplayed().fetchSemanticsNode().boundsInRoot
        compose.onNodeWithText("Se déconnecter").performScrollTo().assertIsDisplayed()
        assertEquals(before, compose.onNodeWithTag("online-mode-menu").assertIsDisplayed().fetchSemanticsNode().boundsInRoot)
        compose.onNodeWithTag("online-mode-menu").performClick()
        compose.onNodeWithText("Jouer en ligne").performClick()
        compose.onNodeWithText("Prêt à jouer ?").performScrollTo().assertIsDisplayed()
        compose.runOnIdle { assertEquals(0, services.signOuts); assertEquals(0, services.clears) }
    }

    @Test fun restoredMenuDoesNotReenterOnlineAfterTheExplicitExit() {
        landscape()
        val services = Services()
        val restoration = StateRestorationTester(compose)
        restoration.setContent {
            SmallScreen { GameModeHost(initialMode = "ONLINE", controllerFactory = { error("No solo opened") },
                onlineContent = { Online(services, it) }) }
        }
        compose.onNodeWithTag("online-mode-menu").assertIsDisplayed().performClick()
        compose.onNodeWithTag("game-mode-menu").assertIsDisplayed()
        val calls = compose.runOnIdle { services.authReplies.size }
        restoration.emulateSavedInstanceStateRestore()
        compose.onNodeWithTag("game-mode-menu").assertIsDisplayed()
        compose.runOnIdle { assertEquals(calls, services.authReplies.size) }
    }
}
