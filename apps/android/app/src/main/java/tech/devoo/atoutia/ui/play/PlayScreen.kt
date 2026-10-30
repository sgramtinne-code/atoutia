package tech.devoo.atoutia.ui.play

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.room.RoomInvitation
import tech.devoo.atoutia.ui.lobby.RoomInvitationActions

sealed interface RoomActionUiState {
    data object Idle :
        RoomActionUiState

    data object Creating :
        RoomActionUiState

    data object Joining :
        RoomActionUiState

    data class Failed(
        val message:
            String,
    ) : RoomActionUiState
}

@Composable
fun PlayScreen(
    roomActionState:
        RoomActionUiState,

    joinSessionId:
        String,

    onJoinSessionIdChange:
        (
            String,
        ) -> Unit,

    onCreateRoom:
        () -> Unit,

    onJoinRoom:
        () -> Unit,

    onBack:
        () -> Unit,

    modifier:
        Modifier =
            Modifier,
    readInvitation: (() -> String?)? = null,
) {
    val focusManager =
        LocalFocusManager.current
    val context = LocalContext.current
    var pasteIssue by remember { mutableStateOf<String?>(null) }

    val busy =
        roomActionState is
            RoomActionUiState.Creating ||
            roomActionState is
            RoomActionUiState.Joining

    val canJoin =
        !busy && pasteIssue == null &&
            RoomInvitation.parse(joinSessionId) != null

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
                    .verticalScroll(rememberScrollState())
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
                    "Jouer",

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
                    "Crée une partie privée ou rejoins un salon existant.",

                style =
                    MaterialTheme
                        .typography
                        .bodyLarge,
            )

            Button(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                32.dp,
                        ),

                enabled =
                    !busy,

                onClick =
                    onCreateRoom,
            ) {
                Text(
                    text =
                        if (
                            roomActionState is
                                RoomActionUiState.Creating
                        ) {
                            "Création du salon…"
                        } else {
                            "Créer une partie"
                        },
                )
            }

            Text(
                modifier =
                    Modifier.padding(
                        top =
                            28.dp,
                    ),

                text =
                    "Rejoindre une partie",

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,
            )

            OutlinedButton(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp).testTag("paste-room-invitation"),
                enabled = !busy,
                onClick = {
                    if (!busy) {
                        val code = try {
                            val text = if (readInvitation != null) readInvitation() else RoomInvitationActions.read(context)
                            text?.let(RoomInvitation::parse)
                        } catch (_: Exception) { null }
                        if (code == null) pasteIssue = "Copie d’abord un code de salon ou une invitation Atoutia valide."
                        else { pasteIssue = null; onJoinSessionIdChange(code) }
                    }
                },
            ) { Text("Coller une invitation") }

            OutlinedTextField(
                modifier =
                    Modifier
                        .testTag("room-invitation-input")
                        .fillMaxWidth()
                        .padding(
                            top =
                                12.dp,
                        ),

                value =
                    joinSessionId,

                onValueChange = { value ->
                    if (value.length > RoomInvitation.MAX_INPUT_LENGTH) pasteIssue = "L’invitation est trop longue."
                    else if (value != joinSessionId) {
                        // An IME echo of the rejected value must not dismiss the length warning.
                        pasteIssue = null
                        onJoinSessionIdChange(value)
                    }
                },

                enabled =
                    !busy,

                minLines = 1,
                maxLines = 3,
                isError = pasteIssue != null || (joinSessionId.isNotBlank() && RoomInvitation.parse(joinSessionId) == null),
                supportingText = {
                    if (pasteIssue != null) Text(pasteIssue!!, modifier = Modifier.testTag("invitation-paste-issue"))
                    else if (joinSessionId.isNotBlank() && RoomInvitation.parse(joinSessionId) == null) Text("Code ou invitation Atoutia non reconnu.")
                },

                label = {
                    Text(
                        text =
                            "Code ou invitation de la partie",
                    )
                },

                placeholder = {
                    Text(
                        text =
                            "ms1_…",
                    )
                },

                keyboardOptions =
                    KeyboardOptions(
                        imeAction =
                            ImeAction.Done,
                    ),

                keyboardActions =
                    KeyboardActions(
                        onDone = {
                            focusManager
                                .clearFocus()

                            if (
                                canJoin
                            ) {
                                onJoinRoom()
                            }
                        },
                    ),
            )

            OutlinedButton(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                12.dp,
                        ),

                enabled =
                    canJoin,

                onClick = {
                    focusManager
                        .clearFocus()

                    onJoinRoom()
                },
            ) {
                Text(
                    text =
                        if (
                            roomActionState is
                                RoomActionUiState.Joining
                        ) {
                            "Connexion au salon…"
                        } else {
                            "Rejoindre la partie"
                        },
                )
            }

            if (
                busy
            ) {
                CircularProgressIndicator(
                    modifier =
                        Modifier.padding(
                            top =
                                20.dp,
                        ),
                )
            }

            if (
                roomActionState is
                    RoomActionUiState.Failed
            ) {
                Text(
                    modifier =
                        Modifier.padding(
                            top =
                                20.dp,
                        ),

                    text =
                        roomActionState.message,

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,
                )
            }

            OutlinedButton(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            top =
                                32.dp,
                        ),

                enabled =
                    !busy,

                onClick =
                    onBack,
            ) {
                Text(
                    text =
                        "Retour",
                )
            }
        }
    }
}