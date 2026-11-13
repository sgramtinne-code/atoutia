package tech.devoo.atoutia.ui.lobby

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.room.RoomInvitation

@Composable
internal fun RoomInvitationPanel(
    sessionId: String,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    onCopy: ((String) -> Unit)? = null,
    onShare: ((String) -> Unit)? = null,
) {
    val context = LocalContext.current
    val text = remember(sessionId) { RoomInvitation.parse(sessionId)?.let(RoomInvitation::create) }
    var feedback by remember(sessionId) { mutableStateOf<String?>(null) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Partage l’invitation avec tes amis. Ils pourront la coller dans Atoutia.", style = MaterialTheme.typography.bodyMedium)
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(enabled = enabled && text != null, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("copy-room-invitation"),
                onClick = {
                    if (enabled && text != null) {
                        feedback = try {
                            if (onCopy != null) onCopy(text) else RoomInvitationActions.copy(context, text)
                            "Invitation copiée."
                        } catch (_: Exception) { "Impossible de copier l’invitation. Tu peux sélectionner le code du salon." }
                    }
                }) { Text("Copier l’invitation") }
            OutlinedButton(enabled = enabled && text != null, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag("share-room-invitation"),
                onClick = {
                    if (enabled && text != null) {
                        feedback = try {
                            if (onShare != null) onShare(text) else RoomInvitationActions.share(context, text)
                            "Options de partage ouvertes."
                        } catch (_: Exception) { "Impossible d’ouvrir le partage. Tu peux copier l’invitation." }
                    }
                }) { Text("Partager") }
        }
        if (feedback != null) Text(feedback!!, modifier = Modifier.testTag("room-invitation-feedback"))
        if (!enabled) Text("Les invitations sont disponibles lorsqu’une place est libre, avant le démarrage.")
    }
}
