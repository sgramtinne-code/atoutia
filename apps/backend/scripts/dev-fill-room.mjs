const DEFAULT_BASE_URL =
  "http://127.0.0.1:3000";

const TEST_PLAYERS =
  Object.freeze([
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
  ]);

const FILLABLE_ROOM_PHASES =
  new Set([
    "WAITING_FOR_PLAYERS",
    "READY",
  ]);

const ADVANCE_BIDDING_FLAG =
  "--advance-bidding-to-player-0";

const COMMAND_FORMAT_VERSION =
  1;

const MATCH_START_TIMEOUT_MS =
  120_000;

const POLL_INTERVAL_MS =
  500;

function usage() {
  return [
    "Usage:",
    "node apps/backend/scripts/dev-fill-room.mjs ms1_<session-id>",
    "node apps/backend/scripts/dev-fill-room.mjs ms1_<session-id> --advance-bidding-to-player-0",
  ].join(
    "\n",
  );
}

function requireSessionId(
  value,
) {
  if (
    typeof value !== "string" ||
    !/^ms1_[0-9a-f]{32}$/.test(
      value,
    )
  ) {
    throw new Error(
      usage(),
    );
  }

  return value;
}

function parseAdvanceBiddingOption(
  args,
) {
  const options =
    args.slice(
      3,
    );

  if (
    options.length ===
      0
  ) {
    return false;
  }

  if (
    options.length ===
      1 &&
    options[0] ===
      ADVANCE_BIDDING_FLAG
  ) {
    return true;
  }

  throw new Error(
    usage(),
  );
}

function sleep(
  milliseconds,
) {
  return new Promise(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function readResponseBody(
  response,
) {
  const text =
    await response.text();

  if (
    text.length ===
    0
  ) {
    return null;
  }

  try {
    return JSON.parse(
      text,
    );
  } catch {
    return text;
  }
}

async function requestJson(
  url,
  options = {},
  expectedStatus,
) {
  const response =
    await fetch(
      url,
      options,
    );

  const body =
    await readResponseBody(
      response,
    );

  if (
    response.status !==
    expectedStatus
  ) {
    throw new Error(
      [
        `Request failed: ${options.method ?? "GET"} ${url}`,
        `Expected HTTP ${expectedStatus}, received HTTP ${response.status}.`,
        `Response: ${JSON.stringify(body)}`,
      ].join(
        "\n",
      ),
    );
  }

  if (
    body ===
      null ||
    typeof body !==
      "object" ||
    Array.isArray(
      body,
    )
  ) {
    throw new Error(
      `Expected JSON object from ${url}.`,
    );
  }

  return body;
}

async function getRoom(
  baseUrl,
  sessionId,
) {
  return requestJson(
    `${baseUrl}/api/v1/rooms/${sessionId}`,
    {
      method:
        "GET",

      headers: {
        accept:
          "application/json",
      },
    },
    200,
  );
}

async function createTestAccount(
  baseUrl,
) {
  const account =
    await requestJson(
      `${baseUrl}/api/v1/auth/accounts`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",
        },
      },
      201,
    );

  if (
    typeof account.accountId !==
      "string"
  ) {
    throw new Error(
      "Bootstrap authentication returned an invalid account document.",
    );
  }

  return account.accountId;
}

async function createTestSession(
  baseUrl,
  accountId,
) {
  const created =
    await requestJson(
      `${baseUrl}/api/v1/auth/sessions`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            accountId,
          }),
      },
      201,
    );

  if (
    typeof created.accessToken !==
      "string" ||
    !created.accessToken.startsWith(
      "atk1_",
    )
  ) {
    throw new Error(
      "Bootstrap authentication returned an invalid access token.",
    );
  }

  return created.accessToken;
}

function isSeatOccupied(
  room,
  player,
) {
  if (
    room ===
      null ||
    typeof room !==
      "object" ||
    room.seats ===
      null ||
    typeof room.seats !==
      "object"
  ) {
    throw new Error(
      "Room API returned an invalid seat document.",
    );
  }

  return room.seats[player] ===
    true;
}

async function claimSeat(
  baseUrl,
  sessionId,
  player,
  accessToken,
) {
  const before =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    isSeatOccupied(
      before,
      player,
    )
  ) {
    console.log(
      `${player}: already occupied, skipping.`,
    );

    return false;
  }

  if (
    !FILLABLE_ROOM_PHASES.has(
      before.phase,
    )
  ) {
    throw new Error(
      `Room cannot accept simulated players while phase is ${before.phase}.`,
    );
  }

  if (
    typeof before.revision !==
      "number"
  ) {
    throw new Error(
      "Room API returned an invalid revision.",
    );
  }

  const after =
    await requestJson(
      `${baseUrl}/api/v1/rooms/${sessionId}/seats`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          authorization:
            `Bearer ${accessToken}`,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            player,
            expectedRevision:
              before.revision,
          }),
      },
      200,
    );

  console.log(
    `${player}: joined — ${after.occupiedSeats}/4 — revision ${after.revision}`,
  );

  return true;
}

async function createAndJoinTestPlayer(
  baseUrl,
  sessionId,
  player,
) {
  const room =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    isSeatOccupied(
      room,
      player,
    )
  ) {
    console.log(
      `${player}: already occupied, skipping.`,
    );

    return null;
  }

  const accountId =
    await createTestAccount(
      baseUrl,
    );

  const accessToken =
    await createTestSession(
      baseUrl,
      accountId,
    );

  const joined =
    await claimSeat(
      baseUrl,
      sessionId,
      player,
      accessToken,
    );

  if (
    !joined
  ) {
    return null;
  }

  return Object.freeze({
    player,
    accountId,
    accessToken,
  });
}

async function getPlayerSnapshot(
  baseUrl,
  sessionId,
  accessToken,
) {
  return requestJson(
    `${baseUrl}/api/v1/rooms/${sessionId}/snapshot`,
    {
      method:
        "POST",

      headers: {
        accept:
          "application/json",

        authorization:
          `Bearer ${accessToken}`,
      },
    },
    200,
  );
}

function requireBiddingPlayer(
  snapshot,
) {
  const biddingPlayer =
    snapshot
      ?.game
      ?.match
      ?.public
      ?.biddingPlayer;

  if (
    biddingPlayer !==
      null &&
    typeof biddingPlayer !==
      "string"
  ) {
    throw new Error(
      "Player snapshot returned an invalid bidding player.",
    );
  }

  return biddingPlayer;
}

function requirePassAction(
  snapshot,
  player,
) {
  const actions =
    snapshot
      ?.game
      ?.actions;

  if (
    actions ===
      null ||
    typeof actions !==
      "object"
  ) {
    throw new Error(
      `${player}: player snapshot returned invalid actions.`,
    );
  }

  if (
    actions.mode !==
      "BID"
  ) {
    throw new Error(
      `${player}: expected BID mode, received ${String(actions.mode)}.`,
    );
  }

  if (
    !Array.isArray(
      actions.biddingActions,
    )
  ) {
    throw new Error(
      `${player}: player snapshot returned invalid bidding actions.`,
    );
  }

  const pass =
    actions.biddingActions.find(
      (
        action,
      ) =>
        action !==
          null &&
        typeof action ===
          "object" &&
        action.type ===
          "PASS" &&
        action.player ===
          player,
    );

  if (
    pass ===
      undefined
  ) {
    throw new Error(
      `${player}: PASS is not currently authorized by the server.`,
    );
  }
}

async function submitPass(
  baseUrl,
  sessionId,
  player,
  accessToken,
  snapshot,
) {
  if (
    typeof snapshot.revision !==
      "number" ||
    !Number.isInteger(
      snapshot.revision,
    ) ||
    snapshot.revision <
      0
  ) {
    throw new Error(
      `${player}: player snapshot returned an invalid revision.`,
    );
  }

  if (
    typeof snapshot.engineVersion !==
      "string" ||
    snapshot.engineVersion.length ===
      0
  ) {
    throw new Error(
      `${player}: player snapshot returned an invalid engine version.`,
    );
  }

  if (
    snapshot.sessionId !==
      sessionId
  ) {
    throw new Error(
      `${player}: player snapshot belongs to another room.`,
    );
  }

  if (
    snapshot.player !==
      player
  ) {
    throw new Error(
      `${player}: authenticated snapshot belongs to ${String(snapshot.player)}.`,
    );
  }

  requirePassAction(
    snapshot,
    player,
  );

  const after =
    await requestJson(
      `${baseUrl}/api/v1/rooms/${sessionId}/commands`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          authorization:
            `Bearer ${accessToken}`,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            document: {
              formatVersion:
                COMMAND_FORMAT_VERSION,

              engineVersion:
                snapshot.engineVersion,

              sessionId,

              expectedRevision:
                snapshot.revision,

              command: {
                type:
                  "PASS",
              },
            },
          }),
      },
      200,
    );

  if (
    typeof after.revision !==
      "number" ||
    after.revision <=
      snapshot.revision
  ) {
    throw new Error(
      `${player}: PASS did not advance the room revision.`,
    );
  }

  console.log(
    `${player}: PASS — revision ${after.revision}`,
  );

  return after;
}

async function waitForMatchStart(
  baseUrl,
  sessionId,
) {
  console.log(
    "",
  );

  console.log(
    "Waiting for PLAYER_0 Android to start the match...",
  );

  const deadline =
    Date.now() +
    MATCH_START_TIMEOUT_MS;

  while (
    Date.now() <
      deadline
  ) {
    const room =
      await getRoom(
        baseUrl,
        sessionId,
      );

    if (
      room.phase ===
        "IN_PROGRESS"
    ) {
      console.log(
        `Match started — revision ${room.revision}.`,
      );

      return;
    }

    if (
      room.phase !==
        "READY"
    ) {
      throw new Error(
        `Expected room phase READY or IN_PROGRESS while waiting, received ${room.phase}.`,
      );
    }

    await sleep(
      POLL_INTERVAL_MS,
    );
  }

  throw new Error(
    "Timed out while waiting for PLAYER_0 Android to start the match.",
  );
}

async function advanceBiddingToPlayer0(
  baseUrl,
  sessionId,
  simulatedPlayers,
) {
  if (
    simulatedPlayers.length !==
      TEST_PLAYERS.length
  ) {
    throw new Error(
      "Bidding advancement requires all three simulated players to have been created by this process.",
    );
  }

  const playersByPosition =
    new Map(
      simulatedPlayers.map(
        (
          player,
        ) => [
          player.player,
          player,
        ],
      ),
    );

  const probePlayer =
    simulatedPlayers[0];

  if (
    probePlayer ===
      undefined
  ) {
    throw new Error(
      "Missing simulated player used to inspect bidding state.",
    );
  }

  console.log(
    "",
  );

  console.log(
    "Advancing simulated bidding to PLAYER_0...",
  );

  for (
    let step =
      0;
    step <
      8;
    step +=
      1
  ) {
    const overview =
      await getPlayerSnapshot(
        baseUrl,
        sessionId,
        probePlayer.accessToken,
      );

    const biddingPlayer =
      requireBiddingPlayer(
        overview,
      );

    if (
      biddingPlayer ===
        "PLAYER_0"
    ) {
      console.log(
        "",
      );

      console.log(
        "PLAYER_0 is now the active bidder.",
      );

      console.log(
        `Current revision: ${overview.revision}`,
      );

      console.log(
        "Simulation is ready for the Android bidding test.",
      );

      return;
    }

    if (
      biddingPlayer ===
        null
    ) {
      throw new Error(
        "Bidding ended before PLAYER_0 became the active bidder.",
      );
    }

    const simulatedPlayer =
      playersByPosition.get(
        biddingPlayer,
      );

    if (
      simulatedPlayer ===
        undefined
    ) {
      throw new Error(
        `Cannot advance bidding for ${biddingPlayer}.`,
      );
    }

    const activeSnapshot =
      biddingPlayer ===
        probePlayer.player
        ? overview
        : await getPlayerSnapshot(
            baseUrl,
            sessionId,
            simulatedPlayer.accessToken,
          );

    await submitPass(
      baseUrl,
      sessionId,
      biddingPlayer,
      simulatedPlayer.accessToken,
      activeSnapshot,
    );
  }

  throw new Error(
    "Unable to advance bidding to PLAYER_0 within the expected number of commands.",
  );
}

async function main() {
  const sessionId =
    requireSessionId(
      process.argv[2],
    );

  const advanceBidding =
    parseAdvanceBiddingOption(
      process.argv,
    );

  const baseUrl =
    process.env
      .ATOUTIA_API_BASE_URL
      ?.trim() ||
    DEFAULT_BASE_URL;

  console.log(
    "ATOUTIA local player simulator",
  );

  console.log(
    `Backend: ${baseUrl}`,
  );

  console.log(
    `Room: ${sessionId}`,
  );

  console.log(
    `Advance bidding: ${advanceBidding ? "yes" : "no"}`,
  );

  console.log(
    "",
  );

  const initialRoom =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    !FILLABLE_ROOM_PHASES.has(
      initialRoom.phase,
    )
  ) {
    throw new Error(
      `Room cannot be filled while phase is ${initialRoom.phase}.`,
    );
  }

  if (
    !isSeatOccupied(
      initialRoom,
      "PLAYER_0",
    )
  ) {
    throw new Error(
      "PLAYER_0 must already be occupied by the real Android player.",
    );
  }

  console.log(
    `Current players: ${initialRoom.occupiedSeats}/4`,
  );

  console.log(
    `Current phase: ${initialRoom.phase}`,
  );

  console.log(
    `Current revision: ${initialRoom.revision}`,
  );

  console.log(
    "",
  );

  const simulatedPlayers =
    [];

  for (
    const player of
    TEST_PLAYERS
  ) {
    const simulatedPlayer =
      await createAndJoinTestPlayer(
        baseUrl,
        sessionId,
        player,
      );

    if (
      simulatedPlayer !==
        null
    ) {
      simulatedPlayers.push(
        simulatedPlayer,
      );
    } else if (
      advanceBidding
    ) {
      throw new Error(
        `${player} was already occupied before this simulator started, so its authentication token is unavailable. Create a fresh room for the bidding test.`,
      );
    }
  }

  const finalRoom =
    await getRoom(
      baseUrl,
      sessionId,
    );

  console.log(
    "",
  );

  console.log(
    "Simulation complete.",
  );

  console.log(
    `Players: ${finalRoom.occupiedSeats}/4`,
  );

  console.log(
    `Phase: ${finalRoom.phase}`,
  );

  console.log(
    `Revision: ${finalRoom.revision}`,
  );

  if (
    finalRoom.occupiedSeats !==
      4
  ) {
    throw new Error(
      "Expected the room to contain exactly 4 players.",
    );
  }

  if (
    finalRoom.phase !==
      "READY"
  ) {
    throw new Error(
      `Expected room phase READY, received ${finalRoom.phase}.`,
    );
  }

  console.log(
    "",
  );

  console.log(
    "Room is READY.",
  );

  if (
    !advanceBidding
  ) {
    console.log(
      "You can now press \"Démarrer la partie\" on PLAYER_0 Android.",
    );

    return;
  }

  console.log(
    "Press \"Démarrer la partie\" on PLAYER_0 Android.",
  );

  console.log(
    "Keep this simulator running.",
  );

  await waitForMatchStart(
    baseUrl,
    sessionId,
  );

  await advanceBiddingToPlayer0(
    baseUrl,
    sessionId,
    simulatedPlayers,
  );
}

main()
  .catch(
    (
      error,
    ) => {
      console.error(
        "",
      );

      console.error(
        "Simulation failed.",
      );

      console.error(
        error instanceof Error
          ? error.message
          : error,
      );

      process.exitCode =
        1;
    },
  );