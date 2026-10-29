package tech.devoo.atoutia.offline

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** No runtime is constructed until preferences have been read successfully. */
@Composable
internal fun SoloPreferencesGate(
    load: () -> SoloPreferences,
    onHome: () -> Unit,
    content: @Composable (SoloPreferences) -> Unit,
) {
    var value by remember { mutableStateOf<SoloPreferences?>(null) }
    var failed by remember { mutableStateOf(false) }
    var attempt by remember { mutableIntStateOf(0) }
    LaunchedEffect(attempt) {
        failed = false
        try {
            value = withContext(Dispatchers.IO) { load() }
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) { failed = true }
    }
    val loaded = value
    if (loaded != null) content(loaded) else {
        BackHandler(onBack = onHome)
        Surface(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = onHome) { Text("Retour à l’accueil") }
                if (failed) {
                    Text("Les réglages solo n’ont pas pu être chargés.")
                    Button(onClick = { attempt++ }) { Text("Réessayer") }
                } else CircularProgressIndicator()
            }
        }
    }
}

@Composable
internal fun SoloSettingsScreen(initial: SoloPreferences, save: (SoloPreferences) -> Unit, onHome: () -> Unit) {
    var value by remember { mutableStateOf(initial) }
    var saving by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    BackHandler { if (!saving) onHome() }
    fun change(next: SoloPreferences) {
        if (saving || next == value) return
        saving = true
        failed = false
        scope.launch {
            try {
                withContext(Dispatchers.IO) { save(next) }
                value = next
            } catch (error: CancellationException) {
                throw error
            } catch (_: Exception) { failed = true }
            finally { saving = false }
        }
    }
    Surface(Modifier.fillMaxSize().testTag("solo-settings")) {
        Column(
            Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Paramètres solo", style = MaterialTheme.typography.headlineMedium)
            OutlinedButton(onClick = onHome, enabled = !saving) { Text("Retour à l’accueil") }
            Text("Rythme des PNJ", style = MaterialTheme.typography.titleLarge)
            Text("Le temps entre leurs actions. Leur niveau et leur manière de jouer restent identiques.")
            SoloPace.entries.forEach { pace ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = value.pace == pace, onClick = { change(value.copy(pace = pace)) },
                        enabled = !saving, modifier = Modifier.testTag("solo-pace-${pace.name}"))
                    Text(pace.label)
                }
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Confirmer mes cartes", modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                Switch(checked = value.confirmCards, onCheckedChange = { change(value.copy(confirmCards = it)) },
                    enabled = !saving, modifier = Modifier.testTag("solo-confirm-cards"))
            }
            Text("Demander confirmation avant de jouer une carte en solo. Tu peux annuler et en choisir une autre.")
            if (saving) Text("Enregistrement…")
            if (failed) Text("La modification n’a pas été enregistrée. Réessaie en sélectionnant ton choix.", modifier = Modifier.testTag("solo-settings-error"))
            Text("Ces réglages sont conservés sur cet appareil et s’appliquent au prochain accès au solo, y compris à une partie reprise.")
        }
    }
}
