package tech.devoo.atoutia.network.game

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import tech.devoo.atoutia.network.testing.*
import java.io.IOException
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.TimeUnit

class GameRealtimeLifecycleTest {
    @Test fun closeDuringTokenLookupCannotOpenANewSocket() {
        val f = Fixture()
        lateinit var subscription: AtoutiaGameRealtimeSubscription
        subscription = f.subscribe { subscription.close(); "atk1_test" }
        f.executor.runNext()
        assertTrue(f.sockets.entries.isEmpty())
    }

    @Test fun socketCreatedWhileClosingIsReleasedImmediately() {
        val f = Fixture()
        val subscription = f.subscribe()
        f.sockets.beforeReturn = { subscription.close() }
        f.executor.runNext()
        assertEquals(1, f.sockets.entries.single().socket.closes.size)
        assertTrue(f.executor.isShutdown())
    }

    @Test fun acknowledgmentRacingWithCloseDoesNotThrow() {
        val f = Fixture()
        val subscription = f.subscribe()
        f.executor.runNext()
        f.executor.beforeExecute = { subscription.close() }
        subscription.acknowledgeRevision(2)
        assertTrue(f.executor.isShutdown())
    }

    @Test fun closeDropsQueuedRevisionsAndLateFailures() {
        val f = Fixture()
        val subscription = f.subscribe()
        f.executor.runNext()
        f.sockets.open()
        f.executor.drain()
        val entry = f.sockets.entries.single()
        entry.listener.onMessage(entry.socket, REALTIME_TEST_SNAPSHOT)
        val task = f.executor.queued.removeFirst()
        subscription.close()
        task.run()
        entry.listener.onFailure(entry.socket, IOException("late"), null)
        assertTrue(f.revisions.isEmpty())
        assertTrue(f.executor.delayed.isEmpty())
        assertTrue(f.issues.isEmpty())
    }

    @Test fun heartbeatUsesFixedDelayAndCannotSendAfterClose() {
        val f = Fixture()
        val subscription = f.subscribe()
        f.executor.runNext()
        f.sockets.open()
        f.executor.drain()
        val task = f.executor.periodic.single()
        assertTrue(task.fixedDelay)
        assertEquals(10_000L, task.initial)
        assertEquals(10_000L, task.interval)
        assertEquals(TimeUnit.MILLISECONDS, task.unit)
        task.task.command.run()
        val socket = f.sockets.entries.single().socket
        assertEquals("HEARTBEAT", JSONObject(socket.sent.single()).getString("type"))
        subscription.close()
        task.task.command.run()
        assertEquals(1, socket.sent.size)
    }

    @Test fun synchronousSocketCreationFailureIsReportedAndRetried() {
        val f = Fixture()
        f.sockets.failNext = IllegalStateException("setup failed")
        val subscription = f.subscribe()
        f.executor.runNext()
        assertEquals(1, f.issues.size)
        assertEquals(1, f.executor.delayed.size)
        f.executor.runNextDelayed()
        assertEquals(1, f.sockets.entries.size)
        subscription.close()
    }

    @Test fun executorFailureWhileStillOpenIsNotHidden() {
        val f = Fixture()
        val subscription = f.subscribe()
        f.executor.beforeExecute = { throw RejectedExecutionException("unexpected rejection") }
        assertThrows(RejectedExecutionException::class.java) { subscription.acknowledgeRevision(2) }
        subscription.close()
    }

    @Test fun negativeAcknowledgmentIsRejectedEvenAfterClose() {
        val f = Fixture()
        val subscription = f.subscribe()
        subscription.close()
        assertThrows(IllegalArgumentException::class.java) { subscription.acknowledgeRevision(-1) }
    }

    private class Fixture {
        val executor = ManualRealtimeExecutor()
        val sockets = RecordingSocketFactory()
        val revisions = mutableListOf<Int>()
        val issues = mutableListOf<String>()
        fun subscribe(provider: () -> String? = { "atk1_test" }): AtoutiaGameRealtimeSubscription =
            AtoutiaGameRealtimeClient("http://127.0.0.1:3000", sockets, { executor }).subscribe(
                sessionId = REALTIME_TEST_SESSION,
                initialRevision = 1,
                accessTokenProvider = provider,
                onRevisionAvailable = { revisions.add(it) },
                onConnectionIssue = { issues.add(it) },
            )
    }
}
