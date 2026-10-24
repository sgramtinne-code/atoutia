package tech.devoo.atoutia.auth

class GoogleAuthCoordinator(
    private val googleAuthApi:
        GoogleAuthApi,

    private val tokenStore:
        AuthTokenStore,
) {
    fun authenticate(
        idToken:
            String,
    ): GoogleAuthResult = synchronized(tokenStore.sessionLock) {
        val result =
            googleAuthApi.authenticate(
                idToken,
            )

        tokenStore.save(
            result.session,
        )

        result
    }
}
