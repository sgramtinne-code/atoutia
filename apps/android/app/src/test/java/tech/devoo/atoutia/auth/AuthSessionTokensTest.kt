package tech.devoo.atoutia.auth

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthSessionTokensTest {
    @Test
    fun acceptsValidAtoutiaAuthenticationSession() {
        AuthSessionTokens(
            accountId =
                "acc1_00000000000000000000000000000000",

            sessionId =
                "as1_00000000000000000000000000000000",

            accessToken =
                "atk1_access-token",

            refreshToken =
                "art1_refresh-token",

            accessExpiresAtMs =
                10_000L,
        )
    }

    @Test(
        expected =
            IllegalArgumentException::class,
    )
    fun rejectsInvalidAccessTokenPrefix() {
        AuthSessionTokens(
            accountId =
                "acc1_00000000000000000000000000000000",

            sessionId =
                "as1_00000000000000000000000000000000",

            accessToken =
                "invalid",

            refreshToken =
                "art1_refresh-token",

            accessExpiresAtMs =
                10_000L,
        )
    }

    @Test(
        expected =
            IllegalArgumentException::class,
    )
    fun rejectsInvalidRefreshTokenPrefix() {
        AuthSessionTokens(
            accountId =
                "acc1_00000000000000000000000000000000",

            sessionId =
                "as1_00000000000000000000000000000000",

            accessToken =
                "atk1_access-token",

            refreshToken =
                "invalid",

            accessExpiresAtMs =
                10_000L,
        )
    }

    @Test
    fun reportsAccessTokenExpirationAtBoundary() {
        val session =
            AuthSessionTokens(
                accountId =
                    "acc1_00000000000000000000000000000000",

                sessionId =
                    "as1_00000000000000000000000000000000",

                accessToken =
                    "atk1_access-token",

                refreshToken =
                    "art1_refresh-token",

                accessExpiresAtMs =
                    10_000L,
            )

        assertFalse(
            session.isAccessTokenExpired(
                9_999L,
            ),
        )

        assertTrue(
            session.isAccessTokenExpired(
                10_000L,
            ),
        )

        assertTrue(
            session.isAccessTokenExpired(
                10_001L,
            ),
        )
    }

    @Test(
        expected =
            IllegalArgumentException::class,
    )
    fun rejectsNegativeExpiration() {
        AuthSessionTokens(
            accountId =
                "acc1_00000000000000000000000000000000",

            sessionId =
                "as1_00000000000000000000000000000000",

            accessToken =
                "atk1_access-token",

            refreshToken =
                "art1_refresh-token",

            accessExpiresAtMs =
                -1L,
        )
    }
}