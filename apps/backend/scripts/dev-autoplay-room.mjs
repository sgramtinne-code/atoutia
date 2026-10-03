const DEFAULT_BASE_URL =
  "http://127.0.0.1:3000";

const PLAYER_POSITIONS =
  Object.freeze([
    "PLAYER_0",
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
  ]);

const ANDROID_BOT_PLAYERS =
  Object.freeze([
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3",
  ]);

const ALL_BOTS_FLAG =
  "--all-bots";

const ANDROID_PLAYER_0_FLAG =
  "--android-player-0";

const COMMAND_FORMAT_VERSION =
  1;

const POLL_INTERVAL_MS =
  250;

const AUTOMATIC_PROGRESS_TIMEOUT_MS =
  10_000;

const HUMAN_ACTION_TIMEOUT_MS =
  10 * 60 * 1000;

const MAX_COMMANDS =
  5_000;

function usage() {
  return [
    "Usage:",
    "",
    "All bots:",
    "  node apps/backend/scripts/dev-autoplay-room.mjs --all-bots",
    "",
    "Android PLAYER_0 + three bots:",
    "  node apps/backend/scripts/dev-autoplay-room.mjs ms1_<session-id> --android-player-0",
  ].join(
    "\n",
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

function parseArguments() {
  const first =
    process.argv[2];

  const second =
    process.argv[3];

  if (
    first ===
      ALL_BOTS_FLAG &&
    second ===
      undefined
  ) {
    return Object.freeze({
      mode:
        "ALL_BOTS",

      sessionId:
        null,
    });
  }

  if (
    typeof first ===
      "string" &&
    /^ms1_[0-9a-f]{32}$/.test(
      first,
    ) &&
    second ===
      ANDROID_PLAYER_0_FLAG &&
    process.argv[4] ===
      undefined
  ) {
    return Object.freeze({
      mode:
        "ANDROID_PLAYER_0",

      sessionId:
        first,
    });
  }

  throw new Error(
    usage(),
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

async function request(
  url,
  options = {},
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

  return Object.freeze({
    status:
      response.status,

    body,
  });
}

function assertJsonObject(
  value,
  context,
) {
  if (
    value ===
      null ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `${context} returned an invalid JSON document.`,
    );
  }

  return value;
}

async function requestJson(
  url,
  options,
  expectedStatus,
) {
  const result =
    await request(
      url,
      options,
    );

  if (
    result.status !==
      expectedStatus
  ) {
    throw new Error(
      [
        `Request failed: ${options?.method ?? "GET"} ${url}`,
        `Expected HTTP ${expectedStatus}, received HTTP ${result.status}.`,
        `Response: ${JSON.stringify(result.body)}`,
      ].join(
        "\n",
      ),
    );
  }

  return assertJsonObject(
    result.body,
    url,
  );
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

async function createRoom(
  baseUrl,
) {
  return requestJson(
    `${baseUrl}/api/v1/rooms`,
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
      "string" ||
    account.accountId.length ===
      0
  ) {
    throw new Error(
      "Bootstrap authentication returned an invalid account identifier.",
    );
  }

  return account.accountId;
}

async function createTestSession(
  baseUrl,
  accountId,
) {
  const session =
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
    typeof session.accessToken !==
      "string" ||
    !session.accessToken.startsWith(
      "atk1_",
    )
  ) {
    throw new Error(
      "Bootstrap authentication returned an invalid access token.",
    );
  }

  return session.accessToken;
}

async function createBotIdentity(
  baseUrl,
  player,
) {
  const accountId =
    await createTestAccount(
      baseUrl,
    );

  const accessToken =
    await createTestSession(
      baseUrl,
      accountId,
    );

  return Object.freeze({
    player,
    accountId,
    accessToken,
  });
}

function isSeatOccupied(
  room,
  player,
) {
  if (
    room.seats ===
      null ||
    typeof room.seats !==
      "object"
  ) {
    throw new Error(
      "Room API returned invalid seats.",
    );
  }

  return room.seats[player] ===
    true;
}

async function claimSeat(
  baseUrl,
  sessionId,
  identity,
) {
  const before =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    isSeatOccupied(
      before,
      identity.player,
    )
  ) {
    throw new Error(
      `${identity.player} is already occupied.`,
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
            `Bearer ${identity.accessToken}`,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            player:
              identity.player,

            expectedRevision:
              before.revision,
          }),
      },
      200,
    );

  console.log(
    `${identity.player}: joined — ${after.occupiedSeats}/4 — revision ${after.revision}`,
  );

  return after;
}

async function createAndClaimBot(
  baseUrl,
  sessionId,
  player,
) {
  const identity =
    await createBotIdentity(
      baseUrl,
      player,
    );

  await claimSeat(
    baseUrl,
    sessionId,
    identity,
  );

  return identity;
}

async function startRoom(
  baseUrl,
  sessionId,
  identity,
) {
  const room =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    typeof room.revision !==
      "number"
  ) {
    throw new Error(
      "Room API returned an invalid revision before start.",
    );
  }

  const started =
    await requestJson(
      `${baseUrl}/api/v1/rooms/${sessionId}/start`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          authorization:
            `Bearer ${identity.accessToken}`,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            expectedRevision:
              room.revision,
          }),
      },
      200,
    );

  console.log(
    `Match started — revision ${started.revision}.`,
  );

  return started;
}

async function waitForAndroidStart(
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
    HUMAN_ACTION_TIMEOUT_MS;

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

      return room;
    }

    if (
      room.phase !==
        "READY"
    ) {
      throw new Error(
        `Expected READY or IN_PROGRESS while waiting for Android, received ${room.phase}.`,
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

async function getPlayerSnapshot(
  baseUrl,
  sessionId,
  identity,
) {
  const snapshot =
    await requestJson(
      `${baseUrl}/api/v1/rooms/${sessionId}/snapshot`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          authorization:
            `Bearer ${identity.accessToken}`,
        },
      },
      200,
    );

  if (
    snapshot.sessionId !==
      sessionId
  ) {
    throw new Error(
      `${identity.player}: snapshot belongs to another room.`,
    );
  }

  if (
    snapshot.player !==
      identity.player
  ) {
    throw new Error(
      `${identity.player}: snapshot belongs to ${String(snapshot.player)}.`,
    );
  }

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
      `${identity.player}: snapshot returned an invalid revision.`,
    );
  }

  if (
    typeof snapshot.engineVersion !==
      "string" ||
    snapshot.engineVersion.length ===
      0
  ) {
    throw new Error(
      `${identity.player}: snapshot returned an invalid engine version.`,
    );
  }

  return snapshot;
}

function getActions(
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
      `${player}: snapshot returned invalid player actions.`,
    );
  }

  if (
    actions.player !==
      player
  ) {
    throw new Error(
      `${player}: actions belong to ${String(actions.player)}.`,
    );
  }

  return actions;
}

function chooseBiddingCommand(
  actions,
  player,
) {
  if (
    !Array.isArray(
      actions.biddingActions,
    )
  ) {
    throw new Error(
      `${player}: BID mode returned invalid bidding actions.`,
    );
  }

  const takeAction =
    actions.biddingActions.find(
      (
        action,
      ) =>
        action !==
          null &&
        typeof action ===
          "object" &&
        action.type ===
          "TAKE" &&
        typeof action.suit ===
          "string",
    );

  if (
    takeAction !==
      undefined
  ) {
    return Object.freeze({
      type:
        "TAKE",

      suit:
        takeAction.suit,
    });
  }

  const passAction =
    actions.biddingActions.find(
      (
        action,
      ) =>
        action !==
          null &&
        typeof action ===
          "object" &&
        action.type ===
          "PASS",
    );

  if (
    passAction !==
      undefined
  ) {
    return Object.freeze({
      type:
        "PASS",
    });
  }

  throw new Error(
    `${player}: BID mode exposed no supported server-authorized command.`,
  );
}

function choosePlayCardCommand(
  actions,
  player,
) {
  if (
    !Array.isArray(
      actions.legalCards,
    )
  ) {
    throw new Error(
      `${player}: PLAY_CARD mode returned invalid legal cards.`,
    );
  }

  const card =
    actions.legalCards[0];

  if (
    card ===
      undefined ||
    card ===
      null ||
    typeof card !==
      "object" ||
    typeof card.suit !==
      "string" ||
    typeof card.rank !==
      "string"
  ) {
    throw new Error(
      `${player}: PLAY_CARD mode exposed no valid legal card.`,
    );
  }

  return Object.freeze({
    type:
      "PLAY_CARD",

    card:
      Object.freeze({
        suit:
          card.suit,

        rank:
          card.rank,
      }),
  });
}

function chooseCommand(
  snapshot,
  player,
) {
  const actions =
    getActions(
      snapshot,
      player,
    );

  switch (
    actions.mode
  ) {
    case "BID":
      return chooseBiddingCommand(
        actions,
        player,
      );

    case "PLAY_CARD":
      return choosePlayCardCommand(
        actions,
        player,
      );

    case "WAIT":
    case "MATCH_FINISHED":
      return null;

    default:
      throw new Error(
        `${player}: unsupported action mode ${String(actions.mode)}.`,
      );
  }
}

function commandToDisplayName(
  command,
) {
  switch (
    command.type
  ) {
    case "PASS":
      return "PASS";

    case "TAKE":
      return `TAKE ${command.suit}`;

    case "PLAY_CARD":
      return `PLAY_CARD ${command.card.rank} ${command.card.suit}`;

    default:
      return JSON.stringify(
        command,
      );
  }
}

async function submitCommand(
  baseUrl,
  sessionId,
  identity,
  snapshot,
  command,
) {
  const result =
    await request(
      `${baseUrl}/api/v1/rooms/${sessionId}/commands`,
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          authorization:
            `Bearer ${identity.accessToken}`,

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

              command,
            },
          }),
      },
    );

  if (
    result.status ===
      409 &&
    result.body !==
      null &&
    typeof result.body ===
      "object" &&
    !Array.isArray(
      result.body,
    ) &&
    result.body.error ===
      "REVISION_MISMATCH"
  ) {
    return null;
  }

  if (
    result.status !==
      200
  ) {
    throw new Error(
      [
        `Command failed for ${identity.player}.`,
        `HTTP ${result.status}.`,
        `Command: ${JSON.stringify(command)}`,
        `Response: ${JSON.stringify(result.body)}`,
      ].join(
        "\n",
      ),
    );
  }

  const after =
    assertJsonObject(
      result.body,
      "Command API",
    );

  if (
    typeof after.revision !==
      "number" ||
    after.revision <=
      snapshot.revision
  ) {
    throw new Error(
      `${identity.player}: command did not advance the room revision.`,
    );
  }

  console.log(
    `${identity.player}: ${commandToDisplayName(command)} — revision ${after.revision}`,
  );

  return after;
}

function snapshotIsMatchFinished(
  snapshot,
) {
  const actions =
    snapshot
      ?.game
      ?.actions;

  if (
    actions?.mode ===
      "MATCH_FINISHED"
  ) {
    return true;
  }

  return snapshot
    ?.game
    ?.match
    ?.public
    ?.score
    ?.completed ===
    true;
}

function describeFinalScore(
  snapshot,
) {
  const score =
    snapshot
      ?.game
      ?.match
      ?.public
      ?.score;

  if (
    score ===
      null ||
    typeof score !==
      "object"
  ) {
    throw new Error(
      "Final snapshot returned an invalid score.",
    );
  }

  const team0 =
    score
      ?.scores
      ?.TEAM_0;

  const team1 =
    score
      ?.scores
      ?.TEAM_1;

  if (
    typeof team0 !==
      "number" ||
    typeof team1 !==
      "number"
  ) {
    throw new Error(
      "Final snapshot returned invalid team scores.",
    );
  }

  if (
    score.completed !==
      true
  ) {
    throw new Error(
      "Final snapshot is not marked as completed.",
    );
  }

  if (
    score.winner !==
      "TEAM_0" &&
    score.winner !==
      "TEAM_1"
  ) {
    throw new Error(
      "Final snapshot returned an invalid winner.",
    );
  }

  return [
    `Final score: ${team0} - ${team1}`,
    `Winner: ${score.winner}`,
  ].join(
    "\n",
  );
}

async function autoplay(
  baseUrl,
  sessionId,
  controlledPlayers,
  mode,
) {
  console.log(
    "",
  );

  console.log(
    "Autoplay started.",
  );

  console.log(
    `Controlled players: ${controlledPlayers.map((identity) => identity.player).join(", ")}`,
  );

  let commandsApplied =
    0;

  let idleStartedAt =
    Date.now();

  let lastHumanWaitRevision =
    null;

  while (
    commandsApplied <
      MAX_COMMANDS
  ) {
    let commandApplied =
      false;

    let firstSnapshot =
      null;

    for (
      const identity
      of controlledPlayers
    ) {
      const snapshot =
        await getPlayerSnapshot(
          baseUrl,
          sessionId,
          identity,
        );

      if (
        firstSnapshot ===
          null
      ) {
        firstSnapshot =
          snapshot;
      }

      if (
        snapshotIsMatchFinished(
          snapshot,
        )
      ) {
        console.log(
          "",
        );

        console.log(
          "Match finished.",
        );

        console.log(
          `Commands applied by this script: ${commandsApplied}`,
        );

        console.log(
          `Final revision: ${snapshot.revision}`,
        );

        console.log(
          describeFinalScore(
            snapshot,
          ),
        );

        return;
      }

      const command =
        chooseCommand(
          snapshot,
          identity.player,
        );

      if (
        command ===
          null
      ) {
        continue;
      }

      const result =
        await submitCommand(
          baseUrl,
          sessionId,
          identity,
          snapshot,
          command,
        );

      if (
        result ===
          null
      ) {
        commandApplied =
          true;

        break;
      }

      commandsApplied +=
        1;

      commandApplied =
        true;

      idleStartedAt =
        Date.now();

      lastHumanWaitRevision =
        null;

      break;
    }

    if (
      commandApplied
    ) {
      continue;
    }

    if (
      firstSnapshot ===
        null
    ) {
      throw new Error(
        "No player snapshot was available.",
      );
    }

    if (
      mode ===
        "ANDROID_PLAYER_0"
    ) {
      if (
        lastHumanWaitRevision !==
          firstSnapshot.revision
      ) {
        console.log(
          `Waiting for PLAYER_0 Android — revision ${firstSnapshot.revision}.`,
        );

        lastHumanWaitRevision =
          firstSnapshot.revision;
      }

      if (
        Date.now() -
          idleStartedAt >
        HUMAN_ACTION_TIMEOUT_MS
      ) {
        throw new Error(
          "Timed out while waiting for PLAYER_0 Android.",
        );
      }
    } else if (
      Date.now() -
        idleStartedAt >
      AUTOMATIC_PROGRESS_TIMEOUT_MS
    ) {
      throw new Error(
        "All-bot autoplay is blocked even though the match is not finished.",
      );
    }

    await sleep(
      POLL_INTERVAL_MS,
    );
  }

  throw new Error(
    `Autoplay stopped after reaching the safety limit of ${MAX_COMMANDS} commands.`,
  );
}

async function prepareAllBots(
  baseUrl,
) {
  const room =
    await createRoom(
      baseUrl,
    );

  if (
    typeof room.sessionId !==
      "string"
  ) {
    throw new Error(
      "Room creation returned an invalid session identifier.",
    );
  }

  const sessionId =
    room.sessionId;

  console.log(
    `Created room: ${sessionId}`,
  );

  const identities =
    [];

  for (
    const player
    of PLAYER_POSITIONS
  ) {
    const identity =
      await createAndClaimBot(
        baseUrl,
        sessionId,
        player,
      );

    identities.push(
      identity,
    );
  }

  const finalRoom =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    finalRoom.occupiedSeats !==
      4 ||
    finalRoom.phase !==
      "READY"
  ) {
    throw new Error(
      `Expected READY room with 4 players, received phase ${String(finalRoom.phase)} and ${String(finalRoom.occupiedSeats)}/4 players.`,
    );
  }

  await startRoom(
    baseUrl,
    sessionId,
    identities[0],
  );

  return Object.freeze({
    sessionId,
    controlledPlayers:
      Object.freeze(
        identities,
      ),
  });
}

async function prepareAndroidPlayer0(
  baseUrl,
  sessionId,
) {
  const initialRoom =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    initialRoom.phase !==
      "WAITING_FOR_PLAYERS"
  ) {
    throw new Error(
      `Create a fresh Android room before starting autoplay. Expected WAITING_FOR_PLAYERS, received ${String(initialRoom.phase)}.`,
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

  for (
    const player
    of ANDROID_BOT_PLAYERS
  ) {
    if (
      isSeatOccupied(
        initialRoom,
        player,
      )
    ) {
      throw new Error(
        `${player} is already occupied. Create a fresh Android room so the script can keep the bot authentication tokens.`,
      );
    }
  }

  const identities =
    [];

  for (
    const player
    of ANDROID_BOT_PLAYERS
  ) {
    const identity =
      await createAndClaimBot(
        baseUrl,
        sessionId,
        player,
      );

    identities.push(
      identity,
    );
  }

  const readyRoom =
    await getRoom(
      baseUrl,
      sessionId,
    );

  if (
    readyRoom.occupiedSeats !==
      4 ||
    readyRoom.phase !==
      "READY"
  ) {
    throw new Error(
      `Expected READY room with 4 players, received phase ${String(readyRoom.phase)} and ${String(readyRoom.occupiedSeats)}/4 players.`,
    );
  }

  console.log(
    "",
  );

  console.log(
    "Room is READY.",
  );

  console.log(
    "Press \"Démarrer la partie\" on PLAYER_0 Android.",
  );

  await waitForAndroidStart(
    baseUrl,
    sessionId,
  );

  return Object.freeze({
    sessionId,
    controlledPlayers:
      Object.freeze(
        identities,
      ),
  });
}

async function main() {
  const argumentsDocument =
    parseArguments();

  const baseUrl =
    process.env
      .ATOUTIA_API_BASE_URL
      ?.trim() ||
    DEFAULT_BASE_URL;

  console.log(
    "ATOUTIA autonomous test players",
  );

  console.log(
    `Backend: ${baseUrl}`,
  );

  console.log(
    `Mode: ${argumentsDocument.mode}`,
  );

  console.log(
    "",
  );

  const prepared =
    argumentsDocument.mode ===
      "ALL_BOTS"
      ? await prepareAllBots(
          baseUrl,
        )
      : await prepareAndroidPlayer0(
          baseUrl,
          argumentsDocument.sessionId,
        );

  console.log(
    "",
  );

  console.log(
    `Room: ${prepared.sessionId}`,
  );

  await autoplay(
    baseUrl,
    prepared.sessionId,
    prepared.controlledPlayers,
    argumentsDocument.mode,
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
        "Autoplay failed.",
      );

      console.error(
        error instanceof Error
          ? error.message
          : error,
      );

      console.error(
        "",
      );

      console.error(
        "The local backend must be running with ATOUTIA_AUTH_BOOTSTRAP_ENABLED=\"true\".",
      );

      process.exitCode =
        1;
    },
  );