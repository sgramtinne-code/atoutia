package tech.devoo.atoutia.network.game

import org.json.JSONArray
import org.json.JSONObject
import tech.devoo.atoutia.network.room.MatchMode
import tech.devoo.atoutia.network.room.PlayerPosition

enum class GameRealtimeConnectionStateName {
    CONNECTED,
    RECONNECTING,
    ABSENT,
}

enum class GameRealtimeAbsenceStatus {
    NOT_ABSENT,
    WAITING,
    ELIGIBLE,
}

enum class GameRealtimeAbsenceResolutionAction {
    NONE,
    MANUAL_ONLY,
    BOT_TAKEOVER,
    TEAM_FORFEIT,
}

data class GameRealtimePresencePlayer(
    val player:
        PlayerPosition,

    val connected:
        Boolean,

    val lastSeenAtMs:
        Long?,
)

data class GameRealtimeConnectionState(
    val player:
        PlayerPosition,

    val state:
        GameRealtimeConnectionStateName,

    val disconnectedAtMs:
        Long?,

    val graceDeadlineAtMs:
        Long?,
)

data class GameRealtimeAbsencePlayer(
    val player:
        PlayerPosition,

    val status:
        GameRealtimeAbsenceStatus,

    val mode:
        MatchMode,

    val absentSinceMs:
        Long?,

    val eligibleAtMs:
        Long?,

    val remainingMs:
        Long?,
)

data class GameRealtimeAbsenceResolution(
    val player:
        PlayerPosition,

    val action:
        GameRealtimeAbsenceResolutionAction,

    val automatic:
        Boolean,
)

data class GameRealtimePresence(
    val sessionId:
        String,

    val players:
        List<GameRealtimePresencePlayer>,

    val connectionStates:
        List<GameRealtimeConnectionState>,

    val absences:
        List<GameRealtimeAbsencePlayer>,

    val resolutions:
        List<GameRealtimeAbsenceResolution>,
)

sealed interface GameRealtimeAdjudication {
    data object Active :
        GameRealtimeAdjudication

    data class Normal(
        val completedAtMs:
            Long,
    ) : GameRealtimeAdjudication

    data class Forfeit(
        val forfeitingPlayer:
            PlayerPosition,

        val losingTeam:
            MatchTeam,

        val winningTeam:
            MatchTeam,

        val completedAtMs:
            Long,
    ) : GameRealtimeAdjudication
}

data class GameRealtimeAdjudicationEvent(
    val sessionId:
        String,

    val adjudication:
        GameRealtimeAdjudication,
)

object GameRealtimeEventParser {
    fun parsePresence(
        message:
            JSONObject,
    ): GameRealtimePresence {
        requireProtocolEnvelope(
            message =
                message,

            expectedType =
                "PRESENCE",
        )

        val sessionId =
            requireSessionId(
                message,
            )

        val players =
            parseArray(
                array =
                    requireArray(
                        message,
                        "players",
                    ),

                parser =
                    ::parsePresencePlayer,
            )

        val connectionStates =
            parseArray(
                array =
                    requireArray(
                        message,
                        "connectionStates",
                    ),

                parser =
                    ::parseConnectionState,
            )

        val absences =
            parseArray(
                array =
                    requireArray(
                        message,
                        "absences",
                    ),

                parser =
                    ::parseAbsencePlayer,
            )

        val resolutions =
            parseArray(
                array =
                    requireArray(
                        message,
                        "resolutions",
                    ),

                parser =
                    ::parseAbsenceResolution,
            )

        return GameRealtimePresence(
            sessionId =
                sessionId,

            players =
                players,

            connectionStates =
                connectionStates,

            absences =
                absences,

            resolutions =
                resolutions,
        )
    }

    fun parseAdjudication(
        message:
            JSONObject,
    ): GameRealtimeAdjudicationEvent {
        requireProtocolEnvelope(
            message =
                message,

            expectedType =
                "ADJUDICATION",
        )

        val sessionId =
            requireSessionId(
                message,
            )

        val adjudication =
            requireObject(
                message,
                "adjudication",
            )

        val formatVersion =
            requireInt(
                adjudication,
                "formatVersion",
            )

        require(
            formatVersion ==
                SUPPORTED_ADJUDICATION_FORMAT_VERSION,
        ) {
            "Version d’adjudication temps réel Atoutia non supportée."
        }

        val status =
            requireString(
                adjudication,
                "status",
            )

        val parsed =
            when (
                status
            ) {
                "ACTIVE" -> {
                    val completion =
                        adjudication.opt(
                            "completion",
                        )

                    val completedAt =
                        adjudication.opt(
                            "completedAtMs",
                        )

                    require(
                        completion ==
                            JSONObject.NULL &&
                            completedAt ==
                            JSONObject.NULL,
                    ) {
                        "Adjudication ACTIVE Atoutia invalide."
                    }

                    GameRealtimeAdjudication.Active
                }

                "COMPLETED" -> {
                    parseCompletedAdjudication(
                        adjudication,
                    )
                }

                else -> {
                    throw IllegalArgumentException(
                        "Statut d’adjudication temps réel Atoutia non supporté.",
                    )
                }
            }

        return GameRealtimeAdjudicationEvent(
            sessionId =
                sessionId,

            adjudication =
                parsed,
        )
    }

    private fun parseCompletedAdjudication(
        adjudication:
            JSONObject,
    ): GameRealtimeAdjudication {
        val completion =
            requireString(
                adjudication,
                "completion",
            )

        return when (
            completion
        ) {
            "NORMAL" -> {
                GameRealtimeAdjudication.Normal(
                    completedAtMs =
                        requireNonNegativeLong(
                            adjudication,
                            "completedAtMs",
                        ),
                )
            }

            "FORFEIT" -> {
                val reason =
                    requireString(
                        adjudication,
                        "reason",
                    )

                require(
                    reason ==
                        "PLAYER_ABSENCE",
                ) {
                    "Raison de forfait Atoutia non supportée."
                }

                GameRealtimeAdjudication.Forfeit(
                    forfeitingPlayer =
                        parsePlayerPosition(
                            requireString(
                                adjudication,
                                "forfeitingPlayer",
                            ),
                        ),

                    losingTeam =
                        parseMatchTeam(
                            requireString(
                                adjudication,
                                "losingTeam",
                            ),
                        ),

                    winningTeam =
                        parseMatchTeam(
                            requireString(
                                adjudication,
                                "winningTeam",
                            ),
                        ),

                    completedAtMs =
                        requireNonNegativeLong(
                            adjudication,
                            "completedAtMs",
                        ),
                )
            }

            else -> {
                throw IllegalArgumentException(
                    "Type de fin d’adjudication Atoutia non supporté.",
                )
            }
        }
    }

    private fun parsePresencePlayer(
        value:
            JSONObject,
    ): GameRealtimePresencePlayer =
        GameRealtimePresencePlayer(
            player =
                parsePlayerPosition(
                    requireString(
                        value,
                        "player",
                    ),
                ),

            connected =
                requireBoolean(
                    value,
                    "connected",
                ),

            lastSeenAtMs =
                requireNullableNonNegativeLong(
                    value,
                    "lastSeenAtMs",
                ),
        )

    private fun parseConnectionState(
        value:
            JSONObject,
    ): GameRealtimeConnectionState =
        GameRealtimeConnectionState(
            player =
                parsePlayerPosition(
                    requireString(
                        value,
                        "player",
                    ),
                ),

            state =
                parseConnectionStateName(
                    requireString(
                        value,
                        "state",
                    ),
                ),

            disconnectedAtMs =
                requireNullableNonNegativeLong(
                    value,
                    "disconnectedAtMs",
                ),

            graceDeadlineAtMs =
                requireNullableNonNegativeLong(
                    value,
                    "graceDeadlineAtMs",
                ),
        )

    private fun parseAbsencePlayer(
        value:
            JSONObject,
    ): GameRealtimeAbsencePlayer =
        GameRealtimeAbsencePlayer(
            player =
                parsePlayerPosition(
                    requireString(
                        value,
                        "player",
                    ),
                ),

            status =
                parseAbsenceStatus(
                    requireString(
                        value,
                        "status",
                    ),
                ),

            mode =
                parseMatchMode(
                    requireString(
                        value,
                        "mode",
                    ),
                ),

            absentSinceMs =
                requireNullableNonNegativeLong(
                    value,
                    "absentSinceMs",
                ),

            eligibleAtMs =
                requireNullableNonNegativeLong(
                    value,
                    "eligibleAtMs",
                ),

            remainingMs =
                requireNullableNonNegativeLong(
                    value,
                    "remainingMs",
                ),
        )

    private fun parseAbsenceResolution(
        value:
            JSONObject,
    ): GameRealtimeAbsenceResolution =
        GameRealtimeAbsenceResolution(
            player =
                parsePlayerPosition(
                    requireString(
                        value,
                        "player",
                    ),
                ),

            action =
                parseAbsenceResolutionAction(
                    requireString(
                        value,
                        "action",
                    ),
                ),

            automatic =
                requireBoolean(
                    value,
                    "automatic",
                ),
        )

    private fun requireProtocolEnvelope(
        message:
            JSONObject,

        expectedType:
            String,
    ) {
        val protocolVersion =
            requireInt(
                message,
                "protocolVersion",
            )

        require(
            protocolVersion ==
                REALTIME_PROTOCOL_VERSION,
        ) {
            "Version du protocole temps réel Atoutia non supportée."
        }

        val type =
            requireString(
                message,
                "type",
            )

        require(
            type ==
                expectedType,
        ) {
            "Type de message temps réel Atoutia inattendu."
        }
    }

    private fun requireSessionId(
        json:
            JSONObject,
    ): String {
        val value =
            requireString(
                json,
                "sessionId",
            )

        require(
            SESSION_ID_PATTERN.matches(
                value,
            ),
        ) {
            "Identifiant de salon temps réel Atoutia invalide."
        }

        return value
    }

    private fun parsePlayerPosition(
        value:
            String,
    ): PlayerPosition =
        try {
            PlayerPosition.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw IllegalArgumentException(
                "Position joueur temps réel Atoutia non supportée.",
                error,
            )
        }

    private fun parseConnectionStateName(
        value:
            String,
    ): GameRealtimeConnectionStateName =
        try {
            GameRealtimeConnectionStateName.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw IllegalArgumentException(
                "État de connexion temps réel Atoutia non supporté.",
                error,
            )
        }

    private fun parseAbsenceStatus(
        value:
            String,
    ): GameRealtimeAbsenceStatus =
        try {
            GameRealtimeAbsenceStatus.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw IllegalArgumentException(
                "État d’absence temps réel Atoutia non supporté.",
                error,
            )
        }

    private fun parseMatchMode(
        value:
            String,
    ): MatchMode =
        try {
            MatchMode.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw IllegalArgumentException(
                "Mode de partie temps réel Atoutia non supporté.",
                error,
            )
        }

    private fun parseAbsenceResolutionAction(
        value:
            String,
    ): GameRealtimeAbsenceResolutionAction =
        try {
            GameRealtimeAbsenceResolutionAction.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw IllegalArgumentException(
                "Action d’absence temps réel Atoutia non supportée.",
                error,
            )
        }

    private fun parseMatchTeam(
        value:
            String,
    ): MatchTeam =
        try {
            MatchTeam.valueOf(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw IllegalArgumentException(
                "Équipe temps réel Atoutia non supportée.",
                error,
            )
        }

    private fun requireObject(
        json:
            JSONObject,

        key:
            String,
    ): JSONObject =
        try {
            json.getJSONObject(
                key,
            )
        } catch (
            error:
                Exception,
        ) {
            throw IllegalArgumentException(
                "Objet $key du message temps réel Atoutia invalide.",
                error,
            )
        }

    private fun requireArray(
        json:
            JSONObject,

        key:
            String,
    ): JSONArray =
        try {
            json.getJSONArray(
                key,
            )
        } catch (
            error:
                Exception,
        ) {
            throw IllegalArgumentException(
                "Tableau $key du message temps réel Atoutia invalide.",
                error,
            )
        }

    private fun requireString(
        json:
            JSONObject,

        key:
            String,
    ): String {
        val value =
            try {
                json.getString(
                    key,
                )
            } catch (
                error:
                    Exception,
            ) {
                throw IllegalArgumentException(
                    "Champ $key du message temps réel Atoutia invalide.",
                    error,
                )
            }

        require(
            value.isNotBlank(),
        ) {
            "Champ $key du message temps réel Atoutia vide."
        }

        return value
    }

    private fun requireBoolean(
        json:
            JSONObject,

        key:
            String,
    ): Boolean =
        try {
            json.getBoolean(
                key,
            )
        } catch (
            error:
                Exception,
        ) {
            throw IllegalArgumentException(
                "Champ booléen $key du message temps réel Atoutia invalide.",
                error,
            )
        }

    private fun requireInt(
        json:
            JSONObject,

        key:
            String,
    ): Int =
        try {
            json.getInt(
                key,
            )
        } catch (
            error:
                Exception,
        ) {
            throw IllegalArgumentException(
                "Champ entier $key du message temps réel Atoutia invalide.",
                error,
            )
        }

    private fun requireNonNegativeLong(
        json:
            JSONObject,

        key:
            String,
    ): Long {
        val value =
            try {
                json.getLong(
                    key,
                )
            } catch (
                error:
                    Exception,
            ) {
                throw IllegalArgumentException(
                    "Champ entier $key du message temps réel Atoutia invalide.",
                    error,
                )
            }

        require(
            value >=
                0L,
        ) {
            "Champ $key du message temps réel Atoutia négatif."
        }

        return value
    }

    private fun requireNullableNonNegativeLong(
        json:
            JSONObject,

        key:
            String,
    ): Long? {
        if (
            json.isNull(
                key,
            )
        ) {
            return null
        }

        return requireNonNegativeLong(
            json,
            key,
        )
    }

    private fun <T> parseArray(
        array:
            JSONArray,

        parser:
            (
                JSONObject,
            ) -> T,
    ): List<T> =
        buildList {
            for (
                index in
                    0 until array.length()
            ) {
                val value =
                    try {
                        array.getJSONObject(
                            index,
                        )
                    } catch (
                        error:
                            Exception,
                    ) {
                        throw IllegalArgumentException(
                            "Élément de tableau temps réel Atoutia invalide.",
                            error,
                        )
                    }

                add(
                    parser(
                        value,
                    ),
                )
            }
        }

    private const val REALTIME_PROTOCOL_VERSION =
        1

    private const val SUPPORTED_ADJUDICATION_FORMAT_VERSION =
        1

    private val SESSION_ID_PATTERN =
        Regex(
            "^ms1_[0-9a-f]{32}$",
        )
}