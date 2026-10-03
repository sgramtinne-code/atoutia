package tech.devoo.atoutia.ui.lobby

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import tech.devoo.atoutia.BuildConfig
import tech.devoo.atoutia.auth.AndroidSecureAuthTokenStore
import tech.devoo.atoutia.auth.AuthSessionCoordinator
import tech.devoo.atoutia.auth.HttpAuthSessionApi
import tech.devoo.atoutia.network.realtime.AtoutiaRealtimeClient
import tech.devoo.atoutia.network.room.HttpAtoutiaRoomApi
import tech.devoo.atoutia.network.room.LiveRoomSummary
import tech.devoo.atoutia.network.room.MatchMode
import tech.devoo.atoutia.network.room.PlayerPosition
import tech.devoo.atoutia.network.room.RoomLobbyRealtimeCoordinator
import tech.devoo.atoutia.network.room.RoomSessionMembership

sealed interface RoomLobbyRealtimeUiState {
    data object Connecting :
        RoomLobbyRealtimeUiState

    data object Connected :
        RoomLobbyRealtimeUiState

    data class Disconnected(
        val message: String,
    ) : RoomLobbyRealtimeUiState

    data class Failed(
        val message: String,
    ) : RoomLobbyRealtimeUiState
}

sealed interface RoomLobbyLeaveUiState {
    data object Idle :
        RoomLobbyLeaveUiState

    data object Leaving :
        RoomLobbyLeaveUiState

    data class Failed(
        val message: String,
    ) : RoomLobbyLeaveUiState
}

sealed interface RoomLobbyStartUiState {
    data object Idle :
        RoomLobbyStartUiState

    data object Starting :
        RoomLobbyStartUiState

    data class Failed(
        val message: String,
    ) : RoomLobbyStartUiState
}

@Composable
fun RoomLobbyScreen(
    room:
        LiveRoomSummary,

    player:
        PlayerPosition,

    leaveState:
        RoomLobbyLeaveUiState =
            RoomLobbyLeaveUiState.Idle,

    onLeaveRoom:
        (
            (
                RoomSessionMembership,
            ) -> Unit
        )? =
            null,

    modifier:
        Modifier =
            Modifier,

    startState:
        RoomLobbyStartUiState =
            RoomLobbyStartUiState.Idle,

    onStartRoom:
        (
            (
                RoomSessionMembership,
            ) -> Unit
        )? =
            null,
) {
    val applicationContext =
        LocalContext.current
            .applicationContext

    val coroutineScope =
        rememberCoroutineScope()

    var realtimeConnection by
        remember(
            room.sessionId,
            player,
        ) {
            mutableStateOf<
                AutoCloseable?
            >(
                null,
            )
        }

    var currentMembership by
        remember(
            room.sessionId,
            player,
        ) {
            mutableStateOf(
                RoomSessionMembership(
                    room =
                        room,

                    player =
                        player,
                ),
            )
        }

    var realtimeState by
        remember(
            room.sessionId,
            player,
        ) {
            mutableStateOf<
                RoomLobbyRealtimeUiState
            >(
                RoomLobbyRealtimeUiState
                    .Connecting,
            )
        }

    val isLeaving =
        leaveState is
            RoomLobbyLeaveUiState.Leaving

    LaunchedEffect(
        room.sessionId,
        player,
        isLeaving,
    ) {
        currentMembership =
            RoomSessionMembership(
                room =
                    room,

                player =
                    player,
            )

        realtimeState =
            RoomLobbyRealtimeUiState
                .Connecting

        if (
            isLeaving
        ) {
            return@LaunchedEffect
        }

        val apiBaseUrl =
            BuildConfig
                .ATOUTIA_API_BASE_URL

        if (
            apiBaseUrl.isBlank()
        ) {
            realtimeState =
                RoomLobbyRealtimeUiState
                    .Failed(
                        message =
                            "Le temps réel Atoutia n’est pas configuré.",
                    )

            return@LaunchedEffect
        }

        val tokenStore =
            AndroidSecureAuthTokenStore(
                applicationContext,
            )

        val authSessionApi =
            HttpAuthSessionApi(
                apiBaseUrl,
            )

        val authSessionCoordinator =
            AuthSessionCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    authSessionApi,
            )

        val roomApi =
            HttpAtoutiaRoomApi(
                apiBaseUrl,
            )

        val realtimeApi =
            AtoutiaRealtimeClient(
                apiBaseUrl,
            )

        val realtimeCoordinator =
            RoomLobbyRealtimeCoordinator(
                roomApi =
                    roomApi,

                realtimeApi =
                    realtimeApi,

                accessTokenProvider =
                    authSessionCoordinator::accessTokenOrRefresh,
            )

        var connection:
            AutoCloseable? =
            null

        try {
            connection =
                withContext(
                    Dispatchers.IO,
                ) {
                    realtimeCoordinator.connect(
                        membership =
                            currentMembership,

                        listener =
                            object :
                                RoomLobbyRealtimeCoordinator.Listener {
                                override fun onConnected() {
                                    coroutineScope.launch {
                                        realtimeState =
                                            RoomLobbyRealtimeUiState
                                                .Connected
                                    }
                                }

                                override fun onRoomUpdated(
                                    membership:
                                        RoomSessionMembership,
                                ) {
                                    coroutineScope.launch {
                                        currentMembership =
                                            membership
                                    }
                                }

                                override fun onServerError(
                                    code:
                                        String,
                                ) {
                                    coroutineScope.launch {
                                        realtimeState =
                                            RoomLobbyRealtimeUiState
                                                .Failed(
                                                    message =
                                                        "Le serveur temps réel Atoutia a signalé l’erreur $code.",
                                                )
                                    }
                                }

                                override fun onDisconnected(
                                    code:
                                        Int,

                                    reason:
                                        String,
                                ) {
                                    coroutineScope.launch {
                                        val description =
                                            reason
                                                .takeIf {
                                                    it.isNotBlank()
                                                }
                                                ?: "connexion fermée"

                                        realtimeState =
                                            RoomLobbyRealtimeUiState
                                                .Disconnected(
                                                    message =
                                                        "Temps réel déconnecté ($code : $description).",
                                                )
                                    }
                                }

                                override fun onFailure(
                                    error:
                                        Throwable,
                                ) {
                                    coroutineScope.launch {
                                        realtimeState =
                                            RoomLobbyRealtimeUiState
                                                .Failed(
                                                    message =
                                                        error.message
                                                            ?: "Erreur temps réel Atoutia.",
                                                )
                                    }
                                }
                            },
                    )
                }

            realtimeConnection =
                connection

            awaitCancellation()
        } catch (
            error:
                CancellationException,
        ) {
            throw error
        } catch (
            error:
                Throwable,
        ) {
            realtimeState =
                RoomLobbyRealtimeUiState
                    .Failed(
                        message =
                            error.message
                                ?: "Impossible d’ouvrir le temps réel Atoutia.",
                    )
        } finally {
            withContext(
                NonCancellable +
                    Dispatchers.IO,
            ) {
                try {
                    connection
                        ?.close()
                } catch (
                    ignored:
                        Exception,
                ) {
                    Unit
                }
            }

            if (
                realtimeConnection ===
                    connection
            ) {
                realtimeConnection =
                    null
            }
        }
    }

    RoomLobbyContent(
        membership =
            currentMembership,

        realtimeState =
            realtimeState,

        startState =
            startState,

        onStartRoom =
            onStartRoom?.let {
                startRoom ->
                {
                    startRoom(
                        currentMembership,
                    )
                }
            },

        leaveState =
            leaveState,

        onLeaveRoom =
            onLeaveRoom?.let {
                leaveRoom ->
                {
                    coroutineScope.launch {
                        val connection =
                            realtimeConnection

                        realtimeConnection =
                            null

                        withContext(
                            Dispatchers.IO,
                        ) {
                            try {
                                connection
                                    ?.close()
                            } catch (
                                ignored:
                                    Exception,
                            ) {
                                Unit
                            }
                        }

                        leaveRoom(
                            currentMembership,
                        )
                    }
                }
            },

        modifier =
            modifier,
    )
}

@Composable
private fun RoomLobbyContent(
    membership:
        RoomSessionMembership,

    realtimeState:
        RoomLobbyRealtimeUiState,

    startState:
        RoomLobbyStartUiState,

    onStartRoom:
        (() -> Unit)?,

    leaveState:
        RoomLobbyLeaveUiState,

    onLeaveRoom:
        (() -> Unit)?,

    modifier:
        Modifier =
            Modifier,
) {
    val room =
        membership.room

    val player =
        membership.player

    val isHost =
        player ==
            PlayerPosition.PLAYER_0

    val isRoomReadyToStart =
        room.phase ==
            "READY" &&
            room.occupiedSeats ==
                PlayerPosition.entries.size &&
            room.seats.occupiedCount ==
                PlayerPosition.entries.size

    val isStarting =
        startState is
            RoomLobbyStartUiState.Starting

    val isLeaving =
        leaveState is
            RoomLobbyLeaveUiState.Leaving

    val scrollState =
        rememberScrollState()

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
                    .verticalScroll(
                        scrollState,
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
                    "Salon Atoutia",

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

            RealtimeStatus(
                modifier =
                    Modifier.padding(
                        top =
                            12.dp,
                    ),

                state =
                    realtimeState,
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
                    Text(
                        text =
                            "Identifiant de la partie",

                        style =
                            MaterialTheme
                                .typography
                                .labelLarge,
                    )

                    SelectionContainer {
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
                    }

                    Text(
                        modifier =
                            Modifier.padding(
                                top =
                                    6.dp,
                            ),

                        text =
                            "Appui long sur l’identifiant pour le sélectionner et le copier.",

                        style =
                            MaterialTheme
                                .typography
                                .bodySmall,
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
                            room.mode
                                .toDisplayName(),

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
                            "Révision serveur",

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
                            room.revision
                                .toString(),

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
                            player
                                .toDisplayName(),

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
                    "Votre siège ${player.name} est réservé sur le serveur Atoutia.",

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                textAlign =
                    TextAlign.Center,
            )

            if (
                isHost
            ) {
                Button(
                    modifier =
                        Modifier.padding(
                            top =
                                24.dp,
                        ),

                    enabled =
                        onStartRoom !=
                            null &&
                            isRoomReadyToStart &&
                            !isStarting &&
                            !isLeaving,

                    onClick = {
                        onStartRoom
                            ?.invoke()
                    },
                ) {
                    Text(
                        text =
                            if (
                                isStarting
                            ) {
                                "Démarrage en cours…"
                            } else {
                                "Démarrer la partie"
                            },
                    )
                }

                if (
                    !isRoomReadyToStart &&
                    !isStarting
                ) {
                    Text(
                        modifier =
                            Modifier.padding(
                                top =
                                    12.dp,
                            ),

                        text =
                            if (
                                room.occupiedSeats <
                                    PlayerPosition.entries.size
                            ) {
                                "Le démarrage sera disponible lorsque les 4 joueurs seront présents."
                            } else {
                                "Le salon attend la confirmation du serveur avant le démarrage."
                            },

                        style =
                            MaterialTheme
                                .typography
                                .bodyMedium,

                        textAlign =
                            TextAlign.Center,
                    )
                }

                if (
                    startState is
                        RoomLobbyStartUiState.Failed
                ) {
                    Text(
                        modifier =
                            Modifier.padding(
                                top =
                                    12.dp,
                            ),

                        text =
                            startState.message,

                        style =
                            MaterialTheme
                                .typography
                                .bodyMedium,

                        textAlign =
                            TextAlign.Center,
                    )
                }
            }

            if (
                onLeaveRoom !=
                    null
            ) {
                Button(
                    modifier =
                        Modifier.padding(
                            top =
                                24.dp,
                        ),

                    enabled =
                        !isLeaving &&
                            !isStarting,

                    onClick =
                        onLeaveRoom,
                ) {
                    Text(
                        text =
                            if (
                                leaveState is
                                    RoomLobbyLeaveUiState.Leaving
                            ) {
                                "Sortie en cours…"
                            } else {
                                "Quitter le salon"
                            },
                    )
                }

                if (
                    leaveState is
                        RoomLobbyLeaveUiState.Failed
                ) {
                    Text(
                        modifier =
                            Modifier.padding(
                                top =
                                    12.dp,
                            ),

                        text =
                            leaveState.message,

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
    }
}

@Composable
private fun RealtimeStatus(
    state:
        RoomLobbyRealtimeUiState,

    modifier:
        Modifier =
            Modifier,
) {
    val text =
        when (
            state
        ) {
            RoomLobbyRealtimeUiState.Connecting ->
                "Temps réel : connexion…"

            RoomLobbyRealtimeUiState.Connected ->
                "Temps réel : connecté"

            is RoomLobbyRealtimeUiState.Disconnected ->
                state.message

            is RoomLobbyRealtimeUiState.Failed ->
                state.message
        }

    val fontWeight =
        when (
            state
        ) {
            RoomLobbyRealtimeUiState.Connected ->
                FontWeight.Bold

            else ->
                FontWeight.Normal
        }

    Text(
        modifier =
            modifier,

        text =
            text,

        style =
            MaterialTheme
                .typography
                .bodyMedium,

        fontWeight =
            fontWeight,

        textAlign =
            TextAlign.Center,
    )
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