package tech.devoo.atoutia.auth

interface AuthTokenStore {
    /**
     * Monitor for the complete read/network/write operation, not just one store call.
     * Stores backed by the same persisted session must expose the same monitor.
     */
    val sessionLock: Any
        get() = this

    fun save(
        session:
            AuthSessionTokens,
    )

    fun load():
        AuthSessionTokens?

    fun clear()
}
