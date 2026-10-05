package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
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
import tech.devoo.atoutia.network.game.DealPhase
import tech.devoo.atoutia.network.game.GameRealtimeConnectionStateName
import tech.devoo.atoutia.network.game.GameRealtimePresence
import tech.devoo.atoutia.network.game.PlayerCard
import tech.devoo.atoutia.network.game.PublicCurrentTrickSnapshot
import tech.devoo.atoutia.network.room.PlayerPosition

private val TableGreen =
    Color(
        0xFF0E5C3B,
    )

private val TableGreenDark =
    Color(
        0xFF083E29,
    )

private val TableCream =
    Color(
        0xFFF7F1E3,
    )

private val TableRed =
    Color(
        0xFFD32F2F,
    )

@Composable
fun BeloteTable(
    localPlayer:
        PlayerPosition,

    dealer:
        PlayerPosition,

    taker:
        PlayerPosition?,

    currentPlayer:
        PlayerPosition?,

    trick:
        PublicCurrentTrickSnapshot?,

    phase:
        DealPhase,

    trumpSuit:
        CardSuit?,

    turnUpCard:
        PlayerCard,

    presence:
        GameRealtimePresence? =
        null,

    modifier:
        Modifier =
        Modifier,
) {
    val leftPlayer =
        localPlayer.offsetBy(
            1,
        )

    val topPlayer =
        localPlayer.offsetBy(
            2,
        )

    val rightPlayer =
        localPlayer.offsetBy(
            3,
        )

    BoxWithConstraints(
        modifier =
            modifier.fillMaxWidth(),
    ) {
        val compactLandscape =
            maxWidth >=
                520.dp

        val tableHeight =
            if (
                compactLandscape
            ) {
                300.dp
            } else {
                410.dp
            }

        Surface(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(
                        tableHeight,
                    ),

            shape =
                RoundedCornerShape(
                    if (
                        compactLandscape
                    ) {
                        24.dp
                    } else {
                        30.dp
                    },
                ),

            color =
                TableGreen,

            border =
                BorderStroke(
                    width =
                        2.dp,

                    color =
                        TableGreenDark,
                ),

            shadowElevation =
                6.dp,
        ) {
            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(
                            if (
                                compactLandscape
                            ) {
                                10.dp
                            } else {
                                14.dp
                            },
                        ),
            ) {
                PlayerSeatBadge(
                    player =
                        topPlayer,

                    localPlayer =
                        localPlayer,

                    dealer =
                        dealer,

                    taker =
                        taker,

                    currentPlayer =
                        currentPlayer,

                    presence =
                        presence,

                    compact =
                        compactLandscape,

                    modifier =
                        Modifier.align(
                            Alignment.TopCenter,
                        ),
                )

                PlayerSeatBadge(
                    player =
                        leftPlayer,

                    localPlayer =
                        localPlayer,

                    dealer =
                        dealer,

                    taker =
                        taker,

                    currentPlayer =
                        currentPlayer,

                    presence =
                        presence,

                    compact =
                        compactLandscape,

                    modifier =
                        Modifier.align(
                            Alignment.CenterStart,
                        ),
                )

                PlayerSeatBadge(
                    player =
                        rightPlayer,

                    localPlayer =
                        localPlayer,

                    dealer =
                        dealer,

                    taker =
                        taker,

                    currentPlayer =
                        currentPlayer,

                    presence =
                        presence,

                    compact =
                        compactLandscape,

                    modifier =
                        Modifier.align(
                            Alignment.CenterEnd,
                        ),
                )

                PlayerSeatBadge(
                    player =
                        localPlayer,

                    localPlayer =
                        localPlayer,

                    dealer =
                        dealer,

                    taker =
                        taker,

                    currentPlayer =
                        currentPlayer,

                    presence =
                        presence,

                    compact =
                        compactLandscape,

                    modifier =
                        Modifier.align(
                            Alignment.BottomCenter,
                        ),
                )

                if (
                    compactLandscape
                ) {
                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                topPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.Center,
                                )
                                .offset(
                                    y =
                                        (-108).dp,
                                ),
                    )

                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                leftPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.Center,
                                )
                                .offset(
                                    x =
                                        (-118).dp,
                                ),
                    )

                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                rightPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.Center,
                                )
                                .offset(
                                    x =
                                        118.dp,
                                ),
                    )

                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                localPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.Center,
                                )
                                .offset(
                                    y =
                                        108.dp,
                                ),
                    )
                } else {
                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                topPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.TopCenter,
                                )
                                .offset(
                                    y =
                                        78.dp,
                                ),
                    )

                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                leftPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.CenterStart,
                                )
                                .offset(
                                    x =
                                        92.dp,
                                ),
                    )

                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                rightPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.CenterEnd,
                                )
                                .offset(
                                    x =
                                        (-92).dp,
                                ),
                    )

                    PlayedCardSlot(
                        card =
                            trick.cardPlayedBy(
                                localPlayer,
                            ),

                        modifier =
                            Modifier
                                .align(
                                    Alignment.BottomCenter,
                                )
                                .offset(
                                    y =
                                        (-78).dp,
                                ),
                    )
                }

                TableCenterStatus(
                    phase =
                        phase,

                    trumpSuit =
                        trumpSuit,

                    turnUpCard =
                        turnUpCard,

                    trick =
                        trick,

                    compact =
                        compactLandscape,

                    modifier =
                        Modifier.align(
                            Alignment.Center,
                        ),
                )
            }
        }
    }
}

@Composable
private fun PlayerSeatBadge(
    player:
        PlayerPosition,

    localPlayer:
        PlayerPosition,

    dealer:
        PlayerPosition,

    taker:
        PlayerPosition?,

    currentPlayer:
        PlayerPosition?,

    presence:
        GameRealtimePresence?,

    compact:
        Boolean,

    modifier:
        Modifier =
        Modifier,
) {
    val isLocalPlayer =
        player ==
            localPlayer

    val isCurrentPlayer =
        player ==
            currentPlayer

    val connectionState =
        presence
            ?.connectionStates
            ?.firstOrNull {
                state ->
                state.player ==
                    player
            }
            ?.state

    val connectionLabel =
        when (
            connectionState
        ) {
            GameRealtimeConnectionStateName.CONNECTED ->
                "En ligne"

            GameRealtimeConnectionStateName.RECONNECTING ->
                "Reconnexion"

            GameRealtimeConnectionStateName.ABSENT ->
                "Absent"

            null ->
                null
        }

    val markers =
        buildList {
            if (
                player ==
                    dealer
            ) {
                add(
                    "D",
                )
            }

            if (
                player ==
                    taker
            ) {
                add(
                    "P",
                )
            }

            if (
                isCurrentPlayer
            ) {
                add(
                    "À jouer",
                )
            }
        }

    Surface(
        modifier =
            modifier,

        shape =
            RoundedCornerShape(
                if (
                    compact
                ) {
                    15.dp
                } else {
                    18.dp
                },
            ),

        color =
            if (
                isCurrentPlayer
            ) {
                TableCream
            } else {
                TableGreenDark.copy(
                    alpha =
                        0.88f,
                )
            },

        contentColor =
            if (
                isCurrentPlayer
            ) {
                Color(
                    0xFF1B1B1F,
                )
            } else {
                Color.White
            },

        border =
            if (
                isCurrentPlayer
            ) {
                BorderStroke(
                    width =
                        2.dp,

                    color =
                        MaterialTheme
                            .colorScheme
                            .primary,
                )
            } else {
                BorderStroke(
                    width =
                        1.dp,

                    color =
                        Color.White.copy(
                            alpha =
                                0.22f,
                        ),
                )
            },
    ) {
        Column(
            modifier =
                Modifier.padding(
                    horizontal =
                        if (
                            compact
                        ) {
                            10.dp
                        } else {
                            12.dp
                        },

                    vertical =
                        if (
                            compact
                        ) {
                            5.dp
                        } else {
                            8.dp
                        },
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.spacedBy(
                    if (
                        compact
                    ) {
                        0.dp
                    } else {
                        2.dp
                    },
                ),
        ) {
            Text(
                text =
                    if (
                        isLocalPlayer
                    ) {
                        "Vous"
                    } else {
                        player.toDisplayName()
                    },

                style =
                    if (
                        compact
                    ) {
                        MaterialTheme
                            .typography
                            .bodySmall
                    } else {
                        MaterialTheme
                            .typography
                            .bodyMedium
                    },

                fontWeight =
                    FontWeight.Bold,

                textAlign =
                    TextAlign.Center,
            )

            if (
                markers.isNotEmpty()
            ) {
                Text(
                    text =
                        markers.joinToString(
                            separator =
                                " • ",
                        ),

                    style =
                        MaterialTheme
                            .typography
                            .labelSmall,

                    fontWeight =
                        if (
                            isCurrentPlayer
                        ) {
                            FontWeight.SemiBold
                        } else {
                            FontWeight.Normal
                        },

                    textAlign =
                        TextAlign.Center,
                )
            }

            if (
                connectionLabel !=
                    null
            ) {
                Text(
                    text =
                        connectionLabel,

                    style =
                        MaterialTheme
                            .typography
                            .labelSmall,

                    fontWeight =
                        if (
                            connectionState ==
                                GameRealtimeConnectionStateName.CONNECTED
                        ) {
                            FontWeight.Normal
                        } else {
                            FontWeight.SemiBold
                        },

                    textAlign =
                        TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun PlayedCardSlot(
    card:
        PlayerCard?,

    modifier:
        Modifier =
        Modifier,
) {
    Box(
        modifier =
            modifier,

        contentAlignment =
            Alignment.Center,
    ) {
        if (
            card !=
                null
        ) {
            BeloteCard(
                card =
                    card,

                size =
                    BeloteCardSize.SMALL,
            )
        }
    }
}

@Composable
private fun TableCenterStatus(
    phase:
        DealPhase,

    trumpSuit:
        CardSuit?,

    turnUpCard:
        PlayerCard,

    trick:
        PublicCurrentTrickSnapshot?,

    compact:
        Boolean,

    modifier:
        Modifier =
        Modifier,
) {
    Surface(
        modifier =
            modifier,

        shape =
            RoundedCornerShape(
                if (
                    compact
                ) {
                    16.dp
                } else {
                    20.dp
                },
            ),

        color =
            TableCream.copy(
                alpha =
                    0.96f,
            ),

        contentColor =
            Color(
                0xFF1B1B1F,
            ),

        shadowElevation =
            3.dp,
    ) {
        Column(
            modifier =
                Modifier.padding(
                    horizontal =
                        if (
                            compact
                        ) {
                            10.dp
                        } else {
                            14.dp
                        },

                    vertical =
                        if (
                            compact
                        ) {
                            6.dp
                        } else {
                            10.dp
                        },
                ),

            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.spacedBy(
                    if (
                        compact
                    ) {
                        2.dp
                    } else {
                        4.dp
                    },
                ),
        ) {
            when (
                phase
            ) {
                DealPhase.BIDDING -> {
                    Text(
                        text =
                            "Enchères",

                        style =
                            if (
                                compact
                            ) {
                                MaterialTheme
                                    .typography
                                    .bodyMedium
                            } else {
                                MaterialTheme
                                    .typography
                                    .titleSmall
                            },

                        fontWeight =
                            FontWeight.Bold,
                    )

                    Text(
                        text =
                            "Carte retournée",

                        style =
                            MaterialTheme
                                .typography
                                .labelSmall,
                    )

                    BeloteCard(
                        card =
                            turnUpCard,

                        size =
                            BeloteCardSize.SMALL,

                        highlighted =
                            true,
                    )
                }

                DealPhase.PLAYING -> {
                    Text(
                        text =
                            "Atout",

                        style =
                            MaterialTheme
                                .typography
                                .labelSmall,
                    )

                    Text(
                        text =
                            trumpSuit
                                ?.toSymbol()
                                ?: "—",

                        color =
                            trumpSuit
                                ?.toCenterSuitColor()
                                ?: Color(
                                    0xFF1B1B1F,
                                ),

                        style =
                            if (
                                compact
                            ) {
                                MaterialTheme
                                    .typography
                                    .titleLarge
                            } else {
                                MaterialTheme
                                    .typography
                                    .headlineMedium
                            },

                        fontWeight =
                            FontWeight.Bold,
                    )

                    Text(
                        text =
                            trumpSuit
                                ?.toDisplayName()
                                ?: "—",

                        style =
                            if (
                                compact
                            ) {
                                MaterialTheme
                                    .typography
                                    .bodySmall
                            } else {
                                MaterialTheme
                                    .typography
                                    .bodyMedium
                            },

                        fontWeight =
                            FontWeight.SemiBold,
                    )

                    Text(
                        text =
                            "${trick?.plays?.size ?: 0} / 4",

                        style =
                            MaterialTheme
                                .typography
                                .labelSmall,
                    )
                }

                DealPhase.FINISHED -> {
                    Text(
                        text =
                            "Donne terminée",

                        style =
                            if (
                                compact
                            ) {
                                MaterialTheme
                                    .typography
                                    .bodyMedium
                            } else {
                                MaterialTheme
                                    .typography
                                    .titleSmall
                            },

                        fontWeight =
                            FontWeight.Bold,
                    )

                    Text(
                        text =
                            trumpSuit
                                ?.toSymbol()
                                ?: "—",

                        color =
                            trumpSuit
                                ?.toCenterSuitColor()
                                ?: Color(
                                    0xFF1B1B1F,
                                ),

                        style =
                            if (
                                compact
                            ) {
                                MaterialTheme
                                    .typography
                                    .titleLarge
                            } else {
                                MaterialTheme
                                    .typography
                                    .headlineMedium
                            },

                        fontWeight =
                            FontWeight.Bold,
                    )

                    Text(
                        text =
                            "${trick?.plays?.size ?: 0} / 4 cartes",

                        style =
                            MaterialTheme
                                .typography
                                .labelSmall,
                    )
                }
            }
        }
    }
}

private fun PublicCurrentTrickSnapshot?.cardPlayedBy(
    player:
        PlayerPosition,
): PlayerCard? =
    this
        ?.plays
        ?.firstOrNull {
            play ->
            play.player ==
                player
        }
        ?.card

private fun PlayerPosition.offsetBy(
    offset:
        Int,
): PlayerPosition {
    val players =
        PlayerPosition.entries

    val index =
        (
            ordinal +
                offset
            ) %
            players.size

    return players[index]
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

private fun CardSuit.toCenterSuitColor():
    Color =
    when (
        this
    ) {
        CardSuit.HEARTS,
        CardSuit.DIAMONDS,
        ->
            TableRed

        CardSuit.CLUBS,
        CardSuit.SPADES,
        ->
            Color(
                0xFF1B1B1F,
            )
    }