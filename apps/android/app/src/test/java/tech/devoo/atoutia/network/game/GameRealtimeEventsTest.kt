package tech.devoo.atoutia.network.game

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tech.devoo.atoutia.network.room.MatchMode
import tech.devoo.atoutia.network.room.PlayerPosition

class GameRealtimeEventsTest {
    @Test
    fun parsesCompletePresenceMessage() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "$TEST_SESSION_ID",
                  "players": [
                    {
                      "player": "PLAYER_0",
                      "connected": true,
                      "lastSeenAtMs": 1000
                    },
                    {
                      "player": "PLAYER_1",
                      "connected": false,
                      "lastSeenAtMs": 900
                    },
                    {
                      "player": "PLAYER_2",
                      "connected": false,
                      "lastSeenAtMs": null
                    },
                    {
                      "player": "PLAYER_3",
                      "connected": true,
                      "lastSeenAtMs": 1100
                    }
                  ],
                  "connectionStates": [
                    {
                      "player": "PLAYER_0",
                      "state": "CONNECTED",
                      "disconnectedAtMs": null,
                      "graceDeadlineAtMs": null
                    },
                    {
                      "player": "PLAYER_1",
                      "state": "RECONNECTING",
                      "disconnectedAtMs": 800,
                      "graceDeadlineAtMs": 120800
                    },
                    {
                      "player": "PLAYER_2",
                      "state": "ABSENT",
                      "disconnectedAtMs": 700,
                      "graceDeadlineAtMs": 120700
                    },
                    {
                      "player": "PLAYER_3",
                      "state": "CONNECTED",
                      "disconnectedAtMs": null,
                      "graceDeadlineAtMs": null
                    }
                  ],
                  "absences": [
                    {
                      "player": "PLAYER_0",
                      "status": "NOT_ABSENT",
                      "mode": "CASUAL",
                      "absentSinceMs": null,
                      "eligibleAtMs": null,
                      "remainingMs": null
                    },
                    {
                      "player": "PLAYER_1",
                      "status": "NOT_ABSENT",
                      "mode": "CASUAL",
                      "absentSinceMs": null,
                      "eligibleAtMs": null,
                      "remainingMs": null
                    },
                    {
                      "player": "PLAYER_2",
                      "status": "WAITING",
                      "mode": "CASUAL",
                      "absentSinceMs": 120700,
                      "eligibleAtMs": 300700,
                      "remainingMs": 180000
                    },
                    {
                      "player": "PLAYER_3",
                      "status": "NOT_ABSENT",
                      "mode": "CASUAL",
                      "absentSinceMs": null,
                      "eligibleAtMs": null,
                      "remainingMs": null
                    }
                  ],
                  "resolutions": [
                    {
                      "player": "PLAYER_0",
                      "action": "NONE",
                      "automatic": false
                    },
                    {
                      "player": "PLAYER_1",
                      "action": "NONE",
                      "automatic": false
                    },
                    {
                      "player": "PLAYER_2",
                      "action": "NONE",
                      "automatic": false
                    },
                    {
                      "player": "PLAYER_3",
                      "action": "NONE",
                      "automatic": false
                    }
                  ]
                }
                """.trimIndent(),
            )

        val presence =
            GameRealtimeEventParser
                .parsePresence(
                    message,
                )

        assertEquals(
            TEST_SESSION_ID,
            presence.sessionId,
        )

        assertEquals(
            4,
            presence.players.size,
        )

        assertEquals(
            GameRealtimePresencePlayer(
                player =
                    PlayerPosition.PLAYER_0,

                connected =
                    true,

                lastSeenAtMs =
                    1000L,
            ),
            presence.players[0],
        )

        assertEquals(
            GameRealtimePresencePlayer(
                player =
                    PlayerPosition.PLAYER_2,

                connected =
                    false,

                lastSeenAtMs =
                    null,
            ),
            presence.players[2],
        )

        assertEquals(
            GameRealtimeConnectionState(
                player =
                    PlayerPosition.PLAYER_1,

                state =
                    GameRealtimeConnectionStateName.RECONNECTING,

                disconnectedAtMs =
                    800L,

                graceDeadlineAtMs =
                    120800L,
            ),
            presence.connectionStates[1],
        )

        assertEquals(
            GameRealtimeConnectionState(
                player =
                    PlayerPosition.PLAYER_2,

                state =
                    GameRealtimeConnectionStateName.ABSENT,

                disconnectedAtMs =
                    700L,

                graceDeadlineAtMs =
                    120700L,
            ),
            presence.connectionStates[2],
        )

        assertEquals(
            GameRealtimeAbsencePlayer(
                player =
                    PlayerPosition.PLAYER_2,

                status =
                    GameRealtimeAbsenceStatus.WAITING,

                mode =
                    MatchMode.CASUAL,

                absentSinceMs =
                    120700L,

                eligibleAtMs =
                    300700L,

                remainingMs =
                    180000L,
            ),
            presence.absences[2],
        )

        assertEquals(
            GameRealtimeAbsenceResolution(
                player =
                    PlayerPosition.PLAYER_2,

                action =
                    GameRealtimeAbsenceResolutionAction.NONE,

                automatic =
                    false,
            ),
            presence.resolutions[2],
        )
    }

    @Test
    fun parsesAutomaticCasualBotTakeoverPresence() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "$TEST_SESSION_ID",
                  "players": [],
                  "connectionStates": [],
                  "absences": [
                    {
                      "player": "PLAYER_1",
                      "status": "ELIGIBLE",
                      "mode": "CASUAL",
                      "absentSinceMs": 1000,
                      "eligibleAtMs": 181000,
                      "remainingMs": 0
                    }
                  ],
                  "resolutions": [
                    {
                      "player": "PLAYER_1",
                      "action": "BOT_TAKEOVER",
                      "automatic": true
                    }
                  ]
                }
                """.trimIndent(),
            )

        val presence =
            GameRealtimeEventParser
                .parsePresence(
                    message,
                )

        assertEquals(
            1,
            presence.absences.size,
        )

        assertEquals(
            GameRealtimeAbsenceStatus.ELIGIBLE,
            presence.absences
                .single()
                .status,
        )

        assertEquals(
            MatchMode.CASUAL,
            presence.absences
                .single()
                .mode,
        )

        assertEquals(
            0L,
            presence.absences
                .single()
                .remainingMs,
        )

        assertEquals(
            GameRealtimeAbsenceResolutionAction.BOT_TAKEOVER,
            presence.resolutions
                .single()
                .action,
        )

        assertTrue(
            presence.resolutions
                .single()
                .automatic,
        )
    }

    @Test
    fun parsesRankedTeamForfeitPresence() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "$TEST_SESSION_ID",
                  "players": [],
                  "connectionStates": [],
                  "absences": [
                    {
                      "player": "PLAYER_3",
                      "status": "ELIGIBLE",
                      "mode": "RANKED",
                      "absentSinceMs": 1000,
                      "eligibleAtMs": 181000,
                      "remainingMs": 0
                    }
                  ],
                  "resolutions": [
                    {
                      "player": "PLAYER_3",
                      "action": "TEAM_FORFEIT",
                      "automatic": true
                    }
                  ]
                }
                """.trimIndent(),
            )

        val presence =
            GameRealtimeEventParser
                .parsePresence(
                    message,
                )

        assertEquals(
            MatchMode.RANKED,
            presence.absences
                .single()
                .mode,
        )

        assertEquals(
            GameRealtimeAbsenceResolutionAction.TEAM_FORFEIT,
            presence.resolutions
                .single()
                .action,
        )

        assertTrue(
            presence.resolutions
                .single()
                .automatic,
        )
    }

    @Test
    fun parsesPrivateManualAbsencePresence() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "$TEST_SESSION_ID",
                  "players": [],
                  "connectionStates": [],
                  "absences": [
                    {
                      "player": "PLAYER_2",
                      "status": "WAITING",
                      "mode": "PRIVATE",
                      "absentSinceMs": 5000,
                      "eligibleAtMs": null,
                      "remainingMs": null
                    }
                  ],
                  "resolutions": [
                    {
                      "player": "PLAYER_2",
                      "action": "MANUAL_ONLY",
                      "automatic": false
                    }
                  ]
                }
                """.trimIndent(),
            )

        val presence =
            GameRealtimeEventParser
                .parsePresence(
                    message,
                )

        assertEquals(
            MatchMode.PRIVATE,
            presence.absences
                .single()
                .mode,
        )

        assertEquals(
            null,
            presence.absences
                .single()
                .eligibleAtMs,
        )

        assertEquals(
            GameRealtimeAbsenceResolutionAction.MANUAL_ONLY,
            presence.resolutions
                .single()
                .action,
        )

        assertEquals(
            false,
            presence.resolutions
                .single()
                .automatic,
        )
    }

    @Test
    fun parsesActiveAdjudication() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "ADJUDICATION",
                  "sessionId": "$TEST_SESSION_ID",
                  "adjudication": {
                    "formatVersion": 1,
                    "status": "ACTIVE",
                    "completion": null,
                    "completedAtMs": null
                  }
                }
                """.trimIndent(),
            )

        val event =
            GameRealtimeEventParser
                .parseAdjudication(
                    message,
                )

        assertEquals(
            TEST_SESSION_ID,
            event.sessionId,
        )

        assertEquals(
            GameRealtimeAdjudication.Active,
            event.adjudication,
        )
    }

    @Test
    fun parsesNormalCompletedAdjudication() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "ADJUDICATION",
                  "sessionId": "$TEST_SESSION_ID",
                  "adjudication": {
                    "formatVersion": 1,
                    "status": "COMPLETED",
                    "completion": "NORMAL",
                    "completedAtMs": 123456789
                  }
                }
                """.trimIndent(),
            )

        val event =
            GameRealtimeEventParser
                .parseAdjudication(
                    message,
                )

        assertEquals(
            GameRealtimeAdjudication.Normal(
                completedAtMs =
                    123456789L,
            ),
            event.adjudication,
        )
    }

    @Test
    fun parsesPlayerAbsenceForfeitAdjudication() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "ADJUDICATION",
                  "sessionId": "$TEST_SESSION_ID",
                  "adjudication": {
                    "formatVersion": 1,
                    "status": "COMPLETED",
                    "completion": "FORFEIT",
                    "reason": "PLAYER_ABSENCE",
                    "forfeitingPlayer": "PLAYER_1",
                    "losingTeam": "TEAM_1",
                    "winningTeam": "TEAM_0",
                    "completedAtMs": 987654321
                  }
                }
                """.trimIndent(),
            )

        val event =
            GameRealtimeEventParser
                .parseAdjudication(
                    message,
                )

        assertEquals(
            GameRealtimeAdjudication.Forfeit(
                forfeitingPlayer =
                    PlayerPosition.PLAYER_1,

                losingTeam =
                    MatchTeam.TEAM_1,

                winningTeam =
                    MatchTeam.TEAM_0,

                completedAtMs =
                    987654321L,
            ),
            event.adjudication,
        )
    }

    @Test
    fun rejectsUnsupportedRealtimeProtocolVersion() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 2,
                  "type": "PRESENCE",
                  "sessionId": "$TEST_SESSION_ID",
                  "players": [],
                  "connectionStates": [],
                  "absences": [],
                  "resolutions": []
                }
                """.trimIndent(),
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                GameRealtimeEventParser
                    .parsePresence(
                        message,
                    )
            }

        assertEquals(
            "Version du protocole temps réel Atoutia non supportée.",
            error.message,
        )
    }

    @Test
    fun rejectsPresenceForInvalidSessionIdentifier() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "invalid-room",
                  "players": [],
                  "connectionStates": [],
                  "absences": [],
                  "resolutions": []
                }
                """.trimIndent(),
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                GameRealtimeEventParser
                    .parsePresence(
                        message,
                    )
            }

        assertEquals(
            "Identifiant de salon temps réel Atoutia invalide.",
            error.message,
        )
    }

    @Test
    fun rejectsUnknownConnectionState() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "$TEST_SESSION_ID",
                  "players": [],
                  "connectionStates": [
                    {
                      "player": "PLAYER_0",
                      "state": "OFFLINE",
                      "disconnectedAtMs": 1000,
                      "graceDeadlineAtMs": 2000
                    }
                  ],
                  "absences": [],
                  "resolutions": []
                }
                """.trimIndent(),
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                GameRealtimeEventParser
                    .parsePresence(
                        message,
                    )
            }

        assertEquals(
            "État de connexion temps réel Atoutia non supporté.",
            error.message,
        )
    }

    @Test
    fun rejectsNegativePresenceTimestamp() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "PRESENCE",
                  "sessionId": "$TEST_SESSION_ID",
                  "players": [
                    {
                      "player": "PLAYER_0",
                      "connected": true,
                      "lastSeenAtMs": -1
                    }
                  ],
                  "connectionStates": [],
                  "absences": [],
                  "resolutions": []
                }
                """.trimIndent(),
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                GameRealtimeEventParser
                    .parsePresence(
                        message,
                    )
            }

        assertEquals(
            "Champ lastSeenAtMs du message temps réel Atoutia négatif.",
            error.message,
        )
    }

    @Test
    fun rejectsUnsupportedAdjudicationFormatVersion() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "ADJUDICATION",
                  "sessionId": "$TEST_SESSION_ID",
                  "adjudication": {
                    "formatVersion": 2,
                    "status": "ACTIVE",
                    "completion": null,
                    "completedAtMs": null
                  }
                }
                """.trimIndent(),
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                GameRealtimeEventParser
                    .parseAdjudication(
                        message,
                    )
            }

        assertEquals(
            "Version d’adjudication temps réel Atoutia non supportée.",
            error.message,
        )
    }

    @Test
    fun rejectsUnknownForfeitReason() {
        val message =
            JSONObject(
                """
                {
                  "protocolVersion": 1,
                  "type": "ADJUDICATION",
                  "sessionId": "$TEST_SESSION_ID",
                  "adjudication": {
                    "formatVersion": 1,
                    "status": "COMPLETED",
                    "completion": "FORFEIT",
                    "reason": "UNKNOWN",
                    "forfeitingPlayer": "PLAYER_1",
                    "losingTeam": "TEAM_1",
                    "winningTeam": "TEAM_0",
                    "completedAtMs": 1000
                  }
                }
                """.trimIndent(),
            )

        val error =
            assertThrows(
                IllegalArgumentException::class.java,
            ) {
                GameRealtimeEventParser
                    .parseAdjudication(
                        message,
                    )
            }

        assertEquals(
            "Raison de forfait Atoutia non supportée.",
            error.message,
        )
    }

    private companion object {
        const val TEST_SESSION_ID =
            "ms1_0123456789abcdef0123456789abcdef"
    }
}