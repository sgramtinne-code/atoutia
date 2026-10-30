package tech.devoo.atoutia.ui.theme

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tech.devoo.atoutia.network.game.CardRank
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.offline.AtoutiaHomeScreen
import tech.devoo.atoutia.ui.game.BeloteCard
import tech.devoo.atoutia.ui.game.BeloteCardSize
import java.io.File

/** Menu and card fixtures only. No account, saved game, GPU, backend or real invitation. */
@RunWith(AndroidJUnit4::class)
class AtoutiaVisualIdentityInstrumentedTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Before fun landscape() {
        compose.runOnUiThread { compose.activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE }
        compose.waitUntil(5_000) { compose.activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
    }
    @Composable private fun Viewport(dark: Boolean, scale: Float, content: @Composable () -> Unit) {
        val density = LocalDensity.current
        CompositionLocalProvider(LocalDensity provides Density(density.density, scale)) {
            AtoutiaTheme(darkTheme = dark) {
                Box(Modifier.requiredSize(640.dp, 320.dp).testTag("visual-viewport")) { content() }
            }
        }
    }
    private fun capture(name: String) {
        compose.waitForIdle()
        val directory = File(compose.activity.cacheDir, "visual-qa").also { check(it.exists() || it.mkdirs()) }
        val bitmap = compose.onNodeWithTag("visual-viewport").captureToImage().asAndroidBitmap()
        File(directory, name).outputStream().use { check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) }
    }
    @Test fun darkMenuKeepsEveryChoiceVisibleAndLargeAtIncreasedFontSize() {
        val selected = mutableListOf<String>()
        compose.setContent { Viewport(true, 1.3f) { AtoutiaHomeScreen { selected.add(it) } } }
        val viewport = compose.onNodeWithTag("visual-viewport").getUnclippedBoundsInRoot()
        val modes = listOf("SOLO", "ONLINE", "STATS", "SETTINGS", "LEARN")
        val tags = listOf("home-solo", "home-online", "home-STATS", "home-SETTINGS", "home-LEARN")
        capture("home-dark.png")
        for (tag in tags) {
            val node = compose.onNodeWithTag(tag).assertIsDisplayed().assertHasClickAction()
            val bounds = node.getUnclippedBoundsInRoot()
            assertTrue("Choice outside viewport: $tag, $bounds", bounds.left >= viewport.left && bounds.right <= viewport.right && bounds.top >= viewport.top && bounds.bottom <= viewport.bottom)
            assertTrue("Touch target below 48 dp: $tag", bounds.right - bounds.left >= 48.dp && bounds.bottom - bounds.top >= 48.dp)
            node.performClick()
        }
        compose.runOnIdle { assertEquals(modes, selected) }
    }
    @Test fun lightMenuPreservesTwoTimesSystemTextAndEveryChoiceRemainsReachable() {
        val selected = mutableListOf<String>()
        compose.setContent { Viewport(false, 2f) { AtoutiaHomeScreen { selected.add(it) } } }
        capture("home-large-text.png")
        val tags = listOf("home-solo", "home-online", "home-STATS", "home-SETTINGS", "home-LEARN")
        for (tag in tags) compose.onNodeWithTag(tag).performScrollTo().assertIsDisplayed().performClick()
        compose.runOnIdle { assertEquals(listOf("SOLO", "ONLINE", "STATS", "SETTINGS", "LEARN"), selected) }
    }
    @Test fun paperCardsKeepSpokenRanksAndUnavailableCardsCannotSubmit() {
        var plays = 0
        compose.setContent { Viewport(true, 1.3f) {
            Surface(Modifier.fillMaxSize()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Cartes lisibles · jeu classique")
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        for (suit in CardSuit.entries) BeloteCard(PlayerCard(suit = suit, rank = CardRank.ACE), size = BeloteCardSize.LARGE)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        BeloteCard(PlayerCard(suit = CardSuit.HEARTS, rank = CardRank.KING), modifier = Modifier.testTag("selected-card"),
                            highlighted = true, onClick = { plays++ })
                        BeloteCard(PlayerCard(suit = CardSuit.SPADES, rank = CardRank.QUEEN), modifier = Modifier.testTag("unavailable-card"),
                            enabled = false, onClick = { plays++ })
                    }
                }
            }
        } }
        capture("cards-dark.png")
        compose.onNodeWithTag("selected-card").assertContentDescriptionEquals("Roi de cœur").assertHasClickAction().performClick()
        compose.onNodeWithTag("unavailable-card").assertContentDescriptionEquals("Dame de pique").assertIsNotEnabled().performTouchInput { click() }
        compose.runOnIdle { assertEquals(1, plays) }
    }
}
