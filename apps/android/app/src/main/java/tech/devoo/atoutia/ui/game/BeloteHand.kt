package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlin.math.abs
import tech.devoo.atoutia.network.game.PlayerCard

@Composable
fun BeloteHand(
    hand:
        List<PlayerCard>,

    legalCards:
        List<PlayerCard>,

    canPlay:
        Boolean,

    submitting:
        Boolean,

    onPlayCard:
        ((PlayerCard) -> Unit)?,

    modifier:
        Modifier =
        Modifier,
) {
    BoxWithConstraints(
        modifier =
            modifier
                .fillMaxWidth()
                .height(
                    112.dp,
                ),

        contentAlignment =
            Alignment.TopStart,
    ) {
        if (
            hand.isEmpty()
        ) {
            return@BoxWithConstraints
        }

        val cardSize =
            BeloteCardSize.SMALL

        val cardWidth =
            cardSize.width

        val cardHeight =
            cardSize.height

        val cardCount =
            hand.size

        val naturalStep =
            if (
                cardCount <=
                    1
            ) {
                0.dp
            } else {
                (
                    maxWidth -
                        cardWidth
                    ) /
                    (
                        cardCount -
                            1
                        ).toFloat()
            }

        val maximumStep = cardWidth + 8.dp

        val horizontalStep =
            when {
                cardCount <=
                    1 ->
                    0.dp

                naturalStep.value <
                    0f ->
                    0.dp

                naturalStep >
                    maximumStep ->
                    maximumStep

                else ->
                    naturalStep
            }

        val occupiedWidth =
            if (
                cardCount <=
                    1
            ) {
                cardWidth
            } else {
                cardWidth +
                    horizontalStep *
                    (
                        cardCount -
                            1
                        ).toFloat()
            }

        val startX =
            (
                maxWidth -
                    occupiedWidth
                ) /
                2f

        val centerIndex =
            (
                cardCount -
                    1
                ) /
                2f

        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(
                        cardHeight +
                            36.dp,
                    ),
        ) {
            hand.forEachIndexed {
                index,
                card,
                ->
                val isLegal =
                    canPlay &&
                        card in
                        legalCards

                val canSelect =
                    isLegal &&
                        !submitting &&
                        onPlayCard !=
                        null

                val distanceFromCenter =
                    index -
                        centerIndex

                val rotation =
                    distanceFromCenter *
                        1.35f

                val fanDrop =
                    (
                        abs(
                            distanceFromCenter,
                        ) *
                            1.2f
                        ).dp

                val legalRaise =
                    if (
                        isLegal
                    ) {
                        8.dp
                    } else {
                        0.dp
                    }

                val yOffset =
                    10.dp +
                        fanDrop -
                        legalRaise

                val visuallyEnabled =
                    when {
                        !canPlay ->
                            true

                        isLegal ->
                            canSelect

                        else ->
                            false
                    }

                BeloteCard(
                    card =
                        card,

                    size =
                        cardSize,

                    enabled =
                        visuallyEnabled,

                    highlighted =
                        isLegal,

                    onClick =
                        if (
                            canSelect
                        ) {
                            {
                                onPlayCard(
                                    card,
                                )
                            }
                        } else {
                            null
                        },

                    modifier =
                        Modifier
                            .testTag("hand-${card.rank.name}-${card.suit.name}")
                            .offset(
                                x =
                                    startX +
                                        horizontalStep *
                                        index.toFloat(),

                                y =
                                    yOffset,
                            )
                            .pointerInput(Unit) {
                                // Keep taps inside this card from reaching an overlapping card.
                                // Leave gestures unconsumed so the surrounding screen can still scroll.
                                awaitEachGesture {
                                    awaitFirstDown(requireUnconsumed = false)
                                    waitForUpOrCancellation()
                                }
                            }
                            .graphicsLayer {
                                rotationZ =
                                    rotation
                            },
                )
            }
        }
    }
}

@Composable
internal fun ExpandedBeloteHand(
    hand: List<PlayerCard>,
    legalCards: List<PlayerCard>,
    canPlay: Boolean,
    submitting: Boolean,
    onPlayCard: ((PlayerCard) -> Unit)?,
    onClose: () -> Unit,
) {
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier.fillMaxWidth(0.94f).fillMaxHeight(0.94f).testTag("expanded-hand"),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("Votre main", modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                    OutlinedButton(onClick = onClose, modifier = Modifier.testTag("expanded-hand-close")) {
                        Text("Fermer")
                    }
                }
                Text(
                    if (canPlay) "Choisissez une carte autorisée." else "En attente de votre prochain tour.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(BeloteCardSize.LARGE.width),
                    modifier = Modifier.weight(1f).fillMaxWidth().testTag("expanded-hand-grid"),
                    contentPadding = PaddingValues(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(hand, key = { "${it.rank.name}-${it.suit.name}" }) { card ->
                        val legal = canPlay && card in legalCards
                        val selectable = legal && !submitting && onPlayCard != null
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            BeloteCard(
                                card = card,
                                size = BeloteCardSize.LARGE,
                                modifier = Modifier.testTag("expanded-${card.rank.name}-${card.suit.name}"),
                                enabled = !canPlay || selectable,
                                highlighted = legal,
                                onClick = if (selectable) {
                                    {
                                        onClose()
                                        onPlayCard?.invoke(card)
                                    }
                                } else null,
                            )
                        }
                    }
                }
            }
        }
    }
}
