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
      "Usage: node apps/backend/scripts/dev-fill-room.mjs ms1_<session-id>",
    );
  }

  return value;
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

    return;
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

    return;
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

  await claimSeat(
    baseUrl,
    sessionId,
    player,
    accessToken,
  );
}

async function main() {
  const sessionId =
    requireSessionId(
      process.argv[2],
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

  for (
    const player of
    TEST_PLAYERS
  ) {
    await createAndJoinTestPlayer(
      baseUrl,
      sessionId,
      player,
    );
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

  console.log(
    "You can now press \"Démarrer la partie\" on PLAYER_0 Android.",
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