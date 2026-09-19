package tech.devoo.atoutia.network.realtime

interface AtoutiaRealtimeApi {
    fun connect(
        sessionId: String,
        accessToken: String,
        listener: Listener,
    ): AtoutiaRealtimeConnection

    interface Listener {
        fun onConnected()

        fun onEvent(
            event: RealtimeEvent,
        )

        fun onDisconnected(
            code: Int,
            reason: String,
        )

        fun onFailure(
            error: Throwable,
        )
    }
}

interface AtoutiaRealtimeConnection :
    AutoCloseable {
    override fun close()
}