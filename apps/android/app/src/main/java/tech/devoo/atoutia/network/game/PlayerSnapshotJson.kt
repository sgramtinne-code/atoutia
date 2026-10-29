package tech.devoo.atoutia.network.game

import org.json.JSONArray
import org.json.JSONObject
import tech.devoo.atoutia.network.room.PlayerPosition

/** Shared structural decoder for HTTP snapshots and the embedded offline engine. */
internal object PlayerSnapshotJson {
    fun parseDocument(body: String): PlayerClientSnapshotDocument {
        try {
            val json = JSONObject(body)
            requireExactKeys(json, setOf("formatVersion", "engineVersion", "snapshot"), "Invalid player snapshot document.")
            val format = requireInt(json, "formatVersion")
            if (format != SUPPORTED_PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION) throw AtoutiaGameApiException("Unsupported player snapshot format.")
            val version = requireString(json, "engineVersion")
            if (version.isBlank()) throw AtoutiaGameApiException("Invalid player snapshot engine version.")
            val snapshot = parsePlayerClientSnapshot(json.getJSONObject("snapshot"))
            validateSnapshotConsistency(snapshot)
            return PlayerClientSnapshotDocument(format, version, snapshot)
        } catch (error: AtoutiaGameApiException) {
            throw error
        } catch (error: Exception) {
            throw AtoutiaGameApiException("Invalid player snapshot document.", cause = error)
        }
    }

    fun parseLiveMatchRoomSnapshotDocument(
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
        }.also { cards ->
            if (cards.toSet().size != cards.size) {
                throw AtoutiaGameApiException(
                    "Atoutia game API returned duplicate cards in a card list.",
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

                if (snapshot.actions.legalCards.any { it !in snapshot.match.hand }) {
                    throw AtoutiaGameApiException(
                        "Atoutia game API returned a legal card outside the player hand.",
                    )
                }

                // Both views describe the server's legal cards; wire order is not significant.
                if (snapshot.actions.legalCards.toSet() != snapshot.match.legalCards.toSet()) {
                    throw AtoutiaGameApiException(
                        "Atoutia game API returned inconsistent legal card lists.",
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

    private const val SUPPORTED_LIVE_MATCH_ROOM_SNAPSHOT_FORMAT_VERSION =
        1

    private val SUPPORTED_LIVE_MATCH_ROOM_PHASES =
        setOf(
            "WAITING_FOR_PLAYERS",
            "READY",
            "IN_PROGRESS",
            "FINISHED",
        )

    private val EXPECTED_LIVE_MATCH_ROOM_SNAPSHOT_KEYS =
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

    private val EXPECTED_SEAT_SNAPSHOT_KEYS =
        setOf(
            "player",
            "occupied",
        )

    private val EXPECTED_SNAPSHOT_KEYS =
        setOf(
            "match",
            "actions",
        )

    private val EXPECTED_PLAYER_MATCH_KEYS =
        setOf(
            "public",
            "player",
            "hand",
            "legalCards",
        )

    private val EXPECTED_PUBLIC_MATCH_KEYS =
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

    private val EXPECTED_SCORE_KEYS =
        setOf(
            "targetScore",
            "scores",
            "completed",
            "winner",
        )

    private val EXPECTED_TEAM_POINTS_KEYS =
        setOf(
            "TEAM_0",
            "TEAM_1",
        )

    private val EXPECTED_CURRENT_TRICK_KEYS =
        setOf(
            "currentPlayer",
            "plays",
        )

    private val EXPECTED_PLAYED_CARD_KEYS =
        setOf(
            "player",
            "card",
        )

    private val EXPECTED_AVAILABLE_ACTIONS_KEYS =
        setOf(
            "player",
            "mode",
            "biddingActions",
            "legalCards",
        )

    private val EXPECTED_PASS_ACTION_KEYS =
        setOf(
            "type",
            "player",
        )

    private val EXPECTED_TAKE_ACTION_KEYS =
        setOf(
            "type",
            "player",
            "suit",
        )

    private val EXPECTED_CARD_KEYS =
        setOf(
            "suit",
            "rank",
        )

}
