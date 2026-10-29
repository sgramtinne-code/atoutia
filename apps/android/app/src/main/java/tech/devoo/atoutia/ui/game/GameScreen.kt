package tech.devoo.atoutia.ui.game

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.DealPhase
import tech.devoo.atoutia.network.game.GameRealtimeAdjudication
import tech.devoo.atoutia.network.game.GameRealtimeAdjudicationEvent
import tech.devoo.atoutia.network.game.GameRealtimePresence
import tech.devoo.atoutia.network.game.MatchTeam
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.network.game.PlayerGameSession
import tech.devoo.atoutia.network.room.PlayerPosition

sealed interface GameBiddingUiState {
    data object Idle :
        GameBiddingUiState

    data object Submitting :
        GameBiddingUiState

    data class Failed(
        val message: String,
    ) : GameBiddingUiState
}

sealed interface GamePlayCardUiState {
    data object Idle :
        GamePlayCardUiState

    data object Submitting :
        GamePlayCardUiState

    data class Failed(
        val message: String,
    ) : GamePlayCardUiState
}

internal data class GameViewState(
    val revision: Int,
    val player: PlayerPosition,
    val document: tech.devoo.atoutia.network.game.PlayerClientSnapshotDocument,
)

@Composable
fun GameScreen(
    session: PlayerGameSession,
    biddingState: GameBiddingUiState = GameBiddingUiState.Idle,
    playCardState: GamePlayCardUiState = GamePlayCardUiState.Idle,
    syncState: GameSyncState = GameSyncState(),
    presence: GameRealtimePresence? = null,
    adjudication: GameRealtimeAdjudicationEvent? = null,
    onBiddingAction: ((BiddingActionSnapshot) -> Unit)? = null,
    onPlayCard: ((PlayerCard) -> Unit)? = null,
    onRefresh: (() -> Unit)? = null,
    onReplay: (() -> Unit)? = null,
    onHistory: (() -> Unit)? = null,
    onHome: (() -> Unit)? = null,
    onReturnToHome: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    GameScreen(GameViewState(session.revision, session.player, session.document),
        biddingState = biddingState,
        playCardState = playCardState,
        syncState = syncState,
        presence = presence,
        adjudication = adjudication,
        onBiddingAction = onBiddingAction,
        onPlayCard = onPlayCard,
        onRefresh = onRefresh,
        onReplay = onReplay,
        onHistory = onHistory,
        onHome = onHome,
        onReturnToHome = onReturnToHome,
        modifier = modifier,
    )
}

@Composable
internal fun GameScreen(
    session: GameViewState,
    biddingState: GameBiddingUiState = GameBiddingUiState.Idle,
    playCardState: GamePlayCardUiState = GamePlayCardUiState.Idle,
    syncState: GameSyncState = GameSyncState(),
    presence: GameRealtimePresence? = null,
    adjudication: GameRealtimeAdjudicationEvent? = null,
    onBiddingAction: ((BiddingActionSnapshot) -> Unit)? = null,
    onPlayCard: ((PlayerCard) -> Unit)? = null,
    onRefresh: (() -> Unit)? = null,
    onReplay: (() -> Unit)? = null,
    onHistory: (() -> Unit)? = null,
    onHome: (() -> Unit)? = null,
    onReturnToHome: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    local: Boolean = false,
    localBotTitle: String? = null,
    localBotDetails: String? = null,
    onNewLocalGame: (() -> Unit)? = null,
) {
    val document =
        session.document

    val snapshot =
        document.snapshot

    val match =
        snapshot.match

    val publicMatch =
        match.publicMatch

    val actions =
        snapshot.actions

    val score =
        publicMatch.score

    val forfeitAdjudication =
        adjudication
            ?.adjudication as?
            GameRealtimeAdjudication.Forfeit

    val isForfeitCompleted =
        forfeitAdjudication !=
            null

    val isMatchCompleted =
        score.completed ||
            isForfeitCompleted

    val isSubmittingBidding =
        biddingState is GameBiddingUiState.Submitting

    val isSubmittingPlayCard =
        playCardState is GamePlayCardUiState.Submitting

    val isSubmitting =
        isSubmittingBidding ||
            isSubmittingPlayCard

    BackHandler(enabled = !isMatchCompleted && onReturnToHome != null) {
        if (!isSubmitting) onReturnToHome?.invoke()
    }

    val currentPlayer =
        if (
            isForfeitCompleted
        ) {
            null
        } else when (
            publicMatch.phase
        ) {
            DealPhase.BIDDING ->
                publicMatch.biddingPlayer

            DealPhase.PLAYING ->
                publicMatch.currentTrick?.currentPlayer

            DealPhase.FINISHED ->
                null
        }

    val screenTitle =
        when {
            isForfeitCompleted ->
                "Partie terminée par forfait"

            score.completed ->
                "Partie terminée"

            local -> "Solo hors ligne"

            else ->
                "Partie Atoutia"
        }

    val actionStatus =
        if (
            isForfeitCompleted
        ) {
            "Partie terminée par forfait"
        } else {
            createActionStatus(
                localPlayer =
                    session.player,

                actionsMode =
                    actions.mode,

                currentPlayer =
                    currentPlayer,
            )
        }

    val hudContent:
        @Composable (Boolean) -> Unit = { compact ->
            GameHud(
                dealNumber =
                    publicMatch.dealNumber,

                dealer =
                    publicMatch.dealer,

                taker =
                    publicMatch.taker,

                trumpSuit =
                    publicMatch.trumpSuit,

                scoreTeam0 =
                    score.scores.team0,

                scoreTeam1 =
                    score.scores.team1,

                targetScore =
                    score.targetScore,

                revision =
                    session.revision,

                modifier =
                    Modifier.fillMaxWidth(),

                compact = compact,
            )
        }

    val tableContent:
        @Composable () -> Unit = {
            BeloteTable(
                localPlayer =
                    session.player,

                dealer =
                    publicMatch.dealer,

                taker =
                    publicMatch.taker,

                currentPlayer =
                    currentPlayer,

                trick =
                    publicMatch.currentTrick,

                phase =
                    publicMatch.phase,

                trumpSuit =
                    publicMatch.trumpSuit,

                turnUpCard =
                    publicMatch.turnUpCard,

                presence =
                    presence,

                modifier =
                    Modifier.fillMaxWidth(),
            )
        }

    val handContent: @Composable (Boolean) -> Unit = { compact ->
        if (
            !isMatchCompleted &&
            match.hand.isNotEmpty()
        ) {
            PlayerHandPanel(
                hand =
                    match.hand,

                legalCards =
                    actions.legalCards,

                canPlay =
                    actions.mode ==
                        PlayerActionMode.PLAY_CARD,

                submitting =
                    isSubmitting,

                onPlayCard =
                    onPlayCard,

                playCardState =
                    playCardState,

                compact = compact,
            )
        }

    }

    val controlsContent:
        @Composable (Boolean) -> Unit = { includeHand ->
            if (
                !isForfeitCompleted &&
                actions.mode ==
                    PlayerActionMode.BID
            ) {
                BiddingPanel(
                    actions =
                        actions.biddingActions,

                    state =
                        biddingState,

                    enabled =
                        !isSubmitting &&
                            onBiddingAction !=
                            null,

                    onAction = {
                        action ->
                        onBiddingAction
                            ?.invoke(
                                action,
                            )
                    },
                )
            }

            if (includeHand) handContent(false)

            if (
                forfeitAdjudication !=
                    null
            ) {
                MatchForfeitPanel(
                    localPlayer =
                        session.player,

                    forfeitingPlayer =
                        forfeitAdjudication
                            .forfeitingPlayer,

                    losingTeam =
                        forfeitAdjudication
                            .losingTeam,

                    winningTeam =
                        forfeitAdjudication
                            .winningTeam,

                    onReplay =
                        onReplay,

                    onHistory =
                        onHistory,

                    onHome =
                        onHome,
                )
            } else if (
                score.completed
            ) {
                MatchFinishedPanel(
                    team0 =
                        score.scores.team0,

                    team1 =
                        score.scores.team1,

                    winner =
                        score.winner,

                    onReplay =
                        onReplay,

                    onHistory =
                        onHistory,

                    onHome =
                        onHome,
                )
            }
            if (local && localBotTitle != null) {
                Text(localBotTitle, modifier = Modifier.testTag("solo-active-bots"), style = MaterialTheme.typography.titleSmall)
                if (localBotDetails != null) Text(localBotDetails)
                if (!isMatchCompleted && onNewLocalGame != null) OutlinedButton(onClick = onNewLocalGame,
                    enabled = !isSubmitting, modifier = Modifier.fillMaxWidth().testTag("solo-new-game")) { Text("Nouvelle partie solo") }
            }
        }

    val secondaryScrollState = rememberScrollState()
    LaunchedEffect(syncState.canRetry) {
        // Reveal incidents and recovery without scrolling the fixed hand.
        secondaryScrollState.scrollTo(0)
    }

    val syncContent: @Composable () -> Unit = {
        if (!local && !isMatchCompleted) GameSyncPanel(
            state = syncState,
            commandSubmitting = isSubmitting,
            onRetry = onRefresh,
        )
    }

    val footerContent:
        @Composable () -> Unit = {
            if (!local) Text(
                text =
                    "Révision serveur ${session.revision} • moteur ${document.engineVersion}",

                style =
                    MaterialTheme
                        .typography
                        .bodySmall,

                textAlign =
                    TextAlign.Center,

                modifier =
                    Modifier.fillMaxWidth(),
            )
        }

    val returnHomeContent: @Composable () -> Unit = {
        if (!isMatchCompleted && onReturnToHome != null) {
            OutlinedButton(onClick = onReturnToHome, enabled = !isSubmitting) {
                Text("Retour à l’accueil")
            }
        }
    }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        // Select from the allocated screen bounds before reserving space for system bars.
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val landscapeLayout = maxWidth > maxHeight && maxWidth >= 600.dp
            if (landscapeLayout) {
                Column(
                    Modifier.fillMaxSize().padding(innerPadding).padding(8.dp).testTag("game-landscape-layout"),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        returnHomeContent()
                        Box(Modifier.weight(1f)) { hudContent(true) }
                    }
                    Row(
                        Modifier.weight(1f).fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            Modifier.weight(1.55f).fillMaxHeight(),
                            contentAlignment = Alignment.Center,
                        ) { tableContent() }
                        Column(
                            Modifier.weight(1f).fillMaxHeight(),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                actionStatus,
                                modifier = Modifier.fillMaxWidth(),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center,
                            )
                            // The hand has its own fixed area; secondary controls alone scroll.
                            handContent(true)
                            Column(
                                Modifier.weight(1f).fillMaxWidth()
                                    .testTag("game-secondary-controls")
                                    .verticalScroll(secondaryScrollState),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                syncContent()
                                if (!isMatchCompleted && match.hand.isNotEmpty()) {
                                    PlayCardFeedback(playCardState)
                                }
                                controlsContent(false)
                                footerContent()
                            }
                        }
                    }
                }
            } else {
                Column(Modifier.fillMaxSize().padding(innerPadding).testTag("game-stacked-layout")) {
                    Box(Modifier.padding(horizontal = 12.dp)) { returnHomeContent() }
                    Column(
                        Modifier.weight(1f).fillMaxWidth()
                            .verticalScroll(rememberScrollState()).padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            screenTitle,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                        )
                        if (actionStatus != screenTitle) {
                            Text(
                                actionStatus,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center,
                            )
                        }
                        syncContent()
                        hudContent(false)
                        tableContent()
                        controlsContent(true)
                        footerContent()
                    }
                }
            }
        }
    }
}

@Composable
private fun BiddingPanel(
    actions: List<BiddingActionSnapshot>,
    state: GameBiddingUiState,
    enabled: Boolean,
    onAction: (BiddingActionSnapshot) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        actions.forEach { action ->
            BiddingActionButton(
                action = action,
                enabled = enabled,
                onClick = { onAction(action) },
            )
        }
        when (state) {
            GameBiddingUiState.Idle -> Unit
            GameBiddingUiState.Submitting -> CommandSubmittingRow("Validation de l’enchère…")
            is GameBiddingUiState.Failed -> CommandFailureText(state.message)
        }
    }
}

@Composable
private fun PlayerHandPanel(
    hand: List<PlayerCard>,
    legalCards: List<PlayerCard>,
    canPlay: Boolean,
    submitting: Boolean,
    onPlayCard: ((PlayerCard) -> Unit)?,
    playCardState: GamePlayCardUiState,
    compact: Boolean = false,
) {
    OutlinedCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            Modifier.padding(if (compact) 8.dp else 16.dp),
            verticalArrangement = Arrangement.spacedBy(if (compact) 4.dp else 12.dp),
        ) {
            if (!compact) {
                Text(
                    "Votre main",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    if (canPlay) "Choisissez une carte mise en évidence."
                    else "En attente de votre prochain tour.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            BeloteHand(
                hand = hand,
                legalCards = legalCards,
                canPlay = canPlay,
                submitting = submitting,
                onPlayCard = onPlayCard,
                modifier = Modifier.fillMaxWidth().testTag("player-hand"),
            )
            if (!compact) PlayCardFeedback(playCardState)
        }
    }
}

@Composable
private fun PlayCardFeedback(state: GamePlayCardUiState) {
    when (state) {
        GamePlayCardUiState.Idle -> Unit
        GamePlayCardUiState.Submitting -> CommandSubmittingRow("Envoi de la carte...")
        is GamePlayCardUiState.Failed -> CommandFailureText(state.message)
    }
}

@Composable
private fun MatchForfeitPanel(
    localPlayer: PlayerPosition,
    forfeitingPlayer: PlayerPosition,
    losingTeam: MatchTeam,
    winningTeam: MatchTeam,
    onReplay: (() -> Unit)?,
    onHistory: (() -> Unit)?,
    onHome: (() -> Unit)?,
) {
    val absenceMessage =
        if (
            forfeitingPlayer ==
                localPlayer
        ) {
            "Vous avez été déclaré absent."
        } else {
            "${forfeitingPlayer.toDisplayName()} a été déclaré absent."
        }

    OutlinedCard(
        modifier =
            Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier =
                Modifier.padding(
                    20.dp,
                ),

            verticalArrangement =
                Arrangement.spacedBy(
                    10.dp,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    "Partie terminée par forfait",

                style =
                    MaterialTheme
                        .typography
                        .titleLarge,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    "Victoire ${winningTeam.toDisplayName()}",

                style =
                    MaterialTheme
                        .typography
                        .headlineSmall,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    absenceMessage,

                style =
                    MaterialTheme
                        .typography
                        .bodyLarge,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    "${losingTeam.toDisplayName()} perd la partie.",

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                textAlign =
                    TextAlign.Center,
            )

            MatchCompletionActions(
                onReplay =
                    onReplay,

                onHistory =
                    onHistory,

                onHome =
                    onHome,
            )
        }
    }
}

@Composable
private fun MatchFinishedPanel(
    team0: Int,
    team1: Int,
    winner: MatchTeam?,
    onReplay: (() -> Unit)?,
    onHistory: (() -> Unit)?,
    onHome: (() -> Unit)?,
) {
    OutlinedCard(
        modifier =
            Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier =
                Modifier.padding(
                    20.dp,
                ),

            verticalArrangement =
                Arrangement.spacedBy(
                    10.dp,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    "Résultat final",

                style =
                    MaterialTheme
                        .typography
                        .titleLarge,

                fontWeight =
                    FontWeight.Bold,
            )

            Text(
                text =
                    "$team0 - $team1",

                style =
                    MaterialTheme
                        .typography
                        .headlineMedium,

                fontWeight =
                    FontWeight.Bold,
            )

            Text(
                text =
                    winner
                        ?.let {
                            "Victoire ${it.toDisplayName()}"
                        }
                        ?: "Partie terminée",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,
            )

            MatchCompletionActions(
                onReplay =
                    onReplay,

                onHistory =
                    onHistory,

                onHome =
                    onHome,
            )
        }
    }
}

@Composable
private fun MatchCompletionActions(
    onReplay: (() -> Unit)?,
    onHistory: (() -> Unit)?,
    onHome: (() -> Unit)?,
) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(
                    top =
                        6.dp,
                ),

        verticalArrangement =
            Arrangement.spacedBy(
                8.dp,
            ),
    ) {
        if (
            onReplay !=
                null
        ) {
            Button(
                onClick =
                    onReplay,

                modifier =
                    Modifier.fillMaxWidth(),
            ) {
                Text(
                    text =
                        "Rejouer",
                )
            }
        }

        if (
            onHistory !=
                null
        ) {
            OutlinedButton(
                onClick =
                    onHistory,

                modifier =
                    Modifier.fillMaxWidth(),
            ) {
                Text(
                    text =
                        "Historique",
                )
            }
        }

        if (
            onHome !=
                null
        ) {
            OutlinedButton(
                onClick =
                    onHome,

                modifier =
                    Modifier.fillMaxWidth(),
            ) {
                Text(
                    text =
                        "Accueil",
                )
            }
        }
    }
}

@Composable
private fun BiddingActionButton(
    action: BiddingActionSnapshot,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val label =
        when (
            action
        ) {
            is BiddingActionSnapshot.Pass ->
                "Passer"

            is BiddingActionSnapshot.Take ->
                "Prendre à ${action.suit.toDisplayName()}"
        }

    Button(
        onClick =
            onClick,

        enabled =
            enabled,

        modifier =
            Modifier.fillMaxWidth(),
    ) {
        Text(
            text =
                label,
        )
    }
}

@Composable
private fun CommandSubmittingRow(
    message: String,
) {
    Row(
        modifier =
            Modifier.fillMaxWidth(),

        horizontalArrangement =
            Arrangement.spacedBy(
                12.dp,
            ),

        verticalAlignment =
            Alignment.CenterVertically,
    ) {
        CircularProgressIndicator()

        Text(
            text =
                message,
        )
    }
}

@Composable
private fun CommandFailureText(
    message: String,
) {
    Text(
        text =
            message,

        color =
            MaterialTheme
                .colorScheme
                .error,

        style =
            MaterialTheme
                .typography
                .bodyMedium,
    )
}

private fun createActionStatus(
    localPlayer: PlayerPosition,
    actionsMode: PlayerActionMode,
    currentPlayer: PlayerPosition?,
): String =
    when (
        actionsMode
    ) {
        PlayerActionMode.BID ->
            "À vous d’enchérir"

        PlayerActionMode.PLAY_CARD ->
            "À vous de jouer"

        PlayerActionMode.MATCH_FINISHED ->
            "Partie terminée"

        PlayerActionMode.WAIT ->
            if (
                currentPlayer ==
                    null
            ) {
                "Préparation du prochain tour"
            } else if (
                currentPlayer ==
                    localPlayer
            ) {
                "Mise à jour de votre tour"
            } else {
                "Tour de ${currentPlayer.toDisplayName()}"
            }
    }

private fun PlayerPosition.toDisplayName():
    String =
    when (
        this
    ) {
        PlayerPosition.PLAYER_0 ->
            "Joueur 1"

        PlayerPosition.PLAYER_1 ->
            "Joueur 2"

        PlayerPosition.PLAYER_2 ->
            "Joueur 3"

        PlayerPosition.PLAYER_3 ->
            "Joueur 4"
    }

private fun MatchTeam.toDisplayName():
    String =
    when (
        this
    ) {
        MatchTeam.TEAM_0 ->
            "Équipe 0"

        MatchTeam.TEAM_1 ->
            "Équipe 1"
    }

private fun CardSuit.toDisplayName():
    String =
    when (
        this
    ) {
        CardSuit.CLUBS ->
            "trèfle"

        CardSuit.DIAMONDS ->
            "carreau"

        CardSuit.HEARTS ->
            "cœur"

        CardSuit.SPADES ->
            "pique"
    }
