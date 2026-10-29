package tech.devoo.atoutia.offline

import androidx.activity.compose.BackHandler
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
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

@Composable
internal fun OfflineProfileScreen(
    loadStatistics: () -> OfflineStatistics,
    onBack: () -> Unit,
    backLabel: String = "Retour aux statistiques",
) {
    val read = rememberOfflineStatistics(loadStatistics)
    BackHandler(onBack = onBack)
    Surface(Modifier.fillMaxSize().testTag("offline-profile-screen")) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Profil solo", style = MaterialTheme.typography.headlineMedium)
            OutlinedButton(onClick = onBack) { Text(backLabel) }
            val statistics = read.value
            if (read.failed) {
                Text("Le profil solo n’a pas pu être chargé.", modifier = Modifier.testTag("offline-profile-error"))
                Button(onClick = read.retry) { Text("Réessayer") }
            } else if (statistics == null) CircularProgressIndicator() else {
                val profile = SoloProfile.from(statistics)
                OutlinedCard(Modifier.fillMaxWidth().testTag("solo-stage")) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Palier ${profile.stage.number} · ${profile.stage.title}", style = MaterialTheme.typography.titleLarge)
                        Text("${statistics.completed} ${if (statistics.completed > 1) "parties terminées" else "partie terminée"}")
                        LinearProgressIndicator(progress = { profile.stageFraction }, modifier = Modifier.fillMaxWidth().testTag("solo-stage-progress"))
                        val next = profile.nextStage
                        if (next == null) Text("Tous les paliers sont atteints. Le compteur continue !")
                        else {
                            Text("Prochain palier : ${next.title}")
                            Text(if (profile.remaining == 1L) "Encore une partie à terminer" else "Encore ${profile.remaining} parties à terminer")
                        }
                    }
                }
                Text("Objectifs accomplis : ${profile.objectives.count { it.reached }}/${profile.objectives.size}", modifier = Modifier.testTag("solo-objective-total"))
                profile.objectives.forEach { objective ->
                    OutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp).testTag("solo-goal-${objective.id}").semantics(mergeDescendants = true) {},
                            verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(objective.title, style = MaterialTheme.typography.titleMedium)
                            Text(if (objective.reached) "Accompli · ${objective.displayed}/${objective.target}" else "En cours · ${objective.displayed}/${objective.target}")
                            LinearProgressIndicator(progress = { objective.fraction }, modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
                Text("Les paliers suivent tes parties terminées. Les victoires de ton équipe remplissent les objectifs. Les parties en cours ne sont pas comptées.")
                Text("Progression conservée sur cet appareil avec les statistiques solo. Les résultats déjà enregistrés sont pris en compte.")
            }
        }
    }
}
