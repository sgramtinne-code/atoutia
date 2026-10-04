package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
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

        val maximumStep =
            cardWidth *
                0.84f

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

                val zOrder =
                    if (
                        isLegal
                    ) {
                        100f +
                            index
                    } else {
                        index.toFloat()
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
                                onPlayCard
                                    ?.invoke(
                                        card,
                                    )
                            }
                        } else {
                            null
                        },

                    modifier =
                        Modifier
                            .offset(
                                x =
                                    startX +
                                        horizontalStep *
                                        index.toFloat(),

                                y =
                                    yOffset,
                            )
                            .zIndex(
                                zOrder,
                            )
                            .graphicsLayer {
                                rotationZ =
                                    rotation
                            },
                )
            }
        }
    }
}