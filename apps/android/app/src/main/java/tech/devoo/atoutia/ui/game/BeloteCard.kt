package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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

    val containerColor =
        if (
            highlighted
        ) {
            MaterialTheme
                .colorScheme
                .primaryContainer
        } else {
            MaterialTheme
                .colorScheme
                .surface
        }

    val borderColor =
        if (
            highlighted
        ) {
            MaterialTheme
                .colorScheme
                .primary
        } else {
            MaterialTheme
                .colorScheme
                .outlineVariant
        }

    val cardModifier =
        modifier
            .size(
                width =
                    size.width,

                height =
                    size.height,
            )
            .alpha(
                if (
                    enabled
                ) {
                    1f
                } else {
                    0.45f
                },
            )

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
                    12.dp,
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
                            2.dp
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
            )
        }
    } else {
        Surface(
            modifier =
                cardModifier,

            shape =
                RoundedCornerShape(
                    12.dp,
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
                            2.dp
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
            )
        }
    }
}

@Composable
private fun BeloteCardFace(
    card:
        PlayerCard,

    foregroundColor:
        Color,
) {
    Box(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(
                    6.dp,
                ),
    ) {
        Column(
            modifier =
                Modifier.align(
                    Alignment.TopStart,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.spacedBy(
                    0.dp,
                ),
        ) {
            Text(
                text =
                    card.rank
                        .toCardRankLabel(),

                color =
                    foregroundColor,

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    card.suit
                        .toCardSuitSymbol(),

                color =
                    foregroundColor,

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )
        }

        Text(
            text =
                card.suit
                    .toCardSuitSymbol(),

            modifier =
                Modifier.align(
                    Alignment.Center,
                ),

            color =
                foregroundColor,

            style =
                MaterialTheme
                    .typography
                    .headlineLarge,

            fontWeight =
                FontWeight.Bold,

            textAlign =
                TextAlign.Center,
        )

        Column(
            modifier =
                Modifier.align(
                    Alignment.BottomEnd,
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.spacedBy(
                    0.dp,
                ),
        ) {
            Text(
                text =
                    card.suit
                        .toCardSuitSymbol(),

                color =
                    foregroundColor,

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            Text(
                text =
                    card.rank
                        .toCardRankLabel(),

                color =
                    foregroundColor,

                style =
                    MaterialTheme
                        .typography
                        .titleMedium,

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )
        }
    }
}

private fun CardSuit.toCardColor():
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
            Color(
                0xFF1B1B1F,
            )
    }

private fun CardSuit.toCardSuitSymbol():
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