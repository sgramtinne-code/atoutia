package tech.devoo.atoutia.network.room

import org.junit.Assert.*
import org.junit.Test

class RoomInvitationTest {
    private val code = "ms1_0123456789abcdef0123456789abcdef"

    @Test fun invitationsRoundTripWithOnlyTheRoomCode() {
        for (id in listOf(code, "ms1_" + "0".repeat(32), "ms1_" + "f".repeat(32))) {
            assertEquals("Invitation Atoutia\nCode du salon : $id", RoomInvitation.create(id))
            assertEquals(id, RoomInvitation.parse(RoomInvitation.create(id)))
        }
    }

    @Test fun rawCodesAndOuterWhitespaceAndWindowsLineEndingsAreAccepted() {
        assertEquals(code, RoomInvitation.parse(" \n$code\r\n "))
        assertEquals(code, RoomInvitation.parse("\r\n" + RoomInvitation.create(code).replace("\n", "\r\n") + "\r\n"))
    }

    @Test fun malformedCodesAndUntrustedMessagesAreNeverExtracted() {
        for (text in listOf("", "ms1_test", code.uppercase(), code.dropLast(1), code + "0",
            "https://example.invalid/$code", "atoutia://join/$code", "$code/", "$code?token=secret",
            "$code#fragment", "$code%0a", "Une invitation : $code", "$code\n$code",
            "Invitation Atoutia\nCode du salon : $code\njeton: secret", "Invitation Atoutia\nCode du salon : $code\nCode du salon : $code",
            "Invitation Atoutia\nCode du salon : \u202e$code", "Invitation Atoutia\nCode du salon : $code\u0000")) {
            assertNull(text, RoomInvitation.parse(text))
        }
    }

    @Test fun oversizedInputIsRejectedBeforeNormalizationWithoutTruncatingToAValidCode() {
        assertNull(RoomInvitation.parse(code + " ".repeat(RoomInvitation.MAX_INPUT_LENGTH)))
        assertNull(RoomInvitation.parse(RoomInvitation.create(code) + "x".repeat(RoomInvitation.MAX_INPUT_LENGTH)))
        assertEquals(code, RoomInvitation.parse(code))
    }

    @Test fun formatterRejectsAnythingOtherThanACanonicalCode() {
        for (text in listOf("", " $code", "$code ", RoomInvitation.create(code), "$code?token=secret")) {
            assertThrows(IllegalArgumentException::class.java) { RoomInvitation.create(text) }
        }
    }
}
