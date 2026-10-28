package tech.devoo.atoutia.offline

import android.content.Context
import androidx.javascriptengine.JavaScriptIsolate
import androidx.javascriptengine.JavaScriptSandbox
import org.json.JSONObject
import java.util.concurrent.Executor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

internal class OfflineUnavailableException : IllegalStateException(
    "Le mode hors ligne n’est pas disponible sur cet appareil. Mets à jour Android System WebView, puis réessaie.",
)

internal class AndroidOfflineRuntime(context: Context) : OfflineRuntime {
    private val context = context.applicationContext
    private val closed = AtomicBoolean(false)
    private val resources = Any()
    private var sandbox: JavaScriptSandbox? = null
    private var isolate: JavaScriptIsolate? = null

    private fun prepare(): JavaScriptIsolate {
        synchronized(resources) { isolate?.let { return it } }
        check(!closed.get()) { "Offline engine is closed." }
        if (!JavaScriptSandbox.isSupported()) throw OfflineUnavailableException()
        // Serialize process creation; close() itself never waits for this lock.
        synchronized(connectionGate) {
            check(!closed.get())
            val future = JavaScriptSandbox.createConnectedInstanceAsync(context)
            future.addListener({
                if (closed.get()) runCatching { future.get().close() }
            }, Executor { it.run() })
            val connected = try { future.get(15, TimeUnit.SECONDS) } catch (error: Exception) {
                close()
                throw error
            }
            if (closed.get()) {
                connected.close()
                error("Offline engine was closed during creation.")
            }
            val created = try { connected.createIsolate() } catch (error: Exception) {
                connected.close()
                throw error
            }
            synchronized(resources) {
                if (closed.get()) {
                    created.close()
                    connected.close()
                    error("Offline engine was closed during creation.")
                }
                sandbox = connected
                isolate = created
            }
            try {
                val script = context.assets.open("atoutia-offline-engine.js").bufferedReader(Charsets.UTF_8).use { it.readText() }
                created.evaluateJavaScriptAsync(script + "\n'loaded';").get(15, TimeUnit.SECONDS)
            } catch (error: Exception) {
                close()
                throw error
            }
            return created
        }
    }

    override fun request(json: String): String {
        check(!closed.get()) { "Offline engine is closed." }
        return prepare().evaluateJavaScriptAsync("AtoutiaOffline.request(" + JSONObject.quote(json) + ");").get(15, TimeUnit.SECONDS)
    }

    override fun close() {
        if (!closed.compareAndSet(false, true)) return
        val previous = synchronized(resources) {
            val value = isolate to sandbox
            isolate = null
            sandbox = null
            value
        }
        runCatching { previous.first?.close() }
        runCatching { previous.second?.close() }
    }

    private companion object { val connectionGate = Any() }
}
