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
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import tech.devoo.atoutia.auth.AndroidSecureAuthTokenStore
import tech.devoo.atoutia.auth.AuthSessionCoordinator
import tech.devoo.atoutia.auth.AuthStartupCoordinator
import tech.devoo.atoutia.auth.AuthStartupState
import tech.devoo.atoutia.auth.CredentialManagerGoogleCredentialProvider
import tech.devoo.atoutia.auth.GoogleAuthCoordinator
import tech.devoo.atoutia.auth.GoogleAuthProtocolException
import tech.devoo.atoutia.auth.GoogleAuthRejectedException
import tech.devoo.atoutia.auth.GoogleAuthUnavailableException
import tech.devoo.atoutia.auth.GoogleCredentialCancelledException
import tech.devoo.atoutia.auth.GoogleCredentialProtocolException
import tech.devoo.atoutia.auth.GoogleCredentialUnavailableException
import tech.devoo.atoutia.auth.HttpAuthSessionApi
import tech.devoo.atoutia.auth.HttpGoogleAuthApi
import tech.devoo.atoutia.network.AtoutiaBackendClient
import tech.devoo.atoutia.network.BackendHealth
import tech.devoo.atoutia.ui.home.AuthenticatedHomeScreen
import tech.devoo.atoutia.ui.home.HomeAction
import tech.devoo.atoutia.ui.home.SignOutUiState
import tech.devoo.atoutia.ui.theme.AtoutiaTheme
import java.io.IOException

class MainActivity :
    ComponentActivity() {
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

                    signInWithGoogle =
                        ::signInWithGoogle,

                    signOut =
                        ::signOut,
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
        lifecycleScope.launch {
            val state =
                withContext(
                    Dispatchers.IO,
                ) {
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

                        startupCoordinator
                            .restore()
                    }
                }

            onResult(
                state,
            )
        }
    }

    private fun signInWithGoogle(
        onResult:
            (
                GoogleSignInResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        val googleClientId =
            BuildConfig
                .ATOUTIA_GOOGLE_CLIENT_ID

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                GoogleSignInResult.Failed(
                    message =
                        "Le backend d’authentification Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        if (
            googleClientId.isBlank()
        ) {
            onResult(
                GoogleSignInResult.Failed(
                    message =
                        "Le Google Client ID Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                try {
                    val credentialProvider =
                        CredentialManagerGoogleCredentialProvider(
                            applicationContext,
                        )

                    val idToken =
                        credentialProvider
                            .requestIdToken(
                                activity =
                                    this@MainActivity,

                                serverClientId =
                                    googleClientId,
                            )

                    val googleResult =
                        withContext(
                            Dispatchers.IO,
                        ) {
                            val tokenStore =
                                AndroidSecureAuthTokenStore(
                                    applicationContext,
                                )

                            val googleAuthApi =
                                HttpGoogleAuthApi(
                                    apiBaseUrl,
                                )

                            val coordinator =
                                GoogleAuthCoordinator(
                                    googleAuthApi =
                                        googleAuthApi,

                                    tokenStore =
                                        tokenStore,
                                )

                            coordinator
                                .authenticate(
                                    idToken,
                                )
                        }

                    GoogleSignInResult.Authenticated(
                        accountId =
                            googleResult
                                .session
                                .accountId,

                        sessionId =
                            googleResult
                                .session
                                .sessionId,

                        accountCreated =
                            googleResult
                                .accountCreated,
                    )
                } catch (
                    error:
                        GoogleCredentialCancelledException,
                ) {
                    GoogleSignInResult.Cancelled
                } catch (
                    error:
                        GoogleCredentialUnavailableException,
                ) {
                    GoogleSignInResult.Failed(
                        message =
                            error.message
                                ?: "La connexion Google est indisponible.",
                    )
                } catch (
                    error:
                        GoogleCredentialProtocolException,
                ) {
                    GoogleSignInResult.Failed(
                        message =
                            error.message
                                ?: "La réponse Google est invalide.",
                    )
                } catch (
                    error:
                        GoogleAuthRejectedException,
                ) {
                    GoogleSignInResult.Failed(
                        message =
                            "Le compte Google n’a pas pu être validé par Atoutia.",
                    )
                } catch (
                    error:
                        GoogleAuthUnavailableException,
                ) {
                    GoogleSignInResult.Failed(
                        message =
                            "L’authentification Google est temporairement indisponible côté Atoutia.",
                    )
                } catch (
                    error:
                        GoogleAuthProtocolException,
                ) {
                    GoogleSignInResult.Failed(
                        message =
                            error.message
                                ?: "La réponse d’authentification Atoutia est invalide.",
                    )
                } catch (
                    error:
                        IOException,
                ) {
                    GoogleSignInResult.Failed(
                        message =
                            error.message
                                ?: "Le backend Atoutia est inaccessible.",
                    )
                } catch (
                    error:
                        IllegalArgumentException,
                ) {
                    GoogleSignInResult.Failed(
                        message =
                            error.message
                                ?: "La configuration Google Atoutia est invalide.",
                    )
                }

            onResult(
                result,
            )
        }
    }

    private fun signOut(
        onResult:
            (
                SignOutResult,
            ) -> Unit,
    ) {
        lifecycleScope.launch {
            val result =
                try {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    val apiBaseUrl =
                        BuildConfig
                            .ATOUTIA_API_BASE_URL

                    var backendWarning:
                        String? =
                            null

                    withContext(
                        Dispatchers.IO,
                    ) {
                        if (
                            apiBaseUrl.isBlank()
                        ) {
                            tokenStore.clear()

                            backendWarning =
                                "La session locale est supprimée, mais la session serveur n’a pas pu être révoquée car le backend Atoutia n’est pas configuré."
                        } else {
                            val sessionApi =
                                HttpAuthSessionApi(
                                    apiBaseUrl,
                                )

                            val sessionCoordinator =
                                AuthSessionCoordinator(
                                    tokenStore =
                                        tokenStore,

                                    sessionApi =
                                        sessionApi,
                                )

                            try {
                                sessionCoordinator
                                    .logout()
                            } catch (
                                error:
                                    IOException,
                            ) {
                                backendWarning =
                                    "La session locale est supprimée, mais Atoutia n’a pas pu confirmer la révocation côté serveur."
                            }
                        }
                    }

                    val credentialProvider =
                        CredentialManagerGoogleCredentialProvider(
                            applicationContext,
                        )

                    var credentialWarning:
                        String? =
                            null

                    try {
                        credentialProvider
                            .clearCredentialState()
                    } catch (
                        error:
                            GoogleCredentialUnavailableException,
                    ) {
                        credentialWarning =
                            "La session Atoutia est supprimée, mais l’état Google local n’a pas pu être entièrement réinitialisé."
                    }

                    SignOutResult.SignedOut(
                        warning =
                            listOfNotNull(
                                backendWarning,
                                credentialWarning,
                            )
                                .joinToString(
                                    separator =
                                        " ",
                                )
                                .takeIf {
                                    it.isNotBlank()
                                },
                    )
                } catch (
                    error:
                        Exception,
                ) {
                    SignOutResult.Failed(
                        message =
                            error.message
                                ?: "Impossible de supprimer la session locale Atoutia.",
                    )
                }

            onResult(
                result,
            )
        }
    }

    private fun checkBackend(
        onResult:
            (
                BackendCheckState,
            ) -> Unit,
    ) {
        lifecycleScope.launch {
            val state =
                withContext(
                    Dispatchers.IO,
                ) {
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
                }

            onResult(
                state,
            )
        }
    }
}

sealed interface GoogleSignInResult {
    data class Authenticated(
        val accountId:
            String,

        val sessionId:
            String,

        val accountCreated:
            Boolean,
    ) : GoogleSignInResult

    data object Cancelled :
        GoogleSignInResult

    data class Failed(
        val message:
            String,
    ) : GoogleSignInResult
}

sealed interface GoogleSignInUiState {
    data object Idle :
        GoogleSignInUiState

    data object Loading :
        GoogleSignInUiState

    data class Failed(
        val message:
            String,
    ) : GoogleSignInUiState
}

sealed interface SignOutResult {
    data class SignedOut(
        val warning:
            String?,
    ) : SignOutResult

    data class Failed(
        val message:
            String,
    ) : SignOutResult
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

    signInWithGoogle:
        (
            (
                GoogleSignInResult,
            ) -> Unit,
        ) -> Unit,

    signOut:
        (
            (
                SignOutResult,
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

    var googleSignInState by
        remember {
            mutableStateOf<
                GoogleSignInUiState
            >(
                GoogleSignInUiState.Idle,
            )
        }

    var signOutState by
        remember {
            mutableStateOf<
                SignOutUiState
            >(
                SignOutUiState.Idle,
            )
        }

    var homeNotice by
        remember {
            mutableStateOf<
                String?
            >(
                null,
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

    when (
        val currentAuthState =
            authState
    ) {
        is AuthStartupState.Authenticated -> {
            AuthenticatedHomeScreen(
                signOutState =
                    signOutState,

                notice =
                    homeNotice,

                onAction = {
                    action ->
                    homeNotice =
                        when (
                            action
                        ) {
                            HomeAction.Play ->
                                "La création et la recherche de parties arrivent dans le prochain bloc."

                            HomeAction.Profile ->
                                "Le profil joueur arrive prochainement."

                            HomeAction.Leaderboard ->
                                "Le classement Atoutia arrive prochainement."

                            HomeAction.History ->
                                "L’historique des parties arrive prochainement."

                            HomeAction.Settings ->
                                "Les paramètres Atoutia arrivent prochainement."
                        }
                },

                onSignOut = {
                    signOutState =
                        SignOutUiState.Loading

                    signOut {
                        result ->
                        when (
                            result
                        ) {
                            is SignOutResult.SignedOut -> {
                                authState =
                                    AuthStartupState.SignedOut

                                signOutState =
                                    SignOutUiState.Idle

                                googleSignInState =
                                    GoogleSignInUiState.Idle

                                homeNotice =
                                    result.warning
                            }

                            is SignOutResult.Failed -> {
                                signOutState =
                                    SignOutUiState.Failed(
                                        message =
                                            result.message,
                                    )
                            }
                        }
                    }
                },
            )
        }

        else -> {
            SignedOutOrLoadingScreen(
                authState =
                    currentAuthState,

                googleSignInState =
                    googleSignInState,

                backendState =
                    backendState,

                onGoogleSignIn = {
                    homeNotice =
                        null

                    googleSignInState =
                        GoogleSignInUiState.Loading

                    signInWithGoogle {
                        result ->
                        when (
                            result
                        ) {
                            is GoogleSignInResult.Authenticated -> {
                                authState =
                                    AuthStartupState.Authenticated(
                                        accountId =
                                            result.accountId,

                                        sessionId =
                                            result.sessionId,
                                    )

                                googleSignInState =
                                    GoogleSignInUiState.Idle
                            }

                            GoogleSignInResult.Cancelled -> {
                                googleSignInState =
                                    GoogleSignInUiState.Idle
                            }

                            is GoogleSignInResult.Failed -> {
                                googleSignInState =
                                    GoogleSignInUiState.Failed(
                                        message =
                                            result.message,
                                    )
                            }
                        }
                    }
                },

                onCheckBackend = {
                    backendState =
                        BackendCheckState.Loading

                    checkBackend {
                        backendState =
                            it
                    }
                },
            )
        }
    }
}

@Composable
private fun SignedOutOrLoadingScreen(
    authState:
        AuthStartupState,

    googleSignInState:
        GoogleSignInUiState,

    backendState:
        BackendCheckState,

    onGoogleSignIn:
        () -> Unit,

    onCheckBackend:
        () -> Unit,
) {
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

            if (
                authState is
                    AuthStartupState.SignedOut
            ) {
                GoogleSignInControls(
                    modifier =
                        Modifier.padding(
                            top =
                                24.dp,
                        ),

                    state =
                        googleSignInState,

                    onSignIn =
                        onGoogleSignIn,
                )
            }

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

                onClick =
                    onCheckBackend,
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
private fun GoogleSignInControls(
    modifier:
        Modifier =
            Modifier,

    state:
        GoogleSignInUiState,

    onSignIn:
        () -> Unit,
) {
    Column(
        modifier =
            modifier,

        horizontalAlignment =
            Alignment.CenterHorizontally,
    ) {
        Button(
            enabled =
                state !is
                    GoogleSignInUiState.Loading,

            onClick =
                onSignIn,
        ) {
            Text(
                text =
                    if (
                        state is
                            GoogleSignInUiState.Loading
                    ) {
                        "Connexion Google…"
                    } else {
                        "Continuer avec Google"
                    },
            )
        }

        if (
            state is
                GoogleSignInUiState.Loading
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
            state is
                GoogleSignInUiState.Failed
        ) {
            Text(
                modifier =
                    Modifier.padding(
                        top =
                            12.dp,
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
                        "Connecte-toi avec ton compte Google.",

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }
        }

        is AuthStartupState.Authenticated -> {
            Unit
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
        SignedOutOrLoadingScreen(
            authState =
                AuthStartupState.SignedOut,

            googleSignInState =
                GoogleSignInUiState.Idle,

            backendState =
                BackendCheckState.Idle,

            onGoogleSignIn = {},

            onCheckBackend = {},
        )
    }
}