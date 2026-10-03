package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
                        24.dp,
                    ),

            verticalArrangement =
                Arrangement.spacedBy(
                    20.dp,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    "Partie Atoutia",

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
                    "La partie est en cours.",

                style =
                    MaterialTheme
                        .typography
                        .bodyLarge,

                textAlign =
                    TextAlign.Center,
            )

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
                            16.dp,
                        ),
                ) {
                    GameInformationRow(
                        label =
                            "Votre place",

                        value =
                            session.player
                                .toDisplayName(),
                    )

                    GameInformationRow(
                        label =
                            "Phase",

                        value =
                            publicMatch.phase
                                .toDisplayName(),
                    )

                    GameInformationRow(
                        label =
                            "Carte retournée",

                        value =
                            publicMatch
                                .turnUpCard
                                .toDisplayName(),
                    )

                    GameInformationRow(
                        label =
                            "Cartes en main",

                        value =
                            match.hand
                                .size
                                .toString(),
                    )

                    GameInformationRow(
                        label =
                            "Action disponible",

                        value =
                            actions.mode
                                .toDisplayName(),
                    )

                    GameInformationRow(
                        label =
                            "Score",

                        value =
                            "${score.scores.team0} - ${score.scores.team1}",
                    )

                    GameInformationRow(
                        label =
                            "Révision serveur",

                        value =
                            session.revision
                                .toString(),
                    )
                }
            }

            if (
                actions.mode ==
                    PlayerActionMode.BID
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
                                12.dp,
                            ),
                    ) {
                        Text(
                            text =
                                "Votre enchère",

                            style =
                                MaterialTheme
                                    .typography
                                    .titleMedium,

                            fontWeight =
                                FontWeight.SemiBold,
                        )

                        Text(
                            text =
                                "Choisis uniquement parmi les actions autorisées par le serveur.",

                            style =
                                MaterialTheme
                                    .typography
                                    .bodyMedium,
                        )

                        actions
                            .biddingActions
                            .forEach {
                                action ->
                                BiddingActionButton(
                                    action =
                                        action,

                                    enabled =
                                        !isSubmitting &&
                                            onBiddingAction !=
                                            null,

                                    onClick = {
                                        onBiddingAction
                                            ?.invoke(
                                                action,
                                            )
                                    },
                                )
                            }

                        when (
                            val state =
                                biddingState
                        ) {
                            GameBiddingUiState.Idle -> {
                                // Rien à afficher.
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

            if (
                actions.mode ==
                    PlayerActionMode.PLAY_CARD
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
                                12.dp,
                            ),
                    ) {
                        Text(
                            text =
                                "Votre carte",

                            style =
                                MaterialTheme
                                    .typography
                                    .titleMedium,

                            fontWeight =
                                FontWeight.SemiBold,
                        )

                        Text(
                            text =
                                "Seules les cartes autorisées par le serveur sont proposées.",

                            style =
                                MaterialTheme
                                    .typography
                                    .bodyMedium,
                        )

                        actions
                            .legalCards
                            .forEach {
                                card ->
                                PlayCardButton(
                                    card =
                                        card,

                                    enabled =
                                        !isSubmitting &&
                                            onPlayCard !=
                                            null,

                                    onClick = {
                                        onPlayCard
                                            ?.invoke(
                                                card,
                                            )
                                    },
                                )
                            }

                        if (
                            actions
                                .legalCards
                                .isEmpty()
                        ) {
                            Text(
                                text =
                                    "Aucune carte jouable n’est actuellement proposée par le serveur.",

                                style =
                                    MaterialTheme
                                        .typography
                                        .bodyMedium,
                            )
                        }

                        when (
                            val state =
                                playCardState
                        ) {
                            GamePlayCardUiState.Idle -> {
                                // Rien à afficher.
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
                                        state.message,
                                )
                            }
                        }
                    }
                }
            }

            if (
                match.hand.isNotEmpty()
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
                                8.dp,
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
                                FontWeight.SemiBold,
                        )

                        match.hand
                            .forEach {
                                card ->
                                Text(
                                    text =
                                        card.toDisplayName(),

                                    style =
                                        MaterialTheme
                                            .typography
                                            .bodyMedium,
                                )
                            }
                    }
                }
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
                    "Snapshot privé chargé depuis le serveur Atoutia.",

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    "Moteur ${document.engineVersion} • format ${document.formatVersion}",

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
private fun PlayCardButton(
    card:
        PlayerCard,

    enabled:
        Boolean,

    onClick:
        () -> Unit,
) {
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
                "Jouer ${card.toDisplayName()}",
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

private fun PlayerActionMode.toDisplayName():
    String =
    when (
        this
    ) {
        PlayerActionMode.WAIT ->
            "Attendre"

        PlayerActionMode.BID ->
            "Enchérir"

        PlayerActionMode.PLAY_CARD ->
            "Jouer une carte"

        PlayerActionMode.MATCH_FINISHED ->
            "Partie terminée"
    }

private fun PlayerCard.toDisplayName():
    String =
    "${rank.toDisplayName()} de ${suit.toDisplayName()}"

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
            "Valet"

        CardRank.QUEEN ->
            "Dame"

        CardRank.KING ->
            "Roi"

        CardRank.ACE ->
            "As"
    }