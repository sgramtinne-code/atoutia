package tech.devoo.atoutia.offline

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import tech.devoo.atoutia.network.game.BiddingActionSnapshot
import tech.devoo.atoutia.network.game.PlayerActionMode
import tech.devoo.atoutia.network.game.PlayerGameCommand
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.ui.game.BeloteCard
import tech.devoo.atoutia.ui.game.GameBiddingUiState
import tech.devoo.atoutia.ui.game.GamePlayCardUiState
import tech.devoo.atoutia.ui.game.GameScreen
import tech.devoo.atoutia.ui.game.GameViewState

@Composable
internal fun OfflineSoloScreen(controllerFactory: () -> OfflineSoloController, preferences: SoloPreferences = SoloPreferences(), onHome: () -> Unit) {
    var controller by remember { mutableStateOf(controllerFactory()) }
    var view by remember { mutableStateOf<GameViewState?>(null) }
    var busy by remember { mutableStateOf(false) }
    var issue by remember { mutableStateOf<String?>(null) }
    var unavailable by remember { mutableStateOf(false) }
    var saveWarning by remember { mutableStateOf(false) }
    var confirmNew by remember { mutableStateOf(false) }
    var pendingCard by remember { mutableStateOf<Pair<Int, PlayerCard>?>(null) }
    val scope = rememberCoroutineScope()
    DisposableEffect(controller) {
        val owned = controller
        onDispose { owned.close() }
    }
    BackHandler { if (!busy || view == null) onHome() }

    fun perform(action: () -> OfflineUpdate) {
        if (busy) return
        busy = true
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) { action() }
                view = result.view
                saveWarning = result.saveFailed
                issue = null
                unavailable = false
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                unavailable = error is OfflineUnavailableException
                issue = if (unavailable) error.message else "La partie solo n’a pas pu être actualisée. Réessaie sans rejouer ton action."
            } finally {
                busy = false
            }
        }
    }

    fun reopen() {
        controller.close()
        controller = controllerFactory()
        perform { controller.resumeOrStart() }
    }

    LaunchedEffect(Unit) { perform { controller.resumeOrStart() } }
    LaunchedEffect(view?.revision) { pendingCard = null }
    LaunchedEffect(view?.revision, busy, issue, saveWarning, preferences.pace) {
        val current = view
        if (!busy && issue == null && !saveWarning && current?.document?.snapshot?.actions?.mode == PlayerActionMode.WAIT) {
            delay(preferences.pace.delayMillis)
            perform { controller.stepBot(current.revision) }
        }
    }

    val current = view
    if (current == null) {
        Surface(Modifier.fillMaxSize()) {
            Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            ) {
                Text("Solo hors ligne", style = MaterialTheme.typography.headlineMedium)
                if (busy) CircularProgressIndicator()
                else {
                    Text(issue ?: "Préparation de la partie…")
                    Button(onClick = { reopen() }) { Text("Réessayer") }
                    if (!unavailable) OutlinedButton(onClick = { confirmNew = true }) { Text("Nouvelle partie") }
                }
                OutlinedButton(onClick = onHome) { Text("Retour à l’accueil") }
            }
        }
    } else {
        GameScreen(
            session = current,
            local = true,
            biddingState = if (busy) GameBiddingUiState.Submitting else GameBiddingUiState.Idle,
            playCardState = if (busy) GamePlayCardUiState.Submitting else GamePlayCardUiState.Idle,
            onBiddingAction = { action ->
                val command = when (action) {
                    is BiddingActionSnapshot.Pass -> PlayerGameCommand.Pass
                    is BiddingActionSnapshot.Take -> PlayerGameCommand.Take(action.suit)
                }
                perform { controller.human(current.revision, command) }
            },
            onPlayCard = { card ->
                if (preferences.confirmCards) pendingCard = current.revision to card
                else perform { controller.human(current.revision, PlayerGameCommand.PlayCard(card)) }
            },
            onReplay = { confirmNew = true },
            onHome = onHome,
            onReturnToHome = onHome,
        )
        val pending = pendingCard
        if (pending != null) AlertDialog(
            modifier = Modifier.testTag("solo-card-confirmation"),
            onDismissRequest = { pendingCard = null },
            title = { Text("Jouer cette carte ?") },
            text = { BeloteCard(card = pending.second) },
            confirmButton = { TextButton(onClick = {
                pendingCard = null
                if (pending.first == current.revision && current.document.snapshot.actions.mode == PlayerActionMode.PLAY_CARD &&
                    pending.second in current.document.snapshot.actions.legalCards) {
                    perform { controller.human(pending.first, PlayerGameCommand.PlayCard(pending.second)) }
                }
            }, enabled = !busy) { Text("Jouer la carte") } },
            dismissButton = { TextButton(onClick = { pendingCard = null }) { Text("Annuler") } },
        )
        if (issue != null || saveWarning) AlertDialog(
            onDismissRequest = { issue = null; saveWarning = false },
            title = { Text(if (saveWarning) "Sauvegarde indisponible" else "Partie solo") },
            text = { Text(if (saveWarning) "La sauvegarde de la partie et des statistiques a échoué. Réessaie pour conserver les derniers changements avant de quitter." else issue.orEmpty()) },
            confirmButton = { TextButton(onClick = { perform { controller.snapshot() } }) { Text("Réessayer") } },
            dismissButton = { TextButton(onClick = { issue = null; saveWarning = false }) { Text("Continuer") } },
        )
    }
    if (confirmNew) AlertDialog(
        onDismissRequest = { confirmNew = false },
        title = { Text("Nouvelle partie solo ?") },
        text = { Text("La partie solo enregistrée sera remplacée.") },
        confirmButton = { TextButton(onClick = { confirmNew = false; perform { controller.startNew() } }) { Text("Nouvelle partie") } },
        dismissButton = { TextButton(onClick = { confirmNew = false }) { Text("Annuler") } },
    )
}
