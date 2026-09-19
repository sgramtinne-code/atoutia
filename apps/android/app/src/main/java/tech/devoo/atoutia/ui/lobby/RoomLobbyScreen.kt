package tech.devoo.atoutia.ui.lobby

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.selection.SelectionContainer
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

@Composable
fun RoomLobbyScreen(
    room:
        LiveRoomSummary,

    player:
        PlayerPosition,

    modifier:
        Modifier =
            Modifier,
) {
    val applicationContext =
        LocalContext.current
            .applicationContext

    val coroutineScope =
        rememberCoroutineScope()

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

    LaunchedEffect(
        room.sessionId,
        player,
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
        }
    }

    RoomLobbyContent(
        membership =
            currentMembership,

        realtimeState =
            realtimeState,

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

    modifier:
        Modifier =
            Modifier,
) {
    val room =
        membership.room

    val player =
        membership.player

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