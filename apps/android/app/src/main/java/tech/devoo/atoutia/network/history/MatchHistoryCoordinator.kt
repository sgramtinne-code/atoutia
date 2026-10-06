package tech.devoo.atoutia.network.history

class MatchHistoryCoordinator(
    private val historyApi:
        AtoutiaMatchHistoryApi,

    private val accessTokenProvider:
        () -> String?,
) {
    fun load(
        limit:
            Int = 20,
    ): MatchHistoryResponse {
        val accessToken =
            accessTokenProvider()
                ?: throw MatchHistoryUnavailableException(
                    "Aucune session Atoutia active.",
                )

        return historyApi.getHistory(
            accessToken =
                accessToken,

            limit =
                limit,
        )
    }
}

class MatchHistoryUnavailableException(
    message:
        String,
) : Exception(
    message,
)
