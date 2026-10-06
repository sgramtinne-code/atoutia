package tech.devoo.atoutia.network.history

enum class MatchHistoryMode {
    PRIVATE,
    CASUAL,
    RANKED,
}

enum class MatchHistoryCompletion {
    NORMAL,
    FORFEIT,
}

enum class MatchHistoryOutcome {
    WIN,
    LOSS,
}

enum class MatchHistoryForfeitReason {
    PLAYER_ABSENCE,
}

data class MatchHistoryScore(
    val targetScore:
        Int,

    val ownTeam:
        Int,

    val opponentTeam:
        Int,
)

data class MatchHistoryForfeit(
    val reason:
        MatchHistoryForfeitReason,

    val byOwnTeam:
        Boolean,

    val bySelf:
        Boolean,
)

data class MatchHistoryEntry(
    val formatVersion:
        Int,

    val sessionId:
        String,

    val mode:
        MatchHistoryMode,

    val completedAtMs:
        Long,

    val completion:
        MatchHistoryCompletion,

    val outcome:
        MatchHistoryOutcome,

    val score:
        MatchHistoryScore?,

    val forfeit:
        MatchHistoryForfeit?,
)

data class MatchHistoryResponse(
    val formatVersion:
        Int,

    val entries:
        List<MatchHistoryEntry>,
)

interface AtoutiaMatchHistoryApi {
    fun getHistory(
        accessToken:
            String,

        limit:
            Int = 20,
    ): MatchHistoryResponse
}
