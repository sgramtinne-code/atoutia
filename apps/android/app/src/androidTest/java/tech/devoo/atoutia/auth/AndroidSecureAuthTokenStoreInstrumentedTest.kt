package tech.devoo.atoutia.auth

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(
    AndroidJUnit4::class,
)
class AndroidSecureAuthTokenStoreInstrumentedTest {
    private val context
        get() =
            InstrumentationRegistry
                .getInstrumentation()
                .targetContext

    @After
    fun cleanUp() {
        AndroidSecureAuthTokenStore(
            context,
        ).clear()
    }

    @Test
    fun savesAndLoadsAuthenticationTokensThroughAndroidKeystore() {
        val expected =
            AuthSessionTokens(
                accountId =
                    "acc1_00000000000000000000000000000000",

                sessionId =
                    "as1_00000000000000000000000000000000",

                accessToken =
                    "atk1_android-access-token",

                refreshToken =
                    "art1_android-refresh-token",

                accessExpiresAtMs =
                    123_456_789L,
            )

        val firstStore =
            AndroidSecureAuthTokenStore(
                context,
            )

        firstStore.clear()

        assertNull(
            firstStore.load(),
        )

        firstStore.save(
            expected,
        )

        val secondStore =
            AndroidSecureAuthTokenStore(
                context,
            )

        assertEquals(
            expected,
            secondStore.load(),
        )
    }

    @Test
    fun clearsPersistedAuthenticationTokens() {
        val store =
            AndroidSecureAuthTokenStore(
                context,
            )

        store.clear()

        store.save(
            AuthSessionTokens(
                accountId =
                    "acc1_11111111111111111111111111111111",

                sessionId =
                    "as1_11111111111111111111111111111111",

                accessToken =
                    "atk1_access",

                refreshToken =
                    "art1_refresh",

                accessExpiresAtMs =
                    42_000L,
            ),
        )

        store.clear()

        assertNull(
            store.load(),
        )
    }
}