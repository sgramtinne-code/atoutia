package tech.devoo.atoutia.network.room

/** Data-only invitation. No token, endpoint, seat claim or automatic navigation. */
internal object RoomInvitation {
    const val MAX_INPUT_LENGTH = 1024
    private const val PREFIX = "Invitation Atoutia\nCode du salon : "
    private val code = Regex("ms1_[0-9a-f]{32}")

    fun create(sessionId: String): String {
        require(code.matches(sessionId)) { "Invalid room invitation code." }
        return PREFIX + sessionId
    }

    fun parse(text: String): String? {
        if (text.length > MAX_INPUT_LENGTH) return null
        val value = text.trim().replace("\r\n", "\n")
        val candidate = if (value.startsWith(PREFIX)) value.removePrefix(PREFIX) else value
        return candidate.takeIf(code::matches)
    }
}
