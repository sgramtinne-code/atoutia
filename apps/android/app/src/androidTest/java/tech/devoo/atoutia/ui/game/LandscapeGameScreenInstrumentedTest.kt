package tech.devoo.atoutia.ui.game

import android.graphics.Bitmap
import java.io.File
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.assertHasNoClickAction
import androidx.compose.ui.test.assertTextEquals
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
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.click
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToIndex
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.DpRect
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
    private var histories = 0
    private var homes = 0
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
        compose.onNodeWithTag("hud-own-score", useUnmergedTree = true).assertIsDisplayed().assertTextEquals("82")
        compose.onNodeWithTag("hud-opponent-score", useUnmergedTree = true).assertIsDisplayed().assertTextEquals("80")
        compose.onNodeWithText("Objectif : 1000").assertIsDisplayed()
        compose.onNodeWithText("Atout ♣ trèfle").assertIsDisplayed()
        compose.onNodeWithText("Retour à l’accueil").assertIsDisplayed()
    }

    @Test fun activeScoresAndRolesFollowEverySeatAndUpdateWithSnapshot() {
        val initial = fixture()
        show(initial, fontScale = 1.3f)
        for (player in PlayerPosition.entries) {
            val ownTeam0 = player == PlayerPosition.PLAYER_0 || player == PlayerPosition.PLAYER_2
            val viewer = forViewer(initial, player, null)
            val snapshot = viewer.document.snapshot
            val match = snapshot.match.publicMatch
            compose.runOnIdle {
                displayedSession.value = viewer.copy(revision = 42, document = viewer.document.copy(snapshot = snapshot.copy(
                    match = snapshot.match.copy(publicMatch = match.copy(score = match.score.copy(
                        targetScore = 1500, scores = TeamPointsSnapshot(1120, 980),
                    ))),
                )))
            }
            compose.onNodeWithTag("hud-own-score", useUnmergedTree = true).assertIsDisplayed()
                .assertTextEquals(if (ownTeam0) "1120" else "980")
            compose.onNodeWithTag("hud-opponent-score", useUnmergedTree = true).assertIsDisplayed()
                .assertTextEquals(if (ownTeam0) "980" else "1120")
            compose.onNodeWithTag("hud-target").assertIsDisplayed().assertTextEquals("Objectif : 1500")
            for (tag in listOf("hud-own-score", "hud-opponent-score")) {
                assertCompleteText("$tag-label")
                assertCompleteText(tag)
            }
            for (seat in PlayerPosition.entries) {
                val sameTeam = (seat == PlayerPosition.PLAYER_0 || seat == PlayerPosition.PLAYER_2) == ownTeam0
                compose.onNodeWithTag("table-role-${seat.name}", useUnmergedTree = true).assertIsDisplayed()
                    .assertTextEquals(when { seat == player -> "Vous"; sameTeam -> "Partenaire"; else -> "Adversaire" })
                assertCompleteText("table-role-${seat.name}")
                compose.onNodeWithTag("table-markers-${seat.name}", useUnmergedTree = true)
                    .assert(SemanticsMatcher.expectValue(SemanticsProperties.Text,
                        listOf(androidx.compose.ui.text.AnnotatedString(buildString {
                            append("J${seat.ordinal + 1}")
                            if (seat == match.dealer) append(" • D")
                            if (seat == match.taker) append(" • P")
                            if (seat == match.currentTrick?.currentPlayer) append(" • À jouer")
                        }))))
            }
            assertHandVisible(initial)
            assertPlayedCardsUnobstructed(match.currentTrick!!.plays)
            if (player == PlayerPosition.PLAYER_1) captureResult("game-teams.png")
        }
        // An updated server score must replace the displayed total without a new screen.
        compose.runOnIdle { displayedSession.value = initial }
        compose.onNodeWithTag("hud-own-score", useUnmergedTree = true).assertTextEquals("82")
        compose.onNodeWithTag("hud-opponent-score", useUnmergedTree = true).assertTextEquals("80")
    }

    @Test fun stackedHudKeepsFourDigitScoresAndUnknownContractReadable() {
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.3f)) {
                AtoutiaTheme {
                    Box(Modifier.requiredSize(360.dp, 320.dp).testTag("test-viewport")) {
                        GameHud(localPlayer = PlayerPosition.PLAYER_3, dealNumber = 12,
                            dealer = PlayerPosition.PLAYER_1, taker = null, trumpSuit = null,
                            scoreTeam0 = 1024, scoreTeam1 = 1234, targetScore = 1500, revision = 100)
                    }
                }
            }
        }
        compose.onNodeWithTag("hud-own-score", useUnmergedTree = true).assertIsDisplayed().assertTextEquals("1234")
        compose.onNodeWithTag("hud-opponent-score", useUnmergedTree = true).assertIsDisplayed().assertTextEquals("1024")
        compose.onNodeWithText("Atout —").assertIsDisplayed()
        compose.onNodeWithText("Donne 12 · Donneur J2 · Preneur — · R100").assertIsDisplayed()
        for (tag in listOf("hud-own-score-label", "hud-own-score", "hud-opponent-score-label", "hud-opponent-score", "hud-target")) {
            assertCompleteText(tag)
        }
        captureResult("score-stacked.png")
    }

    private fun assertCompleteText(tag: String) {
        val node = compose.onNodeWithTag(tag, useUnmergedTree = true).assertIsDisplayed()
        val layouts = mutableListOf<TextLayoutResult>()
        node.performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(layouts) }
        assertTrue("Text must be complete on one line: $tag", layouts.single().lineCount == 1 && !layouts.single().hasVisualOverflow)
        val bounds = node.getUnclippedBoundsInRoot()
        val viewport = compose.onNodeWithTag("test-viewport").getUnclippedBoundsInRoot()
        assertTrue("Text must stay inside viewport: $tag / $bounds / $viewport",
            bounds.left >= viewport.left && bounds.right <= viewport.right &&
                bounds.top >= viewport.top && bounds.bottom <= viewport.bottom)
    }

    @Test fun largerTextKeepsCardsVisibleAndOnlyLegalIdleCardsSubmit() {
        val session = fixture()
        show(session, fontScale = 1.3f)
        assertHandVisible(session)
        val legal = session.document.snapshot.actions.legalCards.first()
        cardNode(session.document.snapshot.match.hand.first()).assertHasNoClickAction()
        cardNode(legal).performTouchInput { click(Offset(8.dp.toPx(), 28.dp.toPx())) }
        compose.runOnIdle { assertEquals(listOf(legal), selected) }
        compose.runOnIdle { submitted.value = GamePlayCardUiState.Submitting }
        cardNode(legal).assertHasNoClickAction()
        compose.onNodeWithText("Retour à l’accueil").assertIsNotEnabled()
        assertHandVisible(session)
    }

    @Test fun playedCardsStayClearOfSeatsAndStatusWithLargeText() {
        val plays = listOf(
            PlayedCardSnapshot(PlayerPosition.PLAYER_1, PlayerCard(CardSuit.SPADES, CardRank.SEVEN)),
            PlayedCardSnapshot(PlayerPosition.PLAYER_2, PlayerCard(CardSuit.SPADES, CardRank.EIGHT)),
            PlayedCardSnapshot(PlayerPosition.PLAYER_3, PlayerCard(CardSuit.SPADES, CardRank.NINE)),
            PlayedCardSnapshot(PlayerPosition.PLAYER_0, PlayerCard(CardSuit.SPADES, CardRank.TEN)),
        )
        val active = withTrick(fixture(), plays.take(3))
        val presence = GameRealtimePresence(
            sessionId = active.sessionId,
            players = emptyList(),
            connectionStates = PlayerPosition.entries.map { player ->
                GameRealtimeConnectionState(player, GameRealtimeConnectionStateName.CONNECTED, null, null)
            },
            absences = emptyList(),
            resolutions = emptyList(),
        )
        show(active, fontScale = 1.3f, presence = presence)
        assertHandVisible(active)
        assertPlayedCardsUnobstructed(plays.take(3))
        compose.onNodeWithTag("table-seat-PLAYER_0", useUnmergedTree = true)
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "En ligne"))
        compose.onNodeWithText("Pli · 3/4").assertIsDisplayed()
        compose.onNodeWithTag("table-card-PLAYER_0", useUnmergedTree = true).assertDoesNotExist()

        compose.runOnIdle {
            displayedSession.value = withTrick(fixture(PlayerActionMode.MATCH_FINISHED), plays)
        }
        assertPlayedCardsUnobstructed(plays)
        compose.onNodeWithText("Pli · 4/4").assertIsDisplayed()
        compose.onNodeWithTag("match-result-title").assertIsDisplayed().assertTextEquals("Victoire !")
    }

    private fun withTrick(session: PlayerGameSession, plays: List<PlayedCardSnapshot>): PlayerGameSession {
        val snapshot = session.document.snapshot
        return session.copy(document = session.document.copy(snapshot = snapshot.copy(
            match = snapshot.match.copy(publicMatch = snapshot.match.publicMatch.copy(
                currentTrick = PublicCurrentTrickSnapshot(session.player, plays),
            )),
        )))
    }

    private fun assertPlayedCardsUnobstructed(plays: List<PlayedCardSnapshot>) {
        fun bounds(tag: String): DpRect {
            val node = compose.onNodeWithTag(tag, useUnmergedTree = true)
            try {
                node.assertIsDisplayed()
            } catch (failure: AssertionError) {
                throw AssertionError("$tag / ${node.getUnclippedBoundsInRoot()}\n" +
                    compose.onRoot(useUnmergedTree = true).printToString(), failure)
            }
            return node.getUnclippedBoundsInRoot()
        }

        val table = bounds("belote-table")
        val cards = plays.map { bounds("table-card-${it.player.name}") }
        val seats = PlayerPosition.entries.map { bounds("table-seat-${it.name}") }
        val status = bounds("table-trick-status")
        cards.forEachIndexed { index, card ->
            assertTrue("Card outside table: $card / $table",
                card.left >= table.left && card.right <= table.right &&
                    card.top >= table.top && card.bottom <= table.bottom)
            assertTrue("Card must retain its full size: $card", card.right - card.left >= 53.dp && card.bottom - card.top >= 75.dp)
            for (other in cards.drop(index + 1) + seats + status) {
                assertTrue("Card overlaps another element: $card / $other", card.isDisjointFrom(other))
            }
        }
    }

    private fun DpRect.isDisjointFrom(other: DpRect) =
        right <= other.left || left >= other.right || bottom <= other.top || top >= other.bottom

    @Test fun tapsOnExposedCardIndicesNeverPlayAnOverlappingNeighbor() {
        val session = fixture()
        show(session, fontScale = 1.3f)
        assertHandVisible(session)
        val expected = mutableListOf<PlayerCard>()
        for (card in session.document.snapshot.match.hand) {
            cardNode(card).performTouchInput { click(Offset(8.dp.toPx(), 28.dp.toPx())) }
            if (card in session.document.snapshot.actions.legalCards) expected.add(card)
            compose.runOnIdle { assertEquals("Tap must belong to $card", expected, selected) }
        }
        compose.runOnIdle { submitted.value = GamePlayCardUiState.Submitting }
        val legal = session.document.snapshot.actions.legalCards.first()
        cardNode(legal).performTouchInput { click(Offset(8.dp.toPx(), 28.dp.toPx())) }
        compose.runOnIdle { assertEquals(expected, selected) }
    }

    @Test fun expandedHandShowsLargeCardsAndSubmitsOnlyTheChosenLegalCard() {
        val session = fixture()
        show(session, fontScale = 1.3f)
        compose.onNodeWithTag("expand-player-hand").performScrollTo().performClick()
        compose.onNodeWithTag("expanded-hand").assertIsDisplayed()
        compose.waitForIdle()
        val directory = File(compose.activity.cacheDir, "visual-qa").also { check(it.exists() || it.mkdirs()) }
        val bitmap = compose.onNodeWithTag("expanded-hand").captureToImage().asAndroidBitmap()
        File(directory, "hand-expanded.png").outputStream().use {
            check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it))
        }
        val hand = session.document.snapshot.match.hand
        val grid = compose.onNodeWithTag("expanded-hand-grid")
        grid.performScrollToIndex(hand.lastIndex)
        compose.onNodeWithTag("expanded-${hand.last().rank.name}-${hand.last().suit.name}")
            .assertIsDisplayed()
        grid.performScrollToIndex(0)
        val unavailable = hand.first()
        compose.onNodeWithTag("expanded-${unavailable.rank.name}-${unavailable.suit.name}")
            .assertHasNoClickAction().performTouchInput { click() }
        compose.runOnIdle { assertTrue(selected.isEmpty()) }
        val legal = session.document.snapshot.actions.legalCards.first()
        grid.performScrollToIndex(hand.indexOf(legal))
        compose.onNodeWithTag("expanded-${legal.rank.name}-${legal.suit.name}")
            .assertIsDisplayed().performClick()
        compose.onNodeWithTag("expanded-hand").assertDoesNotExist()
        compose.runOnIdle { assertEquals(listOf(legal), selected); submitted.value = GamePlayCardUiState.Submitting }
        compose.onNodeWithTag("expand-player-hand").assertIsNotEnabled()
    }

    @Test fun threeRemainingCardsUseAvailableSpaceWithoutOverlapping() {
        val initial = fixture()
        val snapshot = initial.document.snapshot
        val hand = snapshot.match.hand.takeLast(3)
        val legal = snapshot.actions.legalCards.filter { it in hand }
        val session = initial.copy(document = initial.document.copy(snapshot = snapshot.copy(
            match = snapshot.match.copy(hand = hand, legalCards = legal),
            actions = snapshot.actions.copy(legalCards = legal),
        )))
        show(session, fontScale = 1.3f)
        assertHandVisible(session)
        val bounds = hand.map { cardNode(it).getUnclippedBoundsInRoot() }
        bounds.zipWithNext().forEach { (left, right) ->
            assertTrue("Remaining cards overlap: $left / $right", left.right <= right.left)
        }
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
        cardNode(played).performTouchInput { click(Offset(8.dp.toPx(), 28.dp.toPx())) }
        compose.runOnIdle { displayedSession.value = next }
        cardNode(played).assertDoesNotExist()
        assertHandVisible(next)
        cardNode(legal.first()).performTouchInput { click(Offset(8.dp.toPx(), 28.dp.toPx())) }
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

    @Test fun soloBidIsFullyVisibleBeforeScrollAndPassKeepsTheHandFixed() {
        val session = fixture(PlayerActionMode.BID)
        val bidsState = mutableStateOf<GameBiddingUiState>(GameBiddingUiState.Idle)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.3f)) {
                AtoutiaTheme {
                    Box(Modifier.requiredSize(640.dp, 360.dp).testTag("test-viewport")) {
                        GameScreen(
                            session = GameViewState(session.revision, session.player, session.document),
                            biddingState = bidsState.value,
                            local = true,
                            onBiddingAction = { bids.add(it) },
                            onReturnToHome = {},
                        )
                    }
                }
            }
        }
        assertHandVisible(session)
        val viewport = compose.onNodeWithTag("test-viewport").getUnclippedBoundsInRoot()
        val take = compose.onNodeWithText("Prendre à carreau")
        take.assertIsDisplayed()
        val bounds = take.getUnclippedBoundsInRoot()
        val controls = compose.onNodeWithTag("game-secondary-controls").getUnclippedBoundsInRoot()
        assertTrue("First bid must be fully visible before scrolling: $bounds / $controls / $viewport",
            bounds.top >= controls.top && bounds.bottom <= controls.bottom &&
                bounds.left >= viewport.left && bounds.right <= viewport.right)
        take.performClick()
        compose.runOnIdle {
            assertEquals(listOf(BiddingActionSnapshot.Take(session.player, CardSuit.DIAMONDS)), bids)
            bidsState.value = GameBiddingUiState.Submitting
        }
        take.assertIsNotEnabled()
        compose.runOnIdle { bidsState.value = GameBiddingUiState.Idle }
        val before = compose.onNodeWithTag("player-hand").getUnclippedBoundsInRoot()
        compose.onNodeWithText("Passer").performScrollTo().assertIsDisplayed().performClick()
        assertEquals(before, compose.onNodeWithTag("player-hand").getUnclippedBoundsInRoot())
        assertHandVisible(session)
        compose.runOnIdle { assertEquals(BiddingActionSnapshot.Pass(session.player), bids.last()) }
    }

    @Test fun completedMatchHidesHandAndKeepsReplayReachable() {
        submitted.value = GamePlayCardUiState.Failed("Ancienne erreur de carte")
        show(fixture(PlayerActionMode.MATCH_FINISHED))
        compose.onNodeWithTag("player-hand").assertDoesNotExist()
        compose.onNodeWithText("Ancienne erreur de carte").assertDoesNotExist()
        compose.onNodeWithText("Rejouer").assertIsDisplayed().performClick()
        compose.runOnIdle { assertEquals(1, replays) }
        compose.onNodeWithText("Historique").performScrollTo().assertIsDisplayed().performClick()
        compose.onNodeWithText("Accueil").performScrollTo().assertIsDisplayed().performClick()
        compose.runOnIdle { assertEquals(1, histories); assertEquals(1, homes) }
    }

    @Test fun finishedResultUsesEachPlayersOwnTeamAndHidesStalePresence() {
        val initial = fixture(PlayerActionMode.MATCH_FINISHED)
        sync.value = GameSyncState(connection = GameRealtimeStatus.RECONNECTING)
        show(initial, fontScale = 1.3f, presence = reconnectingPresence(initial))
        for (winner in MatchTeam.entries) for (player in PlayerPosition.entries) {
            val team0 = player == PlayerPosition.PLAYER_0 || player == PlayerPosition.PLAYER_2
            val won = (winner == MatchTeam.TEAM_0) == team0
            compose.runOnIdle { displayedSession.value = forViewer(initial, player, winner) }
            compose.onNodeWithTag("match-result-title").performScrollTo()
                .assertIsDisplayed().assertTextEquals(if (won) "Victoire !" else "Défaite")
            compose.onNodeWithTag("result-own-score", useUnmergedTree = true)
                .assertIsDisplayed().assertTextEquals(if (won) "1120" else "980")
            compose.onNodeWithTag("result-opponent-score", useUnmergedTree = true)
                .assertIsDisplayed().assertTextEquals(if (won) "980" else "1120")
            for (tag in listOf("result-own-score", "result-opponent-score")) {
                val layouts = mutableListOf<TextLayoutResult>()
                val label = compose.onNodeWithTag("$tag-label", useUnmergedTree = true).assertIsDisplayed()
                label.performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(layouts) }
                assertTrue("Score label must be complete on one line", layouts.single().lineCount == 1 && !layouts.single().hasVisualOverflow)
                val points = compose.onNodeWithTag(tag, useUnmergedTree = true).getUnclippedBoundsInRoot()
                val controls = compose.onNodeWithTag("game-secondary-controls").getUnclippedBoundsInRoot()
                assertTrue("Score must be fully visible: $points / $controls", points.top >= controls.top && points.bottom <= controls.bottom)
            }
            compose.onNodeWithText("Reconnexion").assertDoesNotExist()
            compose.onNodeWithText("Reconnexion…").assertDoesNotExist()
            compose.onNodeWithText("Réessayer").assertDoesNotExist()
            compose.onNodeWithText("En direct").assertDoesNotExist()
            PlayerPosition.entries.forEach { seat ->
                compose.onNodeWithTag("table-seat-${seat.name}", useUnmergedTree = true)
                    .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
            }
            // The primary action is completely visible at 640 x 320 dp / text 1.3.
            val replay = compose.onNodeWithTag("match-replay").assertIsDisplayed().getUnclippedBoundsInRoot()
            val viewport = compose.onNodeWithTag("test-viewport").getUnclippedBoundsInRoot()
            val controls = compose.onNodeWithTag("game-secondary-controls").getUnclippedBoundsInRoot()
            assertTrue("Replay must remain fully visible: $replay / $controls / $viewport",
                replay.top >= controls.bottom &&
                    replay.left >= viewport.left && replay.right <= viewport.right &&
                    replay.top >= viewport.top && replay.bottom <= viewport.bottom && replay.bottom - replay.top >= 48.dp)
            if (winner == MatchTeam.TEAM_0 && player in listOf(PlayerPosition.PLAYER_0, PlayerPosition.PLAYER_1)) {
                captureResult(if (won) "result-win.png" else "result-loss.png")
            }
        }
    }

    @Test fun missingWinnerNeverInfersAVictoryFromTheScore() {
        val initial = fixture(PlayerActionMode.MATCH_FINISHED)
        show(forViewer(initial, PlayerPosition.PLAYER_0, null))
        compose.onNodeWithTag("match-result-title").assertIsDisplayed().assertTextEquals("Résultat final")
        compose.onNodeWithText("Victoire !").assertDoesNotExist()
        compose.onNodeWithText("Défaite").assertDoesNotExist()
    }

    @Test fun forfeitUsesTheAuthoritativeWinnerWithoutInventingATargetScore() {
        val active = fixture()
        val adjudication = GameRealtimeAdjudicationEvent(active.sessionId,
            GameRealtimeAdjudication.Forfeit(PlayerPosition.PLAYER_0, MatchTeam.TEAM_0, MatchTeam.TEAM_1, 1000L))
        show(active, fontScale = 1.3f, presence = reconnectingPresence(active), adjudication = adjudication)
        compose.onNodeWithText("Défaite").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Votre équipe perd par forfait.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Reconnexion").assertDoesNotExist()
        compose.onNodeWithText("À jouer", substring = true).assertDoesNotExist()
        compose.onNodeWithTag("player-hand").assertDoesNotExist()
        compose.onNodeWithTag("result-own-score", useUnmergedTree = true).assertDoesNotExist()
        compose.runOnIdle { displayedSession.value = forViewer(active, PlayerPosition.PLAYER_1, null) }
        compose.onNodeWithText("Victoire !").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("L’équipe adverse perd par forfait.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Rejouer").assertIsDisplayed()
    }

    private fun forViewer(session: PlayerGameSession, player: PlayerPosition, winner: MatchTeam?): PlayerGameSession {
        val snapshot = session.document.snapshot
        val publicMatch = snapshot.match.publicMatch
        val points = if (winner == MatchTeam.TEAM_1) TeamPointsSnapshot(publicMatch.score.scores.team1, publicMatch.score.scores.team0) else publicMatch.score.scores
        return session.copy(player = player, document = session.document.copy(snapshot = snapshot.copy(
            match = snapshot.match.copy(player = player, publicMatch = publicMatch.copy(score = publicMatch.score.copy(
                scores = points, winner = winner,
            ))), actions = snapshot.actions.copy(player = player),
        )))
    }

    private fun reconnectingPresence(session: PlayerGameSession) = GameRealtimePresence(
        sessionId = session.sessionId, players = emptyList(),
        connectionStates = PlayerPosition.entries.map {
            GameRealtimeConnectionState(it, GameRealtimeConnectionStateName.RECONNECTING, 1000L, 2000L)
        }, absences = emptyList(), resolutions = emptyList(),
    )

    private fun captureResult(name: String) {
        compose.waitForIdle()
        val directory = File(compose.activity.cacheDir, "visual-qa").also { check(it.exists() || it.mkdirs()) }
        val bitmap = compose.onNodeWithTag("test-viewport").captureToImage().asAndroidBitmap()
        File(directory, name).outputStream().use { check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) }
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

    private fun show(
        session: PlayerGameSession,
        fontScale: Float = 1f,
        presence: GameRealtimePresence? = null,
        adjudication: GameRealtimeAdjudicationEvent? = null,
    ) {
        displayedSession.value = session
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) {
                AtoutiaTheme {
                    Box(Modifier.requiredSize(640.dp, 320.dp).testTag("test-viewport")) {
                        GameScreen(
                            session = requireNotNull(displayedSession.value),
                            presence = presence,
                            adjudication = adjudication,
                            playCardState = submitted.value,
                            onPlayCard = { selected.add(it) },
                            onBiddingAction = { bids.add(it) },
                            syncState = sync.value,
                            onRefresh = { retries++ },
                            onReturnToHome = {},
                            onReplay = { replays++ },
                            onHistory = { histories++ },
                            onHome = { homes++ },
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
                targetScore = 1000,
                scores = TeamPointsSnapshot(if (completed) 1120 else 82, if (completed) 980 else 80),
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
