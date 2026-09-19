package tech.devoo.atoutia.ui.home

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

enum class HomeAction {
    Play,
    Profile,
    Leaderboard,
    History,
    Settings,
}

sealed interface SignOutUiState {
    data object Idle :
        SignOutUiState

    data object Loading :
        SignOutUiState

    data class Failed(
        val message:
            String,
    ) : SignOutUiState
}

@Composable
fun AuthenticatedHomeScreen(
    signOutState:
        SignOutUiState,

    notice:
        String?,

    onAction:
        (
            HomeAction,
        ) -> Unit,

    onSignOut:
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
                    "Atoutia",

                style =
                    MaterialTheme
                        .typography
                        .displayMedium,

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
                    "La Belote moderne.",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,
            )

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            32.dp,
                    ),

                text =
                    "Prêt à jouer ?",

                style =
                    MaterialTheme
                        .typography
                        .headlineSmall,

                fontWeight =
                    FontWeight.Bold,
            )

            Button(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                24.dp,
                        ),

                onClick = {
                    onAction(
                        HomeAction.Play,
                    )
                },
            ) {
                Text(
                    text =
                        "Jouer",
                )
            }

            HomeSecondaryButton(
                text =
                    "Mon profil",

                onClick = {
                    onAction(
                        HomeAction.Profile,
                    )
                },
            )

            HomeSecondaryButton(
                text =
                    "Classement",

                onClick = {
                    onAction(
                        HomeAction.Leaderboard,
                    )
                },
            )

            HomeSecondaryButton(
                text =
                    "Historique",

                onClick = {
                    onAction(
                        HomeAction.History,
                    )
                },
            )

            HomeSecondaryButton(
                text =
                    "Paramètres",

                onClick = {
                    onAction(
                        HomeAction.Settings,
                    )
                },
            )

            if (
                notice !=
                    null
            ) {
                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                20.dp,
                        ),

                    text =
                        notice,

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
                                28.dp,
                        ),

                enabled =
                    signOutState !is
                        SignOutUiState.Loading,

                onClick =
                    onSignOut,
            ) {
                Text(
                    text =
                        if (
                            signOutState is
                                SignOutUiState.Loading
                        ) {
                            "Déconnexion…"
                        } else {
                            "Se déconnecter"
                        },
                )
            }

            if (
                signOutState is
                    SignOutUiState.Loading
            ) {
                CircularProgressIndicator(
                    modifier =
                        Modifier.padding(
                            top =
                                12.dp,
                        ),
                )
            }

            if (
                signOutState is
                    SignOutUiState.Failed
            ) {
                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                12.dp,
                        ),

                    text =
                        signOutState.message,

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun HomeSecondaryButton(
    text:
        String,

    onClick:
        () -> Unit,
) {
    OutlinedButton(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(
                    top =
                        12.dp,
                ),

        onClick =
            onClick,
    ) {
        Text(
            text =
                text,
        )
    }
}