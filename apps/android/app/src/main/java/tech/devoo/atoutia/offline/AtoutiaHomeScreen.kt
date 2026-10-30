package tech.devoo.atoutia.offline

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Presentation only. Entering the menu never creates a runtime or reads a saved match. */
@Composable
internal fun AtoutiaHomeScreen(modifier: Modifier = Modifier, onSelect: (String) -> Unit) {
    val colors = MaterialTheme.colorScheme
    Surface(modifier.fillMaxSize().testTag("game-mode-menu"), color = colors.background) {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val compact = maxHeight < 400.dp
            val columns = maxWidth >= 600.dp && LocalDensity.current.fontScale <= 1.5f
            val padding = if (compact) 12.dp else 28.dp
            val contentModifier = Modifier.fillMaxSize()
                .background(Brush.linearGradient(listOf(colors.background, colors.surfaceVariant)))
                .safeDrawingPadding().verticalScroll(rememberScrollState()).padding(padding)
            if (columns) {
                Row(contentModifier, horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.weight(0.36f)) { BrandPanel(compact) }
                    Box(Modifier.weight(0.64f)) { HomeChoices(compact, onSelect) }
                }
            } else {
                Column(contentModifier, verticalArrangement = Arrangement.spacedBy(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    BrandPanel(compact)
                    HomeChoices(compact, onSelect)
                }
            }
        }
    }
}

@Composable
private fun BrandPanel(compact: Boolean) {
    val colors = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.clearAndSetSemantics {}.size(if (compact) 48.dp else 80.dp)
            .background(colors.primaryContainer, RoundedCornerShape(18.dp))
            .border(1.dp, colors.primary, RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
            Text("♠\uFE0E", color = colors.onPrimaryContainer, fontSize = if (compact) 28.sp else 46.sp)
        }
        Text("ATOUTIA", color = colors.onBackground, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold,
            fontSize = if (compact) 28.sp else 40.sp, lineHeight = if (compact) 34.sp else 46.sp,
            modifier = Modifier.semantics { heading() })
        Text("La belote,\nà votre rythme.", color = colors.onBackground,
            fontSize = if (compact) 20.sp else 28.sp, lineHeight = if (compact) 26.sp else 34.sp,
            fontWeight = FontWeight.Medium)
        if (!compact) Text("Une table accueillante. Le plaisir de jouer ensemble.", color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun HomeChoices(compact: Boolean, onSelect: (String) -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Button(onClick = { onSelect("SOLO") }, modifier = Modifier.fillMaxWidth().heightIn(min = if (compact) 64.dp else 96.dp)
            .testTag("home-solo"), shape = RoundedCornerShape(20.dp), contentPadding = PaddingValues(16.dp, 12.dp)) {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Solo hors ligne", fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.Bold)
                if (!compact) Text("Vos PNJ, votre rythme. Reprenez votre partie.", style = MaterialTheme.typography.bodyMedium)
            }
        }
        OutlinedButton(onClick = { onSelect("ONLINE") }, modifier = Modifier.fillMaxWidth().heightIn(min = if (compact) 64.dp else 96.dp)
            .testTag("home-online"), shape = RoundedCornerShape(20.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
            contentPadding = PaddingValues(16.dp, 12.dp)) {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Jouer en ligne", fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.Bold)
                if (!compact) Text("Partagez une table avec vos amis.", style = MaterialTheme.typography.bodyMedium)
            }
        }
        val utility = listOf("Statistiques solo" to "STATS", "Paramètres" to "SETTINGS", "Tutoriel" to "LEARN")
        if (LocalDensity.current.fontScale > 1.5f) {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                utility.forEach { (label, mode) -> HomeUtilityChoice(label, mode, onSelect, Modifier.fillMaxWidth().heightIn(min = 64.dp)) }
            }
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                utility.forEach { (label, mode) -> HomeUtilityChoice(label, mode, onSelect, Modifier.weight(1f).heightIn(min = 80.dp)) }
            }
        }
    }
}

@Composable
private fun HomeUtilityChoice(label: String, mode: String, onSelect: (String) -> Unit, modifier: Modifier = Modifier) {
    OutlinedButton(onClick = { onSelect(mode) }, modifier = modifier.testTag("home-$mode"),
        shape = RoundedCornerShape(16.dp), contentPadding = PaddingValues(8.dp, 10.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)) {
        Text(label, textAlign = TextAlign.Center)
    }
}
