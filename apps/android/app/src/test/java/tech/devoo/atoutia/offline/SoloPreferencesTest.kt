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
            valid.replace("\"formatVersion\":2", "\"formatVersion\":3"),
            valid.replace("\"formatVersion\":2", "\"formatVersion\":2.0"),
            valid.replace("false", "\"false\""), valid.replace("false", "null"),
            valid.dropLast(1) + ",\"extra\":true}", " ".repeat(1025))
        for (text in invalid) assertThrows(Exception::class.java) { SoloPreferences.decode(text) }
    }

    @Test fun legacySettingsKeepTheirChoicesAndOriginalBotsUntilAnExplicitChange() {
        val legacy = "{\"formatVersion\":1,\"pace\":\"FAST\",\"confirmCards\":true}"
        val decoded = SoloPreferences.decode(legacy)
        assertEquals(SoloPreferences(SoloPace.FAST, true, SoloBotTable.CLASSIC), decoded)
        assertEquals(decoded, SoloPreferences.decode(decoded.encode()))
    }

    @Test fun allBotTablesRoundTripWithTheirVersionedPolicy() {
        assertEquals(SoloBotTable.MIXED, SoloPreferences.decode(null).botTable)
        for (table in SoloBotTable.entries) {
            val preferences = SoloPreferences(botTable = table)
            assertEquals(preferences, SoloPreferences.decode(preferences.encode()))
            assertEquals(table, SoloBotTable.fromPolicy(table.policy))
        }
    }

    @Test fun unknownTablesAndPoliciesCannotSilentlySelectDifferentBots() {
        val saved = SoloPreferences().encode()
        for (value in listOf(saved.replace("MIXED", "FUTURE"), saved.replace("\"MIXED\"", "123"))) {
            assertThrows(Exception::class.java) { SoloPreferences.decode(value) }
        }
        assertThrows(IllegalArgumentException::class.java) { SoloBotTable.fromPolicy("future-v1") }
    }
}
