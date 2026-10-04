package tech.devoo.atoutia.ui.game

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.DealPhase
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

@Composable
fun GameScreen(
    session: PlayerGameSession,
    biddingState: GameBiddingUiState = GameBiddingUiState.Idle,
    playCardState: GamePlayCardUiState = GamePlayCardUiState.Idle,
    onBiddingAction: ((BiddingActionSnapshot) -> Unit)? = null,
    onPlayCard: ((PlayerCard) -> Unit)? = null,
    onRefresh: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
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

    val isSubmittingBidding =
        biddingState is GameBiddingUiState.Submitting

    val isSubmittingPlayCard =
        playCardState is GamePlayCardUiState.Submitting

    val isSubmitting =
        isSubmittingBidding ||
            isSubmittingPlayCard

    val currentPlayer =
        when (
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
        if (
            score.completed
        ) {
            "Partie terminée"
        } else {
            "Partie Atoutia"
        }

    val actionStatus =
        createActionStatus(
            localPlayer =
                session.player,

            actionsMode =
                actions.mode,

            currentPlayer =
                currentPlayer,
        )

    val hudContent:
        @Composable () -> Unit = {
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

                modifier =
                    Modifier.fillMaxWidth(),
            )
        }

    val controlsContent:
        @Composable () -> Unit = {
            if (
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

            if (
                !score.completed &&
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
                )
            }

            if (
                score.completed
            ) {
                MatchFinishedPanel(
                    team0 =
                        score.scores.team0,

                    team1 =
                        score.scores.team1,

                    winner =
                        score.winner,
                )
            }
        }

    val footerContent:
        @Composable () -> Unit = {
            OutlinedButton(
                onClick = {
                    onRefresh
                        ?.invoke()
                },

                enabled =
                    onRefresh !=
                        null &&
                        !isSubmitting,

                modifier =
                    Modifier.fillMaxWidth(),
            ) {
                Text(
                    text =
                        "Actualiser la partie",
                )
            }

            Text(
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

    Scaffold(
        modifier =
            modifier.fillMaxSize(),
    ) { innerPadding ->
        BoxWithConstraints(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(
                        innerPadding,
                    ),
        ) {
            val landscapeLayout =
                maxWidth >
                    maxHeight &&
                    maxWidth >=
                    600.dp

            if (
                landscapeLayout
            ) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(
                                10.dp,
                            ),

                    horizontalArrangement =
                        Arrangement.spacedBy(
                            12.dp,
                        ),

                    verticalAlignment =
                        Alignment.CenterVertically,
                ) {
                    Box(
                        modifier =
                            Modifier
                                .weight(
                                    1.55f,
                                )
                                .fillMaxHeight(),

                        contentAlignment =
                            Alignment.Center,
                    ) {
                        tableContent()
                    }

                    Column(
                        modifier =
                            Modifier
                                .weight(
                                    1f,
                                )
                                .fillMaxHeight()
                                .verticalScroll(
                                    rememberScrollState(),
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
                                "$screenTitle • $actionStatus",

                            style =
                                MaterialTheme
                                    .typography
                                    .titleMedium,

                            fontWeight =
                                FontWeight.Bold,

                            textAlign =
                                TextAlign.Center,

                            modifier =
                                Modifier.fillMaxWidth(),
                        )

                        hudContent()

                        controlsContent()

                        footerContent()
                    }
                }
            } else {
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .verticalScroll(
                                rememberScrollState(),
                            )
                            .padding(
                                16.dp,
                            ),

                    verticalArrangement =
                        Arrangement.spacedBy(
                            12.dp,
                        ),

                    horizontalAlignment =
                        Alignment.CenterHorizontally,
                ) {
                    Text(
                        text =
                            screenTitle,

                        style =
                            MaterialTheme
                                .typography
                                .headlineMedium,

                        fontWeight =
                            FontWeight.Bold,

                        textAlign =
                            TextAlign.Center,
                    )

                    Text(
                        text =
                            actionStatus,

                        style =
                            MaterialTheme
                                .typography
                                .titleMedium,

                        fontWeight =
                            FontWeight.SemiBold,

                        textAlign =
                            TextAlign.Center,
                    )

                    hudContent()

                    tableContent()

                    controlsContent()

                    footerContent()
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
    OutlinedCard(
        modifier =
            Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier =
                Modifier.padding(
                    16.dp,
                ),

            verticalArrangement =
                Arrangement.spacedBy(
                    10.dp,
                ),
        ) {
            Text(
                text =
                    "À vous d’enchérir",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,
            )

            Text(
                text =
                    "Les choix ci-dessous viennent directement du serveur.",

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,
            )

            actions.forEach {
                action ->
                BiddingActionButton(
                    action =
                        action,

                    enabled =
                        enabled,

                    onClick = {
                        onAction(
                            action,
                        )
                    },
                )
            }

            when (
                state
            ) {
                GameBiddingUiState.Idle -> {
                    Unit
                }

                GameBiddingUiState.Submitting -> {
                    CommandSubmittingRow(
                        message =
                            "Envoi de l’enchère...",
                    )
                }

                is GameBiddingUiState.Failed -> {
                    CommandFailureText(
                        message =
                            state.message,
                    )
                }
            }
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
) {
    OutlinedCard(
        modifier =
            Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier =
                Modifier.padding(
                    16.dp,
                ),

            verticalArrangement =
                Arrangement.spacedBy(
                    12.dp,
                ),
        ) {
            Text(
                text =
                    "Votre main",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,
            )

            Text(
                text =
                    if (
                        canPlay
                    ) {
                        "Choisissez une carte mise en évidence."
                    } else {
                        "En attente de votre prochain tour."
                    },

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,
            )

            BeloteHand(
                hand =
                    hand,

                legalCards =
                    legalCards,

                canPlay =
                    canPlay,

                submitting =
                    submitting,

                onPlayCard =
                    onPlayCard,

                modifier =
                    Modifier.fillMaxWidth(),
            )

            when (
                playCardState
            ) {
                GamePlayCardUiState.Idle -> {
                    Unit
                }

                GamePlayCardUiState.Submitting -> {
                    CommandSubmittingRow(
                        message =
                            "Envoi de la carte...",
                    )
                }

                is GamePlayCardUiState.Failed -> {
                    CommandFailureText(
                        message =
                            playCardState.message,
                    )
                }
            }
        }
    }
}

@Composable
private fun MatchFinishedPanel(
    team0: Int,
    team1: Int,
    winner: MatchTeam?,
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
                "En attente du serveur"
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