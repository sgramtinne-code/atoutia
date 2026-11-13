package tech.devoo.atoutia.ui.lobby

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.platform.testTag
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

    onRoomInProgress:
        (
            (
                RoomSessionMembership,
            ) -> Unit
        )? =
            null,
    connectRealtime: ((RoomSessionMembership, RoomLobbyRealtimeCoordinator.Listener) -> AutoCloseable)? = null,
    onCopyInvitation: ((String) -> Unit)? = null,
    onShareInvitation: ((String) -> Unit)? = null,
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
            connectRealtime == null && apiBaseUrl.isBlank()
        ) {
            realtimeState =
                RoomLobbyRealtimeUiState
                    .Failed(
                        message =
                            "Le temps réel Atoutia n’est pas configuré.",
                    )

            return@LaunchedEffect
        }

        val realtimeConnector = connectRealtime ?: run {
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
            realtimeCoordinator::connect
        }

        var connection:
            AutoCloseable? =
            null

        try {
            connection =
                withContext(
                    Dispatchers.IO,
                ) {
                    realtimeConnector(
                        currentMembership,
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

    LaunchedEffect(
        currentMembership.room.phase,
        currentMembership.room.revision,
    ) {
        if (
            currentMembership.room.phase ==
                "IN_PROGRESS"
        ) {
            onRoomInProgress
                ?.invoke(
                    currentMembership,
                )
        }
    }

    RoomLobbyContent(
        onCopyInvitation = onCopyInvitation,
        onShareInvitation = onShareInvitation,
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
    onCopyInvitation: ((String) -> Unit)?,
    onShareInvitation: ((String) -> Unit)?,
    membership: RoomSessionMembership,
    realtimeState: RoomLobbyRealtimeUiState,
    startState: RoomLobbyStartUiState,
    onStartRoom: (() -> Unit)?,
    leaveState: RoomLobbyLeaveUiState,
    onLeaveRoom: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    val room = membership.room
    val player = membership.player
    val isHost = player == PlayerPosition.PLAYER_0
    val isRoomReadyToStart = room.phase == "READY" &&
        room.occupiedSeats == PlayerPosition.entries.size &&
        room.seats.occupiedCount == PlayerPosition.entries.size
    val isStarting = startState is RoomLobbyStartUiState.Starting
    val isLeaving = leaveState is RoomLobbyLeaveUiState.Leaving

    val header: @Composable () -> Unit = {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Salon Atoutia",
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Text(room.mode.toDisplayName(), style = MaterialTheme.typography.bodyMedium)
        }
    }

    val details: @Composable () -> Unit = {
        RealtimeStatus(state = realtimeState)
        Text("Votre place · ${player.toDisplayName()}", style = MaterialTheme.typography.bodyMedium)
        Text(
            if (isRoomReadyToStart) "Les quatre joueurs sont prêts." else "En attente des autres joueurs.",
            style = MaterialTheme.typography.titleMedium,
        )
        if (isHost && !isRoomReadyToStart && !isStarting) {
            Text(
                if (room.occupiedSeats < PlayerPosition.entries.size)
                    "Le démarrage sera disponible lorsque les 4 joueurs seront présents."
                else "Le salon attend la confirmation du serveur avant le démarrage.",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Invitations", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (room.mode == MatchMode.PRIVATE && room.phase in setOf("WAITING_FOR_PLAYERS", "READY")) {
                    RoomInvitationPanel(
                        sessionId = room.sessionId,
                        enabled = room.phase == "WAITING_FOR_PLAYERS" && room.occupiedSeats in 1..3 &&
                            !isStarting && !isLeaving,
                        onCopy = onCopyInvitation,
                        onShare = onShareInvitation,
                    )
                }
                Text("Identifiant de la partie", style = MaterialTheme.typography.labelLarge)
                SelectionContainer {
                    Text(room.sessionId, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        if (startState is RoomLobbyStartUiState.Failed) {
            Text(startState.message, color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium)
        }
        if (leaveState is RoomLobbyLeaveUiState.Failed) {
            Text(leaveState.message, color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium)
        }
    }

    val overview: @Composable () -> Unit = {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Joueurs", style = MaterialTheme.typography.labelLarge)
            Text(
                "${room.occupiedSeats} / 4",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.testTag("lobby-player-count"),
            )
        }
        if (!isHost) {
            Text("L’hôte démarrera la partie.", style = MaterialTheme.typography.bodyMedium)
        }
    }

    val actions: @Composable () -> Unit = {
        if (isHost) {
            Button(
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("lobby-start"),
                enabled = onStartRoom != null && isRoomReadyToStart && !isStarting && !isLeaving,
                onClick = { onStartRoom?.invoke() },
            ) {
                Text(if (isStarting) "Démarrage en cours…" else "Démarrer la partie", textAlign = TextAlign.Center)
            }
        }
        if (onLeaveRoom != null) {
            OutlinedButton(
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("lobby-leave"),
                enabled = !isLeaving && !isStarting,
                onClick = onLeaveRoom,
            ) {
                Text(if (isLeaving) "Sortie en cours…" else "Quitter le salon", textAlign = TextAlign.Center)
            }
        }
    }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val landscape = maxWidth > maxHeight && maxWidth >= 600.dp
            if (landscape) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(innerPadding).padding(12.dp)
                        .testTag("lobby-landscape-layout"),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    header()
                    Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column(
                            modifier = Modifier.weight(1.15f).fillMaxHeight()
                                .verticalScroll(rememberScrollState()).testTag("lobby-details"),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) { details() }
                        Column(
                            modifier = Modifier.weight(1f).fillMaxHeight().testTag("lobby-actions"),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            OutlinedCard(Modifier.weight(1f).fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) { overview() }
                            }
                            actions()
                        }
                    }
                }
            } else {
                Column(
                    modifier = Modifier.fillMaxSize().padding(innerPadding)
                        .verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    header()
                    details()
                    OutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            overview()
                        }
                    }
                    actions()
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
