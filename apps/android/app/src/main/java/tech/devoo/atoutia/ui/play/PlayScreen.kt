package tech.devoo.atoutia.ui.play

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.room.RoomInvitation
import tech.devoo.atoutia.ui.lobby.RoomInvitationActions

sealed interface RoomActionUiState {
    data object Idle : RoomActionUiState
    data object Creating : RoomActionUiState
    data object Joining : RoomActionUiState
    data class Failed(val message: String) : RoomActionUiState
}

@Composable
fun PlayScreen(
    roomActionState: RoomActionUiState,
    joinSessionId: String,
    onJoinSessionIdChange: (String) -> Unit,
    onCreateRoom: () -> Unit,
    onJoinRoom: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    readInvitation: (() -> String?)? = null,
) {
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    var pasteIssue by remember { mutableStateOf<String?>(null) }
    val busy = roomActionState is RoomActionUiState.Creating || roomActionState is RoomActionUiState.Joining
    val recognized = RoomInvitation.parse(joinSessionId) != null
    val canJoin = !busy && pasteIssue == null && recognized

    val createSection: @Composable (Modifier) -> Unit = { cardModifier ->
        OutlinedCard(cardModifier.testTag("create-room-card")) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Inviter mes amis", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Button(
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("create-private-room"),
                    enabled = !busy,
                    onClick = onCreateRoom,
                ) {
                    Text(if (roomActionState is RoomActionUiState.Creating) "Création du salon…" else "Créer une partie")
                }
                Text("Crée un salon privé, puis partage son invitation.", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }

    val joinSection: @Composable (Modifier) -> Unit = { cardModifier ->
        OutlinedCard(cardModifier.testTag("join-room-card")) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Rejoindre une partie", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                OutlinedButton(
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("paste-room-invitation"),
                    enabled = !busy,
                    onClick = {
                        if (!busy) {
                            val code = try {
                                val text = if (readInvitation != null) readInvitation() else RoomInvitationActions.read(context)
                                text?.let(RoomInvitation::parse)
                            } catch (_: Exception) { null }
                            if (code == null) pasteIssue = "Copie d’abord un code de salon ou une invitation Atoutia valide."
                            else {
                                pasteIssue = null
                                onJoinSessionIdChange(code)
                            }
                        }
                    },
                ) { Text("Coller une invitation") }
                Text("Colle l’invitation reçue, puis confirme pour entrer.", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth().testTag("room-invitation-input"),
                    value = joinSessionId,
                    onValueChange = { value ->
                        if (value.length > RoomInvitation.MAX_INPUT_LENGTH) pasteIssue = "L’invitation est trop longue."
                        else if (value != joinSessionId) {
                            // An IME echo of the retained value must not dismiss the length warning.
                            pasteIssue = null
                            onJoinSessionIdChange(value)
                        }
                    },
                    enabled = !busy,
                    minLines = 1,
                    maxLines = 3,
                    isError = pasteIssue != null || (joinSessionId.isNotBlank() && !recognized),
                    supportingText = {
                        when {
                            pasteIssue != null -> Text(pasteIssue!!, modifier = Modifier.testTag("invitation-paste-issue"))
                            joinSessionId.isNotBlank() && !recognized -> Text("Code ou invitation Atoutia non reconnu.")
                            recognized -> Text(
                                "Invitation reconnue. Confirme pour entrer.",
                                modifier = Modifier.testTag("invitation-ready").semantics { liveRegion = LiveRegionMode.Polite },
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    },
                    label = { Text("Invitation ou code") },
                    placeholder = { Text("ms1_…") },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = {
                        focusManager.clearFocus()
                        if (canJoin) onJoinRoom()
                    }),
                )
                Button(
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("join-private-room"),
                    enabled = canJoin,
                    onClick = {
                        focusManager.clearFocus()
                        if (canJoin) onJoinRoom()
                    },
                ) {
                    Text(if (roomActionState is RoomActionUiState.Joining) "Connexion au salon…" else "Rejoindre la partie")
                }
            }
        }
    }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val landscape = maxWidth >= 600.dp && maxWidth > maxHeight
            Column(
                modifier = Modifier.fillMaxSize().padding(innerPadding).verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Jouer", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                if (landscape) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        createSection(Modifier.weight(1f))
                        joinSection(Modifier.weight(1f))
                    }
                } else {
                    createSection(Modifier.fillMaxWidth())
                    joinSection(Modifier.fillMaxWidth())
                }
                if (busy) CircularProgressIndicator()
                if (roomActionState is RoomActionUiState.Failed) {
                    Text(roomActionState.message, modifier = Modifier.testTag("room-action-error"),
                        color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }
                OutlinedButton(
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("play-back"),
                    enabled = !busy,
                    onClick = onBack,
                ) { Text("Retour") }
            }
        }
    }
}
