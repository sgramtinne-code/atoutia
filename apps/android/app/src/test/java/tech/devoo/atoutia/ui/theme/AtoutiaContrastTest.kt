package tech.devoo.atoutia.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.max
import kotlin.math.min

class AtoutiaContrastTest {
    private fun checkText(foreground: Color, background: Color) {
        val a = foreground.luminance()
        val b = background.luminance()
        val ratio = (max(a, b) + 0.05) / (min(a, b) + 0.05)
        assertTrue("Text contrast must reach 7:1, found $ratio", ratio >= 7.0)
    }
    private fun checkScheme(colors: ColorScheme) {
        checkText(colors.onBackground, colors.background)
        checkText(colors.onSurface, colors.surface)
        checkText(colors.onSurfaceVariant, colors.surfaceVariant)
        checkText(colors.onPrimary, colors.primary)
        checkText(colors.onPrimaryContainer, colors.primaryContainer)
        checkText(colors.onSecondary, colors.secondary)
        checkText(colors.onSecondaryContainer, colors.secondaryContainer)
    }
    @Test fun lightAndDarkEssentialTextPairsReachEnhancedContrast() {
        checkScheme(AtoutiaLightColors)
        checkScheme(AtoutiaDarkColors)
    }
    @Test fun redAndBlackCardInkRemainReadableEvenWhenUnavailable() {
        for (paper in listOf(AtoutiaCardPalette.paper, AtoutiaCardPalette.unavailablePaper)) {
            checkText(AtoutiaCardPalette.ink, paper)
            checkText(AtoutiaCardPalette.red, paper)
        }
    }
}
