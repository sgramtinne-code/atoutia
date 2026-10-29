package tech.devoo.atoutia.offline

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import java.io.File
import java.security.SecureRandom

internal data class OnlineModeActions(val openSoloSettings: () -> Unit, val openSoloProfile: () -> Unit)

@Composable
internal fun OfflineEntryHost(context: Context, onlineContent: @Composable (OnlineModeActions) -> Unit) {
    val app = context.applicationContext
    val preferences = remember { app.getSharedPreferences("atoutia_game_mode", Context.MODE_PRIVATE) }
    val saveStore = remember(app) { AndroidOfflineSaveStore(app) }
    val settingsStore = remember(app) { AndroidOfflineSaveStore(File(app.filesDir, "offline/preferences.json")) }
    GameModeHost(
        initialMode = preferences.getString("mode", "MENU") ?: "MENU",
        onModeChanged = { preferences.edit().putString("mode", it).apply() },
        controllerFactory = {
            OfflineSoloController(AndroidOfflineRuntime(app), saveStore) {
                SecureRandom().nextInt(Int.MAX_VALUE)
            }
        },
        statisticsLoader = { OfflineProgress.decode(saveStore.read()).statistics },
        preferencesLoader = { SoloPreferences.decode(settingsStore.read()) },
        preferencesWriter = { settingsStore.write(it.encode()) },
        onlineContent = onlineContent,
    )
}

@Composable
internal fun GameModeHost(
    initialMode: String = "MENU",
    onModeChanged: (String) -> Unit = {},
    controllerFactory: () -> OfflineSoloController,
    statisticsLoader: () -> OfflineStatistics = { OfflineStatistics() },
    preferencesLoader: () -> SoloPreferences = { SoloPreferences() },
    preferencesWriter: (SoloPreferences) -> Unit = {},
    onlineContent: @Composable (OnlineModeActions) -> Unit,
) {
    var mode by rememberSaveable { mutableStateOf(initialMode.takeIf { it in setOf("SOLO", "ONLINE", "STATS", "PROFILE", "SETTINGS", "LEARN") } ?: "MENU") }
    fun select(value: String) { mode = value; onModeChanged(value) }
    when (mode) {
        "SOLO" -> SoloPreferencesGate(load = preferencesLoader, onHome = { select("MENU") }) { preferences ->
            OfflineSoloScreen(controllerFactory = controllerFactory, preferences = preferences, onHome = { select("MENU") })
        }
        "SETTINGS" -> SoloPreferencesGate(load = preferencesLoader, onHome = { select("MENU") }) { preferences ->
            SoloSettingsScreen(initial = preferences, save = preferencesWriter, onHome = { select("MENU") })
        }
        "LEARN" -> BeloteTutorialScreen(onHome = { select("MENU") })
        "STATS" -> {
            BackHandler { select("MENU") }
            OfflineStatisticsScreen(loadStatistics = statisticsLoader, onHome = { select("MENU") }, onProfile = { select("PROFILE") })
        }
        "PROFILE" -> OfflineProfileScreen(loadStatistics = statisticsLoader, onBack = { select("STATS") })
        "ONLINE" -> {
            // Child game handlers still take precedence; Back at the online home opens modes.
            BackHandler { select("MENU") }
            var overlay by rememberSaveable { mutableStateOf<String?>(null) }
            onlineContent(OnlineModeActions(openSoloSettings = { overlay = "SETTINGS" }, openSoloProfile = { overlay = "PROFILE" }))
            if (overlay != null) Dialog(onDismissRequest = { overlay = null },
                properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
                if (overlay == "PROFILE") OfflineProfileScreen(loadStatistics = statisticsLoader, onBack = { overlay = null }, backLabel = "Fermer le profil")
                else SoloPreferencesGate(load = preferencesLoader, onHome = { overlay = null }) { preferences ->
                    SoloSettingsScreen(initial = preferences, save = preferencesWriter, onHome = { overlay = null })
                }
            }
        }
        else -> Surface(Modifier.fillMaxSize().testTag("game-mode-menu")) {
            Column(
                Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            ) {
                Text("ATOUTIA", style = MaterialTheme.typography.headlineMedium)
                Text("Solo sans connexion, sauvegardé sur cet appareil.")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = { select("SOLO") }, modifier = Modifier.weight(1f)) { Text("Solo hors ligne") }
                    OutlinedButton(onClick = { select("ONLINE") }, modifier = Modifier.weight(1f)) { Text("Jouer en ligne") }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { select("STATS") }, modifier = Modifier.weight(1f)) { Text("Statistiques solo") }
                    OutlinedButton(onClick = { select("SETTINGS") }, modifier = Modifier.weight(1f)) { Text("Paramètres") }
                    OutlinedButton(onClick = { select("LEARN") }, modifier = Modifier.weight(1f)) { Text("Tutoriel") }
                }
            }
        }
    }
}
