package tech.devoo.atoutia.ui.game

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
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

@Composable
fun BeloteTable(
    localPlayer: PlayerPosition,
    dealer: PlayerPosition,
    taker: PlayerPosition?,
    currentPlayer: PlayerPosition?,
    trick: PublicCurrentTrickSnapshot?,
    phase: DealPhase,
    turnUpCard: PlayerCard,
    presence: GameRealtimePresence? = null,
    modifier: Modifier = Modifier,
) {
    val leftPlayer = localPlayer.offsetBy(1)
    val topPlayer = localPlayer.offsetBy(2)
    val rightPlayer = localPlayer.offsetBy(3)

    BoxWithConstraints(modifier.fillMaxWidth()) {
        val compact = maxWidth >= 520.dp || maxHeight <= 300.dp
        val seat: @Composable (PlayerPosition, Modifier) -> Unit = { player, seatModifier ->
            PlayerSeatBadge(
                player = player,
                localPlayer = localPlayer,
                dealer = dealer,
                taker = taker,
                currentPlayer = currentPlayer,
                presence = presence,
                compact = compact,
                modifier = seatModifier.testTag("table-seat-${player.name}"),
            )
        }

        Surface(
            modifier = Modifier.fillMaxWidth().height(if (compact) 300.dp else 410.dp)
                .testTag("belote-table"),
            shape = RoundedCornerShape(if (compact) 24.dp else 30.dp),
            color = TableGreen,
            border = BorderStroke(2.dp, TableGreenDark),
            shadowElevation = 6.dp,
        ) {
            val tablePadding = if (compact) 6.dp else 14.dp
            if (phase == DealPhase.BIDDING) {
                Box(Modifier.fillMaxSize().padding(tablePadding)) {
                    seat(topPlayer, Modifier.align(Alignment.TopCenter))
                    seat(leftPlayer, Modifier.align(Alignment.CenterStart))
                    seat(rightPlayer, Modifier.align(Alignment.CenterEnd))
                    seat(localPlayer, Modifier.align(Alignment.BottomCenter))
                    BiddingTableStatus(turnUpCard, compact, Modifier.align(Alignment.Center))
                }
            } else {
                val card: @Composable (PlayerPosition) -> Unit = { player ->
                    PlayedCardSlot(trick.cardPlayedBy(player), player)
                }
                Row(
                    modifier = Modifier.fillMaxSize().padding(tablePadding),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        seat(leftPlayer, Modifier)
                        card(leftPlayer)
                    }

                    Column(
                        modifier = Modifier.weight(1.55f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            seat(topPlayer, Modifier.weight(1f, fill = false))
                            card(topPlayer)
                        }

                        Column(
                            modifier = Modifier.testTag("table-trick-status"),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            if (phase == DealPhase.FINISHED && !compact) {
                                Text(
                                    "Donne terminée",
                                    color = TableCream,
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                )
                            }
                            Text(
                                "Pli · ${trick?.plays?.size ?: 0}/4",
                                color = TableCream,
                                style = MaterialTheme.typography.labelMedium,
                                textAlign = TextAlign.Center,
                            )
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            seat(localPlayer, Modifier.weight(1f, fill = false))
                            card(localPlayer)
                        }
                    }

                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        seat(rightPlayer, Modifier)
                        card(rightPlayer)
                    }
                }
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
        modifier = modifier.semantics {
            connectionLabel?.let { stateDescription = it }
        },

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
                            6.dp
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
                connectionLabel != null &&
                (!compact || connectionState != GameRealtimeConnectionStateName.CONNECTED)
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
private fun PlayedCardSlot(card: PlayerCard?, player: PlayerPosition) {
    val size = BeloteCardSize.SMALL
    Box(Modifier.size(size.width, size.height)) {
        if (card != null) {
            BeloteCard(card = card, modifier = Modifier.testTag("table-card-${player.name}"), size = size)
        }
    }
}

@Composable
private fun BiddingTableStatus(turnUpCard: PlayerCard, compact: Boolean, modifier: Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(if (compact) 16.dp else 20.dp),
        color = TableCream.copy(alpha = 0.96f),
        contentColor = Color(0xFF1B1B1F),
        shadowElevation = 3.dp,
    ) {
        Column(
            modifier = Modifier.padding(
                horizontal = if (compact) 10.dp else 14.dp,
                vertical = if (compact) 6.dp else 10.dp,
            ),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(if (compact) 2.dp else 4.dp),
        ) {
            Text(
                "Enchères",
                style = if (compact) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
            Text("Carte retournée", style = MaterialTheme.typography.labelSmall)
            BeloteCard(card = turnUpCard, size = BeloteCardSize.SMALL, highlighted = true)
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
