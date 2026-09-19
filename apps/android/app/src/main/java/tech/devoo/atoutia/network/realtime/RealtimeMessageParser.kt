package tech.devoo.atoutia.network.realtime

import org.json.JSONObject

class RealtimeMessageParser {
    fun parse(
        text: String,
    ): RealtimeEvent {
        val json =
            try {
                JSONObject(
                    text,
                )
            } catch (
                error: Exception,
            ) {
                throw RealtimeProtocolException(
                    "Le message temps réel Atoutia n’est pas un JSON valide.",
                    error,
                )
            }

        val protocolVersion =
            requireInteger(
                json = json,
                key = "protocolVersion",
            )

        if (
            protocolVersion != 1
        ) {
            throw RealtimeProtocolException(
                "Version du protocole temps réel Atoutia non supportée.",
            )
        }

        return when (
            val type =
                requireString(
                    json = json,
                    key = "type",
                )
        ) {
            "SNAPSHOT" ->
                parseSnapshot(
                    json,
                )

            "PRESENCE" ->
                parsePresence(
                    json,
                )

            "ADJUDICATION" ->
                parseAdjudication(
                    json,
                )

            "ERROR" ->
                parseError(
                    json,
                )

            else ->
                throw RealtimeProtocolException(
                    "Type de message temps réel Atoutia non supporté : $type.",
                )
        }
    }

    private fun parseSnapshot(
        json: JSONObject,
    ): RealtimeEvent.Snapshot {
        val snapshot =
            requireObject(
                json = json,
                key = "snapshot",
            )

        return RealtimeEvent.Snapshot(
            sessionId =
                requireString(
                    json = snapshot,
                    key = "sessionId",
                ),

            revision =
                requireInteger(
                    json = snapshot,
                    key = "revision",
                ),
        )
    }

    private fun parsePresence(
        json: JSONObject,
    ): RealtimeEvent.Presence =
        RealtimeEvent.Presence(
            sessionId =
                requireString(
                    json = json,
                    key = "sessionId",
                ),
        )

    private fun parseAdjudication(
        json: JSONObject,
    ): RealtimeEvent.Adjudication =
        RealtimeEvent.Adjudication(
            sessionId =
                requireString(
                    json = json,
                    key = "sessionId",
                ),
        )

    private fun parseError(
        json: JSONObject,
    ): RealtimeEvent.ServerError =
        RealtimeEvent.ServerError(
            code =
                requireString(
                    json = json,
                    key = "code",
                ),
        )

    private fun requireObject(
        json: JSONObject,
        key: String,
    ): JSONObject =
        try {
            json.getJSONObject(
                key,
            )
        } catch (
            error: Exception,
        ) {
            throw RealtimeProtocolException(
                "Le message temps réel Atoutia ne contient pas un objet $key valide.",
                error,
            )
        }

    private fun requireString(
        json: JSONObject,
        key: String,
    ): String {
        val value =
            try {
                json.getString(
                    key,
                )
            } catch (
                error: Exception,
            ) {
                throw RealtimeProtocolException(
                    "Le message temps réel Atoutia ne contient pas un champ $key valide.",
                    error,
                )
            }

        if (
            value.isBlank()
        ) {
            throw RealtimeProtocolException(
                "Le champ $key du message temps réel Atoutia est vide.",
            )
        }

        return value
    }

    private fun requireInteger(
        json: JSONObject,
        key: String,
    ): Int =
        try {
            json.getInt(
                key,
            )
        } catch (
            error: Exception,
        ) {
            throw RealtimeProtocolException(
                "Le message temps réel Atoutia ne contient pas un entier $key valide.",
                error,
            )
        }
}

class RealtimeProtocolException(
    message: String,
    cause: Throwable? = null,
) : Exception(
    message,
    cause,
)