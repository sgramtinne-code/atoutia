package tech.devoo.atoutia

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.auth.AndroidSecureAuthTokenStore
import tech.devoo.atoutia.auth.AuthSessionCoordinator
import tech.devoo.atoutia.auth.AuthStartupCoordinator
import tech.devoo.atoutia.auth.AuthStartupState
import tech.devoo.atoutia.auth.HttpAuthSessionApi
import tech.devoo.atoutia.network.AtoutiaBackendClient
import tech.devoo.atoutia.network.BackendHealth
import tech.devoo.atoutia.ui.theme.AtoutiaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(
        savedInstanceState:
            Bundle?,
    ) {
        super.onCreate(
            savedInstanceState,
        )

        enableEdgeToEdge()

        setContent {
            AtoutiaTheme {
                AtoutiaApp(
                    checkBackend =
                        ::checkBackend,

                    restoreAuth =
                        ::restoreAuth,
                )
            }
        }
    }

    private fun restoreAuth(
        onResult:
            (
                AuthStartupState,
            ) -> Unit,
    ) {
        Thread {
            val state =
                if (
                    BuildConfig
                        .ATOUTIA_API_BASE_URL
                        .isBlank()
                ) {
                    AuthStartupState
                        .TemporarilyUnavailable(
                            message =
                                "Le backend d’authentification Atoutia n’est pas configuré.",
                        )
                } else {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    val sessionApi =
                        HttpAuthSessionApi(
                            BuildConfig
                                .ATOUTIA_API_BASE_URL,
                        )

                    val sessionCoordinator =
                        AuthSessionCoordinator(
                            tokenStore =
                                tokenStore,

                            sessionApi =
                                sessionApi,
                        )

                    val startupCoordinator =
                        AuthStartupCoordinator(
                            sessionCoordinator =
                                sessionCoordinator,
                        )

                    startupCoordinator.restore()
                }

            runOnUiThread {
                onResult(
                    state,
                )
            }
        }.start()
    }

    private fun checkBackend(
        onResult:
            (
                BackendCheckState,
            ) -> Unit,
    ) {
        Thread {
            val state =
                try {
                    val client =
                        AtoutiaBackendClient(
                            BuildConfig
                                .ATOUTIA_API_BASE_URL,
                        )

                    val health =
                        client.checkHealth()

                    BackendCheckState.Connected(
                        health,
                    )
                } catch (
                    error:
                        Exception,
                ) {
                    BackendCheckState.Failed(
                        message =
                            error.message
                                ?: "Erreur réseau inconnue.",
                    )
                }

            runOnUiThread {
                onResult(
                    state,
                )
            }
        }.start()
    }
}

sealed interface BackendCheckState {
    data object Idle :
        BackendCheckState

    data object Loading :
        BackendCheckState

    data class Connected(
        val health:
            BackendHealth,
    ) : BackendCheckState

    data class Failed(
        val message:
            String,
    ) : BackendCheckState
}

@Composable
private fun AtoutiaApp(
    checkBackend:
        (
            (
                BackendCheckState,
            ) -> Unit,
        ) -> Unit,

    restoreAuth:
        (
            (
                AuthStartupState,
            ) -> Unit,
        ) -> Unit,
) {
    var backendState by
        remember {
            mutableStateOf<
                BackendCheckState
            >(
                BackendCheckState.Idle,
            )
        }

    var authState by
        remember {
            mutableStateOf<
                AuthStartupState
            >(
                AuthStartupState.Loading,
            )
        }

    LaunchedEffect(
        Unit,
    ) {
        restoreAuth {
            authState =
                it
        }
    }

    Scaffold(
        modifier =
            Modifier.fillMaxSize(),
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
                            12.dp,
                    ),

                text =
                    "La Belote moderne.",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,
            )

            AuthStatus(
                modifier =
                    Modifier.padding(
                        top =
                            32.dp,
                    ),

                state =
                    authState,
            )

            BackendStatus(
                modifier =
                    Modifier.padding(
                        top =
                            24.dp,
                    ),

                state =
                    backendState,
            )

            Button(
                modifier =
                    Modifier.padding(
                        top =
                            24.dp,
                    ),

                enabled =
                    backendState !is
                        BackendCheckState.Loading,

                onClick = {
                    backendState =
                        BackendCheckState.Loading

                    checkBackend {
                        backendState =
                            it
                    }
                },
            ) {
                Text(
                    text =
                        "Tester le backend",
                )
            }
        }
    }
}

@Composable
private fun AuthStatus(
    modifier:
        Modifier =
            Modifier,

    state:
        AuthStartupState,
) {
    when (
        state
    ) {
        AuthStartupState.Loading -> {
            Column(
                modifier =
                    modifier,

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator()

                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                12.dp,
                        ),

                    text =
                        "Restauration de la session…",

                    style =
                        MaterialTheme
                            .typography
                            .bodyLarge,
                )
            }
        }

        AuthStartupState.SignedOut -> {
            Column(
                modifier =
                    modifier,

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                Text(
                    text =
                        "Aucune session Atoutia",

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

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
                        "Connexion utilisateur à venir.",

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }
        }

        is AuthStartupState.Authenticated -> {
            Column(
                modifier =
                    modifier,

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                Text(
                    text =
                        "Session Atoutia restaurée",

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

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
                        "Session sécurisée active.",

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }
        }

        is AuthStartupState.TemporarilyUnavailable -> {
            Column(
                modifier =
                    modifier,

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                Text(
                    text =
                        "Session temporairement indisponible",

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

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
                        state.message,

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
private fun BackendStatus(
    modifier:
        Modifier =
            Modifier,

    state:
        BackendCheckState,
) {
    when (
        state
    ) {
        BackendCheckState.Idle -> {
            Text(
                modifier =
                    modifier,

                text =
                    "Backend non testé",

                style =
                    MaterialTheme
                        .typography
                        .bodyLarge,
            )
        }

        BackendCheckState.Loading -> {
            Column(
                modifier =
                    modifier,

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator()

                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                12.dp,
                        ),

                    text =
                        "Connexion au backend…",

                    style =
                        MaterialTheme
                            .typography
                            .bodyLarge,
                )
            }
        }

        is BackendCheckState.Connected -> {
            Column(
                modifier =
                    modifier,

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                Text(
                    text =
                        "Backend Atoutia connecté",

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

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
                        "Moteur ${state.health.engineVersion} • ${state.health.liveRooms} partie(s) active(s)",

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }
        }

        is BackendCheckState.Failed -> {
            Column(
                modifier =
                    modifier,

                horizontalAlignment =
                    Alignment.CenterHorizontally,
            ) {
                Text(
                    text =
                        "Backend inaccessible",

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

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
                        state.message,

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }
        }
    }
}

@Preview(
    showBackground =
        true,
)
@Composable
private fun AtoutiaAppPreview() {
    AtoutiaTheme {
        AtoutiaApp(
            checkBackend = {},

            restoreAuth = {
                it(
                    AuthStartupState.SignedOut,
                )
            },
        )
    }
}