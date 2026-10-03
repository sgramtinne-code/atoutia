package tech.devoo.atoutia.network.game

import tech.devoo.atoutia.network.room.PlayerPosition

const val SUPPORTED_PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION =
    1

enum class CardSuit {
    CLUBS,
    DIAMONDS,
    HEARTS,
    SPADES,
}

enum class CardRank {
    SEVEN,
    EIGHT,
    NINE,
    TEN,
    JACK,
    QUEEN,
    KING,
    ACE,
}

data class PlayerCard(
    val suit:
        CardSuit,

    val rank:
        CardRank,
)

enum class DealPhase {
    BIDDING,
    PLAYING,
    FINISHED,
}

enum class MatchTeam {
    TEAM_0,
    TEAM_1,
}

data class TeamPointsSnapshot(
    val team0:
        Int,

    val team1:
        Int,
)

data class PublicMatchScoreSnapshot(
    val targetScore:
        Int,

    val scores:
        TeamPointsSnapshot,

    val completed:
        Boolean,

    val winner:
        MatchTeam?,
)

data class PlayedCardSnapshot(
    val player:
        PlayerPosition,

    val card:
        PlayerCard,
)

data class PublicCurrentTrickSnapshot(
    val currentPlayer:
        PlayerPosition,

    val plays:
        List<PlayedCardSnapshot>,
)

data class PublicMatchSnapshot(
    val dealNumber:
        Int,

    val dealer:
        PlayerPosition,

    val phase:
        DealPhase,

    val score:
        PublicMatchScoreSnapshot,

    val biddingPlayer:
        PlayerPosition?,

    val taker:
        PlayerPosition?,

    val trumpSuit:
        CardSuit?,

    val turnUpCard:
        PlayerCard,

    val currentTrick:
        PublicCurrentTrickSnapshot?,
)

data class PlayerMatchSnapshot(
    val publicMatch:
        PublicMatchSnapshot,

    val player:
        PlayerPosition,

    val hand:
        List<PlayerCard>,

    val legalCards:
        List<PlayerCard>,
)

enum class PlayerActionMode {
    WAIT,
    BID,
    PLAY_CARD,
    MATCH_FINISHED,
}

sealed interface BiddingActionSnapshot {
    val player:
        PlayerPosition

    data class Pass(
        override val player:
            PlayerPosition,
    ) : BiddingActionSnapshot

    data class Take(
        override val player:
            PlayerPosition,

        val suit:
            CardSuit,
    ) : BiddingActionSnapshot
}

data class PlayerAvailableActions(
    val player:
        PlayerPosition,

    val mode:
        PlayerActionMode,

    val biddingActions:
        List<BiddingActionSnapshot>,

    val legalCards:
        List<PlayerCard>,
)

data class PlayerClientSnapshot(
    val match:
        PlayerMatchSnapshot,

    val actions:
        PlayerAvailableActions,
)

data class PlayerClientSnapshotDocument(
    val formatVersion:
        Int,

    val engineVersion:
        String,

    val snapshot:
        PlayerClientSnapshot,
)