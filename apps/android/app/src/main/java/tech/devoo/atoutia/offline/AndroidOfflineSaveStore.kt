package tech.devoo.atoutia.offline

import android.content.Context
import android.util.AtomicFile
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap

internal class AndroidOfflineSaveStore(private val file: File) : OfflineSaveStore {
    constructor(context: Context) : this(File(context.filesDir, "offline/solo.json"))
    private val lock = locks.computeIfAbsent(file.absoluteFile.normalize().path) { Any() }

    override fun read(): String? = synchronized(lock) {
        val input = try { AtomicFile(file).openRead() } catch (error: FileNotFoundException) {
            if (file.exists() || File(file.path + ".bak").exists()) throw error
            return@synchronized null
        }
        input.use {
            val output = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (true) {
                val count = it.read(buffer)
                if (count < 0) break
                if (output.size() + count > OfflineProgress.MAX_FILE_BYTES) throw IOException("Offline save is too large.")
                output.write(buffer, 0, count)
            }
            output.toString(Charsets.UTF_8.name())
        }
    }

    override fun write(save: String): Unit = synchronized(lock) {
        val bytes = save.toByteArray(Charsets.UTF_8)
        if (bytes.size > OfflineProgress.MAX_FILE_BYTES) throw IOException("Offline save is too large.")
        val parent = file.parentFile ?: throw IOException("Offline save directory is missing.")
        if (!parent.isDirectory && !parent.mkdirs()) throw IOException("Offline save directory is unavailable.")
        val atomic = AtomicFile(file)
        val output = atomic.startWrite()
        try {
            output.write(bytes)
            atomic.finishWrite(output)
        } catch (error: Exception) {
            atomic.failWrite(output)
            throw error
        }
    }

    private companion object { val locks = ConcurrentHashMap<String, Any>() }
}
