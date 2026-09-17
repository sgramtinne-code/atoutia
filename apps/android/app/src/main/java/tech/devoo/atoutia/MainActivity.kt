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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.AtoutiaBackendClient
import tech.devoo.atoutia.network.BackendHealth
import tech.devoo.atoutia.ui.theme.AtoutiaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(
        savedInstanceState: Bundle?,
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
                )
            }
        }
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
) {
    var backendState by
        remember {
            mutableStateOf<
                BackendCheckState
            >(
                BackendCheckState.Idle,
            )
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

            BackendStatus(
                modifier =
                    Modifier.padding(
                        top =
                            32.dp,
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
        )
    }
}