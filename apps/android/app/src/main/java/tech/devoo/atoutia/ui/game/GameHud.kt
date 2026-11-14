package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.MatchTeam
import tech.devoo.atoutia.network.room.PlayerPosition

@Composable
fun GameHud(
    localPlayer: PlayerPosition,
    dealNumber: Int,
    dealer: PlayerPosition,
    taker: PlayerPosition?,
    trumpSuit: CardSuit?,
    scoreTeam0: Int,
    scoreTeam1: Int,
    targetScore: Int,
    revision: Int,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val ownTeam0 = localPlayer.matchTeam() == MatchTeam.TEAM_0
    val ownScore = if (ownTeam0) scoreTeam0 else scoreTeam1
    val opponentScore = if (ownTeam0) scoreTeam1 else scoreTeam0
    Surface(
        modifier = modifier.fillMaxWidth().testTag("game-hud"),
        shape = RoundedCornerShape(if (compact) 12.dp else 20.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.42f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(
            Modifier.padding(horizontal = if (compact) 10.dp else 14.dp, vertical = if (compact) 6.dp else 10.dp),
            verticalArrangement = Arrangement.spacedBy(if (compact) 2.dp else 8.dp),
        ) {
            if (compact) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    HudScore("Votre équipe", ownScore, "hud-own-score", Modifier.weight(1f))
                    HudScore("Adversaires", opponentScore, "hud-opponent-score", Modifier.weight(1f))
                }
            } else {
                Text("Score de partie", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                HudScore("Votre équipe", ownScore, "hud-own-score")
                HudScore("Adversaires", opponentScore, "hud-opponent-score")
            }
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Objectif : $targetScore", modifier = Modifier.weight(1f).testTag("hud-target"),
                    style = MaterialTheme.typography.labelMedium)
                Text(
                    "Atout ${trumpSuit?.toSymbol() ?: "—"} ${trumpSuit?.toDisplayName() ?: ""}".trim(),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = trumpSuit?.toSuitColor() ?: MaterialTheme.colorScheme.onSurface,
                )
            }
            Text(
                "Donne $dealNumber · Donneur J${dealer.ordinal + 1} · " +
                    "Preneur ${taker?.let { "J${it.ordinal + 1}" } ?: "—"} · R$revision",
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }
}

@Composable
private fun HudScore(label: String, points: Int, tag: String, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().semantics(mergeDescendants = true) {},
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, modifier = Modifier.weight(1f).testTag("$tag-label"),
            style = MaterialTheme.typography.labelLarge, maxLines = 1, softWrap = false)
        Text(points.toString(), modifier = Modifier.testTag(tag),
            style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    }
}

private fun CardSuit.toSymbol():
    String =
    when (
        this
    ) {
        CardSuit.CLUBS ->
            "♣"

        CardSuit.DIAMONDS ->
            "♦"

        CardSuit.HEARTS ->
            "♥"

        CardSuit.SPADES ->
            "♠"
    }

private fun CardSuit.toDisplayName():
    String =
    when (
        this
    ) {
        CardSuit.CLUBS ->
            "trèfle"

        CardSuit.DIAMONDS ->
            "carreau"

        CardSuit.HEARTS ->
            "cœur"

        CardSuit.SPADES ->
            "pique"
    }

private fun CardSuit.toSuitColor():
    Color =
    when (
        this
    ) {
        CardSuit.HEARTS,
        CardSuit.DIAMONDS,
        ->
            Color(
                0xFFB3261E,
            )

        CardSuit.CLUBS,
        CardSuit.SPADES,
        ->
            MaterialThemeColorBlack
    }

private val MaterialThemeColorBlack =
    Color(
        0xFF1B1B1F,
    )
