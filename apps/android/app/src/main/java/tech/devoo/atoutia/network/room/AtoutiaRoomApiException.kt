package tech.devoo.atoutia.network.room

class AtoutiaRoomApiException(
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