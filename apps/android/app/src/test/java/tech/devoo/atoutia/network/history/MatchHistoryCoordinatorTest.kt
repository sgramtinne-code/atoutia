package tech.devoo.atoutia.network.history

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class MatchHistoryCoordinatorTest {
    @Test
    fun loadsHistoryUsingActiveAuthenticationAndDefaultLimit() {
        val expectedResponse =
            MatchHistoryResponse(
                formatVersion =
                    1,

                entries =
                    emptyList(),
            )

        val api =
            RecordingMatchHistoryApi(
                response =
                    expectedResponse,
            )

        val coordinator =
            MatchHistoryCoordinator(
                historyApi =
                    api,

                accessTokenProvider = {
                    "atk1_history_token"
                },
            )

        val result =
            coordinator.load()

        assertTrue(
            api.called,
        )

        assertEquals(
            "atk1_history_token",
            api.accessToken,
        )

        assertEquals(
            20,
            api.limit,
        )

        assertEquals(
            expectedResponse,
            result,
        )
    }

    @Test
    fun loadsHistoryUsingExplicitLimit() {
        val api =
            RecordingMatchHistoryApi(
                response =
                    MatchHistoryResponse(
                        formatVersion =
                            1,

                        entries =
                            emptyList(),
                    ),
            )

        val coordinator =
            MatchHistoryCoordinator(
                historyApi =
                    api,

                accessTokenProvider = {
                    "atk1_explicit_limit_token"
                },
            )

        coordinator.load(
            limit =
                7,
        )

        assertTrue(
            api.called,
        )

        assertEquals(
            "atk1_explicit_limit_token",
            api.accessToken,
        )

        assertEquals(
            7,
            api.limit,
        )
    }

    @Test
    fun loadingRequiresActiveAuthentication() {
        val api =
            RecordingMatchHistoryApi(
                response =
                    MatchHistoryResponse(
                        formatVersion =
                            1,

                        entries =
                            emptyList(),
                    ),
            )

        val coordinator =
            MatchHistoryCoordinator(
                historyApi =
                    api,

                accessTokenProvider = {
                    null
                },
            )

        val error =
            assertThrows(
                MatchHistoryUnavailableException::class.java,
            ) {
                coordinator.load()
            }

        assertEquals(
            "Aucune session Atoutia active.",
            error.message,
        )

        assertFalse(
            api.called,
        )
    }

    @Test
    fun propagatesStructuredHistoryApiFailure() {
        val expectedFailure =
            AtoutiaMatchHistoryApiException(
                message =
                    "Atoutia match history API returned HTTP 401.",

                statusCode =
                    401,

                errorCode =
                    "AUTH_INVALID",
            )

        val api =
            FailingMatchHistoryApi(
                failure =
                    expectedFailure,
            )

        val coordinator =
            MatchHistoryCoordinator(
                historyApi =
                    api,

                accessTokenProvider = {
                    "atk1_invalid_history_token"
                },
            )

        val error =
            assertThrows(
                AtoutiaMatchHistoryApiException::class.java,
            ) {
                coordinator.load()
            }

        assertEquals(
            "Atoutia match history API returned HTTP 401.",
            error.message,
        )

        assertEquals(
            401,
            error.statusCode,
        )

        assertEquals(
            "AUTH_INVALID",
            error.errorCode,
        )

        assertTrue(
            api.called,
        )

        assertEquals(
            "atk1_invalid_history_token",
            api.accessToken,
        )

        assertEquals(
            20,
            api.limit,
        )
    }

    private class RecordingMatchHistoryApi(
        private val response:
            MatchHistoryResponse,
    ) : AtoutiaMatchHistoryApi {
        var called:
            Boolean =
            false

        var accessToken:
            String? =
            null

        var limit:
            Int? =
            null

        override fun getHistory(
            accessToken:
                String,

            limit:
                Int,
        ): MatchHistoryResponse {
            called =
                true

            this.accessToken =
                accessToken

            this.limit =
                limit

            return response
        }
    }

    private class FailingMatchHistoryApi(
        private val failure:
            AtoutiaMatchHistoryApiException,
    ) : AtoutiaMatchHistoryApi {
        var called:
            Boolean =
            false

        var accessToken:
            String? =
            null

        var limit:
            Int? =
            null

        override fun getHistory(
            accessToken:
                String,

            limit:
                Int,
        ): MatchHistoryResponse {
            called =
                true

            this.accessToken =
                accessToken

            this.limit =
                limit

            throw failure
        }
    }
}
