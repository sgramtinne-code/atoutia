package tech.devoo.atoutia.offline

import org.junit.Assert.*
import org.junit.Test

class SoloPreferencesTest {
    @Test fun freshInstallKeepsTheExistingPaceAndDirectCardPlay() {
        assertEquals(SoloPreferences(SoloPace.NORMAL, false), SoloPreferences.decode(null))
        assertEquals(350L, SoloPreferences.decode(null).pace.delayMillis)
    }

    @Test fun savedChoicesRoundTripWithoutGameData() {
        for (pace in SoloPace.entries) for (confirm in listOf(false, true)) {
            val value = SoloPreferences(pace, confirm)
            assertEquals(value, SoloPreferences.decode(value.encode()))
        }
        assertTrue(SoloPace.FAST.delayMillis < SoloPace.NORMAL.delayMillis)
        assertTrue(SoloPace.RELAXED.delayMillis > SoloPace.NORMAL.delayMillis)
    }

    @Test fun unknownOrDamagedSettingsAreRejectedInsteadOfSilentlyReplacingChoices() {
        val valid = SoloPreferences().encode()
        val invalid = listOf("", "{}", valid.replace("NORMAL", "FUTURE"),
            valid.replace("\"formatVersion\":1", "\"formatVersion\":2"),
            valid.replace("\"formatVersion\":1", "\"formatVersion\":1.0"),
            valid.replace("false", "\"false\""), valid.replace("false", "null"),
            valid.dropLast(1) + ",\"extra\":true}", " ".repeat(1025))
        for (text in invalid) assertThrows(Exception::class.java) { SoloPreferences.decode(text) }
    }
}
