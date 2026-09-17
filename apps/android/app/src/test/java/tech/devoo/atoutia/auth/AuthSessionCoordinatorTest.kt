package tech.devoo.atoutia.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Test
import java.io.IOException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class AuthSessionCoordinatorTest {
    @Test
    fun returnsNullWhenThereIsNoStoredSession() {
        val store =
            FakeAuthTokenStore()

        val api =
            FakeAuthSessionApi()

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    1_000L
                },
            )

        assertNull(
            coordinator.accessTokenOrRefresh(),
        )

        assertEquals(
            0,
            api.refreshCalls.get(),
        )
    }

    @Test
    fun returnsCurrentAccessTokenWhenItIsStillValid() {
        val session =
            session(
                accessToken =
                    "atk1_current",

                refreshToken =
                    "art1_current",

                accessExpiresAtMs =
                    10_000L,
            )

        val store =
            FakeAuthTokenStore(
                session,
            )

        val api =
            FakeAuthSessionApi()

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    9_999L
                },
            )

        assertEquals(
            "atk1_current",
            coordinator.accessTokenOrRefresh(),
        )

        assertSame(
            session,
            store.load(),
        )

        assertEquals(
            0,
            api.refreshCalls.get(),
        )
    }

    @Test
    fun refreshesExpiredAccessTokenAndPersistsRotatedSession() {
        val previous =
            session(
                accessToken =
                    "atk1_old",

                refreshToken =
                    "art1_old",

                accessExpiresAtMs =
                    10_000L,
            )

        val refreshed =
            session(
                accessToken =
                    "atk1_new",

                refreshToken =
                    "art1_new",

                accessExpiresAtMs =
                    20_000L,
            )

        val store =
            FakeAuthTokenStore(
                previous,
            )

        val api =
            FakeAuthSessionApi(
                refreshedSession =
                    refreshed,
            )

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    10_000L
                },
            )

        assertEquals(
            "atk1_new",
            coordinator.accessTokenOrRefresh(),
        )

        assertEquals(
            refreshed,
            store.load(),
        )

        assertEquals(
            listOf(
                "art1_old",
            ),
            api.refreshTokens,
        )
    }

    @Test
    fun clearsStoredSessionWhenRefreshIsRejected() {
        val store =
            FakeAuthTokenStore(
                session(
                    accessExpiresAtMs =
                        10_000L,
                ),
            )

        val rejection =
            AuthSessionRejectedException()

        val api =
            FakeAuthSessionApi(
                refreshError =
                    rejection,
            )

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    10_000L
                },
            )

        val thrown =
            assertThrows(
                AuthSessionRejectedException::class.java,
            ) {
                coordinator.accessTokenOrRefresh()
            }

        assertSame(
            rejection,
            thrown,
        )

        assertNull(
            store.load(),
        )
    }

    @Test
    fun clearsStoredSessionWhenRefreshProtocolIsInvalid() {
        val store =
            FakeAuthTokenStore(
                session(
                    accessExpiresAtMs =
                        10_000L,
                ),
            )

        val failure =
            AuthSessionProtocolException(
                "Invalid rotated session.",
            )

        val api =
            FakeAuthSessionApi(
                refreshError =
                    failure,
            )

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    10_000L
                },
            )

        val thrown =
            assertThrows(
                AuthSessionProtocolException::class.java,
            ) {
                coordinator.accessTokenOrRefresh()
            }

        assertSame(
            failure,
            thrown,
        )

        assertNull(
            store.load(),
        )
    }

    @Test
    fun preservesStoredSessionWhenRefreshFailsTemporarily() {
        val previous =
            session(
                accessExpiresAtMs =
                    10_000L,
            )

        val store =
            FakeAuthTokenStore(
                previous,
            )

        val failure =
            IOException(
                "Temporary network failure.",
            )

        val api =
            FakeAuthSessionApi(
                refreshError =
                    failure,
            )

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    10_000L
                },
            )

        val thrown =
            assertThrows(
                IOException::class.java,
            ) {
                coordinator.accessTokenOrRefresh()
            }

        assertSame(
            failure,
            thrown,
        )

        assertSame(
            previous,
            store.load(),
        )
    }

    @Test
    fun clearsStoredSessionWhenRefreshChangesSessionIdentity() {
        val previous =
            session(
                sessionId =
                    "as1_original",

                accessExpiresAtMs =
                    10_000L,
            )

        val refreshed =
            session(
                sessionId =
                    "as1_other",

                accessToken =
                    "atk1_new",

                refreshToken =
                    "art1_new",

                accessExpiresAtMs =
                    20_000L,
            )

        val store =
            FakeAuthTokenStore(
                previous,
            )

        val api =
            FakeAuthSessionApi(
                refreshedSession =
                    refreshed,
            )

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    10_000L
                },
            )

        val error =
            assertThrows(
                AuthSessionProtocolException::class.java,
            ) {
                coordinator.accessTokenOrRefresh()
            }

        assertEquals(
            "Refresh response changed the Atoutia auth session id.",
            error.message,
        )

        assertNull(
            store.load(),
        )
    }

    @Test
    fun logoutSendsCurrentRefreshTokenAndClearsStoredSession() {
        val store =
            FakeAuthTokenStore(
                session(
                    refreshToken =
                        "art1_logout",
                ),
            )

        val api =
            FakeAuthSessionApi()

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,
            )

        coordinator.logout()

        assertEquals(
            listOf(
                "art1_logout",
            ),
            api.logoutTokens,
        )

        assertNull(
            store.load(),
        )
    }

    @Test
    fun logoutClearsStoredSessionEvenWhenServerCallFails() {
        val store =
            FakeAuthTokenStore(
                session(
                    refreshToken =
                        "art1_logout",
                ),
            )

        val failure =
            IOException(
                "Backend unavailable.",
            )

        val api =
            FakeAuthSessionApi(
                logoutError =
                    failure,
            )

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,
            )

        val thrown =
            assertThrows(
                IOException::class.java,
            ) {
                coordinator.logout()
            }

        assertSame(
            failure,
            thrown,
        )

        assertNull(
            store.load(),
        )
    }

    @Test
    fun concurrentExpiredAccessRequestsPerformOnlyOneRefresh() {
        val previous =
            session(
                accessToken =
                    "atk1_old",

                refreshToken =
                    "art1_old",

                accessExpiresAtMs =
                    10_000L,
            )

        val refreshed =
            session(
                accessToken =
                    "atk1_new",

                refreshToken =
                    "art1_new",

                accessExpiresAtMs =
                    20_000L,
            )

        val store =
            FakeAuthTokenStore(
                previous,
            )

        val api =
            FakeAuthSessionApi(
                refreshedSession =
                    refreshed,
            )

        val coordinator =
            AuthSessionCoordinator(
                tokenStore =
                    store,

                sessionApi =
                    api,

                currentTimeMs = {
                    10_000L
                },
            )

        val executor =
            Executors.newFixedThreadPool(
                2,
            )

        val ready =
            CountDownLatch(
                2,
            )

        val start =
            CountDownLatch(
                1,
            )

        try {
            val first =
                executor.submit<String?> {
                    ready.countDown()

                    start.await()

                    coordinator.accessTokenOrRefresh()
                }

            val second =
                executor.submit<String?> {
                    ready.countDown()

                    start.await()

                    coordinator.accessTokenOrRefresh()
                }

            if (
                !ready.await(
                    5,
                    TimeUnit.SECONDS,
                )
            ) {
                throw AssertionError(
                    "Concurrent test workers did not become ready.",
                )
            }

            start.countDown()

            assertEquals(
                "atk1_new",
                first.get(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertEquals(
                "atk1_new",
                second.get(
                    5,
                    TimeUnit.SECONDS,
                ),
            )

            assertEquals(
                1,
                api.refreshCalls.get(),
            )

            assertEquals(
                refreshed,
                store.load(),
            )
        } finally {
            executor.shutdownNow()
        }
    }

    private fun session(
        accountId:
            String =
                "acc1_00000000000000000000000000000000",

        sessionId:
            String =
                "as1_00000000000000000000000000000000",

        accessToken:
            String =
                "atk1_access",

        refreshToken:
            String =
                "art1_refresh",

        accessExpiresAtMs:
            Long =
                20_000L,
    ) =
        AuthSessionTokens(
            accountId =
                accountId,

            sessionId =
                sessionId,

            accessToken =
                accessToken,

            refreshToken =
                refreshToken,

            accessExpiresAtMs =
                accessExpiresAtMs,
        )

    private class FakeAuthTokenStore(
        initialSession:
            AuthSessionTokens? =
                null,
    ) : AuthTokenStore {
        private var session:
            AuthSessionTokens? =
                initialSession

        override fun save(
            session:
                AuthSessionTokens,
        ) {
            this.session =
                session
        }

        override fun load():
            AuthSessionTokens? =
            session

        override fun clear() {
            session =
                null
        }
    }

    private class FakeAuthSessionApi(
        private val refreshedSession:
            AuthSessionTokens? =
                null,

        private val refreshError:
            Exception? =
                null,

        private val logoutError:
            Exception? =
                null,
    ) : AuthSessionApi {
        val refreshCalls =
            AtomicInteger(
                0,
            )

        val refreshTokens =
            mutableListOf<String>()

        val logoutTokens =
            mutableListOf<String>()

        override fun refresh(
            refreshToken:
                String,
        ): AuthSessionTokens {
            refreshCalls.incrementAndGet()

            refreshTokens +=
                refreshToken

            if (
                refreshError !=
                    null
            ) {
                throw refreshError
            }

            return requireNotNull(
                refreshedSession,
            ) {
                "No fake refreshed session configured."
            }
        }

        override fun logout(
            refreshToken:
                String,
        ) {
            logoutTokens +=
                refreshToken

            if (
                logoutError !=
                    null
            ) {
                throw logoutError
            }
        }
    }
}