package tech.devoo.atoutia.auth

interface AuthSessionApi {
    fun refresh(
        refreshToken:
            String,
    ): AuthSessionTokens

    fun logout(
        refreshToken:
            String,
    )
}

class AuthSessionRejectedException(
    message:
        String =
            "Atoutia authentication session is no longer valid.",

    cause:
        Throwable? =
            null,
) : Exception(
    message,
    cause,
)

class AuthSessionProtocolException(
    message:
        String,

    cause:
        Throwable? =
            null,
) : Exception(
    message,
    cause,
)