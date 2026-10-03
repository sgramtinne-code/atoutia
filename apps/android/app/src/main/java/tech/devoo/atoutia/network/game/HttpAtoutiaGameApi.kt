package tech.devoo.atoutia.network.game

import org.json.JSONArray
import org.json.JSONObject
import tech.devoo.atoutia.network.room.PlayerPosition
import java.net.HttpURLConnection
import java.net.URI

class HttpAtoutiaGameApi(
    baseUrl:
        String,
) : AtoutiaGameApi {
    private val normalizedBaseUrl =
        normalizeBaseUrl(
            baseUrl,
        )

    override fun getPlayerSnapshot(
        sessionId:
            String,

        accessToken:
            String,
    ): PlayerGameSnapshot {
        val normalizedSessionId =
            validateSessionId(
                sessionId,
            )

        val normalizedAccessToken =
            validateAccessToken(
                accessToken,
            )

        return executePlayerSnapshotRequest(
            path =
                "/api/v1/rooms/$normalizedSessionId/snapshot",

            expectedSessionId =
                normalizedSessionId,

            accessToken =
                normalizedAccessToken,

            requestBody =
                null,
        )
    }

    override fun submitCommand(
        sessionId:
            String,

        expectedRevision:
            Int,

        engineVersion:
            String,

        command:
            PlayerGameCommand,

        accessToken:
            String,
    ): PlayerGameSnapshot {
        val normalizedSessionId =
            validateSessionId(
                sessionId,
            )

        require(
            expectedRevision >=
                0,
        ) {
            "Expected room revision must be non-negative."
        }

        val normalizedEngineVersion =
            validateEngineVersion(
                engineVersion,
            )

        val normalizedAccessToken =
            validateAccessToken(
                accessToken,
            )

        val commandJson =
            when (
                command
            ) {
                PlayerGameCommand.Pass ->
                    JSONObject()
                        .put(
                            "type",
                            "PASS",
                        )

                is PlayerGameCommand.Take ->
                    JSONObject()
                        .put(
                            "type",
                            "TAKE",
                        )
                        .put(
                            "suit",
                            command.suit.name,
                        )

                is PlayerGameCommand.PlayCard ->
                    JSONObject()
                        .put(
                            "type",
                            "PLAY_CARD",
                        )
                        .put(
                            "card",
                            JSONObject()
                                .put(
                                    "suit",
                                    command.card.suit.name,
                                )
                                .put(
                                    "rank",
                                    command.card.rank.name,
                                ),
                        )
            }

        val documentJson =
            JSONObject()
                .put(
                    "formatVersion",
                    SUPPORTED_LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION,
                )
                .put(
                    "engineVersion",
                    normalizedEngineVersion,
                )
                .put(
                    "sessionId",
                    normalizedSessionId,
                )
                .put(
                    "expectedRevision",
                    expectedRevision,
                )
                .put(
                    "command",
                    commandJson,
                )

        val requestBody =
            JSONObject()
                .put(
                    "document",
                    documentJson,
                )

        return executePlayerSnapshotRequest(
            path =
                "/api/v1/rooms/$normalizedSessionId/commands",

            expectedSessionId =
                normalizedSessionId,

            accessToken =
                normalizedAccessToken,

            requestBody =
                requestBody,
        )
    }

    private fun executePlayerSnapshotRequest(
        path:
            String,

        expectedSessionId:
            String,

        accessToken:
            String,

        requestBody:
            JSONObject?,
    ): PlayerGameSnapshot {
        val connection =
            URI(
                "$normalizedBaseUrl$path",
            )
                .toURL()
                .openConnection() as HttpURLConnection

        try {
            connection.requestMethod =
                "POST"

            connection.connectTimeout =
                CONNECT_TIMEOUT_MS

            connection.readTimeout =
                READ_TIMEOUT_MS

            connection.useCaches =
                false

            connection.setRequestProperty(
                "Accept",
                "application/json",
            )

            connection.setRequestProperty(
                "Authorization",
                "Bearer $accessToken",
            )

            if (
                requestBody !=
                    null
            ) {
                val bytes =
                    requestBody
                        .toString()
                        .toByteArray(
                            Charsets.UTF_8,
                        )

                connection.doOutput =
                    true

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json; charset=utf-8",
                )

                connection.setFixedLengthStreamingMode(
                    bytes.size,
                )

                connection.outputStream.use {
                    output ->
                    output.write(
                        bytes,
                    )
                }
            }

            val responseCode =
                connection.responseCode

            if (
                responseCode !=
                HttpURLConnection.HTTP_OK
            ) {
                val errorCode =
                    readApiErrorCode(
                        connection,
                    )

                throw AtoutiaGameApiException(
                    message =
                        "Atoutia game API returned HTTP $responseCode.",

                    statusCode =
                        responseCode,

                    errorCode =
                        errorCode,
                )
            }

            val contentType =
                connection.contentType
                    ?.lowercase()

            if (
                contentType ==
                    null ||
                !contentType.startsWith(
                    "application/json",
                )
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an unexpected content type.",
                )
            }

            val responseBody =
                connection
                    .inputStream
                    .bufferedReader(
                        Charsets.UTF_8,
                    )
                    .use {
                        it.readText()
                    }

            return parseLiveMatchRoomSnapshotDocument(
                body =
                    responseBody,

                expectedSessionId =
                    expectedSessionId,
            )
        } catch (
            error:
                AtoutiaGameApiException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaGameApiException(
                message =
                    "Unable to contact Atoutia game API.",

                cause =
                    error,
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun readApiErrorCode(
        connection:
            HttpURLConnection,
    ): String? {
        val errorStream =
            connection.errorStream
                ?: return null

        val responseBody =
            try {
                errorStream
                    .bufferedReader(
                        Charsets.UTF_8,
                    )
                    .use {
                        it.readText()
                    }
            } catch (
                error:
                    Exception,
            ) {
                return null
            }

        if (
            responseBody.isBlank()
        ) {
            return null
        }

        return try {
            val json =
                JSONObject(
                    responseBody,
                )

            val error =
                json.opt(
                    "error",
                )

            if (
                error is String &&
                error.isNotBlank()
            ) {
                error
            } else {
                null
            }
        } catch (
            error:
                Exception,
        ) {
            null
        }
    }

    private fun parseLiveMatchRoomSnapshotDocument(
        body:
            String,

        expectedSessionId:
            String,
    ): PlayerGameSnapshot {
        try {
            val json =
                JSONObject(
                    body,
                )

            requireExactKeys(
                json =
                    json,

                expectedKeys =
                    EXPECTED_LIVE_MATCH_ROOM_SNAPSHOT_KEYS,

                errorMessage =
                    "Atoutia game API returned an unexpected live match snapshot document.",
            )

            val formatVersion =
                requireInt(
                    json =
                        json,

                    key =
                        "formatVersion",
                )

            if (
                formatVersion !=
                    SUPPORTED_LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an unsupported live match snapshot format.",
                )
            }

            val engineVersion =
                requireString(
                    json =
                        json,

                    key =
                        "engineVersion",
                )

            if (
                engineVersion.isBlank()
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an invalid engine version.",
                )
            }

            val sessionId =
                requireString(
                    json =
                        json,

                    key =
                        "sessionId",
                )

            if (
                sessionId !=
                    expectedSessionId
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned a snapshot for another room.",
                )
            }

            val revision =
                requireInt(
                    json =
                        json,

                    key =
                        "revision",
                )

            if (
                revision <
                    0
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an invalid room revision.",
                )
            }

            val phase =
                requireString(
                    json =
                        json,

                    key =
                        "phase",
                )

            if (
                phase !in
                    SUPPORTED_LIVE_MATCH_ROOM_PHASES
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an unsupported room phase.",
                )
            }

            val player =
                parsePlayerPosition(
                    json =
                        json,

                    key =
                        "player",
                )

            val seats =
                parseSeatSnapshots(
                    json.getJSONArray(
                        "seats",
                    ),
                )

            if (
                seats[player] !=
                    true
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned a snapshot for an unoccupied player seat.",
                )
            }

            val snapshot =
                parsePlayerClientSnapshot(
                    json.getJSONObject(
                        "game",
                    ),
                )

            validateSnapshotConsistency(
                snapshot,
            )

            if (
                snapshot.match.player !=
                    player ||
                snapshot.actions.player !=
                    player
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned inconsistent room and game player identities.",
                )
            }

            return PlayerGameSnapshot(
                revision =
                    revision,

                phase =
                    phase,

                document =
                    PlayerClientSnapshotDocument(
                        formatVersion =
                            SUPPORTED_PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,

                        engineVersion =
                            engineVersion,

                        snapshot =
                            snapshot,
                    ),
            )
        } catch (
            error:
                AtoutiaGameApiException,
        ) {
            throw error
        } catch (
            error:
                Exception,
        ) {
            throw AtoutiaGameApiException(
                message =
                    "Atoutia game API returned an invalid live match snapshot document.",

                cause =
                    error,
            )
        }
    }

    private fun parseSeatSnapshots(
        array:
            JSONArray,
    ): Map<PlayerPosition, Boolean> {
        if (
            array.length() !=
                PlayerPosition.entries.size
        ) {
            throw AtoutiaGameApiException(
                "Atoutia game API returned an invalid seat snapshot list.",
            )
        }

        val seats =
            mutableMapOf<
                PlayerPosition,
                Boolean
            >()

        for (
            index in
                0 until array.length()
        ) {
            val json =
                array.getJSONObject(
                    index,
                )

            requireExactKeys(
                json =
                    json,

                expectedKeys =
                    EXPECTED_SEAT_SNAPSHOT_KEYS,

                errorMessage =
                    "Atoutia game API returned an unexpected seat snapshot document.",
            )

            val player =
                parsePlayerPosition(
                    json =
                        json,

                    key =
                        "player",
                )

            val occupied =
                requireBoolean(
                    json =
                        json,

                    key =
                        "occupied",
                )

            if (
                seats.put(
                    player,
                    occupied,
                ) !=
                    null
            ) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned duplicate player seat snapshots.",
                )
            }
        }

        if (
            seats.keys !=
                PlayerPosition.entries.toSet()
        ) {
            throw AtoutiaGameApiException(
                "Atoutia game API returned an incomplete player seat snapshot list.",
            )
        }

        return seats.toMap()
    }

    private fun parsePlayerClientSnapshot(
        json:
            JSONObject,
    ): PlayerClientSnapshot {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_SNAPSHOT_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected game snapshot document.",
        )

        return PlayerClientSnapshot(
            match =
                parsePlayerMatchSnapshot(
                    json.getJSONObject(
                        "match",
                    ),
                ),

            actions =
                parsePlayerAvailableActions(
                    json.getJSONObject(
                        "actions",
                    ),
                ),
        )
    }

    private fun parsePlayerMatchSnapshot(
        json:
            JSONObject,
    ): PlayerMatchSnapshot {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_PLAYER_MATCH_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected player match document.",
        )

        return PlayerMatchSnapshot(
            publicMatch =
                parsePublicMatchSnapshot(
                    json.getJSONObject(
                        "public",
                    ),
                ),

            player =
                parsePlayerPosition(
                    json =
                        json,

                    key =
                        "player",
                ),

            hand =
                parseCardArray(
                    json.getJSONArray(
                        "hand",
                    ),
                ),

            legalCards =
                parseCardArray(
                    json.getJSONArray(
                        "legalCards",
                    ),
                ),
        )
    }

    private fun parsePublicMatchSnapshot(
        json:
            JSONObject,
    ): PublicMatchSnapshot {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_PUBLIC_MATCH_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected public match document.",
        )

        val currentTrick =
            if (
                json.isNull(
                    "currentTrick",
                )
            ) {
                null
            } else {
                parseCurrentTrick(
                    json.getJSONObject(
                        "currentTrick",
                    ),
                )
            }

        return PublicMatchSnapshot(
            dealNumber =
                requireInt(
                    json =
                        json,

                    key =
                        "dealNumber",
                ),

            dealer =
                parsePlayerPosition(
                    json =
                        json,

                    key =
                        "dealer",
                ),

            phase =
                parseDealPhase(
                    json =
                        json,

                    key =
                        "phase",
                ),

            score =
                parseScore(
                    json.getJSONObject(
                        "score",
                    ),
                ),

            biddingPlayer =
                parseNullablePlayerPosition(
                    json =
                        json,

                    key =
                        "biddingPlayer",
                ),

            taker =
                parseNullablePlayerPosition(
                    json =
                        json,

                    key =
                        "taker",
                ),

            trumpSuit =
                parseNullableCardSuit(
                    json =
                        json,

                    key =
                        "trumpSuit",
                ),

            turnUpCard =
                parseCard(
                    json.getJSONObject(
                        "turnUpCard",
                    ),
                ),

            currentTrick =
                currentTrick,
        )
    }

    private fun parseScore(
        json:
            JSONObject,
    ): PublicMatchScoreSnapshot {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_SCORE_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected score document.",
        )

        return PublicMatchScoreSnapshot(
            targetScore =
                requireInt(
                    json =
                        json,

                    key =
                        "targetScore",
                ),

            scores =
                parseTeamPoints(
                    json.getJSONObject(
                        "scores",
                    ),
                ),

            completed =
                requireBoolean(
                    json =
                        json,

                    key =
                        "completed",
                ),

            winner =
                parseNullableMatchTeam(
                    json =
                        json,

                    key =
                        "winner",
                ),
        )
    }

    private fun parseTeamPoints(
        json:
            JSONObject,
    ): TeamPointsSnapshot {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_TEAM_POINTS_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected team points document.",
        )

        return TeamPointsSnapshot(
            team0 =
                requireInt(
                    json =
                        json,

                    key =
                        "TEAM_0",
                ),

            team1 =
                requireInt(
                    json =
                        json,

                    key =
                        "TEAM_1",
                ),
        )
    }

    private fun parseCurrentTrick(
        json:
            JSONObject,
    ): PublicCurrentTrickSnapshot {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_CURRENT_TRICK_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected current trick document.",
        )

        return PublicCurrentTrickSnapshot(
            currentPlayer =
                parsePlayerPosition(
                    json =
                        json,

                    key =
                        "currentPlayer",
                ),

            plays =
                parsePlayedCardArray(
                    json.getJSONArray(
                        "plays",
                    ),
                ),
        )
    }

    private fun parsePlayedCardArray(
        array:
            JSONArray,
    ): List<PlayedCardSnapshot> =
        buildList {
            for (
                index in
                    0 until array.length()
            ) {
                add(
                    parsePlayedCard(
                        array.getJSONObject(
                            index,
                        ),
                    ),
                )
            }
        }

    private fun parsePlayedCard(
        json:
            JSONObject,
    ): PlayedCardSnapshot {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_PLAYED_CARD_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected played card document.",
        )

        return PlayedCardSnapshot(
            player =
                parsePlayerPosition(
                    json =
                        json,

                    key =
                        "player",
                ),

            card =
                parseCard(
                    json.getJSONObject(
                        "card",
                    ),
                ),
        )
    }

    private fun parsePlayerAvailableActions(
        json:
            JSONObject,
    ): PlayerAvailableActions {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_AVAILABLE_ACTIONS_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected available actions document.",
        )

        return PlayerAvailableActions(
            player =
                parsePlayerPosition(
                    json =
                        json,

                    key =
                        "player",
                ),

            mode =
                parsePlayerActionMode(
                    json =
                        json,

                    key =
                        "mode",
                ),

            biddingActions =
                parseBiddingActions(
                    json.getJSONArray(
                        "biddingActions",
                    ),
                ),

            legalCards =
                parseCardArray(
                    json.getJSONArray(
                        "legalCards",
                    ),
                ),
        )
    }

    private fun parseBiddingActions(
        array:
            JSONArray,
    ): List<BiddingActionSnapshot> =
        buildList {
            for (
                index in
                    0 until array.length()
            ) {
                add(
                    parseBiddingAction(
                        array.getJSONObject(
                            index,
                        ),
                    ),
                )
            }
        }

    private fun parseBiddingAction(
        json:
            JSONObject,
    ): BiddingActionSnapshot {
        val type =
            requireString(
                json =
                    json,

                key =
                    "type",
            )

        return when (
            type
        ) {
            "PASS" -> {
                requireExactKeys(
                    json =
                        json,

                    expectedKeys =
                        EXPECTED_PASS_ACTION_KEYS,

                    errorMessage =
                        "Atoutia game API returned an unexpected PASS action document.",
                )

                BiddingActionSnapshot.Pass(
                    player =
                        parsePlayerPosition(
                            json =
                                json,

                            key =
                                "player",
                        ),
                )
            }

            "TAKE" -> {
                requireExactKeys(
                    json =
                        json,

                    expectedKeys =
                        EXPECTED_TAKE_ACTION_KEYS,

                    errorMessage =
                        "Atoutia game API returned an unexpected TAKE action document.",
                )

                BiddingActionSnapshot.Take(
                    player =
                        parsePlayerPosition(
                            json =
                                json,

                            key =
                                "player",
                        ),

                    suit =
                        parseCardSuit(
                            json =
                                json,

                            key =
                                "suit",
                        ),
                )
            }

            else ->
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an unsupported bidding action.",
                )
        }
    }

    private fun parseCardArray(
        array:
            JSONArray,
    ): List<PlayerCard> =
        buildList {
            for (
                index in
                    0 until array.length()
            ) {
                add(
                    parseCard(
                        array.getJSONObject(
                            index,
                        ),
                    ),
                )
            }
        }

    private fun parseCard(
        json:
            JSONObject,
    ): PlayerCard {
        requireExactKeys(
            json =
                json,

            expectedKeys =
                EXPECTED_CARD_KEYS,

            errorMessage =
                "Atoutia game API returned an unexpected card document.",
        )

        return PlayerCard(
            suit =
                parseCardSuit(
                    json =
                        json,

                    key =
                        "suit",
                ),

            rank =
                parseCardRank(
                    json =
                        json,

                    key =
                        "rank",
                ),
        )
    }

    private fun validateSnapshotConsistency(
        snapshot:
            PlayerClientSnapshot,
    ) {
        val player =
            snapshot.match.player

        if (
            snapshot.actions.player !=
                player
        ) {
            throw AtoutiaGameApiException(
                "Atoutia game API returned inconsistent player identities.",
            )
        }

        if (
            snapshot.actions.biddingActions
                .any {
                    action ->
                    action.player !=
                        player
                }
        ) {
            throw AtoutiaGameApiException(
                "Atoutia game API returned an action for another player.",
            )
        }

        if (
            snapshot.match.legalCards
                .any {
                    card ->
                    card !in
                        snapshot.match.hand
                }
        ) {
            throw AtoutiaGameApiException(
                "Atoutia game API returned a legal card outside the player hand.",
            )
        }

        when (
            snapshot.actions.mode
        ) {
            PlayerActionMode.WAIT,
            PlayerActionMode.MATCH_FINISHED,
            -> {
                if (
                    snapshot.actions
                        .biddingActions
                        .isNotEmpty() ||
                    snapshot.actions
                        .legalCards
                        .isNotEmpty()
                ) {
                    throw AtoutiaGameApiException(
                        "Atoutia game API returned actions incompatible with the player action mode.",
                    )
                }
            }

            PlayerActionMode.BID -> {
                if (
                    snapshot.actions
                        .biddingActions
                        .isEmpty() ||
                    snapshot.actions
                        .legalCards
                        .isNotEmpty()
                ) {
                    throw AtoutiaGameApiException(
                        "Atoutia game API returned actions incompatible with BID mode.",
                    )
                }
            }

            PlayerActionMode.PLAY_CARD -> {
                if (
                    snapshot.actions
                        .biddingActions
                        .isNotEmpty()
                ) {
                    throw AtoutiaGameApiException(
                        "Atoutia game API returned bidding actions during PLAY_CARD mode.",
                    )
                }
            }
        }
    }

    private fun parsePlayerPosition(
        json:
            JSONObject,

        key:
            String,
    ): PlayerPosition =
        parseEnum(
            value =
                requireString(
                    json =
                        json,

                    key =
                        key,
                ),

            parser =
                PlayerPosition::valueOf,

            errorMessage =
                "Atoutia game API returned an unsupported player position.",
        )

    private fun parseNullablePlayerPosition(
        json:
            JSONObject,

        key:
            String,
    ): PlayerPosition? {
        if (
            json.isNull(
                key,
            )
        ) {
            return null
        }

        return parsePlayerPosition(
            json =
                json,

            key =
                key,
        )
    }

    private fun parseCardSuit(
        json:
            JSONObject,

        key:
            String,
    ): CardSuit =
        parseEnum(
            value =
                requireString(
                    json =
                        json,

                    key =
                        key,
                ),

            parser =
                CardSuit::valueOf,

            errorMessage =
                "Atoutia game API returned an unsupported card suit.",
        )

    private fun parseNullableCardSuit(
        json:
            JSONObject,

        key:
            String,
    ): CardSuit? {
        if (
            json.isNull(
                key,
            )
        ) {
            return null
        }

        return parseCardSuit(
            json =
                json,

            key =
                key,
        )
    }

    private fun parseCardRank(
        json:
            JSONObject,

        key:
            String,
    ): CardRank =
        parseEnum(
            value =
                requireString(
                    json =
                        json,

                    key =
                        key,
                ),

            parser =
                CardRank::valueOf,

            errorMessage =
                "Atoutia game API returned an unsupported card rank.",
        )

    private fun parseDealPhase(
        json:
            JSONObject,

        key:
            String,
    ): DealPhase =
        parseEnum(
            value =
                requireString(
                    json =
                        json,

                    key =
                        key,
                ),

            parser =
                DealPhase::valueOf,

            errorMessage =
                "Atoutia game API returned an unsupported deal phase.",
        )

    private fun parsePlayerActionMode(
        json:
            JSONObject,

        key:
            String,
    ): PlayerActionMode =
        parseEnum(
            value =
                requireString(
                    json =
                        json,

                    key =
                        key,
                ),

            parser =
                PlayerActionMode::valueOf,

            errorMessage =
                "Atoutia game API returned an unsupported player action mode.",
        )

    private fun parseNullableMatchTeam(
        json:
            JSONObject,

        key:
            String,
    ): MatchTeam? {
        if (
            json.isNull(
                key,
            )
        ) {
            return null
        }

        return parseEnum(
            value =
                requireString(
                    json =
                        json,

                    key =
                        key,
                ),

            parser =
                MatchTeam::valueOf,

            errorMessage =
                "Atoutia game API returned an unsupported match team.",
        )
    }

    private fun <T> parseEnum(
        value:
            String,

        parser:
            (String) -> T,

        errorMessage:
            String,
    ): T =
        try {
            parser(
                value,
            )
        } catch (
            error:
                IllegalArgumentException,
        ) {
            throw AtoutiaGameApiException(
                message =
                    errorMessage,

                cause =
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
            json.get(
                key,
            )

        if (
            value !is String
        ) {
            throw AtoutiaGameApiException(
                "Atoutia game API returned an invalid string field.",
            )
        }

        return value
    }

    private fun requireInt(
        json:
            JSONObject,

        key:
            String,
    ): Int {
        val value =
            json.get(
                key,
            )

        return when (
            value
        ) {
            is Int ->
                value

            is Long -> {
                if (
                    value <
                        Int.MIN_VALUE.toLong() ||
                    value >
                        Int.MAX_VALUE.toLong()
                ) {
                    throw AtoutiaGameApiException(
                        "Atoutia game API returned an integer outside the supported range.",
                    )
                }

                value.toInt()
            }

            else ->
                throw AtoutiaGameApiException(
                    "Atoutia game API returned an invalid integer field.",
                )
        }
    }

    private fun requireBoolean(
        json:
            JSONObject,

        key:
            String,
    ): Boolean {
        val value =
            json.get(
                key,
            )

        if (
            value !is Boolean
        ) {
            throw AtoutiaGameApiException(
                "Atoutia game API returned an invalid boolean field.",
            )
        }

        return value
    }

    private fun requireExactKeys(
        json:
            JSONObject,

        expectedKeys:
            Set<String>,

        errorMessage:
            String,
    ) {
        val actualKeys =
            buildSet {
                val iterator =
                    json.keys()

                while (
                    iterator.hasNext()
                ) {
                    add(
                        iterator.next(),
                    )
                }
            }

        if (
            actualKeys !=
                expectedKeys
        ) {
            throw AtoutiaGameApiException(
                errorMessage,
            )
        }
    }

    private companion object {
        const val CONNECT_TIMEOUT_MS =
            3_000

        const val READ_TIMEOUT_MS =
            5_000

        const val SUPPORTED_LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION =
            1

        const val SUPPORTED_LIVE_MATCH_ROOM_COMMAND_FORMAT_VERSION =
            1

        val SUPPORTED_LIVE_MATCH_ROOM_PHASES =
            setOf(
                "WAITING_FOR_PLAYERS",
                "READY",
                "IN_PROGRESS",
                "FINISHED",
            )

        val EXPECTED_LIVE_MATCH_ROOM_SNAPSHOT_KEYS =
            setOf(
                "formatVersion",
                "engineVersion",
                "sessionId",
                "revision",
                "phase",
                "player",
                "seats",
                "game",
            )

        val EXPECTED_SEAT_SNAPSHOT_KEYS =
            setOf(
                "player",
                "occupied",
            )

        val EXPECTED_SNAPSHOT_KEYS =
            setOf(
                "match",
                "actions",
            )

        val EXPECTED_PLAYER_MATCH_KEYS =
            setOf(
                "public",
                "player",
                "hand",
                "legalCards",
            )

        val EXPECTED_PUBLIC_MATCH_KEYS =
            setOf(
                "dealNumber",
                "dealer",
                "phase",
                "score",
                "biddingPlayer",
                "taker",
                "trumpSuit",
                "turnUpCard",
                "currentTrick",
            )

        val EXPECTED_SCORE_KEYS =
            setOf(
                "targetScore",
                "scores",
                "completed",
                "winner",
            )

        val EXPECTED_TEAM_POINTS_KEYS =
            setOf(
                "TEAM_0",
                "TEAM_1",
            )

        val EXPECTED_CURRENT_TRICK_KEYS =
            setOf(
                "currentPlayer",
                "plays",
            )

        val EXPECTED_PLAYED_CARD_KEYS =
            setOf(
                "player",
                "card",
            )

        val EXPECTED_AVAILABLE_ACTIONS_KEYS =
            setOf(
                "player",
                "mode",
                "biddingActions",
                "legalCards",
            )

        val EXPECTED_PASS_ACTION_KEYS =
            setOf(
                "type",
                "player",
            )

        val EXPECTED_TAKE_ACTION_KEYS =
            setOf(
                "type",
                "player",
                "suit",
            )

        val EXPECTED_CARD_KEYS =
            setOf(
                "suit",
                "rank",
            )

        fun normalizeBaseUrl(
            value:
                String,
        ): String {
            val trimmed =
                value.trim()

            require(
                trimmed.isNotEmpty(),
            ) {
                "Atoutia game API base URL must not be empty."
            }

            require(
                trimmed ==
                    value,
            ) {
                "Atoutia game API base URL must not contain surrounding whitespace."
            }

            require(
                trimmed.startsWith(
                    "http://",
                ) ||
                    trimmed.startsWith(
                        "https://",
                    ),
            ) {
                "Atoutia game API base URL must use HTTP or HTTPS."
            }

            return trimmed.removeSuffix(
                "/",
            )
        }

        fun validateSessionId(
            value:
                String,
        ): String {
            require(
                value.isNotBlank(),
            ) {
                "Atoutia room session ID must not be blank."
            }

            require(
                value ==
                    value.trim(),
            ) {
                "Atoutia room session ID must not contain surrounding whitespace."
            }

            require(
                value.startsWith(
                    "ms1_",
                ),
            ) {
                "Invalid Atoutia room session ID."
            }

            require(
                !value.contains(
                    "/",
                ) &&
                    !value.contains(
                        "?",
                    ) &&
                    !value.contains(
                        "#",
                    ),
            ) {
                "Atoutia room session ID contains invalid URL characters."
            }

            return value
        }

        fun validateEngineVersion(
            value:
                String,
        ): String {
            require(
                value.isNotBlank(),
            ) {
                "Atoutia engine version must not be blank."
            }

            require(
                value ==
                    value.trim(),
            ) {
                "Atoutia engine version must not contain surrounding whitespace."
            }

            require(
                value.none {
                    it.isWhitespace()
                },
            ) {
                "Invalid Atoutia engine version."
            }

            return value
        }

        fun validateAccessToken(
            value:
                String,
        ): String {
            require(
                value.isNotBlank(),
            ) {
                "Atoutia access token must not be blank."
            }

            require(
                value ==
                    value.trim(),
            ) {
                "Atoutia access token must not contain surrounding whitespace."
            }

            require(
                value.startsWith(
                    "atk1_",
                ),
            ) {
                "Invalid Atoutia access token."
            }

            require(
                value.none {
                    it.isWhitespace()
                },
            ) {
                "Invalid Atoutia access token."
            }

            return value
        }
    }
}