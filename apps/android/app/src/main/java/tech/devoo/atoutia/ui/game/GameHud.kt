package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tech.devoo.atoutia.network.game.CardSuit
import tech.devoo.atoutia.network.room.PlayerPosition

@Composable
fun GameHud(
    dealNumber:
        Int,

    dealer:
        PlayerPosition,

    taker:
        PlayerPosition?,

    trumpSuit:
        CardSuit?,

    scoreTeam0:
        Int,

    scoreTeam1:
        Int,

    targetScore:
        Int,

    revision:
        Int,

    modifier:
        Modifier =
        Modifier,
) {
    Surface(
        modifier =
            modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(
                20.dp,
            ),

        color =
            MaterialTheme
                .colorScheme
                .surfaceVariant
                .copy(
                    alpha =
                        0.42f,
                ),

        border =
            BorderStroke(
                width =
                    1.dp,

                color =
                    MaterialTheme
                        .colorScheme
                        .outlineVariant,
            ),
    ) {
        BoxWithConstraints(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(
                        horizontal =
                            14.dp,

                        vertical =
                            10.dp,
                    ),
        ) {
            val landscapeLayout =
                maxWidth >=
                    520.dp

            Column(
                modifier =
                    Modifier.fillMaxWidth(),

                verticalArrangement =
                    Arrangement.spacedBy(
                        8.dp,
                    ),
            ) {
                Row(
                    modifier =
                        Modifier.fillMaxWidth(),

                    horizontalArrangement =
                        Arrangement.SpaceBetween,

                    verticalAlignment =
                        Alignment.CenterVertically,
                ) {
                    Column(
                        verticalArrangement =
                            Arrangement.spacedBy(
                                0.dp,
                            ),
                    ) {
                        Text(
                            text =
                                "Score",

                            style =
                                MaterialTheme
                                    .typography
                                    .labelMedium,
                        )

                        Text(
                            text =
                                "$scoreTeam0 - $scoreTeam1 / $targetScore",

                            style =
                                MaterialTheme
                                    .typography
                                    .titleLarge,

                            fontWeight =
                                FontWeight.Bold,
                        )
                    }

                    Text(
                        text =
                            "R$revision",

                        style =
                            MaterialTheme
                                .typography
                                .labelMedium,

                        fontWeight =
                            FontWeight.SemiBold,
                    )
                }

                if (
                    landscapeLayout
                ) {
                    Row(
                        modifier =
                            Modifier.fillMaxWidth(),

                        horizontalArrangement =
                            Arrangement.SpaceEvenly,

                        verticalAlignment =
                            Alignment.CenterVertically,
                    ) {
                        HudMetric(
                            label =
                                "Donne",

                            value =
                                dealNumber.toString(),
                        )

                        HudMetric(
                            label =
                                "Donneur",

                            value =
                                dealer.toDisplayName(),
                        )

                        HudMetric(
                            label =
                                "Preneur",

                            value =
                                taker
                                    ?.toDisplayName()
                                    ?: "—",
                        )

                        HudTrumpMetric(
                            trumpSuit =
                                trumpSuit,
                        )
                    }
                } else {
                    Row(
                        modifier =
                            Modifier.fillMaxWidth(),

                        horizontalArrangement =
                            Arrangement.SpaceEvenly,

                        verticalAlignment =
                            Alignment.CenterVertically,
                    ) {
                        HudMetric(
                            label =
                                "Donne",

                            value =
                                dealNumber.toString(),
                        )

                        HudMetric(
                            label =
                                "Donneur",

                            value =
                                dealer.toDisplayName(),
                        )
                    }

                    Row(
                        modifier =
                            Modifier.fillMaxWidth(),

                        horizontalArrangement =
                            Arrangement.SpaceEvenly,

                        verticalAlignment =
                            Alignment.CenterVertically,
                    ) {
                        HudMetric(
                            label =
                                "Preneur",

                            value =
                                taker
                                    ?.toDisplayName()
                                    ?: "—",
                        )

                        HudTrumpMetric(
                            trumpSuit =
                                trumpSuit,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HudMetric(
    label:
        String,

    value:
        String,
) {
    Column(
        horizontalAlignment =
            Alignment.CenterHorizontally,

        verticalArrangement =
            Arrangement.spacedBy(
                1.dp,
            ),
    ) {
        Text(
            text =
                label,

            style =
                MaterialTheme
                    .typography
                    .labelSmall,

            textAlign =
                TextAlign.Center,
        )

        Text(
            text =
                value,

            style =
                MaterialTheme
                    .typography
                    .bodyMedium,

            fontWeight =
                FontWeight.SemiBold,

            textAlign =
                TextAlign.Center,
        )
    }
}

@Composable
private fun HudTrumpMetric(
    trumpSuit:
        CardSuit?,
) {
    Column(
        horizontalAlignment =
            Alignment.CenterHorizontally,

        verticalArrangement =
            Arrangement.spacedBy(
                1.dp,
            ),
    ) {
        Text(
            text =
                "Atout",

            style =
                MaterialTheme
                    .typography
                    .labelSmall,

            textAlign =
                TextAlign.Center,
        )

        if (
            trumpSuit ==
                null
        ) {
            Text(
                text =
                    "—",

                style =
                    MaterialTheme
                        .typography
                        .bodyMedium,

                fontWeight =
                    FontWeight.SemiBold,
            )
        } else {
            Row(
                horizontalArrangement =
                    Arrangement.spacedBy(
                        4.dp,
                    ),

                verticalAlignment =
                    Alignment.CenterVertically,
            ) {
                Text(
                    text =
                        trumpSuit.toSymbol(),

                    color =
                        trumpSuit.toSuitColor(),

                    style =
                        MaterialTheme
                            .typography
                            .titleMedium,

                    fontWeight =
                        FontWeight.Bold,
                )

                Text(
                    text =
                        trumpSuit.toDisplayName(),

                    style =
                        MaterialTheme
                            .typography
                            .bodyMedium,

                    fontWeight =
                        FontWeight.SemiBold,
                )
            }
        }
    }
}

private fun PlayerPosition.toDisplayName():
    String =
    when (
        this
    ) {
        PlayerPosition.PLAYER_0 ->
            "Joueur 1"

        PlayerPosition.PLAYER_1 ->
            "Joueur 2"

        PlayerPosition.PLAYER_2 ->
            "Joueur 3"

        PlayerPosition.PLAYER_3 ->
            "Joueur 4"
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