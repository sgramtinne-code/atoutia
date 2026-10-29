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
import java.security.SecureRandom

@Composable
internal fun OfflineEntryHost(context: Context, onlineContent: @Composable () -> Unit) {
    val app = context.applicationContext
    val preferences = remember { app.getSharedPreferences("atoutia_game_mode", Context.MODE_PRIVATE) }
    val saveStore = remember(app) { AndroidOfflineSaveStore(app) }
    GameModeHost(
        initialMode = preferences.getString("mode", "MENU") ?: "MENU",
        onModeChanged = { preferences.edit().putString("mode", it).apply() },
        controllerFactory = {
            OfflineSoloController(AndroidOfflineRuntime(app), saveStore) {
                SecureRandom().nextInt(Int.MAX_VALUE)
            }
        },
        statisticsLoader = { OfflineProgress.decode(saveStore.read()).statistics },
        onlineContent = onlineContent,
    )
}

@Composable
internal fun GameModeHost(
    initialMode: String = "MENU",
    onModeChanged: (String) -> Unit = {},
    controllerFactory: () -> OfflineSoloController,
    statisticsLoader: () -> OfflineStatistics = { OfflineStatistics() },
    onlineContent: @Composable () -> Unit,
) {
    var mode by rememberSaveable { mutableStateOf(initialMode.takeIf { it in setOf("SOLO", "ONLINE", "STATS") } ?: "MENU") }
    fun select(value: String) { mode = value; onModeChanged(value) }
    when (mode) {
        "SOLO" -> OfflineSoloScreen(controllerFactory = controllerFactory, onHome = { select("MENU") })
        "STATS" -> {
            BackHandler { select("MENU") }
            OfflineStatisticsScreen(loadStatistics = statisticsLoader, onHome = { select("MENU") })
        }
        "ONLINE" -> {
            // Child game handlers still take precedence; Back at the online home opens modes.
            BackHandler { select("MENU") }
            onlineContent()
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
                OutlinedButton(onClick = { select("STATS") }) { Text("Statistiques solo") }
            }
        }
    }
}
