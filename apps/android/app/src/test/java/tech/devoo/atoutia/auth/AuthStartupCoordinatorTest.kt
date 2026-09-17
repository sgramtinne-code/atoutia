package tech.devoo.atoutia.auth

import java.io.IOException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

class AuthStartupCoordinatorTest {
    @Test
    fun restoreReturnsSignedOutWhenNoSessionExists() {
        val tokenStore =
            InMemoryAuthTokenStore()

        val sessionApi =
            FakeAuthSessionApi()

        val coordinator =
            createStartupCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    sessionApi,

                nowMs =
                    2_000L,
            )

        assertSame(
            AuthStartupState.SignedOut,
            coordinator.restore(),
        )

        assertEquals(
            0,
            sessionApi.refreshCalls,
        )
    }

    @Test
    fun restoreReturnsAuthenticatedForValidAccessToken() {
        val session =
            createSession(
                accessToken =
                    "atk1_valid",

                refreshToken =
                    "art1_valid",

                accessExpiresAtMs =
                    3_000L,
            )

        val tokenStore =
            InMemoryAuthTokenStore(
                initialSession =
                    session,
            )

        val sessionApi =
            FakeAuthSessionApi()

        val coordinator =
            createStartupCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    sessionApi,

                nowMs =
                    2_000L,
            )

        assertEquals(
            AuthStartupState.Authenticated(
                accountId =
                    session.accountId,

                sessionId =
                    session.sessionId,
            ),
            coordinator.restore(),
        )

        assertEquals(
            0,
            sessionApi.refreshCalls,
        )

        assertSame(
            session,
            tokenStore.load(),
        )
    }

    @Test
    fun restoreRefreshesExpiredAccessToken() {
        val expired =
            createSession(
                accessToken =
                    "atk1_expired",

                refreshToken =
                    "art1_expired",

                accessExpiresAtMs =
                    1_000L,
            )

        val refreshed =
            createSession(
                accessToken =
                    "atk1_rotated",

                refreshToken =
                    "art1_rotated",

                accessExpiresAtMs =
                    4_000L,
            )

        val tokenStore =
            InMemoryAuthTokenStore(
                initialSession =
                    expired,
            )

        val sessionApi =
            FakeAuthSessionApi(
                refreshHandler = {
                    refreshed
                },
            )

        val coordinator =
            createStartupCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    sessionApi,

                nowMs =
                    2_000L,
            )

        assertEquals(
            AuthStartupState.Authenticated(
                accountId =
                    refreshed.accountId,

                sessionId =
                    refreshed.sessionId,
            ),
            coordinator.restore(),
        )

        assertEquals(
            1,
            sessionApi.refreshCalls,
        )

        assertSame(
            refreshed,
            tokenStore.load(),
        )
    }

    @Test
    fun restoreReturnsSignedOutWhenRefreshIsRejected() {
        val expired =
            createSession(
                accessToken =
                    "atk1_expired",

                refreshToken =
                    "art1_expired",

                accessExpiresAtMs =
                    1_000L,
            )

        val tokenStore =
            InMemoryAuthTokenStore(
                initialSession =
                    expired,
            )

        val sessionApi =
            FakeAuthSessionApi(
                refreshHandler = {
                    throw AuthSessionRejectedException()
                },
            )

        val coordinator =
            createStartupCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    sessionApi,

                nowMs =
                    2_000L,
            )

        assertSame(
            AuthStartupState.SignedOut,
            coordinator.restore(),
        )

        assertNull(
            tokenStore.load(),
        )
    }

    @Test
    fun restoreReturnsSignedOutWhenRefreshProtocolIsInvalid() {
        val expired =
            createSession(
                accessToken =
                    "atk1_expired",

                refreshToken =
                    "art1_expired",

                accessExpiresAtMs =
                    1_000L,
            )

        val tokenStore =
            InMemoryAuthTokenStore(
                initialSession =
                    expired,
            )

        val sessionApi =
            FakeAuthSessionApi(
                refreshHandler = {
                    throw AuthSessionProtocolException(
                        "Invalid refresh response.",
                    )
                },
            )

        val coordinator =
            createStartupCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    sessionApi,

                nowMs =
                    2_000L,
            )

        assertSame(
            AuthStartupState.SignedOut,
            coordinator.restore(),
        )

        assertNull(
            tokenStore.load(),
        )
    }

    @Test
    fun restorePreservesSessionWhenBackendIsTemporarilyUnavailable() {
        val expired =
            createSession(
                accessToken =
                    "atk1_expired",

                refreshToken =
                    "art1_expired",

                accessExpiresAtMs =
                    1_000L,
            )

        val tokenStore =
            InMemoryAuthTokenStore(
                initialSession =
                    expired,
            )

        val sessionApi =
            FakeAuthSessionApi(
                refreshHandler = {
                    throw IOException(
                        "Backend unavailable.",
                    )
                },
            )

        val coordinator =
            createStartupCoordinator(
                tokenStore =
                    tokenStore,

                sessionApi =
                    sessionApi,

                nowMs =
                    2_000L,
            )

        assertEquals(
            AuthStartupState.TemporarilyUnavailable(
                message =
                    "Backend unavailable.",
            ),
            coordinator.restore(),
        )

        assertSame(
            expired,
            tokenStore.load(),
        )
    }

    private fun createStartupCoordinator(
        tokenStore:
            AuthTokenStore,

        sessionApi:
            AuthSessionApi,

        nowMs:
            Long,
    ): AuthStartupCoordinator =
        AuthStartupCoordinator(
            sessionCoordinator =
                AuthSessionCoordinator(
                    tokenStore =
                        tokenStore,

                    sessionApi =
                        sessionApi,

                    currentTimeMs = {
                        nowMs
                    },
                ),
        )

    private fun createSession(
        accessToken:
            String,

        refreshToken:
            String,

        accessExpiresAtMs:
            Long,
    ): AuthSessionTokens =
        AuthSessionTokens(
            accountId =
                "acc1_startup",

            sessionId =
                "as1_startup",

            accessToken =
                accessToken,

            refreshToken =
                refreshToken,

            accessExpiresAtMs =
                accessExpiresAtMs,
        )

    private class InMemoryAuthTokenStore(
        initialSession:
            AuthSessionTokens? =
                null,
    ) : AuthTokenStore {
        private var storedSession:
            AuthSessionTokens? =
            initialSession

        override fun save(
            session:
                AuthSessionTokens,
        ) {
            storedSession =
                session
        }

        override fun load():
            AuthSessionTokens? =
            storedSession

        override fun clear() {
            storedSession =
                null
        }
    }

    private class FakeAuthSessionApi(
        private val refreshHandler:
            (
                String,
            ) -> AuthSessionTokens = {
                throw AssertionError(
                    "Unexpected refresh call.",
                )
            },
    ) : AuthSessionApi {
        var refreshCalls:
            Int =
            0
            private set

        override fun refresh(
            refreshToken:
                String,
        ): AuthSessionTokens {
            refreshCalls +=
                1

            return refreshHandler(
                refreshToken,
            )
        }

        override fun logout(
            refreshToken:
                String,
        ) {
        }
    }
}