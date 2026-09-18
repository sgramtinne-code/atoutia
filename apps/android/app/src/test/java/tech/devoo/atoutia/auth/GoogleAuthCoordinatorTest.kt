package tech.devoo.atoutia.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GoogleAuthCoordinatorTest {
    @Test
    fun storesAtoutiaSessionAfterSuccessfulGoogleAuthentication() {
        val expectedSession =
            session(
                accessToken =
                    "atk1_google-access",

                refreshToken =
                    "art1_google-refresh",
            )

        val api =
            FakeGoogleAuthApi(
                result =
                    GoogleAuthResult(
                        session =
                            expectedSession,

                        accountCreated =
                            true,
                    ),
            )

        val store =
            InMemoryAuthTokenStore()

        val coordinator =
            GoogleAuthCoordinator(
                googleAuthApi =
                    api,

                tokenStore =
                    store,
            )

        val result =
            coordinator.authenticate(
                "google-id-token",
            )

        assertEquals(
            listOf(
                "google-id-token",
            ),
            api.receivedTokens,
        )

        assertEquals(
            expectedSession,
            result.session,
        )

        assertEquals(
            true,
            result.accountCreated,
        )

        assertEquals(
            expectedSession,
            store.load(),
        )
    }

    @Test
    fun doesNotModifyStoredSessionWhenGoogleAuthenticationIsRejected() {
        val existingSession =
            session(
                accessToken =
                    "atk1_existing-access",

                refreshToken =
                    "art1_existing-refresh",
            )

        val store =
            InMemoryAuthTokenStore(
                initial =
                    existingSession,
            )

        val coordinator =
            GoogleAuthCoordinator(
                googleAuthApi =
                    RejectingGoogleAuthApi(),

                tokenStore =
                    store,
            )

        try {
            coordinator.authenticate(
                "rejected-google-token",
            )

            throw AssertionError(
                "Expected GoogleAuthRejectedException.",
            )
        } catch (
            error:
                GoogleAuthRejectedException,
        ) {
            assertEquals(
                existingSession,
                store.load(),
            )
        }
    }

    @Test
    fun leavesEmptyStoreEmptyWhenGoogleAuthenticationFails() {
        val store =
            InMemoryAuthTokenStore()

        val coordinator =
            GoogleAuthCoordinator(
                googleAuthApi =
                    RejectingGoogleAuthApi(),

                tokenStore =
                    store,
            )

        try {
            coordinator.authenticate(
                "rejected-google-token",
            )

            throw AssertionError(
                "Expected GoogleAuthRejectedException.",
            )
        } catch (
            error:
                GoogleAuthRejectedException,
        ) {
            assertNull(
                store.load(),
            )
        }
    }

    private class FakeGoogleAuthApi(
        private val result:
            GoogleAuthResult,
    ) : GoogleAuthApi {
        val receivedTokens:
            MutableList<String> =
            mutableListOf()

        override fun authenticate(
            idToken:
                String,
        ): GoogleAuthResult {
            receivedTokens +=
                idToken

            return result
        }
    }

    private class RejectingGoogleAuthApi :
        GoogleAuthApi {
        override fun authenticate(
            idToken:
                String,
        ): GoogleAuthResult {
            throw GoogleAuthRejectedException(
                "Rejected for test.",
            )
        }
    }

    private class InMemoryAuthTokenStore(
        initial:
            AuthSessionTokens? =
            null,
    ) : AuthTokenStore {
        private var value:
            AuthSessionTokens? =
            initial

        override fun save(
            session:
                AuthSessionTokens,
        ) {
            value =
                session
        }

        override fun load():
            AuthSessionTokens? =
            value

        override fun clear() {
            value =
                null
        }
    }

    private companion object {
        fun session(
            accessToken:
                String,

            refreshToken:
                String,
        ): AuthSessionTokens =
            AuthSessionTokens(
                accountId =
                    "acc1_00000000000000000000000000000000",

                sessionId =
                    "as1_00000000000000000000000000000000",

                accessToken =
                    accessToken,

                refreshToken =
                    refreshToken,

                accessExpiresAtMs =
                    999_999L,
            )
    }
}