package tech.devoo.atoutia.auth

class GoogleAuthCoordinator(
    private val googleAuthApi:
        GoogleAuthApi,

    private val tokenStore:
        AuthTokenStore,
) {
    @Synchronized
    fun authenticate(
        idToken:
            String,
    ): GoogleAuthResult {
        val result =
            googleAuthApi.authenticate(
                idToken,
            )

        tokenStore.save(
            result.session,
        )

        return result
    }
}