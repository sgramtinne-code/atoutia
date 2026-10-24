package tech.devoo.atoutia.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class AuthSessionConcurrencyTest {
    @Test
    fun separateCoordinatorsRefreshTheStoredSessionOnlyOnce() {
        val fixture = Fixture()
        val second = fixture.coordinator()

        val result = fixture.duringRefresh { second.accessTokenOrRefresh() }

        assertEquals("atk1_rotated", result)
        assertEquals(1, fixture.api.refreshCalls.get())
        assertEquals(fixture.rotated, fixture.store.load())
    }

    @Test
    fun logoutWaitsForRefreshAndRevokesTheRotatedCredential() {
        val fixture = Fixture()
        val second = fixture.coordinator()

        fixture.duringRefresh { second.logout() }

        assertEquals(listOf("art1_rotated"), fixture.api.logoutTokens)
        assertNull(fixture.store.load())
    }

    @Test
    fun googleSignInCannotBeOverwrittenByAnOlderRefresh() {
        val fixture = Fixture()
        val signedIn = fixture.rotated.copy(
            sessionId = "as1_other",
            accessToken = "atk1_google",
            refreshToken = "art1_google",
        )
        val google = GoogleAuthCoordinator(
            googleAuthApi = object : GoogleAuthApi {
                override fun authenticate(idToken: String) = GoogleAuthResult(signedIn, false)
            },
            tokenStore = fixture.store,
        )

        fixture.duringRefresh { google.authenticate("synthetic-google-id-token") }

        assertEquals(signedIn, fixture.store.load())
    }

    private class Fixture {
        val rotated = AuthSessionTokens(
            accountId = "acc1_test",
            sessionId = "as1_test",
            accessToken = "atk1_rotated",
            refreshToken = "art1_rotated",
            accessExpiresAtMs = 20_000L,
        )
        val store = MemoryTokenStore(
            rotated.copy(
                accessToken = "atk1_expired",
                refreshToken = "art1_original",
                accessExpiresAtMs = 10_000L,
            ),
        )
        val api = BlockingSessionApi(rotated)

        fun coordinator() = AuthSessionCoordinator(store, api) { 10_000L }

        fun <T> duringRefresh(operation: () -> T): T {
            val first = FutureTask<String?> { coordinator().accessTokenOrRefresh() }
            val second = FutureTask<T> { operation() }
            val firstThread = Thread(first, "first-refresh")
            val secondThread = Thread(second, "concurrent-auth-operation")
            try {
                firstThread.start()
                assertTrue("Refresh did not start", api.entered.await(5, TimeUnit.SECONDS))
                secondThread.start()

                // Wait for the other operation to block on the shared monitor or finish.
                // On the faulty implementation it finishes before refresh is released.
                // No timing sleep or network is needed to force the overlap.
                val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
                while (!second.isDone && secondThread.state != Thread.State.BLOCKED) {
                    check(System.nanoTime() < deadline) { "Concurrent operation did not start" }
                    Thread.yield()
                }
                api.release.countDown()

                assertEquals("atk1_rotated", first.get(5, TimeUnit.SECONDS))
                return second.get(5, TimeUnit.SECONDS)
            } finally {
                api.release.countDown()
                firstThread.interrupt()
                secondThread.interrupt()
                firstThread.join(5_000)
                secondThread.join(5_000)
            }
        }
    }

    private class MemoryTokenStore(@Volatile private var session: AuthSessionTokens?) : AuthTokenStore {
        override fun load() = session
        override fun save(session: AuthSessionTokens) { this.session = session }
        override fun clear() { session = null }
    }

    private class BlockingSessionApi(private val rotated: AuthSessionTokens) : AuthSessionApi {
        val entered = CountDownLatch(1)
        val release = CountDownLatch(1)
        val refreshCalls = AtomicInteger()
        val logoutTokens = mutableListOf<String>()

        override fun refresh(refreshToken: String): AuthSessionTokens {
            if (refreshCalls.incrementAndGet() != 1) {
                // The server rejects reuse of the rotating refresh credential.
                throw AuthSessionRejectedException()
            }
            assertEquals("art1_original", refreshToken)
            entered.countDown()
            check(release.await(5, TimeUnit.SECONDS)) { "Refresh was not released" }
            return rotated
        }

        override fun logout(refreshToken: String) { logoutTokens += refreshToken }
    }
}
