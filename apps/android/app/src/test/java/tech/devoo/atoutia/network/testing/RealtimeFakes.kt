package tech.devoo.atoutia.network.testing

import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.util.concurrent.AbstractExecutorService
import java.util.concurrent.Callable
import java.util.concurrent.Delayed
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

// No thread or clock sleeps: tests choose the exact point at which a task runs.
class ManualRealtimeExecutor : AbstractExecutorService(), ScheduledExecutorService {
    val queued = ArrayDeque<Runnable>()
    val delayed = mutableListOf<Task>()
    val periodic = mutableListOf<Periodic>()
    var beforeExecute: (() -> Unit)? = null
    private var stopped = false

    class Task(val command: Runnable) : ScheduledFuture<Any?> {
        private var cancelled = false
        override fun cancel(mayInterruptIfRunning: Boolean): Boolean {
            val changed = !cancelled
            cancelled = true
            return changed
        }
        override fun isCancelled() = cancelled
        override fun isDone() = cancelled
        override fun get(): Any? = throw UnsupportedOperationException()
        override fun get(timeout: Long, unit: TimeUnit): Any? = throw UnsupportedOperationException()
        override fun getDelay(unit: TimeUnit) = 0L
        override fun compareTo(other: Delayed) = 0
    }

    data class Periodic(val task: Task, val initial: Long, val interval: Long, val unit: TimeUnit, val fixedDelay: Boolean)

    override fun execute(command: Runnable) {
        val hook = beforeExecute
        beforeExecute = null
        hook?.invoke()
        ensureRunning()
        queued.addLast(command)
    }
    fun runNext() { queued.removeFirst().run() }
    fun drain() { while (queued.isNotEmpty()) runNext() }
    fun runNextDelayed() { delayed.removeAt(0).command.run() }
    override fun shutdown() { shutdownNow() }
    override fun shutdownNow(): MutableList<Runnable> {
        stopped = true
        val pending = queued.toMutableList()
        queued.clear()
        return pending
    }
    override fun isShutdown() = stopped
    override fun isTerminated() = stopped && queued.isEmpty()
    override fun awaitTermination(timeout: Long, unit: TimeUnit) = isTerminated()
    override fun schedule(command: Runnable, delay: Long, unit: TimeUnit): ScheduledFuture<*> {
        ensureRunning()
        return Task(command).also { delayed.add(it) }
    }
    override fun <V> schedule(callable: Callable<V>, delay: Long, unit: TimeUnit): ScheduledFuture<V> =
        throw UnsupportedOperationException()
    override fun scheduleAtFixedRate(command: Runnable, initialDelay: Long, period: Long, unit: TimeUnit): ScheduledFuture<*> =
        repeat(command, initialDelay, period, unit, false)
    override fun scheduleWithFixedDelay(command: Runnable, initialDelay: Long, delay: Long, unit: TimeUnit): ScheduledFuture<*> =
        repeat(command, initialDelay, delay, unit, true)
    private fun repeat(command: Runnable, initial: Long, interval: Long, unit: TimeUnit, fixed: Boolean): Task {
        ensureRunning()
        return Task(command).also { periodic.add(Periodic(it, initial, interval, unit, fixed)) }
    }
    private fun ensureRunning() {
        if (stopped) throw RejectedExecutionException("Executor is closed")
    }
}

class RecordingSocket(private val socketRequest: Request) : WebSocket {
    val sent = mutableListOf<String>()
    val closes = mutableListOf<Pair<Int, String?>>()
    var acceptsMessages = true
    var cancellations = 0
    override fun request() = socketRequest
    override fun queueSize() = 0L
    override fun send(text: String): Boolean { sent.add(text); return acceptsMessages }
    override fun send(bytes: ByteString) = acceptsMessages
    override fun close(code: Int, reason: String?): Boolean { closes.add(code to reason); return true }
    override fun cancel() { cancellations++ }
}

class RecordingSocketFactory : WebSocket.Factory {
    data class Entry(val socket: RecordingSocket, val listener: WebSocketListener)
    val entries = mutableListOf<Entry>()
    var beforeReturn: (() -> Unit)? = null
    var failNext: RuntimeException? = null
    override fun newWebSocket(request: Request, listener: WebSocketListener): WebSocket {
        failNext?.let { failNext = null; throw it }
        val socket = RecordingSocket(request)
        entries.add(Entry(socket, listener))
        beforeReturn?.invoke()
        return socket
    }
    fun open(index: Int = entries.lastIndex) {
        val entry = entries[index]
        val response = Response.Builder().request(entry.socket.request())
            .protocol(Protocol.HTTP_1_1).code(101).message("Switching Protocols").build()
        entry.listener.onOpen(entry.socket, response)
    }
}

const val REALTIME_TEST_SESSION = "ms1_0123456789abcdef0123456789abcdef"
val REALTIME_TEST_SNAPSHOT = """{"protocolVersion":1,"type":"SNAPSHOT","snapshot":{"sessionId":"$REALTIME_TEST_SESSION","revision":2}}"""
