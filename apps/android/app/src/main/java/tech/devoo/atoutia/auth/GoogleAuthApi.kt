package tech.devoo.atoutia.auth

interface GoogleAuthApi {
    fun authenticate(
        idToken:
            String,
    ): GoogleAuthResult
}

data class GoogleAuthResult(
    val session:
        AuthSessionTokens,

    val accountCreated:
        Boolean,
)

class GoogleAuthRejectedException(
    message:
        String,
) : Exception(
    message,
)

class GoogleAuthUnavailableException(
    message:
        String,
) : Exception(
    message,
)

class GoogleAuthProtocolException(
    message:
        String,
) : Exception(
    message,
)