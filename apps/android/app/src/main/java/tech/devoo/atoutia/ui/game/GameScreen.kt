package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import tech.devoo.atoutia.network.game.CardRank
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.DealPhase
import tech.devoo.atoutia.network.game.MatchTeam
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.network.game.PlayerGameSession
import tech.devoo.atoutia.network.game.PublicCurrentTrickSnapshot
import tech.devoo.atoutia.network.room.PlayerPosition

sealed interface GameBiddingUiState {
    data object Idle :
        GameBiddingUiState

    data object Submitting :
        GameBiddingUiState

    data class Failed(
        val message:
            String,
    ) : GameBiddingUiState
}

sealed interface GamePlayCardUiState {
    data object Idle :
        GamePlayCardUiState

    data object Submitting :
        GamePlayCardUiState

    data class Failed(
        val message:
            String,
    ) : GamePlayCardUiState
}

@Composable
fun GameScreen(
    session:
        PlayerGameSession,

    biddingState:
        GameBiddingUiState =
        GameBiddingUiState.Idle,

    playCardState:
        GamePlayCardUiState =
        GamePlayCardUiState.Idle,

    onBiddingAction:
        (
            (
                BiddingActionSnapshot,
            ) -> Unit
        )? =
        null,

    onPlayCard:
        (
            (
                PlayerCard,
            ) -> Unit
        )? =
        null,

    onRefresh:
        (() -> Unit)? =
        null,

    modifier:
        Modifier =
        Modifier,
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
        biddingState is
            GameBiddingUiState.Submitting

    val isSubmittingPlayCard =
        playCardState is
            GamePlayCardUiState.Submitting

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
                publicMatch
                    .currentTrick
                    ?.currentPlayer

            DealPhase.FINISHED ->
                null
        }

    Scaffold(
        modifier =
            modifier.fillMaxSize(),
    ) {
        innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(
                        innerPadding,
                    )
                    .verticalScroll(
                        rememberScrollState(),
                    )
                    .padding(
                        16.dp,
                    ),

            verticalArrangement =
                Arrangement.spacedBy(
                    16.dp,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    if (
                        score.completed
                    ) {
                        "Partie terminée"
                    } else {
                        "Partie Atoutia"
                    },

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
                    createActionStatus(
                        localPlayer =
                            session.player,

                        actionsMode =
                            actions.mode,

                        currentPlayer =
                            currentPlayer,
                    ),

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.SemiBold,

                textAlign =
                    TextAlign.Center,
            )

            MatchSummaryCard(
                dealNumber =
                    publicMatch.dealNumber,

                localPlayer =
                    session.player,

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
            )

            GameTable(
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
            )

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
            )
        }
    }
}

@Composable
private fun MatchSummaryCard(
    dealNumber:
        Int,

    localPlayer:
        PlayerPosition,

    dealer:
        PlayerPosition,

    taker:
        PlayerPosition?,

    trumpSuit:
        CardSuit?,

    scoreTeam0:
        Int,

    scoreTeam1:
        Int,

    targetScore:
        Int,

    revision:
        Int,
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
            GameInformationRow(
                label =
                    "Vous",

                value =
                    localPlayer
                        .toDisplayName(),
            )

            GameInformationRow(
                label =
                    "Donne",

                value =
                    dealNumber.toString(),
            )

            GameInformationRow(
                label =
                    "Donneur",

                value =
                    dealer.toDisplayName(),
            )

            GameInformationRow(
                label =
                    "Preneur",

                value =
                    taker
                        ?.toDisplayName()
                        ?: "—",
            )

            GameInformationRow(
                label =
                    "Atout",

                value =
                    trumpSuit
                        ?.toDisplayName()
                        ?: "—",
            )

            GameInformationRow(
                label =
                    "Score",

                value =
                    "$scoreTeam0 - $scoreTeam1 / $targetScore",
            )

            GameInformationRow(
                label =
                    "Révision",

                value =
                    revision.toString(),
            )
        }
    }
}

@Composable
private fun GameTable(
    localPlayer:
        PlayerPosition,

    dealer:
        PlayerPosition,

    taker:
        PlayerPosition?,

    currentPlayer:
        PlayerPosition?,

    trick:
        PublicCurrentTrickSnapshot?,

    phase:
        DealPhase,

    trumpSuit:
        CardSuit?,

    turnUpCard:
        PlayerCard,
) {
    val leftPlayer =
        localPlayer.offsetBy(
            1,
        )

    val topPlayer =
        localPlayer.offsetBy(
            2,
        )

    val rightPlayer =
        localPlayer.offsetBy(
            3,
        )

    OutlinedCard(
        modifier =
            Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier =
                Modifier.padding(
                    12.dp,
                ),

            verticalArrangement =
                Arrangement.spacedBy(
                    12.dp,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            SeatPanel(
                player =
                    topPlayer,

                localPlayer =
                    localPlayer,

                dealer =
                    dealer,

                taker =
                    taker,

                currentPlayer =
                    currentPlayer,

                playedCard =
                    trick.cardPlayedBy(
                        topPlayer,
                    ),

                modifier =
                    Modifier.fillMaxWidth(),
            )

            Row(
                modifier =
                    Modifier.fillMaxWidth(),

                horizontalArrangement =
                    Arrangement.spacedBy(
                        8.dp,
                    ),

                verticalAlignment =
                    Alignment.CenterVertically,
            ) {
                SeatPanel(
                    player =
                        leftPlayer,

                    localPlayer =
                        localPlayer,

                    dealer =
                        dealer,

                    taker =
                        taker,

                    currentPlayer =
                        currentPlayer,

                    playedCard =
                        trick.cardPlayedBy(
                            leftPlayer,
                        ),

                    modifier =
                        Modifier.weight(
                            1f,
                        ),
                )

                TableCenter(
                    phase =
                        phase,

                    trumpSuit =
                        trumpSuit,

                    turnUpCard =
                        turnUpCard,

                    trick =
                        trick,

                    modifier =
                        Modifier.weight(
                            1.15f,
                        ),
                )

                SeatPanel(
                    player =
                        rightPlayer,

                    localPlayer =
                        localPlayer,

                    dealer =
                        dealer,

                    taker =
                        taker,

                    currentPlayer =
                        currentPlayer,

                    playedCard =
                        trick.cardPlayedBy(
                            rightPlayer,
                        ),

                    modifier =
                        Modifier.weight(
                            1f,
                        ),
                )
            }

            SeatPanel(
                player =
                    localPlayer,

                localPlayer =
                    localPlayer,

                dealer =
                    dealer,

                taker =
                    taker,

                currentPlayer =
                    currentPlayer,

                playedCard =
                    trick.cardPlayedBy(
                        localPlayer,
                    ),

                modifier =
                    Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun SeatPanel(
    player:
        PlayerPosition,

    localPlayer:
        PlayerPosition,

    dealer:
        PlayerPosition,

    taker:
        PlayerPosition?,

    currentPlayer:
        PlayerPosition?,

    playedCard:
        PlayerCard?,

    modifier:
        Modifier =
        Modifier,
) {
    OutlinedCard(
        modifier =
            modifier,
    ) {
        Column(
            modifier =
                Modifier.padding(
                    10.dp,
                ),

            verticalArrangement =
                Arrangement.spacedBy(
                    4.dp,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    if (
                        player ==
                            localPlayer
                    ) {
                        "Vous • ${player.toDisplayName()}"
                    } else {
                        player.toDisplayName()
                    },

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                fontWeight =
                    if (
                        player ==
                            currentPlayer
                    ) {
                        FontWeight.Bold
                    } else {
                        FontWeight.SemiBold
                    },

                textAlign =
                    TextAlign.Center,
            )

            val markers =
                buildList {
                    if (
                        player ==
                            dealer
                    ) {
                        add(
                            "Donneur",
                        )
                    }

                    if (
                        player ==
                            taker
                    ) {
                        add(
                            "Preneur",
                        )
                    }

                    if (
                        player ==
                            currentPlayer
                    ) {
                        add(
                            "À jouer",
                        )
                    }
                }

            if (
                markers.isNotEmpty()
            ) {
                Text(
                    text =
                        markers.joinToString(
                            separator =
                                " • ",
                        ),

                    style =
                        MaterialTheme
                            .typography
                            .bodySmall,

                    textAlign =
                        TextAlign.Center,
                )
            }

            if (
                playedCard !=
                    null
            ) {
                Text(
                    text =
                        playedCard.toCompactDisplayName(),

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

                    fontWeight =
                        FontWeight.Bold,

                    textAlign =
                        TextAlign.Center,
                )
            } else {
                Text(
                    text =
                        "—",

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

                    textAlign =
                        TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun TableCenter(
    phase:
        DealPhase,

    trumpSuit:
        CardSuit?,

    turnUpCard:
        PlayerCard,

    trick:
        PublicCurrentTrickSnapshot?,

    modifier:
        Modifier =
        Modifier,
) {
    Column(
        modifier =
            modifier.padding(
                horizontal =
                    4.dp,
            ),

        verticalArrangement =
            Arrangement.spacedBy(
                6.dp,
            ),

        horizontalAlignment =
            Alignment.CenterHorizontally,
    ) {
        Text(
            text =
                when (
                    phase
                ) {
                    DealPhase.BIDDING ->
                        "Enchères"

                    DealPhase.PLAYING ->
                        "Pli en cours"

                    DealPhase.FINISHED ->
                        "Donne terminée"
                },

            style =
                MaterialTheme
                    .typography
                    .titleSmall,

            fontWeight =
                FontWeight.Bold,

            textAlign =
                TextAlign.Center,
        )

        if (
            phase ==
                DealPhase.BIDDING
        ) {
            Text(
                text =
                    "Retournée",

                style =
                    MaterialTheme
                        .typography
                        .bodySmall,
            )

            Text(
                text =
                    turnUpCard
                        .toCompactDisplayName(),

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )
        } else {
            Text(
                text =
                    "Atout",

                style =
                    MaterialTheme
                        .typography
                        .bodySmall,
            )

            Text(
                text =
                    trumpSuit
                        ?.toDisplayName()
                        ?: "—",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    "${trick?.plays?.size ?: 0} / 4 cartes",

                style =
                    MaterialTheme
                        .typography
                        .bodySmall,

                textAlign =
                    TextAlign.Center,
            )
        }
    }
}

@Composable
private fun BiddingPanel(
    actions:
        List<BiddingActionSnapshot>,

    state:
        GameBiddingUiState,

    enabled:
        Boolean,

    onAction:
        (
            BiddingActionSnapshot,
        ) -> Unit,
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
    hand:
        List<PlayerCard>,

    legalCards:
        List<PlayerCard>,

    canPlay:
        Boolean,

    submitting:
        Boolean,

    onPlayCard:
        (
            (
                PlayerCard,
            ) -> Unit
        )?,

    playCardState:
        GamePlayCardUiState,
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
                        "Les cartes jouables sont activées. Les autres restent visibles mais désactivées."
                    } else {
                        "En attente de votre prochain tour."
                    },

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,
            )

            hand
                .chunked(
                    2,
                )
                .forEach {
                    rowCards ->
                    Row(
                        modifier =
                            Modifier.fillMaxWidth(),

                        horizontalArrangement =
                            Arrangement.spacedBy(
                                8.dp,
                            ),
                    ) {
                        rowCards.forEach {
                            card ->
                            val isLegal =
                                canPlay &&
                                    card in
                                    legalCards

                            HandCardButton(
                                card =
                                    card,

                                legal =
                                    isLegal,

                                enabled =
                                    isLegal &&
                                        !submitting &&
                                        onPlayCard !=
                                        null,

                                onClick = {
                                    onPlayCard
                                        ?.invoke(
                                            card,
                                        )
                                },

                                modifier =
                                    Modifier.weight(
                                        1f,
                                    ),
                            )
                        }

                        if (
                            rowCards.size ==
                                1
                        ) {
                            Spacer(
                                modifier =
                                    Modifier.weight(
                                        1f,
                                    ),
                            )
                        }
                    }
                }

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
private fun HandCardButton(
    card:
        PlayerCard,

    legal:
        Boolean,

    enabled:
        Boolean,

    onClick:
        () -> Unit,

    modifier:
        Modifier =
        Modifier,
) {
    if (
        legal
    ) {
        Button(
            onClick =
                onClick,

            enabled =
                enabled,

            modifier =
                modifier,
        ) {
            Text(
                text =
                    card.toCompactDisplayName(),

                textAlign =
                    TextAlign.Center,
            )
        }
    } else {
        OutlinedButton(
            onClick = {},

            enabled =
                false,

            modifier =
                modifier,
        ) {
            Text(
                text =
                    card.toCompactDisplayName(),

                textAlign =
                    TextAlign.Center,
            )
        }
    }
}

@Composable
private fun MatchFinishedPanel(
    team0:
        Int,

    team1:
        Int,

    winner:
        MatchTeam?,
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
    action:
        BiddingActionSnapshot,

    enabled:
        Boolean,

    onClick:
        () -> Unit,
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
    message:
        String,
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
    message:
        String,
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

@Composable
private fun GameInformationRow(
    label:
        String,

    value:
        String,
) {
    Row(
        modifier =
            Modifier.fillMaxWidth(),

        horizontalArrangement =
            Arrangement.spacedBy(
                16.dp,
            ),

        verticalAlignment =
            Alignment.CenterVertically,
    ) {
        Text(
            text =
                label,

            modifier =
                Modifier.weight(
                    1f,
                ),

            style =
                MaterialTheme
                    .typography
                    .bodyMedium,

            fontWeight =
                FontWeight.SemiBold,
        )

        Text(
            text =
                value,

            modifier =
                Modifier.weight(
                    1f,
                ),

            style =
                MaterialTheme
                    .typography
                    .bodyMedium,

            textAlign =
                TextAlign.End,
        )
    }
}

private fun createActionStatus(
    localPlayer:
        PlayerPosition,

    actionsMode:
        PlayerActionMode,

    currentPlayer:
        PlayerPosition?,
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

private fun PublicCurrentTrickSnapshot?.cardPlayedBy(
    player:
        PlayerPosition,
): PlayerCard? =
    this
        ?.plays
        ?.firstOrNull {
            play ->
            play.player ==
                player
        }
        ?.card

private fun PlayerPosition.offsetBy(
    offset:
        Int,
): PlayerPosition {
    val players =
        PlayerPosition.entries

    val index =
        (
            ordinal +
                offset
            ) %
            players.size

    return players[index]
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

private fun DealPhase.toDisplayName():
    String =
    when (
        this
    ) {
        DealPhase.BIDDING ->
            "Enchères"

        DealPhase.PLAYING ->
            "Jeu des cartes"

        DealPhase.FINISHED ->
            "Donne terminée"
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

private fun PlayerCard.toCompactDisplayName():
    String =
    "${rank.toDisplayName()} ${suit.toSymbol()}"

private fun PlayerCard.toDisplayName():
    String =
    "${rank.toDisplayName()} de ${suit.toDisplayName()}"

private fun CardSuit.toSymbol():
    String =
    when (
        this
    ) {
        CardSuit.CLUBS ->
            "♣"

        CardSuit.DIAMONDS ->
            "♦"

        CardSuit.HEARTS ->
            "♥"

        CardSuit.SPADES ->
            "♠"
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

private fun CardRank.toDisplayName():
    String =
    when (
        this
    ) {
        CardRank.SEVEN ->
            "7"

        CardRank.EIGHT ->
            "8"

        CardRank.NINE ->
            "9"

        CardRank.TEN ->
            "10"

        CardRank.JACK ->
            "V"

        CardRank.QUEEN ->
            "D"

        CardRank.KING ->
            "R"

        CardRank.ACE ->
            "A"
    }