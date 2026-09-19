package tech.devoo.atoutia.ui.lobby

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
import tech.devoo.atoutia.network.room.LiveRoomSummary
import tech.devoo.atoutia.network.room.MatchMode

@Composable
fun RoomLobbyScreen(
    room:
        LiveRoomSummary,

    modifier:
        Modifier =
            Modifier,
) {
    Scaffold(
        modifier =
            modifier.fillMaxSize(),
    ) { innerPadding ->
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
                Arrangement.Center,

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    "Salon créé",

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
                    "En attente des autres joueurs.",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,
            )

            OutlinedCard(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                32.dp,
                        ),
            ) {
                Column(
                    modifier =
                        Modifier.padding(
                            20.dp,
                        ),
                ) {
                    Text(
                        text =
                            "Identifiant de la partie",

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
                            room.sessionId,

                        style =
                            MaterialTheme
                                .typography
                                .bodyLarge,

                        fontWeight =
                            FontWeight.Bold,
                    )

                    Text(
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        text =
                            "Mode",

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
                            room.mode.toDisplayName(),

                        style =
                            MaterialTheme
                                .typography
                                .bodyLarge,
                    )

                    Text(
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        text =
                            "Joueurs",

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
                            "${room.occupiedSeats} / 4",

                        style =
                            MaterialTheme
                                .typography
                                .headlineSmall,

                        fontWeight =
                            FontWeight.Bold,
                    )

                    Text(
                        modifier =
                            Modifier.padding(
                                top =
                                    20.dp,
                            ),

                        text =
                            "Votre place",

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
                            "Joueur 1",

                        style =
                            MaterialTheme
                                .typography
                                .bodyLarge,

                        fontWeight =
                            FontWeight.Bold,
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
                    "Le salon est créé sur le serveur Atoutia et votre siège PLAYER_0 est réservé.",

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                textAlign =
                    TextAlign.Center,
            )
        }
    }
}

private fun MatchMode.toDisplayName():
    String =
    when (
        this
    ) {
        MatchMode.PRIVATE ->
            "Privée"

        MatchMode.CASUAL ->
            "Amicale"

        MatchMode.RANKED ->
            "Classée"
    }