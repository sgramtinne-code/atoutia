package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.unit.sp
import tech.devoo.atoutia.ui.theme.AtoutiaCardPalette
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.game.CardRank
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.game.PlayerCard

enum class BeloteCardSize(
    val width:
        Dp,

    val height:
        Dp,
) {
    SMALL(
        width =
            54.dp,

        height =
            76.dp,
    ),

    MEDIUM(
        width =
            68.dp,

        height =
            96.dp,
    ),

    LARGE(
        width =
            82.dp,

        height =
            116.dp,
    ),
}

@Composable
fun BeloteCard(
    card:
        PlayerCard,

    modifier:
        Modifier =
        Modifier,

    size:
        BeloteCardSize =
        BeloteCardSize.MEDIUM,

    enabled:
        Boolean =
        true,

    highlighted:
        Boolean =
        false,

    onClick:
        (() -> Unit)? =
        null,
) {
    val foregroundColor =
        card.suit
            .toCardColor()

    val containerColor = if (enabled) AtoutiaCardPalette.paper else AtoutiaCardPalette.unavailablePaper
    val borderColor = if (highlighted) AtoutiaCardPalette.selected else AtoutiaCardPalette.outline
    val cardModifier = modifier.size(size.width, size.height).semantics(mergeDescendants = true) {
        contentDescription = "${card.rank.toSpokenRank()} de ${card.suit.toSpokenSuit()}"
        if (!enabled) { disabled(); stateDescription = "Carte non disponible" }
        else if (highlighted) stateDescription = "Carte autorisée"
    }

    if (
        onClick !=
            null
    ) {
        Surface(
            onClick =
                onClick,

            enabled =
                enabled,

            modifier =
                cardModifier,

            shape =
                RoundedCornerShape(
                    8.dp,
                ),

            color =
                containerColor,

            contentColor =
                foregroundColor,

            border =
                BorderStroke(
                    width =
                        if (
                            highlighted
                        ) {
                            3.dp
                        } else {
                            1.dp
                        },

                    color =
                        borderColor,
                ),

            shadowElevation =
                if (
                    highlighted
                ) {
                    5.dp
                } else {
                    2.dp
                },
        ) {
            BeloteCardFace(
                card =
                    card,

                foregroundColor =
                    foregroundColor,
                size = size,
            )
        }
    } else {
        Surface(
            modifier =
                cardModifier,

            shape =
                RoundedCornerShape(
                    8.dp,
                ),

            color =
                containerColor,

            contentColor =
                foregroundColor,

            border =
                BorderStroke(
                    width =
                        if (
                            highlighted
                        ) {
                            3.dp
                        } else {
                            1.dp
                        },

                    color =
                        borderColor,
                ),

            shadowElevation =
                if (
                    highlighted
                ) {
                    5.dp
                } else {
                    2.dp
                },
        ) {
            BeloteCardFace(
                card =
                    card,

                foregroundColor =
                    foregroundColor,
                size = size,
            )
        }
    }
}

@Composable
private fun BeloteCardFace(card: PlayerCard, foregroundColor: Color, size: BeloteCardSize) {
    val compact = size == BeloteCardSize.SMALL
    val indexSize = if (compact) 14.sp else 18.sp
    val symbolSize = if (compact) 20.sp else 30.sp
    val index = "${card.rank.toCardRankLabel()}${card.suit.toCardSuitSymbol()}"
    Box(Modifier.fillMaxSize().padding(6.dp).clearAndSetSemantics {}) {
        Text(index, modifier = Modifier.align(Alignment.TopStart), color = foregroundColor,
            fontSize = indexSize, lineHeight = indexSize, fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelLarge.copy(platformStyle = PlatformTextStyle(includeFontPadding = false)))
        Text(card.suit.toCardSuitSymbol(), modifier = Modifier.align(Alignment.Center), color = foregroundColor,
            fontSize = symbolSize, lineHeight = symbolSize, fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.headlineLarge.copy(platformStyle = PlatformTextStyle(includeFontPadding = false)))
        Text(index, modifier = Modifier.align(Alignment.BottomEnd).rotate(180f), color = foregroundColor,
            fontSize = indexSize, lineHeight = indexSize, fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelLarge.copy(platformStyle = PlatformTextStyle(includeFontPadding = false)))
    }
}

private fun CardRank.toSpokenRank(): String = when (this) {
    CardRank.JACK -> "Valet"
    CardRank.QUEEN -> "Dame"
    CardRank.KING -> "Roi"
    CardRank.ACE -> "As"
    else -> toCardRankLabel()
}

private fun CardSuit.toSpokenSuit(): String = when (this) {
    CardSuit.CLUBS -> "trèfle"
    CardSuit.DIAMONDS -> "carreau"
    CardSuit.HEARTS -> "cœur"
    CardSuit.SPADES -> "pique"
}

private fun CardSuit.toCardColor():
    Color =
    when (
        this
    ) {
        CardSuit.HEARTS,
        CardSuit.DIAMONDS,
        ->
            AtoutiaCardPalette.red

        CardSuit.CLUBS,
        CardSuit.SPADES,
        ->
            AtoutiaCardPalette.ink
    }

private fun CardSuit.toCardSuitSymbol():
    String =
    when (
        this
    ) {
        CardSuit.CLUBS ->
            "♣\uFE0E"

        CardSuit.DIAMONDS ->
            "♦\uFE0E"

        CardSuit.HEARTS ->
            "♥\uFE0E"

        CardSuit.SPADES ->
            "♠\uFE0E"
    }

private fun CardRank.toCardRankLabel():
    String =
    when (
        this
    ) {
        CardRank.SEVEN ->
            "7"

        CardRank.EIGHT ->
            "8"

        CardRank.NINE ->
            "9"

        CardRank.TEN ->
            "10"

        CardRank.JACK ->
            "V"

        CardRank.QUEEN ->
            "D"

        CardRank.KING ->
            "R"

        CardRank.ACE ->
            "A"
    }