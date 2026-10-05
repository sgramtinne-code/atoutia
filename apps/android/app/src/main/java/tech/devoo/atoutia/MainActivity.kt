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
import androidx.compose.runtime.DisposableEffect
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
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
import tech.devoo.atoutia.network.game.AtoutiaGameApiException
import tech.devoo.atoutia.network.game.AtoutiaGameRealtimeClient
import tech.devoo.atoutia.network.game.AtoutiaGameRealtimeSubscription
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.GameRealtimeAdjudicationEvent
import tech.devoo.atoutia.network.game.GameRealtimePresence
import tech.devoo.atoutia.network.game.HttpAtoutiaGameApi
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.network.game.PlayerGameSession
import tech.devoo.atoutia.network.game.PlayerGameSessionCoordinator
import tech.devoo.atoutia.network.room.ActiveRoomSessionRecoveryCoordinator
import tech.devoo.atoutia.network.room.ActiveRoomSessionRecoveryResult
import tech.devoo.atoutia.network.room.ActiveRoomSessionReference
import tech.devoo.atoutia.network.room.AndroidActiveRoomSessionStore
import tech.devoo.atoutia.network.room.AtoutiaRoomApiException
import tech.devoo.atoutia.network.room.HttpAtoutiaRoomApi
import tech.devoo.atoutia.network.room.RoomSessionCoordinator
import tech.devoo.atoutia.network.room.RoomSessionFullException
import tech.devoo.atoutia.network.room.RoomSessionMembership
import tech.devoo.atoutia.network.room.PlayerPosition
import tech.devoo.atoutia.ui.game.GameBiddingUiState
import tech.devoo.atoutia.ui.game.GamePlayCardUiState
import tech.devoo.atoutia.ui.game.GameScreen
import tech.devoo.atoutia.ui.home.AuthenticatedHomeScreen
import tech.devoo.atoutia.ui.home.HomeAction
import tech.devoo.atoutia.ui.home.SignOutUiState
import tech.devoo.atoutia.ui.lobby.RoomLobbyLeaveUiState
import tech.devoo.atoutia.ui.lobby.RoomLobbyScreen
import tech.devoo.atoutia.ui.lobby.RoomLobbyStartUiState
import tech.devoo.atoutia.ui.play.PlayScreen
import tech.devoo.atoutia.ui.play.RoomActionUiState
import tech.devoo.atoutia.ui.theme.AtoutiaTheme
import java.io.IOException

private const val GAME_AUTO_REFRESH_INTERVAL_MS =
    5_000L

private const val GAME_AUTO_REFRESH_MAX_INTERVAL_MS =
    15_000L

private const val TEST_AUTOPLAY_ACTION_DELAY_MS =
    150L

class MainActivity :
    ComponentActivity() {
    private val gameRealtimeHttpClient =
        OkHttpClient
            .Builder()
            .build()

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

                    restoreActiveRoomSession =
                        ::restoreActiveRoomSession,

                    rememberActiveRoomSession =
                        ::rememberActiveRoomSession,

                    clearActiveRoomSession =
                        ::clearActiveRoomSession,

                    signInWithGoogle =
                        ::signInWithGoogle,

                    signOut =
                        ::signOut,

                    createPrivateRoom =
                        ::createPrivateRoom,

                    joinRoom =
                        ::joinRoom,

                    startRoom =
                        ::startRoom,

                    loadGameSession =
                        ::loadGameSession,

                    refreshGameSession =
                        ::refreshGameSession,

                    subscribeGameRealtime =
                        ::subscribeGameRealtime,

                    submitBiddingAction =
                        ::submitBiddingAction,

                    submitPlayCard =
                        ::submitPlayCard,

                    leaveRoom =
                        ::leaveRoom,
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

    private fun restoreActiveRoomSession(
        accountId:
            String,

        onResult:
            (
                ActiveRoomSessionRecoveryResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                ActiveRoomSessionRecoveryResult.Unavailable(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val activeRoomSessionStore =
                        AndroidActiveRoomSessionStore(
                            applicationContext,
                        )

                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    try {
                        val sessionApi =
                            HttpAuthSessionApi(
                                apiBaseUrl,
                            )

                        val authSessionCoordinator =
                            AuthSessionCoordinator(
                                tokenStore =
                                    tokenStore,

                                sessionApi =
                                    sessionApi,
                            )

                        val roomApi =
                            HttpAtoutiaRoomApi(
                                apiBaseUrl,
                            )

                        val gameApi =
                            HttpAtoutiaGameApi(
                                apiBaseUrl,
                            )

                        val gameSessionCoordinator =
                            PlayerGameSessionCoordinator(
                                gameApi =
                                    gameApi,

                                accessTokenProvider =
                                    authSessionCoordinator::accessTokenOrRefresh,
                            )

                        ActiveRoomSessionRecoveryCoordinator(
                            activeRoomSessionStore =
                                activeRoomSessionStore,

                            roomApi =
                                roomApi,

                            gameSessionCoordinator =
                                gameSessionCoordinator,
                        )
                            .restore(
                                accountId =
                                    accountId,
                            )
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            ActiveRoomSessionRecoveryResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            ActiveRoomSessionRecoveryResult.Unavailable(
                                message =
                                    error.message
                                        ?: "Impossible de restaurer la partie Atoutia pour le moment.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun rememberActiveRoomSession(
        accountId:
            String,

        membership:
            RoomSessionMembership,
    ): Boolean =
        try {
            AndroidActiveRoomSessionStore(
                applicationContext,
            )
                .save(
                    ActiveRoomSessionReference(
                        accountId =
                            accountId,

                        sessionId =
                            membership
                                .room
                                .sessionId,

                        player =
                            membership.player,
                    ),
                )

            true
        } catch (
            ignored:
                Exception,
        ) {
            false
        }

    private fun clearActiveRoomSession() {
        try {
            AndroidActiveRoomSessionStore(
                applicationContext,
            )
                .clear()
        } catch (
            ignored:
                Exception,
        ) {
            Unit
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

    private fun createPrivateRoom(
        onResult:
            (
                CreatePrivateRoomResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                CreatePrivateRoomResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    try {
                        val sessionApi =
                            HttpAuthSessionApi(
                                apiBaseUrl,
                            )

                        val authSessionCoordinator =
                            AuthSessionCoordinator(
                                tokenStore =
                                    tokenStore,

                                sessionApi =
                                    sessionApi,
                            )

                        val roomApi =
                            HttpAtoutiaRoomApi(
                                apiBaseUrl,
                            )

                        val roomSessionCoordinator =
                            RoomSessionCoordinator(
                                roomApi =
                                    roomApi,

                                accessTokenProvider =
                                    authSessionCoordinator::accessTokenOrRefresh,
                            )

                        CreatePrivateRoomResult.Created(
                            membership =
                                roomSessionCoordinator
                                    .createPrivateRoomAndClaimHostSeat(),
                        )
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            CreatePrivateRoomResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            CreatePrivateRoomResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible de créer le salon Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun joinRoom(
        sessionId:
            String,

        onResult:
            (
                JoinRoomResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        val normalizedSessionId =
            sessionId.trim()

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                JoinRoomResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        if (
            normalizedSessionId.isBlank()
        ) {
            onResult(
                JoinRoomResult.Failed(
                    message =
                        "Saisis l’identifiant de la partie.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    try {
                        val sessionApi =
                            HttpAuthSessionApi(
                                apiBaseUrl,
                            )

                        val authSessionCoordinator =
                            AuthSessionCoordinator(
                                tokenStore =
                                    tokenStore,

                                sessionApi =
                                    sessionApi,
                            )

                        val roomApi =
                            HttpAtoutiaRoomApi(
                                apiBaseUrl,
                            )

                        val roomSessionCoordinator =
                            RoomSessionCoordinator(
                                roomApi =
                                    roomApi,

                                accessTokenProvider =
                                    authSessionCoordinator::accessTokenOrRefresh,
                            )

                        JoinRoomResult.Joined(
                            membership =
                                roomSessionCoordinator
                                    .joinRoomAndClaimFirstAvailableSeat(
                                        normalizedSessionId,
                                    ),
                        )
                    } catch (
                        error:
                            RoomSessionFullException,
                    ) {
                        JoinRoomResult.Failed(
                            message =
                                error.message
                                    ?: "Cette partie Atoutia est complète.",
                        )
                    } catch (
                        error:
                            AtoutiaRoomApiException,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            JoinRoomResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else if (
                            error.message ==
                                "Atoutia room API returned HTTP 404."
                        ) {
                            JoinRoomResult.Failed(
                                message =
                                    "Cette partie Atoutia est introuvable.",
                            )
                        } else {
                            JoinRoomResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible de rejoindre la partie Atoutia.",
                            )
                        }
                    } catch (
                        error:
                            IllegalArgumentException,
                    ) {
                        JoinRoomResult.Failed(
                            message =
                                "L’identifiant de la partie est invalide.",
                        )
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            JoinRoomResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            JoinRoomResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible de rejoindre la partie Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun startRoom(
        membership:
            RoomSessionMembership,

        onResult:
            (
                StartRoomResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                StartRoomResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    try {
                        val sessionApi =
                            HttpAuthSessionApi(
                                apiBaseUrl,
                            )

                        val authSessionCoordinator =
                            AuthSessionCoordinator(
                                tokenStore =
                                    tokenStore,

                                sessionApi =
                                    sessionApi,
                            )

                        val roomApi =
                            HttpAtoutiaRoomApi(
                                apiBaseUrl,
                            )

                        val roomSessionCoordinator =
                            RoomSessionCoordinator(
                                roomApi =
                                    roomApi,

                                accessTokenProvider =
                                    authSessionCoordinator::accessTokenOrRefresh,
                            )

                        StartRoomResult.Started(
                            membership =
                                roomSessionCoordinator
                                    .startRoom(
                                        membership,
                                    ),
                        )
                    } catch (
                        error:
                            AtoutiaRoomApiException,
                    ) {
                        if (
                            error.statusCode ==
                                401 ||
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            StartRoomResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            when (
                                error.errorCode
                            ) {
                                "PARTICIPANT_FORBIDDEN" ->
                                    StartRoomResult.Failed(
                                        message =
                                            "Seul l’hôte actuel du salon peut démarrer la partie.",
                                    )

                                "REVISION_MISMATCH" ->
                                    StartRoomResult.Failed(
                                        message =
                                            "Le salon a changé. Attends sa mise à jour puis réessaie.",
                                    )

                                "COMMAND_REJECTED" ->
                                    StartRoomResult.Failed(
                                        message =
                                            "La partie n’est plus prête à démarrer.",
                                    )

                                else ->
                                    StartRoomResult.Failed(
                                        message =
                                            error.message
                                                ?: "Impossible de démarrer la partie Atoutia.",
                                    )
                            }
                        }
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            StartRoomResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            StartRoomResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible de démarrer la partie Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun loadGameSession(
        membership:
            RoomSessionMembership,

        onResult:
            (
                LoadGameSessionResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                LoadGameSessionResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    try {
                        val sessionApi =
                            HttpAuthSessionApi(
                                apiBaseUrl,
                            )

                        val authSessionCoordinator =
                            AuthSessionCoordinator(
                                tokenStore =
                                    tokenStore,

                                sessionApi =
                                    sessionApi,
                            )

                        val gameApi =
                            HttpAtoutiaGameApi(
                                apiBaseUrl,
                            )

                        val gameSessionCoordinator =
                            PlayerGameSessionCoordinator(
                                gameApi =
                                    gameApi,

                                accessTokenProvider =
                                    authSessionCoordinator::accessTokenOrRefresh,
                            )

                        LoadGameSessionResult.Loaded(
                            session =
                                gameSessionCoordinator
                                    .load(
                                        sessionId =
                                            membership
                                                .room
                                                .sessionId,

                                        expectedPlayer =
                                            membership.player,
                                    ),
                        )
                    } catch (
                        error:
                            AtoutiaGameApiException,
                    ) {
                        if (
                            error.statusCode ==
                                401 ||
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            LoadGameSessionResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            LoadGameSessionResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible de charger la partie Atoutia.",
                            )
                        }
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            LoadGameSessionResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            LoadGameSessionResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible de charger la partie Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun refreshGameSession(
        session:
            PlayerGameSession,

        onResult:
            (
                RefreshGameSessionResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                RefreshGameSessionResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    try {
                        val sessionApi =
                            HttpAuthSessionApi(
                                apiBaseUrl,
                            )

                        val authSessionCoordinator =
                            AuthSessionCoordinator(
                                tokenStore =
                                    tokenStore,

                                sessionApi =
                                    sessionApi,
                            )

                        val gameApi =
                            HttpAtoutiaGameApi(
                                apiBaseUrl,
                            )

                        val gameSessionCoordinator =
                            PlayerGameSessionCoordinator(
                                gameApi =
                                    gameApi,

                                accessTokenProvider =
                                    authSessionCoordinator::accessTokenOrRefresh,
                            )

                        RefreshGameSessionResult.Refreshed(
                            session =
                                gameSessionCoordinator
                                    .load(
                                        sessionId =
                                            session.sessionId,

                                        expectedPlayer =
                                            session.player,
                                    ),
                        )
                    } catch (
                        error:
                            AtoutiaGameApiException,
                    ) {
                        if (
                            error.statusCode ==
                                401 ||
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            RefreshGameSessionResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            RefreshGameSessionResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible d’actualiser la partie Atoutia.",
                            )
                        }
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            RefreshGameSessionResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            RefreshGameSessionResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible d’actualiser la partie Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun subscribeGameRealtime(
        session:
            PlayerGameSession,

        onRevisionAvailable:
            (
                Int,
            ) -> Unit,

        onPresence:
            (
                GameRealtimePresence,
            ) -> Unit,

        onAdjudication:
            (
                GameRealtimeAdjudicationEvent,
            ) -> Unit,
    ): AtoutiaGameRealtimeSubscription? {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            return null
        }

        val tokenStore =
            AndroidSecureAuthTokenStore(
                applicationContext,
            )

        val sessionApi =
            HttpAuthSessionApi(
                apiBaseUrl,
            )

        val authSessionCoordinator =
            AuthSessionCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    sessionApi,
            )

        val realtimeClient =
            AtoutiaGameRealtimeClient(
                baseUrl =
                    apiBaseUrl,

                webSocketClient =
                    gameRealtimeHttpClient,
            )

        return realtimeClient
            .subscribe(
                sessionId =
                    session.sessionId,

                initialRevision =
                    session.revision,

                accessTokenProvider =
                    authSessionCoordinator::accessTokenOrRefresh,

                onRevisionAvailable = {
                    revision ->
                    lifecycleScope.launch {
                        onRevisionAvailable(
                            revision,
                        )
                    }
                },

                onPresence = {
                    presence ->
                    lifecycleScope.launch {
                        onPresence(
                            presence,
                        )
                    }
                },

                onAdjudication = {
                    adjudication ->
                    lifecycleScope.launch {
                        onAdjudication(
                            adjudication,
                        )
                    }
                },

                onConnectionIssue = {
                    // Le polling HTTP reste le filet de sécurité.
                },
            )
    }

    private fun submitBiddingAction(
        session:
            PlayerGameSession,

        action:
            BiddingActionSnapshot,

        onResult:
            (
                SubmitBiddingActionResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                SubmitBiddingActionResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    val sessionApi =
                        HttpAuthSessionApi(
                            apiBaseUrl,
                        )

                    val authSessionCoordinator =
                        AuthSessionCoordinator(
                            tokenStore =
                                tokenStore,

                            sessionApi =
                                sessionApi,
                        )

                    val gameApi =
                        HttpAtoutiaGameApi(
                            apiBaseUrl,
                        )

                    val gameSessionCoordinator =
                        PlayerGameSessionCoordinator(
                            gameApi =
                                gameApi,

                            accessTokenProvider =
                                authSessionCoordinator::accessTokenOrRefresh,
                        )

                    try {
                        SubmitBiddingActionResult.Submitted(
                            session =
                                gameSessionCoordinator
                                    .submitBiddingAction(
                                        session =
                                            session,

                                        action =
                                            action,
                                    ),
                        )
                    } catch (
                        error:
                            AtoutiaGameApiException,
                    ) {
                        if (
                            error.statusCode ==
                                401 ||
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            SubmitBiddingActionResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else if (
                            error.errorCode ==
                                "REVISION_MISMATCH"
                        ) {
                            try {
                                SubmitBiddingActionResult.Stale(
                                    session =
                                        gameSessionCoordinator
                                            .load(
                                                sessionId =
                                                    session.sessionId,

                                                expectedPlayer =
                                                    session.player,
                                            ),

                                    message =
                                        "La partie a changé avant ton enchère. L’état a été actualisé.",
                                )
                            } catch (
                                refreshError:
                                    AtoutiaGameApiException,
                            ) {
                                if (
                                    refreshError.statusCode ==
                                        401 ||
                                    !sessionStillAvailable(
                                        tokenStore,
                                    )
                                ) {
                                    SubmitBiddingActionResult.SessionExpired(
                                        message =
                                            "Ta session Atoutia a expiré. Reconnecte-toi.",
                                    )
                                } else {
                                    SubmitBiddingActionResult.Failed(
                                        message =
                                            refreshError.message
                                                ?: "Impossible d’actualiser la partie Atoutia.",
                                    )
                                }
                            } catch (
                                refreshError:
                                    Exception,
                            ) {
                                if (
                                    !sessionStillAvailable(
                                        tokenStore,
                                    )
                                ) {
                                    SubmitBiddingActionResult.SessionExpired(
                                        message =
                                            "Ta session Atoutia a expiré. Reconnecte-toi.",
                                    )
                                } else {
                                    SubmitBiddingActionResult.Failed(
                                        message =
                                            refreshError.message
                                                ?: "Impossible d’actualiser la partie Atoutia.",
                                    )
                                }
                            }
                        } else {
                            val message =
                                when (
                                    error.errorCode
                                ) {
                                    "PARTICIPANT_FORBIDDEN" ->
                                        "Tu n’es plus autorisé à agir dans cette partie."

                                    "COMMAND_REJECTED" ->
                                        "Cette enchère n’est plus autorisée par le serveur."

                                    "SESSION_MISMATCH" ->
                                        "La commande Atoutia ne correspond pas à cette partie."

                                    else ->
                                        error.message
                                            ?: "Impossible d’envoyer l’enchère Atoutia."
                                }

                            SubmitBiddingActionResult.Failed(
                                message =
                                    message,
                            )
                        }
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            SubmitBiddingActionResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            SubmitBiddingActionResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible d’envoyer l’enchère Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun submitPlayCard(
        session:
            PlayerGameSession,

        card:
            PlayerCard,

        onResult:
            (
                SubmitPlayCardResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                SubmitPlayCardResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    val sessionApi =
                        HttpAuthSessionApi(
                            apiBaseUrl,
                        )

                    val authSessionCoordinator =
                        AuthSessionCoordinator(
                            tokenStore =
                                tokenStore,

                            sessionApi =
                                sessionApi,
                        )

                    val gameApi =
                        HttpAtoutiaGameApi(
                            apiBaseUrl,
                        )

                    val gameSessionCoordinator =
                        PlayerGameSessionCoordinator(
                            gameApi =
                                gameApi,

                            accessTokenProvider =
                                authSessionCoordinator::accessTokenOrRefresh,
                        )

                    try {
                        SubmitPlayCardResult.Submitted(
                            session =
                                gameSessionCoordinator
                                    .submitPlayCard(
                                        session =
                                            session,

                                        card =
                                            card,
                                    ),
                        )
                    } catch (
                        error:
                            AtoutiaGameApiException,
                    ) {
                        if (
                            error.statusCode ==
                                401 ||
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            SubmitPlayCardResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else if (
                            error.errorCode ==
                                "REVISION_MISMATCH"
                        ) {
                            try {
                                SubmitPlayCardResult.Stale(
                                    session =
                                        gameSessionCoordinator
                                            .load(
                                                sessionId =
                                                    session.sessionId,

                                                expectedPlayer =
                                                    session.player,
                                            ),

                                    message =
                                        "La partie a changé avant ta carte. L’état a été actualisé.",
                                )
                            } catch (
                                refreshError:
                                    AtoutiaGameApiException,
                            ) {
                                if (
                                    refreshError.statusCode ==
                                        401 ||
                                    !sessionStillAvailable(
                                        tokenStore,
                                    )
                                ) {
                                    SubmitPlayCardResult.SessionExpired(
                                        message =
                                            "Ta session Atoutia a expiré. Reconnecte-toi.",
                                    )
                                } else {
                                    SubmitPlayCardResult.Failed(
                                        message =
                                            refreshError.message
                                                ?: "Impossible d’actualiser la partie Atoutia.",
                                    )
                                }
                            } catch (
                                refreshError:
                                    Exception,
                            ) {
                                if (
                                    !sessionStillAvailable(
                                        tokenStore,
                                    )
                                ) {
                                    SubmitPlayCardResult.SessionExpired(
                                        message =
                                            "Ta session Atoutia a expiré. Reconnecte-toi.",
                                    )
                                } else {
                                    SubmitPlayCardResult.Failed(
                                        message =
                                            refreshError.message
                                                ?: "Impossible d’actualiser la partie Atoutia.",
                                    )
                                }
                            }
                        } else {
                            val message =
                                when (
                                    error.errorCode
                                ) {
                                    "PARTICIPANT_FORBIDDEN" ->
                                        "Tu n’es plus autorisé à agir dans cette partie."

                                    "COMMAND_REJECTED" ->
                                        "Cette carte n’est plus autorisée par le serveur."

                                    "SESSION_MISMATCH" ->
                                        "La commande Atoutia ne correspond pas à cette partie."

                                    else ->
                                        error.message
                                            ?: "Impossible d’envoyer la carte Atoutia."
                                }

                            SubmitPlayCardResult.Failed(
                                message =
                                    message,
                            )
                        }
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            SubmitPlayCardResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            SubmitPlayCardResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible d’envoyer la carte Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun leaveRoom(
        membership:
            RoomSessionMembership,

        onResult:
            (
                LeaveRoomResult,
            ) -> Unit,
    ) {
        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            onResult(
                LeaveRoomResult.Failed(
                    message =
                        "Le backend Atoutia n’est pas configuré.",
                ),
            )

            return
        }

        lifecycleScope.launch {
            val result =
                withContext(
                    Dispatchers.IO,
                ) {
                    val tokenStore =
                        AndroidSecureAuthTokenStore(
                            applicationContext,
                        )

                    try {
                        val sessionApi =
                            HttpAuthSessionApi(
                                apiBaseUrl,
                            )

                        val authSessionCoordinator =
                            AuthSessionCoordinator(
                                tokenStore =
                                    tokenStore,

                                sessionApi =
                                    sessionApi,
                            )

                        val roomApi =
                            HttpAtoutiaRoomApi(
                                apiBaseUrl,
                            )

                        val roomSessionCoordinator =
                            RoomSessionCoordinator(
                                roomApi =
                                    roomApi,

                                accessTokenProvider =
                                    authSessionCoordinator::accessTokenOrRefresh,
                            )

                        roomSessionCoordinator
                            .leaveRoom(
                                membership,
                            )

                        LeaveRoomResult.Left
                    } catch (
                        error:
                            Exception,
                    ) {
                        if (
                            !sessionStillAvailable(
                                tokenStore,
                            )
                        ) {
                            LeaveRoomResult.SessionExpired(
                                message =
                                    "Ta session Atoutia a expiré. Reconnecte-toi.",
                            )
                        } else {
                            LeaveRoomResult.Failed(
                                message =
                                    error.message
                                        ?: "Impossible de quitter le salon Atoutia.",
                            )
                        }
                    }
                }

            onResult(
                result,
            )
        }
    }

    private fun sessionStillAvailable(
        tokenStore:
            AndroidSecureAuthTokenStore,
    ): Boolean =
        try {
            tokenStore.load() !=
                null
        } catch (
            ignored:
                Exception,
        ) {
            false
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

sealed interface CreatePrivateRoomResult {
    data class Created(
        val membership:
            RoomSessionMembership,
    ) : CreatePrivateRoomResult

    data class SessionExpired(
        val message:
            String,
    ) : CreatePrivateRoomResult

    data class Failed(
        val message:
            String,
    ) : CreatePrivateRoomResult
}

sealed interface JoinRoomResult {
    data class Joined(
        val membership:
            RoomSessionMembership,
    ) : JoinRoomResult

    data class SessionExpired(
        val message:
            String,
    ) : JoinRoomResult

    data class Failed(
        val message:
            String,
    ) : JoinRoomResult
}

sealed interface StartRoomResult {
    data class Started(
        val membership:
            RoomSessionMembership,
    ) : StartRoomResult

    data class SessionExpired(
        val message:
            String,
    ) : StartRoomResult

    data class Failed(
        val message:
            String,
    ) : StartRoomResult
}

sealed interface LoadGameSessionResult {
    data class Loaded(
        val session:
            PlayerGameSession,
    ) : LoadGameSessionResult

    data class SessionExpired(
        val message:
            String,
    ) : LoadGameSessionResult

    data class Failed(
        val message:
            String,
    ) : LoadGameSessionResult
}

sealed interface RefreshGameSessionResult {
    data class Refreshed(
        val session:
            PlayerGameSession,
    ) : RefreshGameSessionResult

    data class SessionExpired(
        val message:
            String,
    ) : RefreshGameSessionResult

    data class Failed(
        val message:
            String,
    ) : RefreshGameSessionResult
}

sealed interface SubmitBiddingActionResult {
    data class Submitted(
        val session:
            PlayerGameSession,
    ) : SubmitBiddingActionResult

    data class Stale(
        val session:
            PlayerGameSession,

        val message:
            String,
    ) : SubmitBiddingActionResult

    data class SessionExpired(
        val message:
            String,
    ) : SubmitBiddingActionResult

    data class Failed(
        val message:
            String,
    ) : SubmitBiddingActionResult
}

sealed interface SubmitPlayCardResult {
    data class Submitted(
        val session:
            PlayerGameSession,
    ) : SubmitPlayCardResult

    data class Stale(
        val session:
            PlayerGameSession,

        val message:
            String,
    ) : SubmitPlayCardResult

    data class SessionExpired(
        val message:
            String,
    ) : SubmitPlayCardResult

    data class Failed(
        val message:
            String,
    ) : SubmitPlayCardResult
}

sealed interface LeaveRoomResult {
    data object Left :
        LeaveRoomResult

    data class SessionExpired(
        val message:
            String,
    ) : LeaveRoomResult

    data class Failed(
        val message:
            String,
    ) : LeaveRoomResult
}

sealed interface AuthenticatedDestination {
    data object Home :
        AuthenticatedDestination

    data object Play :
        AuthenticatedDestination

    data class Lobby(
        val membership:
            RoomSessionMembership,
    ) : AuthenticatedDestination

    data class GameLoading(
        val membership:
            RoomSessionMembership,
    ) : AuthenticatedDestination

    data class GameLoadFailed(
        val membership:
            RoomSessionMembership,

        val message:
            String,
    ) : AuthenticatedDestination

    data class Game(
        val session:
            PlayerGameSession,
    ) : AuthenticatedDestination
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

    restoreActiveRoomSession:
        (
            String,
            (
                ActiveRoomSessionRecoveryResult,
            ) -> Unit,
        ) -> Unit,

    rememberActiveRoomSession:
        (
            String,
            RoomSessionMembership,
        ) -> Boolean,

    clearActiveRoomSession:
        () -> Unit,

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

    createPrivateRoom:
        (
            (
                CreatePrivateRoomResult,
            ) -> Unit,
        ) -> Unit,

    joinRoom:
        (
            String,
            (
                JoinRoomResult,
            ) -> Unit,
        ) -> Unit,

    startRoom:
        (
            RoomSessionMembership,
            (
                StartRoomResult,
            ) -> Unit,
        ) -> Unit,

    loadGameSession:
        (
            RoomSessionMembership,
            (
                LoadGameSessionResult,
            ) -> Unit,
        ) -> Unit,

    refreshGameSession:
        (
            PlayerGameSession,
            (
                RefreshGameSessionResult,
            ) -> Unit,
        ) -> Unit,

    subscribeGameRealtime:
        (
            PlayerGameSession,
            (
                Int,
            ) -> Unit,
            (
                GameRealtimePresence,
            ) -> Unit,
            (
                GameRealtimeAdjudicationEvent,
            ) -> Unit,
        ) -> AtoutiaGameRealtimeSubscription?,

    submitBiddingAction:
        (
            PlayerGameSession,
            BiddingActionSnapshot,
            (
                SubmitBiddingActionResult,
            ) -> Unit,
        ) -> Unit,

    submitPlayCard:
        (
            PlayerGameSession,
            PlayerCard,
            (
                SubmitPlayCardResult,
            ) -> Unit,
        ) -> Unit,

    leaveRoom:
        (
            RoomSessionMembership,
            (
                LeaveRoomResult,
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

    var destination by
        remember {
            mutableStateOf<
                AuthenticatedDestination
            >(
                AuthenticatedDestination.Home,
            )
        }

    var roomActionState by
        remember {
            mutableStateOf<
                RoomActionUiState
            >(
                RoomActionUiState.Idle,
            )
        }

    var leaveState by
        remember {
            mutableStateOf<
                RoomLobbyLeaveUiState
            >(
                RoomLobbyLeaveUiState.Idle,
            )
        }

    var startState by
        remember {
            mutableStateOf<
                RoomLobbyStartUiState
            >(
                RoomLobbyStartUiState.Idle,
            )
        }

    var gameBiddingState by
        remember {
            mutableStateOf<
                GameBiddingUiState
            >(
                GameBiddingUiState.Idle,
            )
        }

    var gamePlayCardState by
        remember {
            mutableStateOf<
                GamePlayCardUiState
            >(
                GamePlayCardUiState.Idle,
            )
        }

    var joinSessionId by
        remember {
            mutableStateOf(
                "",
            )
        }

    var notice by
        remember {
            mutableStateOf<
                String?
            >(
                null,
            )
        }

    fun applyAuthenticatedState(
        authenticatedState:
            AuthStartupState.Authenticated,
    ) {
        authState =
            AuthStartupState.Loading

        restoreActiveRoomSession(
            authenticatedState.accountId,
        ) {
            recoveryResult ->
            roomActionState =
                RoomActionUiState.Idle

            leaveState =
                RoomLobbyLeaveUiState.Idle

            startState =
                RoomLobbyStartUiState.Idle

            gameBiddingState =
                GameBiddingUiState.Idle

            gamePlayCardState =
                GamePlayCardUiState.Idle

            joinSessionId =
                ""

            googleSignInState =
                GoogleSignInUiState.Idle

            when (
                recoveryResult
            ) {
                ActiveRoomSessionRecoveryResult.None -> {
                    destination =
                        AuthenticatedDestination.Home

                    notice =
                        null

                    authState =
                        authenticatedState
                }

                is ActiveRoomSessionRecoveryResult.Lobby -> {
                    destination =
                        AuthenticatedDestination.Lobby(
                            membership =
                                recoveryResult.membership,
                        )

                    notice =
                        null

                    authState =
                        authenticatedState
                }

                is ActiveRoomSessionRecoveryResult.Game -> {
                    destination =
                        AuthenticatedDestination.Game(
                            session =
                                recoveryResult.session,
                        )

                    notice =
                        null

                    authState =
                        authenticatedState
                }

                is ActiveRoomSessionRecoveryResult.SessionExpired -> {
                    destination =
                        AuthenticatedDestination.Home

                    notice =
                        recoveryResult.message

                    authState =
                        AuthStartupState.SignedOut
                }

                is ActiveRoomSessionRecoveryResult.Unavailable -> {
                    destination =
                        AuthenticatedDestination.Home

                    notice =
                        recoveryResult.message

                    authState =
                        authenticatedState
                }
            }
        }
    }

    LaunchedEffect(
        Unit,
    ) {
        restoreAuth {
            restoredState ->
            when (
                restoredState
            ) {
                is AuthStartupState.Authenticated -> {
                    applyAuthenticatedState(
                        restoredState,
                    )
                }

                else -> {
                    authState =
                        restoredState
                }
            }
        }
    }

    when (
        val currentAuthState =
            authState
    ) {
        is AuthStartupState.Authenticated -> {
            when (
                val currentDestination =
                    destination
            ) {
                AuthenticatedDestination.Home -> {
                    AuthenticatedHomeScreen(
                        signOutState =
                            signOutState,

                        notice =
                            notice,

                        onAction = {
                            action ->
                            when (
                                action
                            ) {
                                HomeAction.Play -> {
                                    notice =
                                        null

                                    roomActionState =
                                        RoomActionUiState.Idle

                                    leaveState =
                                        RoomLobbyLeaveUiState.Idle

                                    startState =
                                        RoomLobbyStartUiState.Idle

                                    joinSessionId =
                                        ""

                                    destination =
                                        AuthenticatedDestination.Play
                                }

                                HomeAction.Profile -> {
                                    notice =
                                        "Le profil joueur arrive prochainement."
                                }

                                HomeAction.Leaderboard -> {
                                    notice =
                                        "Le classement Atoutia arrive prochainement."
                                }

                                HomeAction.History -> {
                                    notice =
                                        "L’historique des parties arrive prochainement."
                                }

                                HomeAction.Settings -> {
                                    notice =
                                        "Les paramètres Atoutia arrivent prochainement."
                                }
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
                                        clearActiveRoomSession()

                                        authState =
                                            AuthStartupState.SignedOut

                                        destination =
                                            AuthenticatedDestination.Home

                                        signOutState =
                                            SignOutUiState.Idle

                                        googleSignInState =
                                            GoogleSignInUiState.Idle

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        joinSessionId =
                                            ""

                                        notice =
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

                AuthenticatedDestination.Play -> {
                    PlayScreen(
                        roomActionState =
                            roomActionState,

                        joinSessionId =
                            joinSessionId,

                        onJoinSessionIdChange = {
                            value ->
                            joinSessionId =
                                value

                            if (
                                roomActionState is
                                    RoomActionUiState.Failed
                            ) {
                                roomActionState =
                                    RoomActionUiState.Idle
                            }
                        },

                        onCreateRoom = {
                            roomActionState =
                                RoomActionUiState.Creating

                            createPrivateRoom {
                                result ->
                                when (
                                    result
                                ) {
                                    is CreatePrivateRoomResult.Created -> {
                                        roomActionState =
                                            RoomActionUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        val recoverySaved =
                                            rememberActiveRoomSession(
                                                currentAuthState.accountId,
                                                result.membership,
                                            )

                                        notice =
                                            if (
                                                recoverySaved
                                            ) {
                                                null
                                            } else {
                                                "La partie fonctionne, mais sa reprise automatique n’a pas pu être enregistrée."
                                            }

                                        destination =
                                            AuthenticatedDestination.Lobby(
                                                membership =
                                                    result.membership,
                                            )
                                    }

                                    is CreatePrivateRoomResult.SessionExpired -> {
                                        authState =
                                            AuthStartupState.SignedOut

                                        destination =
                                            AuthenticatedDestination.Home

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        joinSessionId =
                                            ""

                                        googleSignInState =
                                            GoogleSignInUiState.Idle

                                        notice =
                                            result.message
                                    }

                                    is CreatePrivateRoomResult.Failed -> {
                                        roomActionState =
                                            RoomActionUiState.Failed(
                                                message =
                                                    result.message,
                                            )
                                    }
                                }
                            }
                        },

                        onJoinRoom = {
                            val normalizedSessionId =
                                joinSessionId.trim()

                            if (
                                normalizedSessionId.isBlank()
                            ) {
                                roomActionState =
                                    RoomActionUiState.Failed(
                                        message =
                                            "Saisis l’identifiant de la partie.",
                                    )
                            } else {
                                roomActionState =
                                    RoomActionUiState.Joining

                                joinRoom(
                                    normalizedSessionId,
                                ) {
                                    result ->
                                    when (
                                        result
                                    ) {
                                        is JoinRoomResult.Joined -> {
                                            roomActionState =
                                                RoomActionUiState.Idle

                                            leaveState =
                                                RoomLobbyLeaveUiState.Idle

                                            startState =
                                                RoomLobbyStartUiState.Idle

                                            joinSessionId =
                                                normalizedSessionId

                                            val recoverySaved =
                                                rememberActiveRoomSession(
                                                    currentAuthState.accountId,
                                                    result.membership,
                                                )

                                            notice =
                                                if (
                                                    recoverySaved
                                                ) {
                                                    null
                                                } else {
                                                    "La partie fonctionne, mais sa reprise automatique n’a pas pu être enregistrée."
                                                }

                                            destination =
                                                AuthenticatedDestination.Lobby(
                                                    membership =
                                                        result.membership,
                                                )
                                        }

                                        is JoinRoomResult.SessionExpired -> {
                                            authState =
                                                AuthStartupState.SignedOut

                                            destination =
                                                AuthenticatedDestination.Home

                                            roomActionState =
                                                RoomActionUiState.Idle

                                            leaveState =
                                                RoomLobbyLeaveUiState.Idle

                                            startState =
                                                RoomLobbyStartUiState.Idle

                                            joinSessionId =
                                                ""

                                            googleSignInState =
                                                GoogleSignInUiState.Idle

                                            notice =
                                                result.message
                                        }

                                        is JoinRoomResult.Failed -> {
                                            roomActionState =
                                                RoomActionUiState.Failed(
                                                    message =
                                                        result.message,
                                                )
                                        }
                                    }
                                }
                            }
                        },

                        onBack = {
                            roomActionState =
                                RoomActionUiState.Idle

                            startState =
                                RoomLobbyStartUiState.Idle

                            joinSessionId =
                                ""

                            destination =
                                AuthenticatedDestination.Home
                        },
                    )
                }

                is AuthenticatedDestination.Lobby -> {
                    RoomLobbyScreen(
                        room =
                            currentDestination
                                .membership
                                .room,

                        player =
                            currentDestination
                                .membership
                                .player,

                        startState =
                            startState,

                        onStartRoom = {
                            membership ->
                            startState =
                                RoomLobbyStartUiState.Starting

                            startRoom(
                                membership,
                            ) {
                                result ->
                                when (
                                    result
                                ) {
                                    is StartRoomResult.Started -> {
                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        destination =
                                            AuthenticatedDestination.GameLoading(
                                                membership =
                                                    result.membership,
                                            )
                                    }

                                    is StartRoomResult.SessionExpired -> {
                                        authState =
                                            AuthStartupState.SignedOut

                                        destination =
                                            AuthenticatedDestination.Home

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        joinSessionId =
                                            ""

                                        googleSignInState =
                                            GoogleSignInUiState.Idle

                                        notice =
                                            result.message
                                    }

                                    is StartRoomResult.Failed -> {
                                        startState =
                                            RoomLobbyStartUiState.Failed(
                                                message =
                                                    result.message,
                                            )
                                    }
                                }
                            }
                        },

                        leaveState =
                            leaveState,

                        onLeaveRoom = {
                            membership ->
                            leaveState =
                                RoomLobbyLeaveUiState.Leaving

                            startState =
                                RoomLobbyStartUiState.Idle

                            leaveRoom(
                                membership,
                            ) {
                                result ->
                                when (
                                    result
                                ) {
                                    LeaveRoomResult.Left -> {
                                        clearActiveRoomSession()

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        joinSessionId =
                                            ""

                                        destination =
                                            AuthenticatedDestination.Play
                                    }

                                    is LeaveRoomResult.SessionExpired -> {
                                        authState =
                                            AuthStartupState.SignedOut

                                        destination =
                                            AuthenticatedDestination.Home

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        joinSessionId =
                                            ""

                                        googleSignInState =
                                            GoogleSignInUiState.Idle

                                        notice =
                                            result.message
                                    }

                                    is LeaveRoomResult.Failed -> {
                                        leaveState =
                                            RoomLobbyLeaveUiState.Failed(
                                                message =
                                                    result.message,
                                            )
                                    }
                                }
                            }
                        },

                        onRoomInProgress = {
                            membership ->
                            startState =
                                RoomLobbyStartUiState.Idle

                            leaveState =
                                RoomLobbyLeaveUiState.Idle

                            destination =
                                AuthenticatedDestination.GameLoading(
                                    membership =
                                        membership,
                                )
                        },
                    )
                }

                is AuthenticatedDestination.GameLoading -> {
                    LaunchedEffect(
                        currentDestination
                            .membership
                            .room
                            .sessionId,

                        currentDestination
                            .membership
                            .player,
                    ) {
                        loadGameSession(
                            currentDestination.membership,
                        ) {
                            result ->
                            when (
                                result
                            ) {
                                is LoadGameSessionResult.Loaded -> {
                                    gameBiddingState =
                                        GameBiddingUiState.Idle

                                    gamePlayCardState =
                                        GamePlayCardUiState.Idle

                                    destination =
                                        AuthenticatedDestination.Game(
                                            session =
                                                result.session,
                                        )
                                }

                                is LoadGameSessionResult.SessionExpired -> {
                                    authState =
                                        AuthStartupState.SignedOut

                                    destination =
                                        AuthenticatedDestination.Home

                                    roomActionState =
                                        RoomActionUiState.Idle

                                    leaveState =
                                        RoomLobbyLeaveUiState.Idle

                                    startState =
                                        RoomLobbyStartUiState.Idle

                                    joinSessionId =
                                        ""

                                    googleSignInState =
                                        GoogleSignInUiState.Idle

                                    notice =
                                        result.message
                                }

                                is LoadGameSessionResult.Failed -> {
                                    destination =
                                        AuthenticatedDestination.GameLoadFailed(
                                            membership =
                                                currentDestination.membership,

                                            message =
                                                result.message,
                                        )
                                }
                            }
                        }
                    }

                    GameLoadingScreen()
                }

                is AuthenticatedDestination.GameLoadFailed -> {
                    GameLoadFailedScreen(
                        message =
                            currentDestination.message,

                        onRetry = {
                            destination =
                                AuthenticatedDestination.GameLoading(
                                    membership =
                                        currentDestination.membership,
                                )
                        },
                    )
                }

                is AuthenticatedDestination.Game -> {
                    val gameSession =
                        currentDestination.session

                    val gameActions =
                        gameSession
                            .document
                            .snapshot
                            .actions

                    var realtimeRevision by
                        remember(
                            gameSession.sessionId,
                        ) {
                            mutableStateOf(
                                gameSession.revision,
                            )
                        }

                    var realtimeSubscription by
                        remember(
                            gameSession.sessionId,
                        ) {
                            mutableStateOf<
                                AtoutiaGameRealtimeSubscription?
                            >(
                                null,
                            )
                        }

                    var gameRealtimePresence by
                        remember(
                            gameSession.sessionId,
                        ) {
                            mutableStateOf<
                                GameRealtimePresence?
                            >(
                                null,
                            )
                        }

                    var gameRealtimeAdjudication by
                        remember(
                            gameSession.sessionId,
                        ) {
                            mutableStateOf<
                                GameRealtimeAdjudicationEvent?
                            >(
                                null,
                            )
                        }

                    fun applyRefreshedGameSession(
                        refreshedSession:
                            PlayerGameSession,
                    ) {
                        realtimeSubscription
                            ?.acknowledgeRevision(
                                refreshedSession.revision,
                            )

                        val activeDestination =
                            destination

                        if (
                            activeDestination !is
                                AuthenticatedDestination.Game ||
                            activeDestination
                                .session
                                .sessionId !=
                                refreshedSession.sessionId ||
                            refreshedSession.revision <
                                activeDestination
                                    .session
                                    .revision
                        ) {
                            return
                        }

                        gameBiddingState =
                            GameBiddingUiState.Idle

                        gamePlayCardState =
                            GamePlayCardUiState.Idle

                        destination =
                            AuthenticatedDestination.Game(
                                session =
                                    refreshedSession,
                            )
                    }

                    DisposableEffect(
                        gameSession.sessionId,
                        gameSession.player,
                    ) {
                        val subscription =
                            subscribeGameRealtime(
                                gameSession,

                                {
                                    revision ->
                                    if (
                                        revision >
                                            realtimeRevision
                                    ) {
                                        realtimeRevision =
                                            revision
                                    }
                                },

                                {
                                    presence ->
                                    gameRealtimePresence =
                                        presence
                                },

                                {
                                    adjudication ->
                                    gameRealtimeAdjudication =
                                        adjudication
                                },
                            )

                        realtimeSubscription =
                            subscription

                        onDispose {
                            if (
                                realtimeSubscription ===
                                subscription
                            ) {
                                realtimeSubscription =
                                    null
                            }

                            subscription
                                ?.close()
                        }
                    }

                    LaunchedEffect(
                        gameSession.sessionId,
                        gameSession.revision,
                        realtimeRevision,
                    ) {
                        if (
                            realtimeRevision <=
                                gameSession.revision
                        ) {
                            realtimeSubscription
                                ?.acknowledgeRevision(
                                    gameSession.revision,
                                )

                            return@LaunchedEffect
                        }

                        refreshGameSession(
                            gameSession,
                        ) {
                            result ->
                            when (
                                result
                            ) {
                                is RefreshGameSessionResult.Refreshed -> {
                                    applyRefreshedGameSession(
                                        result.session,
                                    )
                                }

                                is RefreshGameSessionResult.SessionExpired -> {
                                    authState =
                                        AuthStartupState.SignedOut

                                    destination =
                                        AuthenticatedDestination.Home

                                    roomActionState =
                                        RoomActionUiState.Idle

                                    leaveState =
                                        RoomLobbyLeaveUiState.Idle

                                    startState =
                                        RoomLobbyStartUiState.Idle

                                    gameBiddingState =
                                        GameBiddingUiState.Idle

                                    gamePlayCardState =
                                        GamePlayCardUiState.Idle

                                    joinSessionId =
                                        ""

                                    googleSignInState =
                                        GoogleSignInUiState.Idle

                                    notice =
                                        result.message
                                }

                                is RefreshGameSessionResult.Failed -> {
                                    // Le polling HTTP prendra le relais.
                                }
                            }
                        }
                    }

                    LaunchedEffect(
                        gameSession.sessionId,
                        gameSession.revision,
                        gameActions.mode,
                    ) {
                        if (
                            gameActions.mode ==
                                PlayerActionMode.WAIT
                        ) {
                            var requestInFlight =
                                false

                            var nextDelayMs =
                                GAME_AUTO_REFRESH_INTERVAL_MS

                            while (
                                true
                            ) {
                                delay(
                                    nextDelayMs,
                                )

                                if (
                                    requestInFlight
                                ) {
                                    continue
                                }

                                requestInFlight =
                                    true

                                refreshGameSession(
                                    gameSession,
                                ) {
                                    result ->
                                    requestInFlight =
                                        false

                                    when (
                                        result
                                    ) {
                                        is RefreshGameSessionResult.Refreshed -> {
                                            nextDelayMs =
                                                GAME_AUTO_REFRESH_INTERVAL_MS

                                            applyRefreshedGameSession(
                                                result.session,
                                            )
                                        }

                                        is RefreshGameSessionResult.SessionExpired -> {
                                            authState =
                                                AuthStartupState.SignedOut

                                            destination =
                                                AuthenticatedDestination.Home

                                            roomActionState =
                                                RoomActionUiState.Idle

                                            leaveState =
                                                RoomLobbyLeaveUiState.Idle

                                            startState =
                                                RoomLobbyStartUiState.Idle

                                            gameBiddingState =
                                                GameBiddingUiState.Idle

                                            gamePlayCardState =
                                                GamePlayCardUiState.Idle

                                            joinSessionId =
                                                ""

                                            googleSignInState =
                                                GoogleSignInUiState.Idle

                                            notice =
                                                result.message
                                        }

                                        is RefreshGameSessionResult.Failed -> {
                                            nextDelayMs =
                                                (
                                                    nextDelayMs *
                                                        2
                                                ).coerceAtMost(
                                                    GAME_AUTO_REFRESH_MAX_INTERVAL_MS,
                                                )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    LaunchedEffect(
                        gameSession.sessionId,
                        gameSession.revision,
                        gameActions.mode,
                        BuildConfig.ATOUTIA_TEST_AUTOPLAY_PLAYER_0,
                    ) {
                        if (
                            !BuildConfig.ATOUTIA_TEST_AUTOPLAY_PLAYER_0 ||
                            gameSession.player !=
                                PlayerPosition.PLAYER_0
                        ) {
                            return@LaunchedEffect
                        }

                        when (
                            gameActions.mode
                        ) {
                            PlayerActionMode.BID -> {
                                val action =
                                    gameActions
                                        .biddingActions
                                        .firstOrNull {
                                            it is
                                                BiddingActionSnapshot.Take
                                        }
                                        ?: gameActions
                                            .biddingActions
                                            .firstOrNull {
                                                it is
                                                    BiddingActionSnapshot.Pass
                                            }

                                if (
                                    action !=
                                        null
                                ) {
                                    delay(
                                        TEST_AUTOPLAY_ACTION_DELAY_MS,
                                    )

                                    gamePlayCardState =
                                        GamePlayCardUiState.Idle

                                    gameBiddingState =
                                        GameBiddingUiState.Submitting

                                    submitBiddingAction(
                                        gameSession,
                                        action,
                                    ) {
                                        result ->
                                        when (
                                            result
                                        ) {
                                            is SubmitBiddingActionResult.Submitted -> {
                                                gameBiddingState =
                                                    GameBiddingUiState.Idle

                                                gamePlayCardState =
                                                    GamePlayCardUiState.Idle

                                                destination =
                                                    AuthenticatedDestination.Game(
                                                        session =
                                                            result.session,
                                                    )
                                            }

                                            is SubmitBiddingActionResult.Stale -> {
                                                gameBiddingState =
                                                    GameBiddingUiState.Failed(
                                                        message =
                                                            result.message,
                                                    )

                                                gamePlayCardState =
                                                    GamePlayCardUiState.Idle

                                                destination =
                                                    AuthenticatedDestination.Game(
                                                        session =
                                                            result.session,
                                                    )
                                            }

                                            is SubmitBiddingActionResult.SessionExpired -> {
                                                authState =
                                                    AuthStartupState.SignedOut

                                                destination =
                                                    AuthenticatedDestination.Home

                                                roomActionState =
                                                    RoomActionUiState.Idle

                                                leaveState =
                                                    RoomLobbyLeaveUiState.Idle

                                                startState =
                                                    RoomLobbyStartUiState.Idle

                                                gameBiddingState =
                                                    GameBiddingUiState.Idle

                                                gamePlayCardState =
                                                    GamePlayCardUiState.Idle

                                                joinSessionId =
                                                    ""

                                                googleSignInState =
                                                    GoogleSignInUiState.Idle

                                                notice =
                                                    result.message
                                            }

                                            is SubmitBiddingActionResult.Failed -> {
                                                gameBiddingState =
                                                    GameBiddingUiState.Failed(
                                                        message =
                                                            result.message,
                                                    )
                                            }
                                        }
                                    }
                                }
                            }

                            PlayerActionMode.PLAY_CARD -> {
                                val card =
                                    gameActions
                                        .legalCards
                                        .firstOrNull()

                                if (
                                    card !=
                                        null
                                ) {
                                    delay(
                                        TEST_AUTOPLAY_ACTION_DELAY_MS,
                                    )

                                    gameBiddingState =
                                        GameBiddingUiState.Idle

                                    gamePlayCardState =
                                        GamePlayCardUiState.Submitting

                                    submitPlayCard(
                                        gameSession,
                                        card,
                                    ) {
                                        result ->
                                        when (
                                            result
                                        ) {
                                            is SubmitPlayCardResult.Submitted -> {
                                                gameBiddingState =
                                                    GameBiddingUiState.Idle

                                                gamePlayCardState =
                                                    GamePlayCardUiState.Idle

                                                destination =
                                                    AuthenticatedDestination.Game(
                                                        session =
                                                            result.session,
                                                    )
                                            }

                                            is SubmitPlayCardResult.Stale -> {
                                                gameBiddingState =
                                                    GameBiddingUiState.Idle

                                                gamePlayCardState =
                                                    GamePlayCardUiState.Failed(
                                                        message =
                                                            result.message,
                                                    )

                                                destination =
                                                    AuthenticatedDestination.Game(
                                                        session =
                                                            result.session,
                                                    )
                                            }

                                            is SubmitPlayCardResult.SessionExpired -> {
                                                authState =
                                                    AuthStartupState.SignedOut

                                                destination =
                                                    AuthenticatedDestination.Home

                                                roomActionState =
                                                    RoomActionUiState.Idle

                                                leaveState =
                                                    RoomLobbyLeaveUiState.Idle

                                                startState =
                                                    RoomLobbyStartUiState.Idle

                                                gameBiddingState =
                                                    GameBiddingUiState.Idle

                                                gamePlayCardState =
                                                    GamePlayCardUiState.Idle

                                                joinSessionId =
                                                    ""

                                                googleSignInState =
                                                    GoogleSignInUiState.Idle

                                                notice =
                                                    result.message
                                            }

                                            is SubmitPlayCardResult.Failed -> {
                                                gamePlayCardState =
                                                    GamePlayCardUiState.Failed(
                                                        message =
                                                            result.message,
                                                    )
                                            }
                                        }
                                    }
                                }
                            }

                            PlayerActionMode.WAIT,
                            PlayerActionMode.MATCH_FINISHED,
                            -> {
                                // Aucune action joueur à envoyer.
                            }
                        }
                    }

                    GameScreen(
                        session =
                            gameSession,

                        biddingState =
                            gameBiddingState,

                        playCardState =
                            gamePlayCardState,

                        presence =
                            gameRealtimePresence,

                        adjudication =
                            gameRealtimeAdjudication,

                        onBiddingAction = {
                            action ->
                            gamePlayCardState =
                                GamePlayCardUiState.Idle

                            gameBiddingState =
                                GameBiddingUiState.Submitting

                            submitBiddingAction(
                                gameSession,
                                action,
                            ) {
                                result ->
                                when (
                                    result
                                ) {
                                    is SubmitBiddingActionResult.Submitted -> {
                                        gameBiddingState =
                                            GameBiddingUiState.Idle

                                        gamePlayCardState =
                                            GamePlayCardUiState.Idle

                                        destination =
                                            AuthenticatedDestination.Game(
                                                session =
                                                    result.session,
                                            )
                                    }

                                    is SubmitBiddingActionResult.Stale -> {
                                        gameBiddingState =
                                            GameBiddingUiState.Failed(
                                                message =
                                                    result.message,
                                            )

                                        gamePlayCardState =
                                            GamePlayCardUiState.Idle

                                        destination =
                                            AuthenticatedDestination.Game(
                                                session =
                                                    result.session,
                                            )
                                    }

                                    is SubmitBiddingActionResult.SessionExpired -> {
                                        authState =
                                            AuthStartupState.SignedOut

                                        destination =
                                            AuthenticatedDestination.Home

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        gameBiddingState =
                                            GameBiddingUiState.Idle

                                        gamePlayCardState =
                                            GamePlayCardUiState.Idle

                                        joinSessionId =
                                            ""

                                        googleSignInState =
                                            GoogleSignInUiState.Idle

                                        notice =
                                            result.message
                                    }

                                    is SubmitBiddingActionResult.Failed -> {
                                        gameBiddingState =
                                            GameBiddingUiState.Failed(
                                                message =
                                                    result.message,
                                            )
                                    }
                                }
                            }
                        },

                        onPlayCard = {
                            card ->
                            gameBiddingState =
                                GameBiddingUiState.Idle

                            gamePlayCardState =
                                GamePlayCardUiState.Submitting

                            submitPlayCard(
                                gameSession,
                                card,
                            ) {
                                result ->
                                when (
                                    result
                                ) {
                                    is SubmitPlayCardResult.Submitted -> {
                                        gameBiddingState =
                                            GameBiddingUiState.Idle

                                        gamePlayCardState =
                                            GamePlayCardUiState.Idle

                                        destination =
                                            AuthenticatedDestination.Game(
                                                session =
                                                    result.session,
                                            )
                                    }

                                    is SubmitPlayCardResult.Stale -> {
                                        gameBiddingState =
                                            GameBiddingUiState.Idle

                                        gamePlayCardState =
                                            GamePlayCardUiState.Failed(
                                                message =
                                                    result.message,
                                            )

                                        destination =
                                            AuthenticatedDestination.Game(
                                                session =
                                                    result.session,
                                            )
                                    }

                                    is SubmitPlayCardResult.SessionExpired -> {
                                        authState =
                                            AuthStartupState.SignedOut

                                        destination =
                                            AuthenticatedDestination.Home

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        gameBiddingState =
                                            GameBiddingUiState.Idle

                                        gamePlayCardState =
                                            GamePlayCardUiState.Idle

                                        joinSessionId =
                                            ""

                                        googleSignInState =
                                            GoogleSignInUiState.Idle

                                        notice =
                                            result.message
                                    }

                                    is SubmitPlayCardResult.Failed -> {
                                        gamePlayCardState =
                                            GamePlayCardUiState.Failed(
                                                message =
                                                    result.message,
                                            )
                                    }
                                }
                            }
                        },

                        onRefresh = {
                            refreshGameSession(
                                gameSession,
                            ) {
                                result ->
                                when (
                                    result
                                ) {
                                    is RefreshGameSessionResult.Refreshed -> {
                                        applyRefreshedGameSession(
                                            result.session,
                                        )
                                    }

                                    is RefreshGameSessionResult.SessionExpired -> {
                                        authState =
                                            AuthStartupState.SignedOut

                                        destination =
                                            AuthenticatedDestination.Home

                                        roomActionState =
                                            RoomActionUiState.Idle

                                        leaveState =
                                            RoomLobbyLeaveUiState.Idle

                                        startState =
                                            RoomLobbyStartUiState.Idle

                                        gameBiddingState =
                                            GameBiddingUiState.Idle

                                        gamePlayCardState =
                                            GamePlayCardUiState.Idle

                                        joinSessionId =
                                            ""

                                        googleSignInState =
                                            GoogleSignInUiState.Idle

                                        notice =
                                            result.message
                                    }

                                    is RefreshGameSessionResult.Failed -> {
                                        val message =
                                            result.message

                                        gameBiddingState =
                                            GameBiddingUiState.Failed(
                                                message =
                                                    message,
                                            )

                                        gamePlayCardState =
                                            GamePlayCardUiState.Failed(
                                                message =
                                                    message,
                                            )
                                    }
                                }
                            }
                        },

                        onReplay = {
                            clearActiveRoomSession()

                            roomActionState =
                                RoomActionUiState.Idle

                            leaveState =
                                RoomLobbyLeaveUiState.Idle

                            startState =
                                RoomLobbyStartUiState.Idle

                            gameBiddingState =
                                GameBiddingUiState.Idle

                            gamePlayCardState =
                                GamePlayCardUiState.Idle

                            joinSessionId =
                                ""

                            notice =
                                null

                            destination =
                                AuthenticatedDestination.Play
                        },
                    )
                }
            }
        }

        else -> {
            SignedOutOrLoadingScreen(
                authState =
                    currentAuthState,

                googleSignInState =
                    googleSignInState,

                backendState =
                    backendState,

                notice =
                    notice,

                onGoogleSignIn = {
                    notice =
                        null

                    googleSignInState =
                        GoogleSignInUiState.Loading

                    signInWithGoogle {
                        result ->
                        when (
                            result
                        ) {
                            is GoogleSignInResult.Authenticated -> {
                                applyAuthenticatedState(
                                    AuthStartupState.Authenticated(
                                        accountId =
                                            result.accountId,

                                        sessionId =
                                            result.sessionId,
                                    ),
                                )
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
private fun GameLoadingScreen(
    modifier:
        Modifier =
        Modifier,
) {
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
                    ),

            verticalArrangement =
                Arrangement.Center,

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator()

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            16.dp,
                    ),

                text =
                    "Chargement de la partie Atoutia…",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,
            )
        }
    }
}

@Composable
private fun GameLoadFailedScreen(
    message:
        String,

    onRetry:
        () -> Unit,

    modifier:
        Modifier =
        Modifier,
) {
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
                    ),

            verticalArrangement =
                Arrangement.Center,

            horizontalAlignment =
                Alignment.CenterHorizontally,
        ) {
            Text(
                text =
                    "Impossible de charger la partie",

                style =
                    MaterialTheme
                        .typography
                        .titleLarge,

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
                    message,

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,
            )

            Button(
                modifier =
                    Modifier.padding(
                        top =
                            24.dp,
                    ),

                onClick =
                    onRetry,
            ) {
                Text(
                    text =
                        "Réessayer",
                )
            }
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

    notice:
        String?,

    onGoogleSignIn:
        () -> Unit,

    onCheckBackend:
        () -> Unit,

    modifier:
        Modifier =
        Modifier,
) {
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

            if (
                notice !=
                    null
            ) {
                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                16.dp,
                        ),

                    text =
                        notice,

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
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

            notice =
                null,

            onGoogleSignIn = {},

            onCheckBackend = {},
        )
    }
}