package tech.devoo.atoutia.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

internal val AtoutiaLightColors = lightColorScheme(
    primary = Color(0xFF0C624D), onPrimary = Color.White,
    primaryContainer = Color(0xFFD9E9DD), onPrimaryContainer = Color(0xFF183B2D),
    secondary = Color(0xFF725112), onSecondary = Color.White,
    secondaryContainer = Color(0xFFF1E3BB), onSecondaryContainer = Color(0xFF3B2A0A),
    tertiary = Color(0xFF244A5A), onTertiary = Color.White,
    background = Color(0xFFF6F3EA), onBackground = Color(0xFF142C34),
    surface = Color(0xFFFFFCF4), onSurface = Color(0xFF142C34),
    surfaceVariant = Color(0xFFE5EBE7), onSurfaceVariant = Color(0xFF34484E),
    outline = Color(0xFF647A77), outlineVariant = Color(0xFFABBDB4),
    surfaceTint = Color(0xFF0C624D),
    surfaceDim = Color(0xFFE1E8E0), surfaceBright = Color(0xFFFFFCF4),
    surfaceContainerLowest = Color.White, surfaceContainerLow = Color(0xFFF4F5EE),
    surfaceContainer = Color(0xFFEEF1E9), surfaceContainerHigh = Color(0xFFE8EDE5),
    surfaceContainerHighest = Color(0xFFE1E8E0),
    inverseSurface = Color(0xFF16313B), inverseOnSurface = Color(0xFFF3F2E9),
    inversePrimary = Color(0xFF97D8BD),
    error = Color(0xFF8F181F), onError = Color.White,
)

internal val AtoutiaDarkColors = darkColorScheme(
    primary = Color(0xFFE5C27A), onPrimary = Color(0xFF211A0C),
    primaryContainer = Color(0xFF304632), onPrimaryContainer = Color(0xFFF3F2E9),
    secondary = Color(0xFF97D8BD), onSecondary = Color(0xFF092D24),
    secondaryContainer = Color(0xFF193D32), onSecondaryContainer = Color(0xFFCFEDDB),
    tertiary = Color(0xFF9DCDE0), onTertiary = Color(0xFF092B37),
    background = Color(0xFF0A1821), onBackground = Color(0xFFF3F2E9),
    surface = Color(0xFF0F2630), onSurface = Color(0xFFF3F2E9),
    surfaceVariant = Color(0xFF19333B), onSurfaceVariant = Color(0xFFB5C8CC),
    outline = Color(0xFF82999A), outlineVariant = Color(0xFF466069),
    surfaceTint = Color(0xFFE5C27A),
    surfaceDim = Color(0xFF0A1821), surfaceBright = Color(0xFF29414A),
    surfaceContainerLowest = Color(0xFF07141B), surfaceContainerLow = Color(0xFF10232C),
    surfaceContainer = Color(0xFF142B34), surfaceContainerHigh = Color(0xFF1B333D),
    surfaceContainerHighest = Color(0xFF263F48),
    inverseSurface = Color(0xFFE5EBE7), inverseOnSurface = Color(0xFF142C34),
    inversePrimary = Color(0xFF0C624D),
    error = Color(0xFFFFBFC3), onError = Color(0xFF4F1118),
)

/** Cards retain dark ink on paper in both themes, including unavailable cards. */
internal object AtoutiaCardPalette {
    val paper = Color(0xFFFFFBF2)
    val unavailablePaper = Color(0xFFE4E7E5)
    val ink = Color(0xFF12202A)
    val red = Color(0xFF8F181F)
    val outline = Color(0xFF647571)
    val selected = Color(0xFF916113)
}

private val AtoutiaTypography = Typography(
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 18.sp, lineHeight = 26.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 16.sp, lineHeight = 24.sp),
    bodySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 14.sp, lineHeight = 20.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, lineHeight = 24.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
    labelMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp),
    labelSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp),
)

@Composable
fun AtoutiaTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) AtoutiaDarkColors else AtoutiaLightColors,
        typography = AtoutiaTypography,
        content = content,
    )
}
