package tech.devoo.atoutia.ui.history

import tech.devoo.atoutia.network.history.MatchHistoryEntry

sealed interface MatchHistoryUiState {
    data object Loading :
        MatchHistoryUiState

    data class Loaded(
        val entries:
            List<MatchHistoryEntry>,
    ) : MatchHistoryUiState

    data class Failed(
        val message:
            String,
    ) : MatchHistoryUiState
}
