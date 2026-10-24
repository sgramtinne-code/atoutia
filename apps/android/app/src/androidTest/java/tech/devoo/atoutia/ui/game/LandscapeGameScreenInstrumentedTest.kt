package tech.devoo.atoutia.ui.game

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertHasNoClickAction
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.printToString
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.network.game.*
import tech.devoo.atoutia.network.room.PlayerPosition
import tech.devoo.atoutia.ui.theme.AtoutiaTheme

// Pure UI fixtures: no backend, account, persisted membership or authentication storage.
@RunWith(AndroidJUnit4::class)
class LandscapeGameScreenInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val submitted = mutableStateOf<GamePlayCardUiState>(GamePlayCardUiState.Idle)
    private val selected = mutableListOf<PlayerCard>()
    private val bids = mutableListOf<BiddingActionSnapshot>()
    private var replays = 0
    private var retries = 0
    private val sync = mutableStateOf(GameSyncState(connection = GameRealtimeStatus.CONNECTED))
    private val displayedSession = mutableStateOf<PlayerGameSession?>(null)

    @Before fun landscapeHost() {
        compose.runOnUiThread {
            compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        }
        val configuration = compose.activity.resources.configuration
        check(configuration.screenWidthDp >= 640 && configuration.screenHeightDp >= 320) {
            "Use a landscape emulator with at least 640 x 320 dp available."
        }
    }

    @Test fun allEightCardsAreVisibleBeforeAnyScroll() {
        val session = fixture()
        show(session)
        assertHandVisible(session)
        compose.onNodeWithText("Score 82 - 80 / 1000").assertIsDisplayed()
        compose.onNodeWithText("Atout ♣ trèfle").assertIsDisplayed()
        compose.onNodeWithText("Retour à l’accueil").assertIsDisplayed()
    }

    @Test fun largerTextKeepsCardsVisibleAndOnlyLegalIdleCardsSubmit() {
        val session = fixture()
        show(session, fontScale = 1.3f)
        assertHandVisible(session)
        val legal = session.document.snapshot.actions.legalCards.first()
        cardNode(session.document.snapshot.match.hand.first()).assertHasNoClickAction()
        cardNode(legal).performClick()
        compose.runOnIdle { assertEquals(listOf(legal), selected) }
        compose.runOnIdle { submitted.value = GamePlayCardUiState.Submitting }
        cardNode(legal).assertHasNoClickAction()
        compose.onNodeWithText("Retour à l’accueil").assertIsNotEnabled()
        assertHandVisible(session)
    }

    @Test fun updatedSnapshotRemovesPlayedCardAndKeepsRemainingCardsPlayable() {
        val initial = fixture()
        val played = initial.document.snapshot.actions.legalCards.first()
        val snapshot = initial.document.snapshot
        val remaining = snapshot.match.hand.filter { it != played }
        val legal = snapshot.actions.legalCards.filter { it != played }
        // Next local turn after the other three players: the server supplies seven cards.
        val next = initial.copy(revision = initial.revision + 4, document = initial.document.copy(
            snapshot = snapshot.copy(
                match = snapshot.match.copy(hand = remaining, legalCards = legal,
                    publicMatch = snapshot.match.publicMatch.copy(currentTrick =
                        PublicCurrentTrickSnapshot(initial.player, emptyList()))),
                actions = snapshot.actions.copy(legalCards = legal),
            ),
        ))
        show(initial)
        cardNode(played).performClick()
        compose.runOnIdle { displayedSession.value = next }
        cardNode(played).assertDoesNotExist()
        assertHandVisible(next)
        cardNode(legal.first()).performClick()
        compose.runOnIdle { assertEquals(listOf(played, legal.first()), selected) }
    }

    @Test fun scrollingBidsDoesNotMoveTheHandAndPassRemainsReachable() {
        val session = fixture(PlayerActionMode.BID)
        show(session)
        assertHandVisible(session)
        val before = compose.onNodeWithTag("player-hand").getUnclippedBoundsInRoot()
        compose.onNodeWithText("Passer").performScrollTo().assertIsDisplayed().performClick()
        val after = compose.onNodeWithTag("player-hand").getUnclippedBoundsInRoot()
        assertEquals(before, after)
        assertHandVisible(session)
        compose.runOnIdle {
            assertEquals(listOf(BiddingActionSnapshot.Pass(PlayerPosition.PLAYER_0)), bids)
        }
    }

    @Test fun completedMatchHidesHandAndKeepsReplayReachable() {
        submitted.value = GamePlayCardUiState.Failed("Ancienne erreur de carte")
        show(fixture(PlayerActionMode.MATCH_FINISHED))
        compose.onNodeWithTag("player-hand").assertDoesNotExist()
        compose.onNodeWithText("Ancienne erreur de carte").assertDoesNotExist()
        compose.onNodeWithText("Rejouer").performScrollTo().assertIsDisplayed().performClick()
        compose.runOnIdle { assertEquals(1, replays) }
    }

    @Test fun healthySyncHasNoPermanentRefreshButton() {
        val session = fixture()
        show(session)
        compose.onNodeWithText("En direct").assertIsDisplayed()
        compose.onNodeWithText("Actualiser la partie").assertDoesNotExist()
        compose.onNodeWithText("Réessayer").assertDoesNotExist()
        assertHandVisible(session)
    }

    @Test fun retryAppearsOnErrorAndIsDisabledDuringRefreshOrCommand() {
        val session = fixture()
        sync.value = GameSyncState(connection = GameRealtimeStatus.CONNECTED, refreshFailed = true)
        show(session)
        compose.onNodeWithText("Réessayer").performScrollTo().performClick()
        compose.runOnIdle {
            assertEquals(1, retries)
            sync.value = sync.value.copy(refreshing = true)
        }
        compose.onNodeWithText("Réessayer").assertIsNotEnabled()
        compose.runOnIdle {
            sync.value = sync.value.copy(refreshing = false)
            submitted.value = GamePlayCardUiState.Submitting
        }
        compose.onNodeWithText("Réessayer").assertIsNotEnabled()
        assertHandVisible(session)
        compose.runOnIdle {
            submitted.value = GamePlayCardUiState.Idle
            sync.value = GameSyncState(connection = GameRealtimeStatus.CONNECTED)
        }
        compose.onNodeWithText("Réessayer").assertDoesNotExist()
    }

    @Test fun reconnectAndRecoveryKeepTheHandInItsFixedArea() {
        val session = fixture(PlayerActionMode.BID)
        show(session)
        val before = compose.onNodeWithTag("player-hand").getUnclippedBoundsInRoot()
        compose.onNodeWithText("Passer").performScrollTo().assertIsDisplayed()
        compose.runOnIdle { sync.value = GameSyncState(connection = GameRealtimeStatus.RECONNECTING) }
        compose.onNodeWithText("Reconnexion…").assertIsDisplayed()
        compose.onNodeWithText("Réessayer").performScrollTo().assertIsDisplayed()
        assertHandVisible(session)
        compose.runOnIdle { sync.value = GameSyncState(connection = GameRealtimeStatus.CONNECTED) }
        compose.onNodeWithText("Réessayer").assertDoesNotExist()
        compose.onNodeWithText("En direct").assertIsDisplayed()
        assertEquals(before, compose.onNodeWithTag("player-hand").getUnclippedBoundsInRoot())
    }

    private fun cardNode(card: PlayerCard) = compose.onNodeWithTag(
        "hand-${card.rank.name}-${card.suit.name}", useUnmergedTree = true,
    )

    private fun assertHandVisible(session: PlayerGameSession) {
        val viewport = compose.onNodeWithTag("test-viewport").getUnclippedBoundsInRoot()
        val hand = compose.onNodeWithTag("player-hand")
        try {
            hand.assertIsDisplayed()
        } catch (failure: AssertionError) {
            val landscape = compose.onAllNodesWithTag("game-landscape-layout").fetchSemanticsNodes().size
            val stacked = compose.onAllNodesWithTag("game-stacked-layout").fetchSemanticsNodes().size
            throw AssertionError(
                "viewport=$viewport hand=${hand.getUnclippedBoundsInRoot()} " +
                    "landscape=$landscape stacked=$stacked\n" +
                    compose.onRoot(useUnmergedTree = true).printToString(), failure,
            )
        }
        for (card in session.document.snapshot.match.hand) {
            val node = cardNode(card).assertIsDisplayed()
            val bounds = node.getUnclippedBoundsInRoot()
            assertTrue("Card exceeds viewport: $card / $bounds", bounds.left >= viewport.left &&
                bounds.right <= viewport.right && bounds.top >= viewport.top && bounds.bottom <= viewport.bottom)
        }
    }

    private fun show(session: PlayerGameSession, fontScale: Float = 1f) {
        displayedSession.value = session
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) {
                AtoutiaTheme {
                    Box(Modifier.requiredSize(640.dp, 320.dp).testTag("test-viewport")) {
                        GameScreen(
                            session = requireNotNull(displayedSession.value),
                            playCardState = submitted.value,
                            onPlayCard = { selected.add(it) },
                            onBiddingAction = { bids.add(it) },
                            syncState = sync.value,
                            onRefresh = { retries++ },
                            onReturnToHome = {},
                            onReplay = { replays++ },
                            onHistory = {},
                            onHome = {},
                        )
                    }
                }
            }
        }
    }

    private fun fixture(mode: PlayerActionMode = PlayerActionMode.PLAY_CARD): PlayerGameSession {
        val player = PlayerPosition.PLAYER_0
        val completed = mode == PlayerActionMode.MATCH_FINISHED
        val bidding = mode == PlayerActionMode.BID
        val hand = if (completed) emptyList() else listOf(
            PlayerCard(CardSuit.CLUBS, CardRank.SEVEN),
            PlayerCard(CardSuit.CLUBS, CardRank.EIGHT),
            PlayerCard(CardSuit.HEARTS, CardRank.NINE),
            PlayerCard(CardSuit.CLUBS, CardRank.TEN),
            PlayerCard(CardSuit.SPADES, CardRank.JACK),
            PlayerCard(CardSuit.HEARTS, CardRank.QUEEN),
            PlayerCard(CardSuit.DIAMONDS, CardRank.KING),
            PlayerCard(CardSuit.CLUBS, CardRank.ACE),
        ).let { if (bidding) it.take(5) else it }
        val legal = if (mode == PlayerActionMode.PLAY_CARD) hand.filter { it.suit == CardSuit.HEARTS } else emptyList()
        val actions: List<BiddingActionSnapshot> = if (bidding) CardSuit.entries.filter { it != CardSuit.CLUBS }
            .map { BiddingActionSnapshot.Take(player, it) } + BiddingActionSnapshot.Pass(player) else emptyList()
        val publicMatch = PublicMatchSnapshot(
            dealNumber = if (completed) 4 else 2,
            dealer = PlayerPosition.PLAYER_1,
            phase = when { completed -> DealPhase.FINISHED; bidding -> DealPhase.BIDDING; else -> DealPhase.PLAYING },
            score = PublicMatchScoreSnapshot(
                targetScore = if (completed) 501 else 1000,
                scores = TeamPointsSnapshot(if (completed) 568 else 82, 80),
                completed = completed,
                winner = if (completed) MatchTeam.TEAM_0 else null,
            ),
            biddingPlayer = if (bidding) player else null,
            taker = if (bidding) null else PlayerPosition.PLAYER_2,
            trumpSuit = if (bidding) null else CardSuit.CLUBS,
            turnUpCard = PlayerCard(CardSuit.CLUBS, CardRank.QUEEN),
            currentTrick = if (bidding || completed) null else PublicCurrentTrickSnapshot(player,
                listOf(PlayedCardSnapshot(PlayerPosition.PLAYER_3, PlayerCard(CardSuit.HEARTS, CardRank.ACE)))),
        )
        return PlayerGameSession(
            sessionId = "ms1_0123456789abcdef0123456789abcdef",
            player = player,
            revision = 12,
            phase = if (completed) "FINISHED" else "IN_PROGRESS",
            document = PlayerClientSnapshotDocument(1, "0.1.0", PlayerClientSnapshot(
                PlayerMatchSnapshot(publicMatch, player, hand, legal),
                PlayerAvailableActions(player, mode, actions, legal),
            )),
        )
    }
}
