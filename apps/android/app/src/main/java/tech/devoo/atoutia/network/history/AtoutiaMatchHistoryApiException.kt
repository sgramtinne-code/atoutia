package tech.devoo.atoutia.network.history

class AtoutiaMatchHistoryApiException(
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
