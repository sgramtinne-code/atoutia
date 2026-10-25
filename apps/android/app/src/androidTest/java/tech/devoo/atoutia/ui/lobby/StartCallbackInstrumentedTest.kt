package tech.devoo.atoutia.ui.lobby

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.AtoutiaApp
import tech.devoo.atoutia.LoadGameSessionResult
import tech.devoo.atoutia.StartRoomResult
import tech.devoo.atoutia.auth.AuthStartupState
import tech.devoo.atoutia.network.room.ActiveRoomSessionRecoveryResult
import tech.devoo.atoutia.network.room.LiveRoomSeats
import tech.devoo.atoutia.network.room.LiveRoomSummary
import tech.devoo.atoutia.network.room.MatchMode
import tech.devoo.atoutia.network.room.PlayerPosition
import tech.devoo.atoutia.network.room.RoomLobbyRealtimeCoordinator
import tech.devoo.atoutia.network.room.RoomSessionMembership
import tech.devoo.atoutia.ui.theme.AtoutiaTheme

// Real app and lobby composition. Services and realtime delivery are memory-only.
@RunWith(AndroidJUnit4::class)
class StartCallbackInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val starts = mutableListOf<(StartRoomResult) -> Unit>()
    private val loads = mutableListOf<(LoadGameSessionResult) -> Unit>()
    private val realtime = AtomicReference<RoomLobbyRealtimeCoordinator.Listener?>()
    private val closed = AtomicInteger()
    private val ready = RoomSessionMembership(
        room = LiveRoomSummary(
            sessionId = "ms1_00000000000000000000000000000001",
            mode = MatchMode.PRIVATE,
            revision = 4,
            phase = "READY",
            occupiedSeats = 4,
            seats = LiveRoomSeats(true, true, true, true),
            adjudicationJson = """{"formatVersion":1,"status":"ACTIVE","completion":null,"completedAtMs":null}""",
        ),
        player = PlayerPosition.PLAYER_0,
    )
    private val started = ready.copy(room = ready.room.copy(revision = 5, phase = "IN_PROGRESS"))
    private val loadError = "Échec contrôlé du chargement actuel"

    @Before fun showLobby() {
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
                    restoreAuth = { it(AuthStartupState.Authenticated(
                        "acc1_00000000000000000000000000000001",
                        "as1_00000000000000000000000000000001",
                    )) },
                    restoreActiveRoomSession = { _, callback -> callback(ActiveRoomSessionRecoveryResult.Lobby(ready)) },
                    rememberActiveRoomSession = { _, _ -> error("Unexpected storage write") },
                    clearActiveRoomSession = { error("Unexpected storage clear") },
                    signInWithGoogle = { error("Unexpected sign in") },
                    signOut = { error("Unexpected sign out") },
                    loadMatchHistory = { error("Unexpected history load") },
                    createPrivateRoom = { error("Unexpected room creation") },
                    joinRoom = { _, _ -> error("Unexpected room join") },
                    startRoom = { membership, callback ->
                        assertEquals(ready, membership)
                        starts.add(callback)
                    },
                    loadGameSession = { membership, callback ->
                        assertEquals(started, membership)
                        loads.add(callback)
                    },
                    refreshGameSession = { _, _ -> error("Unexpected game refresh") },
                    subscribeGameRealtime = { _, _, _, _, _ -> error("Unexpected game subscription") },
                    submitBiddingAction = { _, _, _ -> error("Unexpected bidding") },
                    submitPlayCard = { _, _, _ -> error("Unexpected card play") },
                    leaveRoom = { _, _ -> error("Unexpected room leave") },
                    connectLobbyRealtime = { membership, listener ->
                        assertEquals(ready, membership)
                        realtime.set(listener)
                        listener.onConnected()
                        AutoCloseable { closed.incrementAndGet() }
                    },
                )
            }
        }
        compose.waitUntil(timeoutMillis = 5_000) { realtime.get() != null }
        start()
    }

    @Test fun currentHttpSuccessStartsOneLoad() {
        reply(StartRoomResult.Started(started))
        failCurrentLoad()
        assertLoadError()
    }

    @Test fun currentHttpFailureCanRetry() {
        reply(StartRoomResult.Failed("Erreur actuelle du démarrage"))
        compose.onNodeWithText("Erreur actuelle du démarrage").performScrollTo().assertIsDisplayed()
        start()
        compose.runOnIdle {
            assertEquals(2, starts.size)
            starts[1](StartRoomResult.Started(started))
        }
        failCurrentLoad()
        assertLoadError()
    }

    @Test fun currentHttpExpiryStillSignsOut() {
        reply(StartRoomResult.SessionExpired("Expiration actuelle"))
        compose.onNodeWithText("Aucune session Atoutia").assertIsDisplayed()
    }

    @Test fun httpSuccessAfterRealtimeCannotRestartTheCompletedLoad() {
        advanceByRealtimeAndFailLoad()
        reply(StartRoomResult.Started(started))
        assertLoadError()
    }

    @Test fun httpExpiryAfterRealtimeCannotReplaceTheCurrentScreen() {
        advanceByRealtimeAndFailLoad()
        reply(StartRoomResult.SessionExpired("Expiration tardive du démarrage"))
        assertLoadError()
        compose.onNodeWithText("Expiration tardive du démarrage").assertDoesNotExist()
    }

    private fun start() {
        compose.onNodeWithText("Démarrer la partie").performScrollTo().performClick()
        compose.onNodeWithText("Démarrage en cours…").assertIsDisplayed()
    }

    private fun reply(result: StartRoomResult) {
        compose.runOnIdle { starts[0](result) }
    }

    private fun advanceByRealtimeAndFailLoad() {
        compose.runOnIdle { requireNotNull(realtime.get()).onRoomUpdated(started) }
        failCurrentLoad()
        compose.waitUntil(timeoutMillis = 5_000) { closed.get() == 1 }
        assertLoadError()
    }

    private fun failCurrentLoad() {
        compose.onNodeWithText("Chargement de la partie Atoutia…").assertIsDisplayed()
        compose.runOnIdle {
            assertEquals(1, loads.size)
            loads[0](LoadGameSessionResult.Failed(loadError))
        }
    }

    private fun assertLoadError() {
        compose.onNodeWithText(loadError).assertIsDisplayed()
        compose.onNodeWithText("Réessayer").assertIsDisplayed()
        compose.onNodeWithText("Aucune session Atoutia").assertDoesNotExist()
        compose.runOnIdle { assertEquals(1, loads.size) }
    }
}
