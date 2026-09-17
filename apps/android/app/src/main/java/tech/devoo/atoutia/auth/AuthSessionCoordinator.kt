package tech.devoo.atoutia.auth

class AuthSessionCoordinator(
    private val tokenStore:
        AuthTokenStore,

    private val sessionApi:
        AuthSessionApi,

    private val currentTimeMs:
        () -> Long =
            System::currentTimeMillis,
) {
    private val lock =
        Any()

    fun loadSession():
        AuthSessionTokens? =
        synchronized(
            lock,
        ) {
            tokenStore.load()
        }

    fun accessTokenOrRefresh():
        String? =
        synchronized(
            lock,
        ) {
            val currentSession =
                tokenStore.load()
                    ?: return@synchronized null

            val nowMs =
                currentTimeMs()

            require(
                nowMs >=
                    0L,
            ) {
                "Current time must be non-negative."
            }

            if (
                !currentSession
                    .isAccessTokenExpired(
                        nowMs,
                    )
            ) {
                return@synchronized currentSession
                    .accessToken
            }

            val refreshedSession =
                try {
                    sessionApi.refresh(
                        currentSession
                            .refreshToken,
                    )
                } catch (
                    error:
                        AuthSessionRejectedException,
                ) {
                    tokenStore.clear()

                    throw error
                } catch (
                    error:
                        AuthSessionProtocolException,
                ) {
                    tokenStore.clear()

                    throw error
                }

            validateRefreshedSession(
                previous =
                    currentSession,

                refreshed =
                    refreshedSession,

                nowMs =
                    nowMs,
            )

            tokenStore.save(
                refreshedSession,
            )

            refreshedSession.accessToken
        }

    fun logout() {
        synchronized(
            lock,
        ) {
            val currentSession =
                tokenStore.load()

            try {
                if (
                    currentSession !=
                        null
                ) {
                    sessionApi.logout(
                        currentSession
                            .refreshToken,
                    )
                }
            } finally {
                tokenStore.clear()
            }
        }
    }

    private fun validateRefreshedSession(
        previous:
            AuthSessionTokens,

        refreshed:
            AuthSessionTokens,

        nowMs:
            Long,
    ) {
        if (
            refreshed.accountId !=
                previous.accountId
        ) {
            rejectInvalidRefresh(
                "Refresh response changed the Atoutia account id.",
            )
        }

        if (
            refreshed.sessionId !=
                previous.sessionId
        ) {
            rejectInvalidRefresh(
                "Refresh response changed the Atoutia auth session id.",
            )
        }

        if (
            refreshed.refreshToken ==
                previous.refreshToken
        ) {
            rejectInvalidRefresh(
                "Refresh response did not rotate the refresh token.",
            )
        }

        if (
            refreshed.accessToken ==
                previous.accessToken
        ) {
            rejectInvalidRefresh(
                "Refresh response did not rotate the access token.",
            )
        }

        if (
            refreshed.accessExpiresAtMs <=
                nowMs
        ) {
            rejectInvalidRefresh(
                "Refresh response returned an already expired access token.",
            )
        }
    }

    private fun rejectInvalidRefresh(
        message:
            String,
    ): Nothing {
        tokenStore.clear()

        throw AuthSessionProtocolException(
            message,
        )
    }
}