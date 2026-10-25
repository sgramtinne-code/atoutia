package tech.devoo.atoutia.ui.history

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.AtoutiaApp
import tech.devoo.atoutia.GoogleSignInResult
import tech.devoo.atoutia.LoadMatchHistoryResult
import tech.devoo.atoutia.SignOutResult
import tech.devoo.atoutia.auth.AuthStartupState
import tech.devoo.atoutia.network.history.MatchHistoryResponse
import tech.devoo.atoutia.network.room.ActiveRoomSessionRecoveryResult
import tech.devoo.atoutia.ui.theme.AtoutiaTheme

// Real app composition with controlled callbacks, no Activity services or private storage.
@RunWith(AndroidJUnit4::class)
class HistoryCallbackInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val pending = mutableListOf<(LoadMatchHistoryResult) -> Unit>()
    private val account = "acc1_00000000000000000000000000000001"
    private val firstSession = "as1_00000000000000000000000000000001"
    private val nextSession = "as1_00000000000000000000000000000002"
    private val loaded = LoadMatchHistoryResult.Loaded(MatchHistoryResponse(1, emptyList()))

    @Before fun showApp() {
        compose.runOnUiThread {
            compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_PORTRAIT
        }
        compose.setContent {
            AtoutiaTheme {
                AtoutiaApp(
                    checkBackend = { error("Unexpected backend check") },
                    restoreAuth = { it(AuthStartupState.Authenticated(account, firstSession)) },
                    restoreActiveRoomSession = { _, callback -> callback(ActiveRoomSessionRecoveryResult.None) },
                    rememberActiveRoomSession = { _, _ -> true },
                    clearActiveRoomSession = {},
                    signInWithGoogle = { it(GoogleSignInResult.Authenticated(account, nextSession, false)) },
                    signOut = { it(SignOutResult.SignedOut(null)) },
                    loadMatchHistory = { pending.add(it) },
                    createPrivateRoom = { error("Unexpected room creation") },
                    joinRoom = { _, _ -> error("Unexpected room join") },
                    startRoom = { _, _ -> error("Unexpected match start") },
                    loadGameSession = { _, _ -> error("Unexpected game load") },
                    refreshGameSession = { _, _ -> error("Unexpected game refresh") },
                    subscribeGameRealtime = { _, _, _, _, _ -> error("Unexpected game subscription") },
                    submitBiddingAction = { _, _, _ -> error("Unexpected bidding") },
                    submitPlayCard = { _, _, _ -> error("Unexpected card play") },
                    leaveRoom = { _, _ -> error("Unexpected room leave") },
                )
            }
        }
        assertHome()
    }

    @Test fun currentResponseDisplaysHistory() {
        reply(openHistory(), loaded)
        compose.onNodeWithText("Aucune partie terminée").assertIsDisplayed()
    }

    @Test fun currentFailureCanRetryAndLoadHistory() {
        reply(openHistory(), LoadMatchHistoryResult.Failed("Échec actuel"))
        compose.onNodeWithText("Échec actuel").assertIsDisplayed()
        compose.onNodeWithText("Réessayer").performClick()
        compose.runOnIdle { assertEquals(2, pending.size) }
        reply(1, loaded)
        compose.onNodeWithText("Aucune partie terminée").assertIsDisplayed()
    }

    @Test fun currentExpiryStillSignsOut() {
        reply(openHistory(), LoadMatchHistoryResult.SessionExpired("Expiration actuelle"))
        compose.onNodeWithText("Aucune session Atoutia").assertIsDisplayed()
    }

    @Test fun expiryAfterBackCannotSignOutTheHomeScreen() {
        val old = openHistory()
        back()
        reply(old, LoadMatchHistoryResult.SessionExpired("Expiration obsolète"))
        assertHome()
        compose.onNodeWithText("Expiration obsolète").assertDoesNotExist()
    }

    @Test fun oldFailureCannotReplaceLoadingOnAReopenedHistoryScreen() {
        val old = openHistory()
        back()
        val current = openHistory()
        reply(old, LoadMatchHistoryResult.Failed("Ancienne erreur"))
        compose.onNodeWithText("Ancienne erreur").assertDoesNotExist()
        compose.onNodeWithText("Chargement de l’historique…").assertIsDisplayed()
        reply(current, loaded)
        compose.onNodeWithText("Aucune partie terminée").assertIsDisplayed()
    }

    @Test fun oldSuccessCannotOverwriteTheNewerFailure() {
        val old = openHistory()
        back()
        val current = openHistory()
        reply(current, LoadMatchHistoryResult.Failed("Erreur de la demande actuelle"))
        reply(old, loaded)
        compose.onNodeWithText("Erreur de la demande actuelle").assertIsDisplayed()
        compose.onNodeWithText("Aucune partie terminée").assertDoesNotExist()
    }

    @Test fun expiryFromBeforeSignOutCannotSignOutTheNewSession() {
        val old = openHistory()
        back()
        compose.onNodeWithText("Se déconnecter").performScrollTo().performClick()
        compose.onNodeWithText("Continuer avec Google").assertIsDisplayed().performClick()
        assertHome()
        reply(old, LoadMatchHistoryResult.SessionExpired("Ancienne session expirée"))
        assertHome()
        compose.onNodeWithText("Ancienne session expirée").assertDoesNotExist()
    }

    private fun assertHome() {
        compose.onNodeWithText("Historique").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Aucune session Atoutia").assertDoesNotExist()
    }

    private fun openHistory(): Int {
        val index = compose.runOnIdle { pending.size }
        compose.onNodeWithText("Historique").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(index + 1, pending.size) }
        return index
    }

    private fun back() { compose.onNodeWithText("Retour").performClick() }
    private fun reply(index: Int, result: LoadMatchHistoryResult) {
        compose.runOnIdle { pending[index](result) }
    }
}
