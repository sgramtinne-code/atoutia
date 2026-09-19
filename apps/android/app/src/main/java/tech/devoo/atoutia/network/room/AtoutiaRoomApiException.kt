package tech.devoo.atoutia.network.room

class AtoutiaRoomApiException(
    message:
        String,

    cause:
        Throwable? =
        null,
) : Exception(
    message,
    cause,
)