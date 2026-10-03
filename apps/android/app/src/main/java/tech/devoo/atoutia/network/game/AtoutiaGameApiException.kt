package tech.devoo.atoutia.network.game

class AtoutiaGameApiException(
    message:
        String,

    val statusCode:
        Int? =
        null,

    val errorCode:
        String? =
        null,

    cause:
        Throwable? =
        null,
) : Exception(
    message,
    cause,
)