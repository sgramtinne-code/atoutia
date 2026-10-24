package tech.devoo.atoutia.ui.game

import org.junit.Assert.*
import org.junit.Test
import tech.devoo.atoutia.network.game.GameRealtimeStatus
import tech.devoo.atoutia.network.game.PlayerActionMode

class GameSyncStateTest {
    @Test fun healthyActiveTurnUsesRealtimeAndWaitingKeepsTheSafetyPoll() {
        val state = GameSyncState(connection = GameRealtimeStatus.CONNECTED)
        assertFalse(state.canRetry)
        assertFalse(state.needsPolling(PlayerActionMode.PLAY_CARD, false))
        assertFalse(state.needsPolling(PlayerActionMode.BID, false))
        assertTrue(state.needsPolling(PlayerActionMode.WAIT, false))
        assertEquals("En direct", state.label)
    }

    @Test fun failedRefreshOrMissingRevisionRecoversEvenDuringALocalTurn() {
        val healthy = GameSyncState(connection = GameRealtimeStatus.CONNECTED)
        for (state in listOf(healthy.copy(refreshFailed = true), healthy.copy(revisionBehind = true),
                healthy.copy(connection = GameRealtimeStatus.RECONNECTING),
                healthy.copy(connection = GameRealtimeStatus.ERROR), GameSyncState())) {
            assertTrue(state.needsPolling(PlayerActionMode.PLAY_CARD, false))
            assertTrue(state.needsPolling(PlayerActionMode.BID, false))
            assertFalse(state.needsPolling(PlayerActionMode.WAIT, true))
        }
    }

    @Test fun httpSuccessCannotPretendTheRealtimeSocketHasRecovered() {
        val failed = GameSyncState(connection = GameRealtimeStatus.RECONNECTING, refreshFailed = true)
        val refreshed = failed.copy(refreshFailed = false, refreshing = false)
        assertTrue(refreshed.canRetry)
        assertEquals("Reconnexion…", refreshed.label)
        val recovered = refreshed.copy(connection = GameRealtimeStatus.CONNECTED)
        assertFalse(recovered.canRetry)
        assertEquals("En direct", recovered.label)
    }

    @Test fun refreshingRetainsTheRetryConditionUntilSuccess() {
        val state = GameSyncState(connection = GameRealtimeStatus.CONNECTED, refreshFailed = true)
        assertTrue(state.copy(refreshing = true).canRetry)
        assertEquals("Actualisation…", state.copy(refreshing = true).label)
        assertEquals("Actualisation impossible", state.label)
    }

    @Test fun realtimePollingAndTapCannotStartConcurrentRefreshes() {
        val gate = GameRefreshGate()
        val first = gate.begin()!!
        assertNull(gate.begin())
        assertFalse(gate.complete(first + 1))
        assertNull(gate.begin())
        assertTrue(gate.complete(first))
        val second = gate.begin()!!
        assertFalse(gate.complete(first))
        assertNull(gate.begin())
        assertTrue(gate.complete(second))
    }

    @Test fun leavingTheScreenInvalidatesLateResultsAndNewRequests() {
        val gate = GameRefreshGate()
        val pending = gate.begin()!!
        gate.close()
        assertFalse(gate.active)
        assertFalse(gate.complete(pending))
        assertNull(gate.begin())
        gate.close()
        val newScreen = GameRefreshGate()
        assertNotNull(newScreen.begin())
        assertFalse(gate.complete(pending))
    }
}
