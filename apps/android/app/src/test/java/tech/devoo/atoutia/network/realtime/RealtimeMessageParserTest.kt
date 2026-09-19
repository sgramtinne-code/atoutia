package tech.devoo.atoutia.network.realtime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class RealtimeMessageParserTest {
    private val parser =
        RealtimeMessageParser()

    @Test
    fun parsesSnapshot() {
        val event =
            parser.parse(
                """
                {
                  "protocolVersion": 1,
                  "type": "SNAPSHOT",
                  "snapshot": {
                    "sessionId": "ms1_test",
                    "revision": 7,
                    "player": "PLAYER_1"
                  }
                }
                """.trimIndent(),
            )

        assertEquals(
            RealtimeEvent.Snapshot(
                sessionId =
                    "ms1_test",

                revision =
                    7,
            ),
            event,
        )
    }

    @Test
    fun parsesPresence() {
        val event =
            parser.parse(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "ms1_test",
                  "players": [],
                  "connectionStates": [],
                  "absences": [],
                  "resolutions": []
                }
                """.trimIndent(),
            )

        assertEquals(
            RealtimeEvent.Presence(
                sessionId =
                    "ms1_test",
            ),
            event,
        )
    }

    @Test
    fun parsesAdjudication() {
        val event =
            parser.parse(
                """
                {
                  "protocolVersion": 1,
                  "type": "ADJUDICATION",
                  "sessionId": "ms1_test",
                  "adjudication": {}
                }
                """.trimIndent(),
            )

        assertEquals(
            RealtimeEvent.Adjudication(
                sessionId =
                    "ms1_test",
            ),
            event,
        )
    }

    @Test
    fun parsesServerError() {
        val event =
            parser.parse(
                """
                {
                  "protocolVersion": 1,
                  "type": "ERROR",
                  "code": "REVISION_MISMATCH"
                }
                """.trimIndent(),
            )

        assertEquals(
            RealtimeEvent.ServerError(
                code =
                    "REVISION_MISMATCH",
            ),
            event,
        )
    }

    @Test
    fun rejectsUnsupportedProtocolVersion() {
        val error =
            assertThrows(
                RealtimeProtocolException::class.java,
            ) {
                parser.parse(
                    """
                    {
                      "protocolVersion": 2,
                      "type": "ERROR",
                      "code": "ROOM_NOT_FOUND"
                    }
                    """.trimIndent(),
                )
            }

        assertEquals(
            "Version du protocole temps réel Atoutia non supportée.",
            error.message,
        )
    }

    @Test
    fun rejectsUnknownMessageType() {
        val error =
            assertThrows(
                RealtimeProtocolException::class.java,
            ) {
                parser.parse(
                    """
                    {
                      "protocolVersion": 1,
                      "type": "UNKNOWN"
                    }
                    """.trimIndent(),
                )
            }

        assertEquals(
            "Type de message temps réel Atoutia non supporté : UNKNOWN.",
            error.message,
        )
    }

    @Test
    fun rejectsInvalidJson() {
        assertThrows(
            RealtimeProtocolException::class.java,
        ) {
            parser.parse(
                "not-json",
            )
        }
    }
}