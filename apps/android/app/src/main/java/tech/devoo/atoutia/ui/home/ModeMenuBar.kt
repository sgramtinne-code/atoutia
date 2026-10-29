package tech.devoo.atoutia.ui.home

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

/** Kept outside scrolling online content so a network failure cannot hide the exit. */
@Composable
internal fun ModeMenuBar(onOpenModes: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Box(modifier.fillMaxWidth()
        .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
        .padding(horizontal = 16.dp, vertical = 4.dp)) {
        OutlinedButton(onClick = onOpenModes, enabled = enabled, modifier = Modifier.testTag("online-mode-menu")) {
            Text("Retour au menu")
        }
    }
}
