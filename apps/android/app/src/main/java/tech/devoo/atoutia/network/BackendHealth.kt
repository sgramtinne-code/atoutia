package tech.devoo.atoutia.network

data class BackendHealth(
    val status: String,
    val service: String,
    val engineVersion: String,
    val liveRooms: Int,
) {
    init {
        require(
            status ==
                "ok",
        ) {
            "Unexpected Atoutia backend status."
        }

        require(
            service ==
                "@atoutia/backend",
        ) {
            "Unexpected Atoutia backend service."
        }

        require(
            engineVersion.isNotBlank() &&
                engineVersion ==
                engineVersion.trim(),
        ) {
            "Invalid Atoutia engine version."
        }

        require(
            liveRooms >=
                0,
        ) {
            "Live room count must be non-negative."
        }
    }
}