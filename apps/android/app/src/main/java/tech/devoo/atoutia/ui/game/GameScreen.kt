package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.game.CardRank
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.DealPhase
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerGameSession
import tech.devoo.atoutia.network.room.PlayerPosition

@Composable
fun GameScreen(
    session:
        PlayerGameSession,

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
                    .padding(
                        horizontal =
                            24.dp,

                        vertical =
                            32.dp,
                    ),

            verticalArrangement =
                Arrangement.Top,

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    "Partie Atoutia",

                style =
                    MaterialTheme
                        .typography
                        .displaySmall,

                fontWeight =
                    FontWeight.Bold,
            )

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            8.dp,
                    ),

                text =
                    "La partie est en cours.",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                textAlign =
                    TextAlign.Center,
            )

            OutlinedCard(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                28.dp,
                        ),
            ) {
                Column(
                    modifier =
                        Modifier.padding(
                            20.dp,
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
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        label =
                            "Phase",

                        value =
                            publicMatch.phase
                                .toDisplayName(),
                    )

                    GameInformationRow(
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        label =
                            "Carte retournée",

                        value =
                            "${publicMatch.turnUpCard.rank.toDisplayName()} de ${publicMatch.turnUpCard.suit.toDisplayName()}",
                    )

                    GameInformationRow(
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        label =
                            "Cartes en main",

                        value =
                            match.hand.size
                                .toString(),
                    )

                    GameInformationRow(
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        label =
                            "Action disponible",

                        value =
                            actions.mode
                                .toDisplayName(),
                    )

                    GameInformationRow(
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        label =
                            "Score",

                        value =
                            "${publicMatch.score.scores.team0} - ${publicMatch.score.scores.team1}",
                    )
                }
            }

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            24.dp,
                    ),

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
                modifier =
                    Modifier.padding(
                        top =
                            8.dp,
                    ),

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
private fun GameInformationRow(
    label:
        String,

    value:
        String,

    modifier:
        Modifier =
            Modifier,
) {
    Column(
        modifier =
            modifier,
    ) {
        Text(
            text =
                label,

            style =
                MaterialTheme
                    .typography
                    .labelLarge,
        )

        Text(
            modifier =
                Modifier.padding(
                    top =
                        6.dp,
                ),

            text =
                value,

            style =
                MaterialTheme
                    .typography
                    .bodyLarge,

            fontWeight =
                FontWeight.Bold,
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