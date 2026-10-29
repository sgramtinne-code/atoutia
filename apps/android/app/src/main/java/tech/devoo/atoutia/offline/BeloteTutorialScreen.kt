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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

/** Authored teaching examples from GAME_RULES 0.1.3, never a second rules implementation. */
internal data class BeloteLesson(val title: String, val text: String, val question: String, val answers: List<String>, val correct: Int, val explanation: String)

internal val beloteLessons = listOf(
    BeloteLesson("Deux équipes, une partie",
        "La belote se joue à quatre, avec 32 cartes. Tu fais équipe avec le joueur en face de toi ; les deux autres sont vos adversaires. " +
            "Après la prise, chacun a huit cartes. Un pli réunit une carte de chaque joueur ; son gagnant entame le suivant. Une donne comporte huit plis.",
        "Qui est ton partenaire ?", listOf("Le joueur en face", "Le joueur à droite", "Tous les autres joueurs"), 0,
        "Les partenaires sont opposés autour de la table. Les points de leurs plis sont réunis."),
    BeloteLesson("Choisir l’atout",
        "Chacun reçoit d’abord cinq cartes et une carte est retournée. Au premier tour, prendre choisit forcément la couleur de cette carte comme atout. " +
            "Si tous passent, le second tour permet de choisir l’une des trois autres couleurs. Huit passes entraînent une nouvelle donne, sans point. " +
            "Le preneur reçoit la carte retournée, puis les mains sont complétées à huit cartes. Le joueur suivant le donneur entame, même s’il n’a pas pris.",
        "Au premier tour, la carte retournée est un cœur. Tu peux prendre…", listOf("À pique", "À cœur", "À n’importe quelle couleur"), 1,
        "Au premier tour, seule la couleur retournée peut devenir l’atout."),
    BeloteLesson("Reconnaître les cartes fortes",
        "À l’atout, de la plus forte à la plus faible : V (20 points), 9 (14), A (11), 10 (10), R (4), D (3), 8 (0), 7 (0).\n\n" +
            "Hors atout : A (11), 10 (10), R (4), D (3), V (2), 9 (0), 8 (0), 7 (0). Un atout bat toute carte d’une autre couleur. " +
            "Sans atout dans le pli, seule la couleur demandée peut gagner.",
        "Quelle est la carte la plus forte à l’atout ?", listOf("L’As", "Le 10", "Le Valet"), 2,
        "Le Valet est le plus fort à l’atout. Hors atout, c’est l’As."),
    BeloteLesson("Fournir, couper et monter",
        "Tu dois fournir la couleur demandée si tu en as. Hors atout, tu n’es pas obligé de monter. " +
            "Si tu n’as pas la couleur et que ton partenaire est maître, tu peux jouer librement. Sinon, tu dois couper avec un atout si tu en as. " +
            "Quand tu es tenu de jouer atout, monte au-dessus du meilleur atout déjà posé si tu le peux ; sinon, joue un atout inférieur. " +
            "Si tu n’as ni la couleur demandée ni d’atout, défausse-toi.",
        "Pique est demandé. Tu as du pique et du cœur, qui est l’atout. Que dois-tu jouer ?", listOf("Un cœur pour couper", "Un pique", "N’importe quelle carte"), 1,
        "Fournir la couleur demandée passe en premier, même si tu possèdes de l’atout."),
    BeloteLesson("Compter les points",
        "Les cartes valent ensemble 152 points. Le dernier pli ajoute le dix de der : 10 points, soit 162 points de plis. " +
            "Remporter les huit plis est un capot : 252 points de plis au total.\n\n" +
            "Roi et Dame d’atout dans une même main donnent 20 points de Belote/Rebelote. Atoutia l’annonce automatiquement au jeu de ces cartes. " +
            "Cette Belote reste acquise, même en chute ou en capot subi. Les autres annonces ne sont pas comptées dans cette version.",
        "Combien rapporte Roi + Dame d’atout dans la même main ?", listOf("10 points", "20 points", "50 points"), 1,
        "La Belote/Rebelote rapporte 20 points. Aucun bouton d’annonce n’est nécessaire dans Atoutia."),
    BeloteLesson("Réussite, chute et litige",
        "Les points de plis et la Belote servent à comparer les deux équipes. Si les preneurs ont plus de points, chacun marque son total. " +
            "S’ils en ont moins, ils chutent : zéro point de plis pour eux, 162 pour la défense ; chaque équipe garde sa Belote. Un capot vaut 252.\n\n" +
            "À égalité, la défense marque ses points et ceux des preneurs sont mis en litige. Le gagnant du prochain contrat les reçoit. Huit passes conservent ce report ; " +
            "un second litige donne l’ancien report à la nouvelle défense et crée un nouveau report.\n\n" +
            "En solo, la cible est 1 000 points. À la fin d’une donne, si le seuil est atteint, l’équipe au score le plus élevé gagne. Une égalité au seuil demande une autre donne.",
        "Les deux équipes atteignent le seuil avec exactement le même score. Que se passe-t-il ?", listOf("Les preneurs gagnent", "La partie est annulée", "Une donne les départage"), 2,
        "L’égalité au seuil ne désigne aucun vainqueur : une nouvelle donne les départage."),
    BeloteLesson("Jouer dans Atoutia",
        "À ton tour, les cartes autorisées sont mises en évidence ; les cartes grisées ne peuvent pas être jouées. " +
            "Pour prendre, choisis l’atout proposé, ou touche Passer.\n\n" +
            "En solo, les Paramètres permettent de ralentir les PNJ ou de confirmer chaque carte. Retour à l’accueil conserve la partie : Solo hors ligne la reprend. " +
            "Les statistiques comptent les parties terminées, pas les donnes. Ce tutoriel ne lance ni ne remplace ta partie.",
        "Comment reprendre ta partie solo après un retour à l’accueil ?", listOf("Toucher Solo hors ligne", "Créer un salon en ligne", "Recommencer une nouvelle partie"), 0,
        "Solo hors ligne reprend la partie enregistrée sur cet appareil. Tu peux maintenant revenir au menu et jouer."),
)

@Composable
internal fun BeloteTutorialScreen(onHome: () -> Unit) {
    var step by rememberSaveable { mutableIntStateOf(0) }
    var answer by rememberSaveable(step) { mutableIntStateOf(-1) }
    val scroll = rememberScrollState()
    LaunchedEffect(step) { scroll.scrollTo(0) }
    BackHandler(onBack = onHome)
    val lesson = beloteLessons[step]
    Surface(Modifier.fillMaxSize().testTag("belote-tutorial")) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(scroll).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Tutoriel · ${step + 1}/${beloteLessons.size}", style = MaterialTheme.typography.titleMedium)
            OutlinedButton(onClick = onHome) { Text("Retour à l’accueil") }
            Text(lesson.title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.testTag("tutorial-title"))
            Text(lesson.text)
            Text(lesson.question, style = MaterialTheme.typography.titleMedium)
            lesson.answers.forEachIndexed { index, text ->
                OutlinedButton(onClick = { answer = index }, modifier = Modifier.fillMaxWidth().testTag("tutorial-answer-$index")) { Text(text) }
            }
            if (answer >= 0) Text(if (answer == lesson.correct) "Bien vu ! ${lesson.explanation}" else "Essaie encore. ${lesson.explanation}", modifier = Modifier.testTag("tutorial-feedback"))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = { step-- }, enabled = step > 0) { Text("Précédent") }
                Button(onClick = { if (step == beloteLessons.lastIndex) onHome() else step++ }, enabled = answer == lesson.correct,
                    modifier = Modifier.testTag("tutorial-next")) { Text(if (step == beloteLessons.lastIndex) "Terminer" else "Suivant") }
            }
        }
    }
}
