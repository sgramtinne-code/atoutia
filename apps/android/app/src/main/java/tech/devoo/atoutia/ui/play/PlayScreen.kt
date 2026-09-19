package tech.devoo.atoutia.ui.play

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

sealed interface CreateRoomUiState {
    data object Idle :
        CreateRoomUiState

    data object Loading :
        CreateRoomUiState

    data class Failed(
        val message:
            String,
    ) : CreateRoomUiState
}

@Composable
fun PlayScreen(
    createRoomState:
        CreateRoomUiState,

    onCreateRoom:
        () -> Unit,

    onBack:
        () -> Unit,

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
                    "Jouer",

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
                    "Choisis comment tu veux lancer ta partie.",

                style =
                    MaterialTheme
                        .typography
                        .bodyLarge,
            )

            Button(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                32.dp,
                        ),

                enabled =
                    createRoomState !is
                        CreateRoomUiState.Loading,

                onClick =
                    onCreateRoom,
            ) {
                Text(
                    text =
                        if (
                            createRoomState is
                                CreateRoomUiState.Loading
                        ) {
                            "Création du salon…"
                        } else {
                            "Créer une partie"
                        },
                )
            }

            OutlinedButton(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                12.dp,
                        ),

                enabled =
                    false,

                onClick = {},
            ) {
                Text(
                    text =
                        "Rejoindre une partie",
                )
            }

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            8.dp,
                    ),

                text =
                    "Rejoindre une partie sera activé dans le prochain bloc.",

                style =
                    MaterialTheme
                        .typography
                        .bodySmall,
            )

            if (
                createRoomState is
                    CreateRoomUiState.Loading
            ) {
                CircularProgressIndicator(
                    modifier =
                        Modifier.padding(
                            top =
                                20.dp,
                        ),
                )
            }

            if (
                createRoomState is
                    CreateRoomUiState.Failed
            ) {
                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                20.dp,
                        ),

                    text =
                        createRoomState.message,

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }

            OutlinedButton(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                32.dp,
                        ),

                enabled =
                    createRoomState !is
                        CreateRoomUiState.Loading,

                onClick =
                    onBack,
            ) {
                Text(
                    text =
                        "Retour",
                )
            }
        }
    }
}