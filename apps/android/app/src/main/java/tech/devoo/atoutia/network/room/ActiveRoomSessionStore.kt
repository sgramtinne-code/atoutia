package tech.devoo.atoutia.network.room

import android.content.Context

data class ActiveRoomSessionReference(
    val accountId:
        String,

    val sessionId:
        String,

    val player:
        PlayerPosition,
)

interface ActiveRoomSessionStore {
    fun save(
        reference:
            ActiveRoomSessionReference,
    )

    fun load():
        ActiveRoomSessionReference?

    fun clear()
}

class AndroidActiveRoomSessionStore(
    context:
        Context,
) : ActiveRoomSessionStore {
    private val preferences =
        context
            .applicationContext
            .getSharedPreferences(
                PREFERENCES_NAME,
                Context.MODE_PRIVATE,
            )

    override fun save(
        reference:
            ActiveRoomSessionReference,
    ) {
        require(
            isValidAccountId(
                reference.accountId,
            ),
        ) {
            "Invalid Atoutia active room account ID."
        }

        require(
            isValidSessionId(
                reference.sessionId,
            ),
        ) {
            "Invalid Atoutia active room session ID."
        }

        val saved =
            preferences
                .edit()
                .clear()
                .putInt(
                    KEY_FORMAT_VERSION,
                    FORMAT_VERSION,
                )
                .putString(
                    KEY_ACCOUNT_ID,
                    reference.accountId,
                )
                .putString(
                    KEY_SESSION_ID,
                    reference.sessionId,
                )
                .putString(
                    KEY_PLAYER,
                    reference.player.name,
                )
                .commit()

        check(
            saved,
        ) {
            "Unable to persist Atoutia active room session."
        }
    }

    override fun load():
        ActiveRoomSessionReference? {
        val hasStoredValue =
            preferences.contains(
                KEY_FORMAT_VERSION,
            ) ||
                preferences.contains(
                    KEY_ACCOUNT_ID,
                ) ||
                preferences.contains(
                    KEY_SESSION_ID,
                ) ||
                preferences.contains(
                    KEY_PLAYER,
                )

        if (
            !hasStoredValue
        ) {
            return null
        }

        return try {
            val formatVersion =
                preferences.getInt(
                    KEY_FORMAT_VERSION,
                    INVALID_FORMAT_VERSION,
                )

            val accountId =
                preferences.getString(
                    KEY_ACCOUNT_ID,
                    null,
                )

            val sessionId =
                preferences.getString(
                    KEY_SESSION_ID,
                    null,
                )

            val playerName =
                preferences.getString(
                    KEY_PLAYER,
                    null,
                )

            if (
                formatVersion !=
                    FORMAT_VERSION ||
                accountId ==
                    null ||
                sessionId ==
                    null ||
                playerName ==
                    null ||
                !isValidAccountId(
                    accountId,
                ) ||
                !isValidSessionId(
                    sessionId,
                )
            ) {
                clear()

                return null
            }

            val player =
                try {
                    PlayerPosition.valueOf(
                        playerName,
                    )
                } catch (
                    error:
                        IllegalArgumentException,
                ) {
                    clear()

                    return null
                }

            ActiveRoomSessionReference(
                accountId =
                    accountId,

                sessionId =
                    sessionId,

                player =
                    player,
            )
        } catch (
            error:
                ClassCastException,
        ) {
            clear()

            null
        }
    }

    override fun clear() {
        preferences
            .edit()
            .clear()
            .apply()
    }

    private companion object {
        const val FORMAT_VERSION =
            1

        const val INVALID_FORMAT_VERSION =
            -1

        const val PREFERENCES_NAME =
            "atoutia_active_room_v1"

        const val KEY_FORMAT_VERSION =
            "format_version"

        const val KEY_ACCOUNT_ID =
            "account_id"

        const val KEY_SESSION_ID =
            "room_session_id"

        const val KEY_PLAYER =
            "player"

        val SESSION_ID_PATTERN =
            Regex(
                "^ms1_[0-9a-f]{32}$",
            )

        fun isValidAccountId(
            value:
                String,
        ): Boolean =
            value.isNotBlank() &&
                value ==
                    value.trim() &&
                value.none {
                    it.isWhitespace()
                }

        fun isValidSessionId(
            value:
                String,
        ): Boolean =
            SESSION_ID_PATTERN.matches(
                value,
            )
    }
}