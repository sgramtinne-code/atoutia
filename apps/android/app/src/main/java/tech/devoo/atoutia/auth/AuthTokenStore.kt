package tech.devoo.atoutia.auth

interface AuthTokenStore {
    fun save(
        session:
            AuthSessionTokens,
    )

    fun load():
        AuthSessionTokens?

    fun clear()
}