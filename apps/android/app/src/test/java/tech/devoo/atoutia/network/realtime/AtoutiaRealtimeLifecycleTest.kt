package tech.devoo.atoutia.network.realtime

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import tech.devoo.atoutia.network.testing.*
import java.io.IOException
import java.util.concurrent.TimeUnit

class AtoutiaRealtimeLifecycleTest {
    @Test fun remoteClosureStopsTheSchedulerAndNotifiesOnce() {
        val f = Fixture()
        f.sockets.open()
        val entry = f.sockets.entries.single()
        entry.listener.onClosed(entry.socket, 1000, "done")
        entry.listener.onFailure(entry.socket, IOException("late failure"), null)
        assertTrue(f.executor.isShutdown())
        assertEquals(1, f.listener.disconnected)
        assertTrue(f.listener.failures.isEmpty())
    }

    @Test fun transportFailureStopsTheScheduler() {
        val f = Fixture()
        f.sockets.open()
        val entry = f.sockets.entries.single()
        val failure = IOException("connection lost")
        entry.listener.onFailure(entry.socket, failure, null)
        assertTrue(f.executor.isShutdown())
        assertEquals(listOf(failure), f.listener.failures)
    }

    @Test fun closeDuringHandshakeIgnoresLateOpenAndMessages() {
        val f = Fixture()
        f.connection.close()
        f.sockets.open()
        val entry = f.sockets.entries.single()
        entry.listener.onMessage(entry.socket, REALTIME_TEST_SNAPSHOT)
        entry.listener.onClosed(entry.socket, 1000, "late close")
        assertEquals(0, f.listener.connected)
        assertEquals(0, f.listener.disconnected)
        assertTrue(f.listener.events.isEmpty())
        assertTrue(f.executor.periodic.isEmpty())
    }

    @Test fun connectedCallbackCanCloseWithoutStartingAHeartbeat() {
        val f = Fixture()
        f.listener.onConnectedHook = { f.connection.close() }
        f.sockets.open()
        assertTrue(f.executor.isShutdown())
        assertTrue(f.executor.periodic.isEmpty())
    }

    @Test fun localCloseIsIdempotent() {
        val f = Fixture()
        f.sockets.open()
        f.connection.close()
        f.connection.close()
        assertEquals(1, f.sockets.entries.single().socket.closes.size)
        assertTrue(f.executor.periodic.single().task.isCancelled())
    }

    @Test fun synchronousSocketCreationFailureReleasesTheScheduler() {
        val executor = ManualRealtimeExecutor()
        val sockets = RecordingSocketFactory().apply { failNext = IllegalStateException("setup failed") }
        assertThrows(IllegalStateException::class.java) {
            client(executor, sockets).connect(REALTIME_TEST_SESSION, "atk1_test", Listener())
        }
        assertTrue(executor.isShutdown())
    }

    @Test fun heartbeatAlreadyQueuedAtCloseCannotSendAgain() {
        val f = Fixture()
        f.sockets.open()
        val task = f.executor.periodic.single().task.command
        f.connection.close()
        task.run()
        assertTrue(f.sockets.entries.single().socket.sent.isEmpty())
    }

    @Test fun remoteClosingStopsWorkAndStillReportsTheFinalClosure() {
        val f = Fixture()
        f.sockets.open()
        val entry = f.sockets.entries.single()
        entry.listener.onClosing(entry.socket, 1000, "server closing")
        assertTrue(f.executor.isShutdown())
        entry.listener.onClosed(entry.socket, 1000, "server closing")
        assertEquals(1, f.listener.disconnected)
    }

    @Test fun heartbeatUsesFixedDelayAndPreservesTheProtocol() {
        val f = Fixture()
        f.sockets.open()
        val task = f.executor.periodic.single()
        assertTrue(task.fixedDelay)
        assertEquals(10L, task.initial)
        assertEquals(10L, task.interval)
        assertEquals(TimeUnit.SECONDS, task.unit)
        task.task.command.run()
        val message = JSONObject(f.sockets.entries.single().socket.sent.single())
        assertEquals(1, message.getInt("protocolVersion"))
        assertEquals("HEARTBEAT", message.getString("type"))
    }

    private class Fixture {
        val executor = ManualRealtimeExecutor()
        val sockets = RecordingSocketFactory()
        val listener = Listener()
        val connection = client(executor, sockets).connect(REALTIME_TEST_SESSION, "atk1_test", listener)
    }
    private class Listener : AtoutiaRealtimeApi.Listener {
        var connected = 0
        var disconnected = 0
        val events = mutableListOf<RealtimeEvent>()
        val failures = mutableListOf<Throwable>()
        var onConnectedHook: (() -> Unit)? = null
        override fun onConnected() { connected++; onConnectedHook?.invoke() }
        override fun onEvent(event: RealtimeEvent) { events.add(event) }
        override fun onDisconnected(code: Int, reason: String) { disconnected++ }
        override fun onFailure(error: Throwable) { failures.add(error) }
    }
    private companion object {
        fun client(executor: ManualRealtimeExecutor, sockets: RecordingSocketFactory) =
            AtoutiaRealtimeClient("http://127.0.0.1:3000", httpClient = sockets, schedulerFactory = { executor })
    }
}
