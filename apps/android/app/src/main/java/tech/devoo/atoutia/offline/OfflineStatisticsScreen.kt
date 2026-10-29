package tech.devoo.atoutia.offline

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import tech.devoo.atoutia.network.game.MatchTeam
import kotlin.math.roundToInt

@Composable
internal fun OfflineStatisticsScreen(loadStatistics: () -> OfflineStatistics, onHome: () -> Unit) {
    var statistics by remember { mutableStateOf<OfflineStatistics?>(null) }
    var failed by remember { mutableStateOf(false) }
    var attempt by remember { mutableStateOf(0) }
    LaunchedEffect(attempt) {
        statistics = null
        failed = false
        try {
            statistics = withContext(Dispatchers.IO) { loadStatistics() }
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            failed = true
        }
    }
    Surface(Modifier.fillMaxSize()) {
        Column(
            Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Statistiques solo", style = MaterialTheme.typography.headlineMedium)
            OutlinedButton(onClick = onHome) { Text("Retour à l’accueil") }
            val current = statistics
            if (failed) {
                Text("Les statistiques n’ont pas pu être chargées.")
                Button(onClick = { attempt++ }) { Text("Réessayer") }
            } else if (current == null) {
                CircularProgressIndicator()
            } else {
                OutlinedCard(Modifier.fillMaxWidth().testTag("offline-statistics-ready")) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Parties terminées : ${current.completed}")
                        Text("Victoires : ${current.wins}")
                        Text("Défaites : ${current.losses}")
                        val rate = if (current.completed == 0L) "—" else
                            "${(100.0 * current.wins.toDouble() / current.completed.toDouble()).roundToInt()} %"
                        Text("Taux de victoire : $rate")
                    }
                }
                val last = current.lastResult
                if (last == null) {
                    Text("Termine une partie solo pour commencer tes statistiques.")
                } else {
                    Text(if (last.winner == MatchTeam.TEAM_0) "Dernière partie : victoire" else "Dernière partie : défaite")
                    Text("Votre équipe : ${last.team0} · Adversaires : ${last.team1}")
                }
                Text("Enregistrées sur cet appareil. Les parties en cours ne sont pas comptées.")
            }
        }
    }
}
