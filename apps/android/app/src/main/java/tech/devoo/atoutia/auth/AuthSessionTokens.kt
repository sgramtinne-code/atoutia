package tech.devoo.atoutia.auth

data class AuthSessionTokens(
    val accountId: String,
    val sessionId: String,
    val accessToken: String,
    val refreshToken: String,
    val accessExpiresAtMs: Long,
) {
    init {
        require(
            accountId.isNotBlank() &&
                accountId == accountId.trim() &&
                accountId.startsWith("acc1_"),
        ) {
            "Invalid Atoutia account id."
        }

        require(
            sessionId.isNotBlank() &&
                sessionId == sessionId.trim() &&
                sessionId.startsWith("as1_"),
        ) {
            "Invalid Atoutia auth session id."
        }

        require(
            accessToken.isNotBlank() &&
                accessToken == accessToken.trim() &&
                accessToken.startsWith("atk1_"),
        ) {
            "Invalid Atoutia access token."
        }

        require(
            refreshToken.isNotBlank() &&
                refreshToken == refreshToken.trim() &&
                refreshToken.startsWith("art1_"),
        ) {
            "Invalid Atoutia refresh token."
        }

        require(
            accessExpiresAtMs >= 0L,
        ) {
            "Access token expiration must be non-negative."
        }
    }

    fun isAccessTokenExpired(
        nowMs: Long,
    ): Boolean {
        require(
            nowMs >= 0L,
        ) {
            "Current time must be non-negative."
        }

        return nowMs >=
            accessExpiresAtMs
    }
}