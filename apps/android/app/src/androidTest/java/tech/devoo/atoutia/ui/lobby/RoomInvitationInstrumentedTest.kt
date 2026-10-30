package tech.devoo.atoutia.ui.lobby

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.util.concurrent.atomic.AtomicReference
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.AtoutiaApp
import tech.devoo.atoutia.JoinRoomResult
import tech.devoo.atoutia.auth.AuthStartupState
import tech.devoo.atoutia.network.room.*
import tech.devoo.atoutia.ui.play.PlayScreen
import tech.devoo.atoutia.ui.play.RoomActionUiState
import tech.devoo.atoutia.ui.theme.AtoutiaTheme

/** Synthetic room/account only. No real backend, recipient or external messaging activity. */
@RunWith(AndroidJUnit4::class)
class RoomInvitationInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val code = "ms1_00000000000000000000000000000001"
    private val room = LiveRoomSummary(code, MatchMode.PRIVATE, 1, "WAITING_FOR_PLAYERS", 1,
        LiveRoomSeats(true, false, false, false),
        """{"formatVersion":1,"status":"ACTIVE","completion":null,"completedAtMs":null}""")

    @Before fun landscape() {
        compose.runOnUiThread { compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE }
        compose.waitUntil(5_000) { compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
    }

    @Composable private fun SmallScreen(content: @Composable () -> Unit) {
        val density = LocalDensity.current
        CompositionLocalProvider(LocalDensity provides Density(density.density, 1.3f)) {
            AtoutiaTheme { Box(Modifier.requiredSize(640.dp, 320.dp)) { content() } }
        }
    }

    private fun clipboard() = compose.activity.getSystemService(ClipboardManager::class.java)
    private fun clearClipboard() = compose.runOnIdle { clipboard().setPrimaryClip(ClipData.newPlainText("", "")) }
    private fun input() = compose.onNodeWithTag("room-invitation-input")
    private fun inputText() = input().fetchSemanticsNode().config[SemanticsProperties.EditableText].text

    @Test fun lobbyCopiesARealSensitiveClipAndBuildsATextOnlyShareFromTheCurrentRoom() {
        var share: Intent? = null
        compose.setContent {
            SmallScreen { RoomLobbyScreen(room, PlayerPosition.PLAYER_0,
                connectRealtime = { _, listener -> listener.onConnected(); AutoCloseable {} },
                onShareInvitation = { share = RoomInvitationActions.shareIntent(it) }) }
        }
        try {
            compose.onNodeWithTag("copy-room-invitation").performScrollTo().assertIsDisplayed().performClick()
            compose.onNodeWithText("Invitation copiée.").performScrollTo().assertIsDisplayed()
            compose.runOnIdle {
                val clip = requireNotNull(clipboard().primaryClip)
                assertEquals(1, clip.itemCount)
                assertEquals(RoomInvitation.create(code), clip.getItemAt(0).text.toString())
                assertEquals(code, RoomInvitationActions.read(compose.activity))
                if (Build.VERSION.SDK_INT >= 33) assertTrue(clip.description.extras!!.getBoolean(ClipDescription.EXTRA_IS_SENSITIVE))
            }
            compose.onNodeWithTag("share-room-invitation").performScrollTo().performClick()
            compose.runOnIdle {
                val intent = requireNotNull(share)
                assertEquals(Intent.ACTION_SEND, intent.action)
                assertEquals("text/plain", intent.type)
                assertEquals(setOf(Intent.EXTRA_TEXT), intent.extras!!.keySet())
                assertEquals(RoomInvitation.create(code), intent.getStringExtra(Intent.EXTRA_TEXT))
                assertNull(intent.data)
                assertNull(intent.clipData)
            }
        } finally { clearClipboard() }
    }

    @Test fun completeInvitationReachesTheAppJoinApiOnlyAfterConfirmationAndCanRetry() {
        val pending = mutableListOf<Pair<String, (JoinRoomResult) -> Unit>>()
        val saved = mutableListOf<RoomSessionMembership>()
        val joined = RoomSessionMembership(room.copy(revision = 2, occupiedSeats = 2,
            seats = LiveRoomSeats(true, true, false, false)), PlayerPosition.PLAYER_1)
        compose.setContent {
            SmallScreen {
                AtoutiaApp(
                    checkBackend = { error("No health probe") },
                    restoreAuth = { it(AuthStartupState.Authenticated("acc1_00000000000000000000000000000001", "as1_00000000000000000000000000000001")) },
                    restoreActiveRoomSession = { _, callback -> callback(ActiveRoomSessionRecoveryResult.None) },
                    rememberActiveRoomSession = { _, membership -> saved.add(membership); true },
                    clearActiveRoomSession = { error("No reference to clear") },
                    signInWithGoogle = { error("No sign in") }, signOut = { error("No sign out") },
                    loadMatchHistory = { error("No history") }, createPrivateRoom = { error("No creation") },
                    joinRoom = { id, callback -> pending.add(id to callback) },
                    startRoom = { _, _ -> error("No start") }, loadGameSession = { _, _ -> error("No game load") },
                    refreshGameSession = { _, _ -> error("No game refresh") },
                    subscribeGameRealtime = { _, _, _, _, _ -> error("No game realtime") },
                    submitBiddingAction = { _, _, _ -> error("No bid") }, submitPlayCard = { _, _, _ -> error("No card") },
                    leaveRoom = { _, _ -> error("No leave") },
                    connectLobbyRealtime = { _, listener -> listener.onConnected(); AutoCloseable {} },
                )
            }
        }
        compose.onNodeWithText("Jouer").performScrollTo().performClick()
        input().performScrollTo().performTextInput(RoomInvitation.create(code))
        compose.runOnIdle { assertTrue(pending.isEmpty()); assertTrue(saved.isEmpty()) }
        compose.onNodeWithText("Rejoindre la partie").performScrollTo().performClick()
        compose.onNodeWithTag("paste-room-invitation").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText("Créer une partie").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText("Retour").performScrollTo().assertIsNotEnabled()
        compose.runOnIdle {
            assertEquals(listOf(code), pending.map { it.first })
            pending[0].second(JoinRoomResult.Failed("Réponse de refus contrôlée"))
        }
        assertEquals(RoomInvitation.create(code), inputText())
        compose.onNodeWithText("Rejoindre la partie").performScrollTo().performClick()
        compose.runOnIdle {
            assertEquals(listOf(code, code), pending.map { it.first })
            pending[1].second(JoinRoomResult.Joined(joined))
        }
        compose.onNodeWithText("Salon Atoutia").performScrollTo().assertIsDisplayed()
        compose.runOnIdle { assertEquals(listOf(joined), saved) }
    }

    @Test fun explicitPasteAcceptsPlainInvitationsAndRejectsUriClipsWithoutChangingTheInput() {
        val value = mutableStateOf("")
        var joins = 0
        compose.setContent {
            SmallScreen { PlayScreen(RoomActionUiState.Idle, value.value, { value.value = it }, {}, { joins++ }, {}) }
        }
        try {
            compose.runOnIdle { clipboard().setPrimaryClip(ClipData.newRawUri("Fausse invitation", Uri.parse("https://invalid.test/invitation"))) }
            compose.onNodeWithTag("paste-room-invitation").performScrollTo().performClick()
            compose.onNodeWithTag("invitation-paste-issue").performScrollTo().assertIsDisplayed()
            compose.runOnIdle { assertEquals("", value.value); assertEquals(0, joins) }
            compose.runOnIdle { RoomInvitationActions.copy(compose.activity, RoomInvitation.create(code)) }
            compose.onNodeWithTag("paste-room-invitation").performScrollTo().performClick()
            compose.runOnIdle { assertEquals(code, value.value); assertEquals(0, joins) }
            compose.runOnIdle { clipboard().setPrimaryClip(ClipData.newPlainText("Invalid", "$code\n$code")) }
            compose.onNodeWithTag("paste-room-invitation").performScrollTo().performClick()
            compose.runOnIdle { assertEquals(code, value.value); assertEquals(0, joins) }
            compose.onNodeWithText("Rejoindre la partie").performScrollTo().assertIsNotEnabled()
            compose.runOnIdle { RoomInvitationActions.copy(compose.activity, RoomInvitation.create(code)) }
            compose.onNodeWithTag("paste-room-invitation").performScrollTo().performClick()
            compose.onNodeWithText("Rejoindre la partie").performScrollTo().assertIsEnabled().performClick()
            compose.runOnIdle { assertEquals(1, joins) }
        } finally { clearClipboard() }
    }

    @Test fun lobbyInvitationActionsRespectFullRoomsAndStartLeaveAndModeChanges() {
        val listener = AtomicReference<RoomLobbyRealtimeCoordinator.Listener?>()
        val start = mutableStateOf<RoomLobbyStartUiState>(RoomLobbyStartUiState.Idle)
        val leave = mutableStateOf<RoomLobbyLeaveUiState>(RoomLobbyLeaveUiState.Idle)
        var sends = 0
        compose.setContent {
            SmallScreen { RoomLobbyScreen(room, PlayerPosition.PLAYER_0, startState = start.value, leaveState = leave.value,
                connectRealtime = { _, sink -> listener.set(sink); sink.onConnected(); AutoCloseable {} },
                onCopyInvitation = { sends++ }, onShareInvitation = { sends++ }) }
        }
        compose.waitUntil(5_000) { listener.get() != null }
        compose.onNodeWithTag("copy-room-invitation").performScrollTo().assertIsEnabled()
        compose.runOnIdle { start.value = RoomLobbyStartUiState.Starting }
        compose.onNodeWithTag("copy-room-invitation").assertIsNotEnabled()
        compose.onNodeWithTag("share-room-invitation").assertIsNotEnabled()
        compose.runOnIdle { start.value = RoomLobbyStartUiState.Idle; leave.value = RoomLobbyLeaveUiState.Leaving }
        compose.onNodeWithTag("copy-room-invitation").assertIsNotEnabled()
        val previousListener = compose.runOnIdle { listener.get() }
        compose.runOnIdle { leave.value = RoomLobbyLeaveUiState.Idle }
        compose.waitUntil(5_000) { listener.get() != null && listener.get() !== previousListener }
        compose.runOnIdle { listener.get()!!.onRoomUpdated(RoomSessionMembership(room.copy(revision = 4, phase = "READY", occupiedSeats = 4,
            seats = LiveRoomSeats(true, true, true, true)), PlayerPosition.PLAYER_0)) }
        compose.onNodeWithTag("copy-room-invitation").assertIsNotEnabled()
        compose.onNodeWithTag("share-room-invitation").assertIsNotEnabled()
        compose.runOnIdle { listener.get()!!.onRoomUpdated(RoomSessionMembership(room.copy(mode = MatchMode.CASUAL, revision = 5), PlayerPosition.PLAYER_0)) }
        compose.onNodeWithTag("copy-room-invitation").assertDoesNotExist()
        compose.runOnIdle { assertEquals(0, sends) }
    }

    @Test fun copyAndShareFailuresRemainRecoverableWithoutClaimingAnInvitationWasSent() {
        val fail = mutableStateOf(true)
        var copies = 0
        var shares = 0
        compose.setContent {
            SmallScreen { RoomLobbyScreen(room, PlayerPosition.PLAYER_0,
                connectRealtime = { _, sink -> sink.onConnected(); AutoCloseable {} },
                onCopyInvitation = { if (fail.value) error("Unavailable") else { assertEquals(code, RoomInvitation.parse(it)); copies++ } },
                onShareInvitation = { if (fail.value) error("Unavailable") else { assertEquals(code, RoomInvitation.parse(it)); shares++ } }) }
        }
        compose.onNodeWithTag("copy-room-invitation").performScrollTo().performClick()
        compose.onNodeWithTag("room-invitation-feedback").performScrollTo().assertTextEquals("Impossible de copier l’invitation. Tu peux sélectionner le code du salon.")
        compose.onNodeWithTag("share-room-invitation").performScrollTo().performClick()
        compose.onNodeWithTag("room-invitation-feedback").performScrollTo().assertTextEquals("Impossible d’ouvrir le partage. Tu peux copier l’invitation.")
        compose.runOnIdle { fail.value = false }
        compose.onNodeWithTag("copy-room-invitation").performScrollTo().performClick()
        compose.onNodeWithTag("share-room-invitation").performScrollTo().performClick()
        compose.onNodeWithTag("room-invitation-feedback").performScrollTo().assertTextEquals("Options de partage ouvertes.")
        compose.runOnIdle { assertEquals(1, copies); assertEquals(1, shares) }
    }

    @Test fun invalidOrOversizedInputCannotJoinAndKeyboardConfirmationHonorsBusyState() {
        val value = mutableStateOf("")
        val state = mutableStateOf<RoomActionUiState>(RoomActionUiState.Idle)
        var reads = 0
        var joins = 0
        compose.setContent {
            SmallScreen { PlayScreen(state.value, value.value, { value.value = it }, {},
                { joins++; state.value = RoomActionUiState.Joining }, {}, readInvitation = { reads++; code }) }
        }
        compose.runOnIdle { assertEquals(0, reads) }
        input().performScrollTo().performTextInput("https://invalid.test/$code")
        compose.onNodeWithText("Rejoindre la partie").performScrollTo().assertIsNotEnabled()
        input().performScrollTo().performTextReplacement("x".repeat(RoomInvitation.MAX_INPUT_LENGTH + 1))
        compose.onNodeWithTag("invitation-paste-issue").performScrollTo().assertTextEquals("L’invitation est trop longue.")
        compose.runOnIdle { assertEquals(0, joins); assertEquals(0, reads) }
        input().performScrollTo().performTextReplacement(code)
        input().performImeAction()
        compose.onNodeWithTag("paste-room-invitation").performScrollTo().assertIsNotEnabled()
        input().assertIsNotEnabled()
        compose.runOnIdle { assertEquals(1, joins); assertEquals(0, reads) }
    }
}
