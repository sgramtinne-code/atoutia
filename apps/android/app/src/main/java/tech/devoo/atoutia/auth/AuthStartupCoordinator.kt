package tech.devoo.atoutia.auth

import java.io.IOException

sealed interface AuthStartupState {
    data object Loading :
        AuthStartupState

    data object SignedOut :
        AuthStartupState

    data class Authenticated(
        val accountId:
            String,

        val sessionId:
            String,
    ) : AuthStartupState

    data class TemporarilyUnavailable(
        val message:
            String,
    ) : AuthStartupState
}

class AuthStartupCoordinator(
    private val sessionCoordinator:
        AuthSessionCoordinator,
) {
    fun restore():
        AuthStartupState {
        return try {
            val accessToken =
                sessionCoordinator
                    .accessTokenOrRefresh()
                    ?: return AuthStartupState
                        .SignedOut

            check(
                accessToken.isNotBlank(),
            ) {
                "Atoutia authentication returned an empty access token."
            }

            val session =
                sessionCoordinator
                    .loadSession()
                    ?: return AuthStartupState
                        .SignedOut

            AuthStartupState.Authenticated(
                accountId =
                    session.accountId,

                sessionId =
                    session.sessionId,
            )
        } catch (
            error:
                AuthSessionRejectedException,
        ) {
            AuthStartupState.SignedOut
        } catch (
            error:
                AuthSessionProtocolException,
        ) {
            AuthStartupState.SignedOut
        } catch (
            error:
                IOException,
        ) {
            AuthStartupState.TemporarilyUnavailable(
                message =
                    error.message
                        ?: "Le backend Atoutia est temporairement inaccessible.",
            )
        }
    }
}