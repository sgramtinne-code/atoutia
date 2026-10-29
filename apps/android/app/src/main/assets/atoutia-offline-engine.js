// Generated from the shared engine and offline adapter. Run pnpm --filter @atoutia/offline-game bundle.
"use strict";
var AtoutiaOffline = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // packages/offline-game/src/bridge.ts
  var bridge_exports = {};
  __export(bridge_exports, {
    request: () => request
  });

  // packages/belote-engine/dist/cards.js
  var SUITS = ["CLUBS", "DIAMONDS", "HEARTS", "SPADES"];
  var RANKS = [
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "JACK",
    "QUEEN",
    "KING",
    "ACE"
  ];
  function createCard(suit, rank) {
    return Object.freeze({
      suit,
      rank
    });
  }
  function createDeck() {
    const deck = SUITS.flatMap((suit) => RANKS.map((rank) => createCard(suit, rank)));
    return Object.freeze(deck);
  }
  function cardKey(card) {
    return `${card.suit}:${card.rank}`;
  }

  // packages/belote-engine/dist/cardRules.js
  var NON_TRUMP_STRENGTH = Object.freeze({
    SEVEN: 0,
    EIGHT: 1,
    NINE: 2,
    JACK: 3,
    QUEEN: 4,
    KING: 5,
    TEN: 6,
    ACE: 7
  });
  var TRUMP_STRENGTH = Object.freeze({
    SEVEN: 0,
    EIGHT: 1,
    QUEEN: 2,
    KING: 3,
    TEN: 4,
    ACE: 5,
    NINE: 6,
    JACK: 7
  });
  var NON_TRUMP_POINTS = Object.freeze({
    SEVEN: 0,
    EIGHT: 0,
    NINE: 0,
    JACK: 2,
    QUEEN: 3,
    KING: 4,
    TEN: 10,
    ACE: 11
  });
  var TRUMP_POINTS = Object.freeze({
    SEVEN: 0,
    EIGHT: 0,
    QUEEN: 3,
    KING: 4,
    TEN: 10,
    ACE: 11,
    NINE: 14,
    JACK: 20
  });
  function isTrump(card, trumpSuit) {
    return card.suit === trumpSuit;
  }
  function getCardPoints(card, trumpSuit) {
    return isTrump(card, trumpSuit) ? TRUMP_POINTS[card.rank] : NON_TRUMP_POINTS[card.rank];
  }
  function getCardStrength(card, trumpSuit) {
    return isTrump(card, trumpSuit) ? TRUMP_STRENGTH[card.rank] : NON_TRUMP_STRENGTH[card.rank];
  }

  // packages/belote-engine/dist/scoring.js
  function getPlayerTeam(player) {
    switch (player) {
      case "PLAYER_0":
      case "PLAYER_2":
        return "TEAM_0";
      case "PLAYER_1":
      case "PLAYER_3":
        return "TEAM_1";
    }
  }
  function getCompletedTrickPoints(completedTrick, trumpSuit, isLastTrick = false) {
    if (!completedTrick.trick.completed) {
      throw new Error("Trick must be completed before scoring.");
    }
    if (completedTrick.trick.plays.length !== 4) {
      throw new Error("A scored trick must contain exactly four cards.");
    }
    const cardPoints = completedTrick.trick.plays.reduce((total, play) => total + getCardPoints(play.card, trumpSuit), 0);
    return cardPoints + (isLastTrick ? 10 : 0);
  }
  function scoreCompletedDealTricks(completedTricks, trumpSuit) {
    if (completedTricks.length !== 8) {
      throw new Error("A complete deal must contain exactly eight completed tricks.");
    }
    const allCardKeys = completedTricks.flatMap((completedTrick) => completedTrick.trick.plays.map((play) => cardKey(play.card)));
    if (allCardKeys.length !== 32) {
      throw new Error("A complete deal must contain exactly 32 played cards.");
    }
    if (new Set(allCardKeys).size !== 32) {
      throw new Error("A complete deal must contain 32 unique played cards.");
    }
    let team0Points = 0;
    let team1Points = 0;
    for (let index = 0; index < completedTricks.length; index += 1) {
      const completedTrick = completedTricks[index];
      if (completedTrick === void 0) {
        throw new Error("Invalid completed trick.");
      }
      const points = getCompletedTrickPoints(completedTrick, trumpSuit, index === completedTricks.length - 1);
      const team = getPlayerTeam(completedTrick.winner.player);
      if (team === "TEAM_0") {
        team0Points += points;
      } else {
        team1Points += points;
      }
    }
    return Object.freeze({
      TEAM_0: team0Points,
      TEAM_1: team1Points
    });
  }

  // packages/belote-engine/dist/belote.js
  function hasTrumpHonorPair(hand, trumpSuit) {
    const hasKing = hand.some((card) => card.suit === trumpSuit && card.rank === "KING");
    const hasQueen = hand.some((card) => card.suit === trumpSuit && card.rank === "QUEEN");
    return hasKing && hasQueen;
  }
  function isTrumpHonor(card, trumpSuit) {
    return card.suit === trumpSuit && (card.rank === "KING" || card.rank === "QUEEN");
  }
  function createBeloteState(hands, trumpSuit) {
    const players = [
      "PLAYER_0",
      "PLAYER_1",
      "PLAYER_2",
      "PLAYER_3"
    ];
    const eligiblePlayers = players.filter((player) => hasTrumpHonorPair(hands[player], trumpSuit));
    if (eligiblePlayers.length > 1) {
      throw new Error("More than one player cannot hold the trump King and Queen.");
    }
    const eligiblePlayer = eligiblePlayers[0] ?? null;
    const eligibleTeam = eligiblePlayer === null ? null : getPlayerTeam(eligiblePlayer);
    return Object.freeze({
      trumpSuit,
      eligiblePlayer,
      eligibleTeam,
      playedHonorKeys: Object.freeze([]),
      events: Object.freeze([]),
      completed: false,
      points: 0
    });
  }
  function applyBeloteCardPlayed(state, player, card) {
    if (state.eligiblePlayer === null || player !== state.eligiblePlayer || !isTrumpHonor(card, state.trumpSuit)) {
      return Object.freeze({
        state,
        event: null
      });
    }
    const key = cardKey(card);
    if (state.playedHonorKeys.includes(key)) {
      throw new Error("Belote trump honor has already been played.");
    }
    if (state.completed) {
      throw new Error("Belote/Rebelote is already completed.");
    }
    const isFirstHonor = state.playedHonorKeys.length === 0;
    const event = Object.freeze({
      type: isFirstHonor ? "BELOTE" : "REBELOTE",
      player,
      team: getPlayerTeam(player),
      card
    });
    const nextPlayedHonorKeys = Object.freeze([
      ...state.playedHonorKeys,
      key
    ]);
    const completed = nextPlayedHonorKeys.length === 2;
    const nextState = Object.freeze({
      ...state,
      playedHonorKeys: nextPlayedHonorKeys,
      events: Object.freeze([
        ...state.events,
        event
      ]),
      completed,
      points: completed ? 20 : 0
    });
    return Object.freeze({
      state: nextState,
      event
    });
  }

  // packages/belote-engine/dist/players.js
  var PLAYER_POSITIONS = [
    "PLAYER_0",
    "PLAYER_1",
    "PLAYER_2",
    "PLAYER_3"
  ];
  function nextPlayer(position) {
    const index = PLAYER_POSITIONS.indexOf(position);
    return PLAYER_POSITIONS[(index + 1) % PLAYER_POSITIONS.length];
  }
  function getPlayOrderAfter(position) {
    const order = [];
    let current = nextPlayer(position);
    for (let index = 0; index < PLAYER_POSITIONS.length; index += 1) {
      order.push(current);
      current = nextPlayer(current);
    }
    return Object.freeze(order);
  }

  // packages/belote-engine/dist/bidding.js
  function createBiddingState(dealer, turnUpSuit) {
    return Object.freeze({
      dealer,
      turnUpSuit,
      round: "FIRST",
      currentPlayer: nextPlayer(dealer),
      passesInRound: 0,
      status: "IN_PROGRESS",
      taker: null,
      trumpSuit: null
    });
  }
  function getAllowedTrumpSuits(state) {
    if (state.status !== "IN_PROGRESS") {
      return Object.freeze([]);
    }
    if (state.round === "FIRST") {
      return Object.freeze([state.turnUpSuit]);
    }
    const allSuits = [
      "CLUBS",
      "DIAMONDS",
      "HEARTS",
      "SPADES"
    ];
    return Object.freeze(allSuits.filter((suit) => suit !== state.turnUpSuit));
  }
  function assertActionAllowed(state, action) {
    if (state.status !== "IN_PROGRESS") {
      throw new Error("Bidding is already finished.");
    }
    if (action.player !== state.currentPlayer) {
      throw new Error("It is not this player's turn.");
    }
    if (action.type === "TAKE") {
      const allowedSuits = getAllowedTrumpSuits(state);
      if (!allowedSuits.includes(action.suit)) {
        throw new Error("Trump suit is not allowed in this bidding round.");
      }
    }
  }
  function advanceAfterPass(state) {
    const newPasses = state.passesInRound + 1;
    if (newPasses < 4) {
      return Object.freeze({
        ...state,
        currentPlayer: nextPlayer(state.currentPlayer),
        passesInRound: newPasses
      });
    }
    if (state.round === "FIRST") {
      const playOrder = getPlayOrderAfter(state.dealer);
      const firstPlayer = playOrder[0];
      if (firstPlayer === void 0) {
        throw new Error("Unable to determine first bidding player.");
      }
      return Object.freeze({
        ...state,
        round: "SECOND",
        currentPlayer: firstPlayer,
        passesInRound: 0
      });
    }
    return Object.freeze({
      ...state,
      passesInRound: 4,
      status: "ALL_PASSED"
    });
  }
  function takeTrump(state, action) {
    return Object.freeze({
      ...state,
      status: "TAKEN",
      taker: action.player,
      trumpSuit: action.suit
    });
  }
  function applyBiddingAction(state, action) {
    assertActionAllowed(state, action);
    if (action.type === "PASS") {
      return advanceAfterPass(state);
    }
    return takeTrump(state, action);
  }

  // packages/belote-engine/dist/capot.js
  var CAPOT_POINTS = 252;
  function detectCapot(completedTricks) {
    if (completedTricks.length !== 8) {
      throw new Error("Capot detection requires exactly eight completed tricks.");
    }
    let team0Wins = 0;
    let team1Wins = 0;
    for (const completedTrick of completedTricks) {
      if (!completedTrick.trick.completed) {
        throw new Error("Capot detection requires completed tricks.");
      }
      if (completedTrick.trick.plays.length !== 4) {
        throw new Error("Each completed trick must contain exactly four played cards.");
      }
      const winningTeam = getPlayerTeam(completedTrick.winner.player);
      if (winningTeam === "TEAM_0") {
        team0Wins += 1;
      } else {
        team1Wins += 1;
      }
    }
    const trickWins = Object.freeze({
      TEAM_0: team0Wins,
      TEAM_1: team1Wins
    });
    if (team0Wins === 8) {
      return Object.freeze({
        isCapot: true,
        team: "TEAM_0",
        trickWins
      });
    }
    if (team1Wins === 8) {
      return Object.freeze({
        isCapot: true,
        team: "TEAM_1",
        trickWins
      });
    }
    return Object.freeze({
      isCapot: false,
      team: null,
      trickWins
    });
  }
  function applyCapotPoints(capotResult, beloteTeam = null) {
    if (!capotResult.isCapot || capotResult.team === null) {
      throw new Error("Capot points can only be applied to a detected capot.");
    }
    return Object.freeze({
      TEAM_0: (capotResult.team === "TEAM_0" ? CAPOT_POINTS : 0) + (beloteTeam === "TEAM_0" ? 20 : 0),
      TEAM_1: (capotResult.team === "TEAM_1" ? CAPOT_POINTS : 0) + (beloteTeam === "TEAM_1" ? 20 : 0)
    });
  }

  // packages/belote-engine/dist/dealResult.js
  function getOtherTeam(team) {
    return team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
  }
  function addBeloteBonus(rawTrickPoints, beloteBonus) {
    return Object.freeze({
      TEAM_0: rawTrickPoints.TEAM_0 + (beloteBonus?.team === "TEAM_0" ? beloteBonus.points : 0),
      TEAM_1: rawTrickPoints.TEAM_1 + (beloteBonus?.team === "TEAM_1" ? beloteBonus.points : 0)
    });
  }
  function assertRawTrickPoints(rawTrickPoints) {
    if (rawTrickPoints.TEAM_0 < 0 || rawTrickPoints.TEAM_1 < 0) {
      throw new Error("Raw trick points cannot be negative.");
    }
    if (rawTrickPoints.TEAM_0 + rawTrickPoints.TEAM_1 !== 162) {
      throw new Error("Raw trick points must total exactly 162.");
    }
  }
  function resolveDealResult(taker, rawTrickPoints, beloteBonus) {
    assertRawTrickPoints(rawTrickPoints);
    const takerTeam = getPlayerTeam(taker);
    const defendingTeam = getOtherTeam(takerTeam);
    const comparisonPoints = addBeloteBonus(rawTrickPoints, beloteBonus);
    const takerComparisonPoints = comparisonPoints[takerTeam];
    const defenderComparisonPoints = comparisonPoints[defendingTeam];
    if (takerComparisonPoints === defenderComparisonPoints) {
      return Object.freeze({
        status: "LITIGE",
        taker,
        takerTeam,
        defendingTeam,
        rawTrickPoints,
        beloteBonus,
        comparisonPoints,
        awardedPoints: comparisonPoints
      });
    }
    if (takerComparisonPoints > defenderComparisonPoints) {
      return Object.freeze({
        status: "CONTRACT_MADE",
        taker,
        takerTeam,
        defendingTeam,
        rawTrickPoints,
        beloteBonus,
        comparisonPoints,
        awardedPoints: comparisonPoints
      });
    }
    const awardedPoints = Object.freeze({
      TEAM_0: defendingTeam === "TEAM_0" ? 162 + (beloteBonus?.team === "TEAM_0" ? 20 : 0) : beloteBonus?.team === "TEAM_0" ? 20 : 0,
      TEAM_1: defendingTeam === "TEAM_1" ? 162 + (beloteBonus?.team === "TEAM_1" ? 20 : 0) : beloteBonus?.team === "TEAM_1" ? 20 : 0
    });
    return Object.freeze({
      status: "CONTRACT_FAILED",
      taker,
      takerTeam,
      defendingTeam,
      rawTrickPoints,
      beloteBonus,
      comparisonPoints,
      awardedPoints
    });
  }

  // packages/belote-engine/dist/matchRulesVersion.js
  var LEGACY_MATCH_RULES_VERSION = "CLASSIC_LEGACY_LITIGE_TAKER";
  var CURRENT_MATCH_RULES_VERSION = "CLASSIC_LITIGE_WINNER";
  function resolveMatchRulesVersion(value) {
    if (value === void 0)
      return LEGACY_MATCH_RULES_VERSION;
    if (value === LEGACY_MATCH_RULES_VERSION || value === CURRENT_MATCH_RULES_VERSION)
      return value;
    throw new Error("Unsupported match rules version.");
  }

  // packages/belote-engine/dist/litige.js
  function createLitigeState() {
    return Object.freeze({
      pendingPoints: 0
    });
  }
  function addPendingPoints(awardedPoints, team, pendingPoints) {
    if (pendingPoints === 0) {
      return awardedPoints;
    }
    return Object.freeze({
      TEAM_0: awardedPoints.TEAM_0 + (team === "TEAM_0" ? pendingPoints : 0),
      TEAM_1: awardedPoints.TEAM_1 + (team === "TEAM_1" ? pendingPoints : 0)
    });
  }
  function resolveLitigeForDeal(state, dealResult, rulesVersion = CURRENT_MATCH_RULES_VERSION) {
    const rules = resolveMatchRulesVersion(rulesVersion);
    if (state.pendingPoints < 0) {
      throw new Error("Pending litige points cannot be negative.");
    }
    if (dealResult.status !== "LITIGE") {
      const awardedPoints2 = addPendingPoints(dealResult.awardedPoints, rules === LEGACY_MATCH_RULES_VERSION || dealResult.status === "CONTRACT_MADE" ? dealResult.takerTeam : dealResult.defendingTeam, state.pendingPoints);
      return Object.freeze({
        awardedPoints: awardedPoints2,
        nextLitigeState: createLitigeState()
      });
    }
    const defendingTeam = dealResult.defendingTeam;
    const takerTeam = dealResult.takerTeam;
    const defenderPoints = dealResult.comparisonPoints[defendingTeam];
    const takerPoints = dealResult.comparisonPoints[takerTeam];
    const awardedPoints = Object.freeze({
      TEAM_0: defendingTeam === "TEAM_0" ? defenderPoints + state.pendingPoints : 0,
      TEAM_1: defendingTeam === "TEAM_1" ? defenderPoints + state.pendingPoints : 0
    });
    return Object.freeze({
      awardedPoints,
      nextLitigeState: Object.freeze({
        pendingPoints: takerPoints
      })
    });
  }

  // packages/belote-engine/dist/completeDealResult.js
  function getBeloteBonus(beloteState) {
    if (!beloteState.completed || beloteState.points !== 20 || beloteState.eligibleTeam === null) {
      return null;
    }
    return Object.freeze({
      team: beloteState.eligibleTeam,
      points: 20
    });
  }
  function getOtherTeam2(team) {
    return team === "TEAM_0" ? "TEAM_1" : "TEAM_0";
  }
  function createCapotDealResult(taker, rawTrickPoints, capot, beloteBonus) {
    if (!capot.isCapot || capot.team === null) {
      throw new Error("A capot deal result requires a detected capot.");
    }
    const takerTeam = getPlayerTeam(taker);
    const defendingTeam = getOtherTeam2(takerTeam);
    const capotPoints = applyCapotPoints(capot, beloteBonus?.team ?? null);
    return Object.freeze({
      status: capot.team === takerTeam ? "CONTRACT_MADE" : "CONTRACT_FAILED",
      taker,
      takerTeam,
      defendingTeam,
      rawTrickPoints,
      beloteBonus,
      comparisonPoints: capotPoints,
      awardedPoints: capotPoints
    });
  }
  function resolveCompleteDeal(completedTricks, trumpSuit, taker, beloteState, litigeState, rulesVersion = CURRENT_MATCH_RULES_VERSION) {
    if (beloteState.trumpSuit !== trumpSuit) {
      throw new Error("Belote state trump suit must match deal trump suit.");
    }
    const rawTrickPoints = scoreCompletedDealTricks(completedTricks, trumpSuit);
    const capot = detectCapot(completedTricks);
    const beloteBonus = getBeloteBonus(beloteState);
    const dealResult = capot.isCapot ? createCapotDealResult(taker, rawTrickPoints, capot, beloteBonus) : resolveDealResult(taker, rawTrickPoints, beloteBonus);
    const litigeResolution = resolveLitigeForDeal(litigeState, dealResult, rulesVersion);
    return Object.freeze({
      rawTrickPoints,
      capot,
      dealResult,
      litigeResolution,
      finalAwardedPoints: litigeResolution.awardedPoints
    });
  }

  // packages/belote-engine/dist/deck.js
  function shuffleDeck(deck, random) {
    const shuffled = [...deck];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(random.next() * (index + 1));
      const currentCard = shuffled[index];
      const randomCard = shuffled[randomIndex];
      if (currentCard === void 0 || randomCard === void 0) {
        throw new Error("Invalid deck state during shuffle.");
      }
      shuffled[index] = randomCard;
      shuffled[randomIndex] = currentCard;
    }
    return Object.freeze(shuffled);
  }

  // packages/belote-engine/dist/deal.js
  function assertValidDeck(deck) {
    if (deck.length !== 32) {
      throw new Error("Initial deal requires exactly 32 cards.");
    }
    const uniqueCards = new Set(deck.map(cardKey));
    if (uniqueCards.size !== 32) {
      throw new Error("Initial deal requires 32 unique cards.");
    }
  }
  function createEmptyHands() {
    return {
      PLAYER_0: [],
      PLAYER_1: [],
      PLAYER_2: [],
      PLAYER_3: []
    };
  }
  function getPacketSizes(pattern) {
    switch (pattern) {
      case "THREE_THEN_TWO":
        return [3, 2];
      case "TWO_THEN_THREE":
        return [2, 3];
    }
  }
  function freezeHands(hands) {
    return Object.freeze({
      PLAYER_0: Object.freeze([...hands.PLAYER_0]),
      PLAYER_1: Object.freeze([...hands.PLAYER_1]),
      PLAYER_2: Object.freeze([...hands.PLAYER_2]),
      PLAYER_3: Object.freeze([...hands.PLAYER_3])
    });
  }
  function createInitialDeal(deck, dealer, pattern = "THREE_THEN_TWO") {
    assertValidDeck(deck);
    const hands = createEmptyHands();
    const playOrder = getPlayOrderAfter(dealer);
    const packetSizes = getPacketSizes(pattern);
    let deckIndex = 0;
    for (const packetSize of packetSizes) {
      for (const player of playOrder) {
        const packet = deck.slice(deckIndex, deckIndex + packetSize);
        if (packet.length !== packetSize) {
          throw new Error("Unexpected end of deck during initial deal.");
        }
        hands[player].push(...packet);
        deckIndex += packetSize;
      }
    }
    const turnUpCard = deck[deckIndex];
    if (turnUpCard === void 0) {
      throw new Error("Turn-up card is missing.");
    }
    deckIndex += 1;
    const remainingDeck = Object.freeze(deck.slice(deckIndex));
    return Object.freeze({
      dealer,
      pattern,
      hands: freezeHands(hands),
      turnUpCard,
      remainingDeck
    });
  }

  // packages/belote-engine/dist/dealCompletion.js
  function cloneInitialHands(hands) {
    return {
      PLAYER_0: [...hands.PLAYER_0],
      PLAYER_1: [...hands.PLAYER_1],
      PLAYER_2: [...hands.PLAYER_2],
      PLAYER_3: [...hands.PLAYER_3]
    };
  }
  function freezeHands2(hands) {
    return Object.freeze({
      PLAYER_0: Object.freeze([...hands.PLAYER_0]),
      PLAYER_1: Object.freeze([...hands.PLAYER_1]),
      PLAYER_2: Object.freeze([...hands.PLAYER_2]),
      PLAYER_3: Object.freeze([...hands.PLAYER_3])
    });
  }
  function assertValidInitialDeal(initialDeal) {
    for (const hand of Object.values(initialDeal.hands)) {
      if (hand.length !== 5) {
        throw new Error("Deal completion requires exactly five cards per player.");
      }
    }
    if (initialDeal.remainingDeck.length !== 11) {
      throw new Error("Deal completion requires exactly eleven remaining cards.");
    }
    const allCards = [
      ...initialDeal.hands.PLAYER_0,
      ...initialDeal.hands.PLAYER_1,
      ...initialDeal.hands.PLAYER_2,
      ...initialDeal.hands.PLAYER_3,
      initialDeal.turnUpCard,
      ...initialDeal.remainingDeck
    ];
    if (allCards.length !== 32) {
      throw new Error("Deal completion requires exactly 32 cards.");
    }
    if (new Set(allCards.map(cardKey)).size !== 32) {
      throw new Error("Deal completion requires 32 unique cards.");
    }
  }
  function completeDealAfterTake(initialDeal, taker) {
    assertValidInitialDeal(initialDeal);
    const hands = cloneInitialHands(initialDeal.hands);
    const distributionOrder = getPlayOrderAfter(initialDeal.dealer);
    hands[taker].push(initialDeal.turnUpCard);
    let remainingIndex = 0;
    for (const player of distributionOrder) {
      const numberOfCards = player === taker ? 2 : 3;
      const packet = initialDeal.remainingDeck.slice(remainingIndex, remainingIndex + numberOfCards);
      if (packet.length !== numberOfCards) {
        throw new Error("Unexpected end of deck during deal completion.");
      }
      hands[player].push(...packet);
      remainingIndex += numberOfCards;
    }
    if (remainingIndex !== initialDeal.remainingDeck.length) {
      throw new Error("Not all remaining cards were distributed.");
    }
    for (const hand of Object.values(hands)) {
      if (hand.length !== 8) {
        throw new Error("Every player must have exactly eight cards after completion.");
      }
    }
    return Object.freeze({
      dealer: initialDeal.dealer,
      taker,
      hands: freezeHands2(hands)
    });
  }

  // packages/belote-engine/dist/random.js
  var Mulberry32Random = class {
    constructor(seed) {
      __publicField(this, "state");
      if (!Number.isInteger(seed)) {
        throw new Error("Seed must be an integer.");
      }
      this.state = seed >>> 0;
    }
    next() {
      let value = this.state += 1831565813;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }
  };

  // packages/belote-engine/dist/trick.js
  function doesCardBeat(challenger, currentWinner, ledSuit, trumpSuit) {
    const challengerIsTrump = challenger.suit === trumpSuit;
    const winnerIsTrump = currentWinner.suit === trumpSuit;
    if (challengerIsTrump && !winnerIsTrump) {
      return true;
    }
    if (!challengerIsTrump && winnerIsTrump) {
      return false;
    }
    if (challengerIsTrump && winnerIsTrump) {
      return getCardStrength(challenger, trumpSuit) > getCardStrength(currentWinner, trumpSuit);
    }
    const challengerFollowsLedSuit = challenger.suit === ledSuit;
    const winnerFollowsLedSuit = currentWinner.suit === ledSuit;
    if (challengerFollowsLedSuit && !winnerFollowsLedSuit) {
      return true;
    }
    if (!challengerFollowsLedSuit && winnerFollowsLedSuit) {
      return false;
    }
    if (!challengerFollowsLedSuit && !winnerFollowsLedSuit) {
      return false;
    }
    return getCardStrength(challenger, trumpSuit) > getCardStrength(currentWinner, trumpSuit);
  }
  function assertValidPlays(plays) {
    if (plays.length === 0) {
      throw new Error("A trick must contain at least one played card.");
    }
    if (plays.length > 4) {
      throw new Error("A trick cannot contain more than four played cards.");
    }
    const players = new Set(plays.map((play) => play.player));
    if (players.size !== plays.length) {
      throw new Error("A player cannot play more than once in the same trick.");
    }
  }
  function getTrickWinner(plays, trumpSuit) {
    assertValidPlays(plays);
    const firstPlay = plays[0];
    if (firstPlay === void 0) {
      throw new Error("Unable to determine the first played card.");
    }
    const ledSuit = firstPlay.card.suit;
    let winningPlay = firstPlay;
    let winningIndex = 0;
    for (let index = 1; index < plays.length; index += 1) {
      const challenger = plays[index];
      if (challenger === void 0) {
        throw new Error("Invalid trick state.");
      }
      if (doesCardBeat(challenger.card, winningPlay.card, ledSuit, trumpSuit)) {
        winningPlay = challenger;
        winningIndex = index;
      }
    }
    return Object.freeze({
      player: winningPlay.player,
      card: winningPlay.card,
      playIndex: winningIndex
    });
  }

  // packages/belote-engine/dist/legalPlays.js
  function arePartners(first, second) {
    return first === "PLAYER_0" && second === "PLAYER_2" || first === "PLAYER_2" && second === "PLAYER_0" || first === "PLAYER_1" && second === "PLAYER_3" || first === "PLAYER_3" && second === "PLAYER_1";
  }
  function freezeCards(cards) {
    return Object.freeze([...cards]);
  }
  function getHigherTrumps(cards, trumpSuit, currentWinningTrump) {
    return cards.filter((card) => card.suit === trumpSuit && getCardStrength(card, trumpSuit) > getCardStrength(currentWinningTrump, trumpSuit));
  }
  function assertPlayerHasNotAlreadyPlayed(player, plays) {
    if (plays.some((play) => play.player === player)) {
      throw new Error("Player has already played a card in this trick.");
    }
  }
  function getLegalCards(hand, player, plays, trumpSuit) {
    if (hand.length === 0) {
      return Object.freeze([]);
    }
    assertPlayerHasNotAlreadyPlayed(player, plays);
    if (plays.length === 0) {
      return freezeCards(hand);
    }
    const firstPlay = plays[0];
    if (firstPlay === void 0) {
      throw new Error("Unable to determine the led suit.");
    }
    const ledSuit = firstPlay.card.suit;
    const cardsOfLedSuit = hand.filter((card) => card.suit === ledSuit);
    if (cardsOfLedSuit.length > 0) {
      if (ledSuit === trumpSuit) {
        const winner2 = getTrickWinner(plays, trumpSuit);
        const higherTrumps2 = getHigherTrumps(cardsOfLedSuit, trumpSuit, winner2.card);
        if (higherTrumps2.length > 0) {
          return freezeCards(higherTrumps2);
        }
      }
      return freezeCards(cardsOfLedSuit);
    }
    const winner = getTrickWinner(plays, trumpSuit);
    if (arePartners(player, winner.player)) {
      return freezeCards(hand);
    }
    const trumps = hand.filter((card) => card.suit === trumpSuit);
    if (trumps.length === 0) {
      return freezeCards(hand);
    }
    if (winner.card.suit !== trumpSuit) {
      return freezeCards(trumps);
    }
    const higherTrumps = getHigherTrumps(trumps, trumpSuit, winner.card);
    if (higherTrumps.length > 0) {
      return freezeCards(higherTrumps);
    }
    return freezeCards(trumps);
  }

  // packages/belote-engine/dist/trickPlay.js
  function freezeHands3(hands) {
    return Object.freeze({
      PLAYER_0: Object.freeze([...hands.PLAYER_0]),
      PLAYER_1: Object.freeze([...hands.PLAYER_1]),
      PLAYER_2: Object.freeze([...hands.PLAYER_2]),
      PLAYER_3: Object.freeze([...hands.PLAYER_3])
    });
  }
  function cloneHands(hands) {
    return {
      PLAYER_0: [...hands.PLAYER_0],
      PLAYER_1: [...hands.PLAYER_1],
      PLAYER_2: [...hands.PLAYER_2],
      PLAYER_3: [...hands.PLAYER_3]
    };
  }
  function createTrickState(leader) {
    return Object.freeze({
      leader,
      currentPlayer: leader,
      plays: Object.freeze([]),
      winner: null,
      completed: false
    });
  }
  function assertCardIsInHand(hand, card) {
    const wantedKey = cardKey(card);
    if (!hand.some((candidate) => cardKey(candidate) === wantedKey)) {
      throw new Error("Card is not present in player's hand.");
    }
  }
  function assertCardIsLegal(hand, player, plays, trumpSuit, card) {
    const legalCards = getLegalCards(hand, player, plays, trumpSuit);
    const wantedKey = cardKey(card);
    if (!legalCards.some((candidate) => cardKey(candidate) === wantedKey)) {
      throw new Error("Card is not legal in the current trick.");
    }
  }
  function removeCardFromHand(hand, card) {
    const wantedKey = cardKey(card);
    const index = hand.findIndex((candidate) => cardKey(candidate) === wantedKey);
    if (index === -1) {
      throw new Error("Unable to remove card from hand.");
    }
    const nextHand = [...hand];
    nextHand.splice(index, 1);
    return nextHand;
  }
  function playCard(hands, trick, player, card, trumpSuit, beloteState) {
    if (trick.completed) {
      throw new Error("Trick is already completed.");
    }
    if (player !== trick.currentPlayer) {
      throw new Error("It is not this player's turn.");
    }
    if (beloteState.trumpSuit !== trumpSuit) {
      throw new Error("Belote state trump suit must match trick trump suit.");
    }
    const playerHand = hands[player];
    assertCardIsInHand(playerHand, card);
    assertCardIsLegal(playerHand, player, trick.plays, trumpSuit, card);
    const beloteResult = applyBeloteCardPlayed(beloteState, player, card);
    const nextHands = cloneHands(hands);
    nextHands[player] = removeCardFromHand(playerHand, card);
    const nextPlays = Object.freeze([
      ...trick.plays,
      Object.freeze({
        player,
        card
      })
    ]);
    if (nextPlays.length === 4) {
      const winner = getTrickWinner(nextPlays, trumpSuit);
      return Object.freeze({
        hands: freezeHands3(nextHands),
        trick: Object.freeze({
          leader: trick.leader,
          currentPlayer: winner.player,
          plays: nextPlays,
          winner,
          completed: true
        }),
        beloteState: beloteResult.state,
        beloteEvent: beloteResult.event
      });
    }
    return Object.freeze({
      hands: freezeHands3(nextHands),
      trick: Object.freeze({
        leader: trick.leader,
        currentPlayer: nextPlayer(player),
        plays: nextPlays,
        winner: null,
        completed: false
      }),
      beloteState: beloteResult.state,
      beloteEvent: beloteResult.event
    });
  }

  // packages/belote-engine/dist/trickSequence.js
  function createTrickSequence(hands, firstLeader) {
    return Object.freeze({
      hands,
      currentTrick: createTrickState(firstLeader),
      completedTricks: Object.freeze([])
    });
  }
  function advanceToNextTrick(state) {
    if (!state.currentTrick.completed) {
      throw new Error("Current trick must be completed before starting the next trick.");
    }
    const winner = state.currentTrick.winner;
    if (winner === null) {
      throw new Error("Completed trick must have a winner.");
    }
    const completedTrick = Object.freeze({
      leader: state.currentTrick.leader,
      winner,
      trick: state.currentTrick
    });
    return Object.freeze({
      hands: state.hands,
      currentTrick: createTrickState(winner.player),
      completedTricks: Object.freeze([
        ...state.completedTricks,
        completedTrick
      ])
    });
  }

  // packages/belote-engine/dist/dealMachine.js
  function assertSeed(seed) {
    if (!Number.isInteger(seed)) {
      throw new Error("Deal machine seed must be an integer.");
    }
  }
  function assertLitigeState(state) {
    if (!Number.isInteger(state.pendingPoints) || state.pendingPoints < 0) {
      throw new Error("Pending litige points must be a non-negative integer.");
    }
  }
  function createDealMachine(options) {
    assertSeed(options.seed);
    const litigeState = options.litigeState ?? createLitigeState();
    assertLitigeState(litigeState);
    const sourceDeck = createDeck();
    const shuffledDeck = shuffleDeck(sourceDeck, new Mulberry32Random(options.seed));
    const initialDeal = createInitialDeal(shuffledDeck, options.dealer, options.initialDealPattern ?? "THREE_THEN_TWO");
    const bidding = createBiddingState(options.dealer, initialDeal.turnUpCard.suit);
    return Object.freeze({
      seed: options.seed,
      dealer: options.dealer,
      phase: "BIDDING",
      shuffledDeck,
      initialDeal,
      bidding,
      completedDeal: null,
      taker: null,
      trumpSuit: null,
      belote: null,
      trickSequence: null,
      litigeState,
      resolution: null
    });
  }
  function applyDealMachineBiddingAction(state, action) {
    if (state.phase !== "BIDDING") {
      throw new Error("Bidding actions are only allowed during the bidding phase.");
    }
    const bidding = applyBiddingAction(state.bidding, action);
    if (bidding.status === "TAKEN") {
      if (bidding.taker === null || bidding.trumpSuit === null) {
        throw new Error("Taken bidding must define both taker and trump suit.");
      }
      const completedDeal = completeDealAfterTake(state.initialDeal, bidding.taker);
      const belote = createBeloteState(completedDeal.hands, bidding.trumpSuit);
      const firstLeader = nextPlayer(state.dealer);
      const trickSequence = createTrickSequence(completedDeal.hands, firstLeader);
      return Object.freeze({
        ...state,
        phase: "PLAYING",
        bidding,
        completedDeal,
        taker: bidding.taker,
        trumpSuit: bidding.trumpSuit,
        belote,
        trickSequence,
        resolution: null
      });
    }
    if (bidding.status === "ALL_PASSED") {
      return Object.freeze({
        ...state,
        phase: "FINISHED",
        bidding,
        completedDeal: null,
        taker: null,
        trumpSuit: null,
        belote: null,
        trickSequence: null,
        resolution: null
      });
    }
    return Object.freeze({
      ...state,
      bidding
    });
  }
  function createSequenceAfterPlay(previousSequence, playResult) {
    const sequenceAfterPlay = Object.freeze({
      hands: playResult.hands,
      currentTrick: playResult.trick,
      completedTricks: previousSequence.completedTricks
    });
    if (!playResult.trick.completed) {
      return sequenceAfterPlay;
    }
    if (previousSequence.completedTricks.length < 7) {
      return advanceToNextTrick(sequenceAfterPlay);
    }
    if (playResult.trick.winner === null) {
      throw new Error("A completed final trick must have a winner.");
    }
    const finalCompletedTrick = Object.freeze({
      leader: playResult.trick.leader,
      winner: playResult.trick.winner,
      trick: playResult.trick
    });
    return Object.freeze({
      hands: playResult.hands,
      currentTrick: playResult.trick,
      completedTricks: Object.freeze([
        ...previousSequence.completedTricks,
        finalCompletedTrick
      ])
    });
  }
  function applyDealMachineCardPlay(state, player, card, rulesVersion = CURRENT_MATCH_RULES_VERSION) {
    const rules = resolveMatchRulesVersion(rulesVersion);
    if (state.phase !== "PLAYING") {
      throw new Error("Cards can only be played during the playing phase.");
    }
    if (state.trumpSuit === null || state.taker === null || state.belote === null || state.trickSequence === null) {
      throw new Error("Playing phase requires taker, trump, Belote and trick sequence state.");
    }
    const playResult = playCard(state.trickSequence.hands, state.trickSequence.currentTrick, player, card, state.trumpSuit, state.belote);
    const trickSequence = createSequenceAfterPlay(state.trickSequence, playResult);
    const finished = trickSequence.completedTricks.length === 8;
    if (finished) {
      const resolution = resolveCompleteDeal(trickSequence.completedTricks, state.trumpSuit, state.taker, playResult.beloteState, state.litigeState, rules);
      const nextState2 = Object.freeze({
        ...state,
        phase: "FINISHED",
        belote: playResult.beloteState,
        trickSequence,
        litigeState: resolution.litigeResolution.nextLitigeState,
        resolution
      });
      return Object.freeze({
        state: nextState2,
        beloteEvent: playResult.beloteEvent
      });
    }
    const nextState = Object.freeze({
      ...state,
      phase: "PLAYING",
      belote: playResult.beloteState,
      trickSequence,
      resolution: null
    });
    return Object.freeze({
      state: nextState,
      beloteEvent: playResult.beloteEvent
    });
  }

  // packages/belote-engine/dist/matchHistory.js
  function createMatchHistory() {
    return Object.freeze([]);
  }
  function appendBiddingHistoryEvent(history, dealNumber, action) {
    const event = Object.freeze({
      index: history.length,
      type: "BIDDING_ACTION",
      dealNumber,
      action: Object.freeze({
        ...action
      })
    });
    return Object.freeze([
      ...history,
      event
    ]);
  }
  function appendCardPlayHistoryEvent(history, dealNumber, player, card) {
    const event = Object.freeze({
      index: history.length,
      type: "CARD_PLAY",
      dealNumber,
      player,
      card
    });
    return Object.freeze([
      ...history,
      event
    ]);
  }

  // packages/belote-engine/dist/matchScore.js
  function createMatchScoreState(targetScore = 1e3) {
    if (!Number.isInteger(targetScore) || targetScore <= 0) {
      throw new Error("Target score must be a positive integer.");
    }
    return Object.freeze({
      targetScore,
      scores: Object.freeze({
        TEAM_0: 0,
        TEAM_1: 0
      }),
      completed: false,
      winner: null
    });
  }
  function determineWinner(scores, targetScore) {
    const team0Reached = scores.TEAM_0 >= targetScore;
    const team1Reached = scores.TEAM_1 >= targetScore;
    if (!team0Reached && !team1Reached) {
      return null;
    }
    if (team0Reached && !team1Reached) {
      return "TEAM_0";
    }
    if (team1Reached && !team0Reached) {
      return "TEAM_1";
    }
    if (scores.TEAM_0 > scores.TEAM_1) {
      return "TEAM_0";
    }
    if (scores.TEAM_1 > scores.TEAM_0) {
      return "TEAM_1";
    }
    return null;
  }
  function addDealPointsToMatch(state, dealPoints) {
    if (state.completed) {
      throw new Error("Match is already completed.");
    }
    if (dealPoints.TEAM_0 < 0 || dealPoints.TEAM_1 < 0) {
      throw new Error("Deal points cannot be negative.");
    }
    const scores = Object.freeze({
      TEAM_0: state.scores.TEAM_0 + dealPoints.TEAM_0,
      TEAM_1: state.scores.TEAM_1 + dealPoints.TEAM_1
    });
    const winner = determineWinner(scores, state.targetScore);
    return Object.freeze({
      targetScore: state.targetScore,
      scores,
      completed: winner !== null,
      winner
    });
  }

  // packages/belote-engine/dist/matchMachine.js
  function assertBaseSeed(baseSeed) {
    if (!Number.isInteger(baseSeed)) {
      throw new Error("Match machine base seed must be an integer.");
    }
  }
  function getDealSeed(baseSeed, dealNumber) {
    return baseSeed + dealNumber - 1;
  }
  function finalizeFinishedDeal(state, finishedDeal) {
    if (finishedDeal.phase !== "FINISHED") {
      throw new Error("Only a finished deal can be finalized.");
    }
    let score = state.score;
    if (finishedDeal.resolution !== null) {
      score = addDealPointsToMatch(score, finishedDeal.resolution.finalAwardedPoints);
    }
    const litigeState = finishedDeal.litigeState;
    if (score.completed) {
      return Object.freeze({
        ...state,
        score,
        litigeState,
        currentDeal: finishedDeal
      });
    }
    const dealNumber = state.dealNumber + 1;
    const dealer = nextPlayer(state.dealer);
    const currentDeal = createDealMachine({
      seed: getDealSeed(state.baseSeed, dealNumber),
      dealer,
      litigeState
    });
    return Object.freeze({
      ...state,
      dealNumber,
      dealer,
      score,
      litigeState,
      currentDeal
    });
  }
  function createMatchMachine(options) {
    assertBaseSeed(options.baseSeed);
    const rulesVersion = options.rulesVersion === void 0 ? CURRENT_MATCH_RULES_VERSION : resolveMatchRulesVersion(options.rulesVersion);
    const firstDealer = options.firstDealer ?? "PLAYER_0";
    const dealer = firstDealer;
    const score = createMatchScoreState(options.targetScore ?? 1e3);
    const litigeState = createLitigeState();
    const dealNumber = 1;
    const currentDeal = createDealMachine({
      seed: getDealSeed(options.baseSeed, dealNumber),
      dealer,
      litigeState
    });
    const history = createMatchHistory();
    return Object.freeze({
      ...rulesVersion === LEGACY_MATCH_RULES_VERSION ? {} : { rulesVersion },
      baseSeed: options.baseSeed,
      firstDealer,
      dealNumber,
      dealer,
      score,
      litigeState,
      currentDeal,
      history
    });
  }
  function applyMatchBiddingAction(state, action) {
    resolveMatchRulesVersion(state.rulesVersion);
    if (state.score.completed) {
      throw new Error("Match is already completed.");
    }
    const currentDeal = applyDealMachineBiddingAction(state.currentDeal, action);
    const history = appendBiddingHistoryEvent(state.history, state.dealNumber, action);
    const stateWithAction = Object.freeze({
      ...state,
      currentDeal,
      history
    });
    if (currentDeal.phase === "FINISHED") {
      return finalizeFinishedDeal(stateWithAction, currentDeal);
    }
    return stateWithAction;
  }
  function applyMatchCardPlay(state, player, card) {
    if (state.score.completed) {
      throw new Error("Match is already completed.");
    }
    const dealPlay = applyDealMachineCardPlay(state.currentDeal, player, card, resolveMatchRulesVersion(state.rulesVersion));
    const history = appendCardPlayHistoryEvent(state.history, state.dealNumber, player, card);
    const stateWithAction = Object.freeze({
      ...state,
      currentDeal: dealPlay.state,
      history
    });
    const nextState = dealPlay.state.phase === "FINISHED" ? finalizeFinishedDeal(stateWithAction, dealPlay.state) : stateWithAction;
    return Object.freeze({
      state: nextState,
      dealPlay
    });
  }

  // packages/belote-engine/dist/version.js
  var BELOTE_ENGINE_VERSION = "0.1.0";

  // packages/belote-engine/dist/matchReplayFormat.js
  var MATCH_REPLAY_FORMAT_VERSION = 2;
  var LEGACY_MATCH_REPLAY_FORMAT_VERSION = 1;
  function resolveReplayRulesVersion(formatVersion, rulesVersion) {
    if (formatVersion === LEGACY_MATCH_REPLAY_FORMAT_VERSION) {
      if (rulesVersion !== void 0)
        throw new Error("Legacy replay must not declare a rules version.");
      return LEGACY_MATCH_RULES_VERSION;
    }
    if (formatVersion !== MATCH_REPLAY_FORMAT_VERSION)
      throw new Error("Unsupported match replay format version.");
    if (rulesVersion === void 0)
      throw new Error("Replay rules version is required.");
    return resolveMatchRulesVersion(rulesVersion);
  }
  function createMatchReplayDocument(state) {
    return Object.freeze({
      ...state.rulesVersion === void 0 ? {} : { rulesVersion: resolveMatchRulesVersion(state.rulesVersion) },
      formatVersion: state.rulesVersion === void 0 ? LEGACY_MATCH_REPLAY_FORMAT_VERSION : MATCH_REPLAY_FORMAT_VERSION,
      engineVersion: BELOTE_ENGINE_VERSION,
      baseSeed: state.baseSeed,
      firstDealer: state.firstDealer,
      targetScore: state.score.targetScore,
      history: state.history
    });
  }

  // packages/belote-engine/dist/matchReplay.js
  function assertHistoryEventPosition(event, expectedIndex, currentDealNumber) {
    if (event.index !== expectedIndex) {
      throw new Error("Match history indexes must be continuous and start at zero.");
    }
    if (event.dealNumber !== currentDealNumber) {
      throw new Error("Match history deal number does not match the current replay deal.");
    }
  }
  function replayMatch(options) {
    let state = createMatchMachine({
      ...options.rulesVersion === void 0 ? {} : { rulesVersion: options.rulesVersion },
      baseSeed: options.baseSeed,
      ...options.firstDealer === void 0 ? {} : {
        firstDealer: options.firstDealer
      },
      ...options.targetScore === void 0 ? {} : {
        targetScore: options.targetScore
      }
    });
    for (let expectedIndex = 0; expectedIndex < options.history.length; expectedIndex += 1) {
      const event = options.history[expectedIndex];
      if (event === void 0) {
        throw new Error("Missing match history event.");
      }
      assertHistoryEventPosition(event, expectedIndex, state.dealNumber);
      if (event.type === "BIDDING_ACTION") {
        state = applyMatchBiddingAction(state, event.action);
        continue;
      }
      state = applyMatchCardPlay(state, event.player, event.card).state;
    }
    return state;
  }
  function replayMatchDocument(document) {
    const rulesVersion = resolveReplayRulesVersion(document.formatVersion, document.rulesVersion);
    return replayMatch({
      rulesVersion,
      baseSeed: document.baseSeed,
      firstDealer: document.firstDealer,
      targetScore: document.targetScore,
      history: document.history
    });
  }

  // packages/belote-engine/dist/matchReplayJson.js
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function isPlayerPosition(value) {
    return typeof value === "string" && PLAYER_POSITIONS.includes(value);
  }
  function isSuit(value) {
    return typeof value === "string" && SUITS.includes(value);
  }
  function isRank(value) {
    return typeof value === "string" && RANKS.includes(value);
  }
  function assertPositiveInteger(value, message) {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
      throw new Error(message);
    }
  }
  function assertInteger(value, message) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error(message);
    }
  }
  function validateCard(value) {
    if (!isRecord(value)) {
      throw new Error("Replay card play must contain a card.");
    }
    if (!isSuit(value.suit)) {
      throw new Error("Replay card suit is invalid.");
    }
    if (!isRank(value.rank)) {
      throw new Error("Replay card rank is invalid.");
    }
    return Object.freeze({
      suit: value.suit,
      rank: value.rank
    });
  }
  function validateBiddingAction(value) {
    if (!isRecord(value)) {
      throw new Error("Replay bidding event must contain an action.");
    }
    if (!isPlayerPosition(value.player)) {
      throw new Error("Replay bidding action player is invalid.");
    }
    if (value.type === "PASS") {
      if ("suit" in value) {
        throw new Error("Replay PASS action must not contain a suit.");
      }
      return Object.freeze({
        type: "PASS",
        player: value.player
      });
    }
    if (value.type === "TAKE") {
      if (!isSuit(value.suit)) {
        throw new Error("Replay TAKE action suit is invalid.");
      }
      return Object.freeze({
        type: "TAKE",
        player: value.player,
        suit: value.suit
      });
    }
    throw new Error("Replay bidding action type is invalid.");
  }
  function validateHistoryEvent(event, expectedIndex) {
    if (!isRecord(event)) {
      throw new Error("Replay history event must be an object.");
    }
    if (event.index !== expectedIndex) {
      throw new Error("Replay history indexes must be continuous and start at zero.");
    }
    assertPositiveInteger(event.dealNumber, "Replay history deal number must be a positive integer.");
    if (event.type === "BIDDING_ACTION") {
      return Object.freeze({
        index: expectedIndex,
        type: "BIDDING_ACTION",
        dealNumber: event.dealNumber,
        action: validateBiddingAction(event.action)
      });
    }
    if (event.type === "CARD_PLAY") {
      if (!isPlayerPosition(event.player)) {
        throw new Error("Replay card play player is invalid.");
      }
      return Object.freeze({
        index: expectedIndex,
        type: "CARD_PLAY",
        dealNumber: event.dealNumber,
        player: event.player,
        card: validateCard(event.card)
      });
    }
    throw new Error("Replay history event type is invalid.");
  }
  function validateHistory(value) {
    if (!Array.isArray(value)) {
      throw new Error("Replay history must be an array.");
    }
    const events = value.map((event, index) => validateHistoryEvent(event, index));
    return Object.freeze(events);
  }
  function parseMatchReplayDocument(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("Replay JSON is invalid.");
    }
    if (!isRecord(parsed)) {
      throw new Error("Replay document must be an object.");
    }
    if (parsed.formatVersion !== MATCH_REPLAY_FORMAT_VERSION && parsed.formatVersion !== LEGACY_MATCH_REPLAY_FORMAT_VERSION) {
      throw new Error("Unsupported match replay format version.");
    }
    if (parsed.engineVersion !== BELOTE_ENGINE_VERSION) {
      throw new Error("Unsupported Belote engine version.");
    }
    assertInteger(parsed.baseSeed, "Replay base seed must be an integer.");
    if (!isPlayerPosition(parsed.firstDealer)) {
      throw new Error("Replay first dealer is invalid.");
    }
    assertPositiveInteger(parsed.targetScore, "Replay target score must be a positive integer.");
    const history = validateHistory(parsed.history);
    const rulesVersion = Object.hasOwn(parsed, "rulesVersion") ? resolveMatchRulesVersion(parsed.rulesVersion) : void 0;
    resolveReplayRulesVersion(parsed.formatVersion, rulesVersion);
    return Object.freeze({
      ...rulesVersion === void 0 ? {} : { rulesVersion },
      formatVersion: parsed.formatVersion,
      engineVersion: BELOTE_ENGINE_VERSION,
      baseSeed: parsed.baseSeed,
      firstDealer: parsed.firstDealer,
      targetScore: parsed.targetScore,
      history
    });
  }

  // packages/belote-engine/dist/publicMatchSnapshot.js
  function createPublicScoreSnapshot(state) {
    return Object.freeze({
      targetScore: state.score.targetScore,
      scores: Object.freeze({
        TEAM_0: state.score.scores.TEAM_0,
        TEAM_1: state.score.scores.TEAM_1
      }),
      completed: state.score.completed,
      winner: state.score.winner
    });
  }
  function createPublicCurrentTrickSnapshot(state) {
    const sequence = state.currentDeal.trickSequence;
    if (sequence === null) {
      return null;
    }
    const plays = sequence.currentTrick.plays.map((play) => Object.freeze({
      player: play.player,
      card: Object.freeze({
        suit: play.card.suit,
        rank: play.card.rank
      })
    }));
    return Object.freeze({
      currentPlayer: sequence.currentTrick.currentPlayer,
      plays: Object.freeze(plays)
    });
  }
  function createPublicMatchSnapshot(state) {
    const biddingPlayer = state.currentDeal.phase === "BIDDING" ? state.currentDeal.bidding.currentPlayer : null;
    const turnUpCard = state.currentDeal.initialDeal.turnUpCard;
    return Object.freeze({
      dealNumber: state.dealNumber,
      dealer: state.dealer,
      phase: state.currentDeal.phase,
      score: createPublicScoreSnapshot(state),
      biddingPlayer,
      taker: state.currentDeal.taker,
      trumpSuit: state.currentDeal.trumpSuit,
      turnUpCard: Object.freeze({
        suit: turnUpCard.suit,
        rank: turnUpCard.rank
      }),
      currentTrick: createPublicCurrentTrickSnapshot(state)
    });
  }

  // packages/belote-engine/dist/playerMatchSnapshot.js
  function cloneCard(card) {
    return Object.freeze({
      suit: card.suit,
      rank: card.rank
    });
  }
  function createPlayerHand(state, player) {
    if (state.currentDeal.phase === "BIDDING") {
      return Object.freeze(state.currentDeal.initialDeal.hands[player].map(cloneCard));
    }
    const sequence = state.currentDeal.trickSequence;
    if (sequence === null) {
      return Object.freeze([]);
    }
    return Object.freeze(sequence.hands[player].map(cloneCard));
  }
  function createLegalCards(state, player) {
    if (state.currentDeal.phase !== "PLAYING" || state.currentDeal.trickSequence === null || state.currentDeal.trumpSuit === null) {
      return Object.freeze([]);
    }
    const sequence = state.currentDeal.trickSequence;
    if (sequence.currentTrick.currentPlayer !== player) {
      return Object.freeze([]);
    }
    return Object.freeze(getLegalCards(sequence.hands[player], player, sequence.currentTrick.plays, state.currentDeal.trumpSuit).map(cloneCard));
  }
  function createPlayerMatchSnapshot(state, player) {
    return Object.freeze({
      public: createPublicMatchSnapshot(state),
      player,
      hand: createPlayerHand(state, player),
      legalCards: createLegalCards(state, player)
    });
  }

  // packages/belote-engine/dist/playerAvailableActions.js
  function cloneCard2(card) {
    return Object.freeze({
      suit: card.suit,
      rank: card.rank
    });
  }
  function freezeBiddingAction(action) {
    if (action.type === "PASS") {
      return Object.freeze({
        type: "PASS",
        player: action.player
      });
    }
    return Object.freeze({
      type: "TAKE",
      player: action.player,
      suit: action.suit
    });
  }
  function createBiddingActions(state, player) {
    const bidding = state.currentDeal.bidding;
    if (state.currentDeal.phase !== "BIDDING" || bidding.currentPlayer !== player) {
      return Object.freeze([]);
    }
    const actions = [
      {
        type: "PASS",
        player
      }
    ];
    if (bidding.round === "FIRST") {
      actions.push({
        type: "TAKE",
        player,
        suit: state.currentDeal.initialDeal.turnUpCard.suit
      });
    } else {
      for (const suit of [
        "CLUBS",
        "DIAMONDS",
        "HEARTS",
        "SPADES"
      ]) {
        if (suit !== state.currentDeal.initialDeal.turnUpCard.suit) {
          actions.push({
            type: "TAKE",
            player,
            suit
          });
        }
      }
    }
    return Object.freeze(actions.map(freezeBiddingAction));
  }
  function createLegalPlayerCards(state, player) {
    if (state.currentDeal.phase !== "PLAYING" || state.currentDeal.trickSequence === null || state.currentDeal.trumpSuit === null) {
      return Object.freeze([]);
    }
    const sequence = state.currentDeal.trickSequence;
    if (sequence.currentTrick.currentPlayer !== player) {
      return Object.freeze([]);
    }
    return Object.freeze(getLegalCards(sequence.hands[player], player, sequence.currentTrick.plays, state.currentDeal.trumpSuit).map(cloneCard2));
  }
  function createPlayerAvailableActions(state, player) {
    if (state.score.completed) {
      return Object.freeze({
        player,
        mode: "MATCH_FINISHED",
        biddingActions: Object.freeze([]),
        legalCards: Object.freeze([])
      });
    }
    if (state.currentDeal.phase === "BIDDING" && state.currentDeal.bidding.currentPlayer === player) {
      return Object.freeze({
        player,
        mode: "BID",
        biddingActions: createBiddingActions(state, player),
        legalCards: Object.freeze([])
      });
    }
    if (state.currentDeal.phase === "PLAYING" && state.currentDeal.trickSequence?.currentTrick.currentPlayer === player) {
      return Object.freeze({
        player,
        mode: "PLAY_CARD",
        biddingActions: Object.freeze([]),
        legalCards: createLegalPlayerCards(state, player)
      });
    }
    return Object.freeze({
      player,
      mode: "WAIT",
      biddingActions: Object.freeze([]),
      legalCards: Object.freeze([])
    });
  }

  // packages/belote-engine/dist/playerClientSnapshot.js
  function createPlayerClientSnapshot(state, player) {
    return Object.freeze({
      match: createPlayerMatchSnapshot(state, player),
      actions: createPlayerAvailableActions(state, player)
    });
  }

  // packages/belote-engine/dist/playerClientSnapshotFormat.js
  var PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION = 1;
  function createPlayerClientSnapshotDocument(state, player) {
    return Object.freeze({
      formatVersion: PLAYER_CLIENT_SNAPSHOT_FORMAT_VERSION,
      engineVersion: BELOTE_ENGINE_VERSION,
      snapshot: createPlayerClientSnapshot(state, player)
    });
  }

  // packages/belote-engine/dist/playerCommandFormat.js
  var PLAYER_COMMAND_FORMAT_VERSION = 1;

  // packages/belote-engine/dist/playerCommandJson.js
  function isRecord2(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function isPlayerPosition2(value) {
    return typeof value === "string" && PLAYER_POSITIONS.includes(value);
  }
  function isSuit2(value) {
    return typeof value === "string" && SUITS.includes(value);
  }
  function isRank2(value) {
    return typeof value === "string" && RANKS.includes(value);
  }
  function validateCard2(value) {
    if (!isRecord2(value)) {
      throw new Error("Player command card must be an object.");
    }
    if (!isSuit2(value.suit)) {
      throw new Error("Player command card suit is invalid.");
    }
    if (!isRank2(value.rank)) {
      throw new Error("Player command card rank is invalid.");
    }
    return Object.freeze({
      suit: value.suit,
      rank: value.rank
    });
  }
  function validateCommand(value) {
    if (!isRecord2(value)) {
      throw new Error("Player command must be an object.");
    }
    if (value.type === "PASS") {
      return Object.freeze({
        type: "PASS"
      });
    }
    if (value.type === "TAKE") {
      if (!isSuit2(value.suit)) {
        throw new Error("Player command TAKE suit is invalid.");
      }
      return Object.freeze({
        type: "TAKE",
        suit: value.suit
      });
    }
    if (value.type === "PLAY_CARD") {
      return Object.freeze({
        type: "PLAY_CARD",
        card: validateCard2(value.card)
      });
    }
    throw new Error("Player command type is invalid.");
  }
  function parsePlayerCommandDocument(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("Player command JSON is invalid.");
    }
    if (!isRecord2(parsed)) {
      throw new Error("Player command document must be an object.");
    }
    if (parsed.formatVersion !== PLAYER_COMMAND_FORMAT_VERSION) {
      throw new Error("Unsupported player command format version.");
    }
    if (parsed.engineVersion !== BELOTE_ENGINE_VERSION) {
      throw new Error("Unsupported player command engine version.");
    }
    if (!isPlayerPosition2(parsed.player)) {
      throw new Error("Player command player is invalid.");
    }
    return Object.freeze({
      formatVersion: PLAYER_COMMAND_FORMAT_VERSION,
      engineVersion: BELOTE_ENGINE_VERSION,
      player: parsed.player,
      command: validateCommand(parsed.command)
    });
  }

  // packages/belote-engine/dist/playerCommandApply.js
  function applyPlayerCommandDocument(state, document) {
    const { player, command } = document;
    if (command.type === "PASS") {
      return applyMatchBiddingAction(state, {
        type: "PASS",
        player
      });
    }
    if (command.type === "TAKE") {
      return applyMatchBiddingAction(state, {
        type: "TAKE",
        player,
        suit: command.suit
      });
    }
    return applyMatchCardPlay(state, player, command.card).state;
  }

  // packages/belote-engine/dist/matchSessionId.js
  var MATCH_SESSION_ID_BYTE_LENGTH = 16;
  var MATCH_SESSION_ID_HEX_LENGTH = MATCH_SESSION_ID_BYTE_LENGTH * 2;

  // packages/offline-game/src/index.ts
  var OFFLINE_SAVE_VERSION = 1;
  var OFFLINE_BOT_POLICY = "starter-v1";
  var HUMAN_PLAYER = "PLAYER_0";
  var MAX_SAVE_LENGTH = 2 * 1024 * 1024;
  function chooseOfflineBot(snapshot) {
    const { actions, match } = snapshot;
    if (actions.mode === "BID") {
      const threshold = actions.player === "PLAYER_1" ? 28 : actions.player === "PLAYER_3" ? 42 : 35;
      const takes = actions.biddingActions.filter((action) => action.type === "TAKE");
      const candidates = takes.map((action) => ({
        action,
        strength: match.hand.filter((card) => card.suit === action.suit).reduce((total, card) => total + 6 + getCardPoints(card, action.suit), 0)
      })).sort((a, b) => b.strength - a.strength);
      const best = candidates[0];
      if (best && best.strength >= threshold) return { type: "TAKE", suit: best.action.suit };
      return { type: "PASS" };
    }
    if (actions.mode === "PLAY_CARD") {
      const trump = match.public.trumpSuit;
      const cards = [...actions.legalCards];
      if (trump !== null && actions.player !== "PLAYER_1") {
        cards.sort((a, b) => getCardPoints(a, trump) - getCardPoints(b, trump));
      }
      const card = cards[0];
      return card ? { type: "PLAY_CARD", card } : null;
    }
    return null;
  }
  var OfflineGame = class _OfflineGame {
    constructor(state) {
      __publicField(this, "state", state);
    }
    static start(seed) {
      if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) throw new Error("Invalid offline seed.");
      return new _OfflineGame(createMatchMachine({ baseSeed: seed, firstDealer: "PLAYER_3", targetScore: 1e3 }));
    }
    static restore(text) {
      if (text.length > MAX_SAVE_LENGTH) throw new Error("Offline save is too large.");
      const save = JSON.parse(text);
      if (!save || Array.isArray(save) || save.formatVersion !== OFFLINE_SAVE_VERSION || save.botPolicy !== OFFLINE_BOT_POLICY) {
        throw new Error("Unsupported offline save.");
      }
      const replay = parseMatchReplayDocument(JSON.stringify(save.replay));
      if (replay.targetScore !== 1e3 || replay.history.length > 2e4) throw new Error("Invalid offline match configuration.");
      return new _OfflineGame(replayMatchDocument(replay));
    }
    apply(player, command) {
      const document = parsePlayerCommandDocument(JSON.stringify({
        formatVersion: 1,
        engineVersion: BELOTE_ENGINE_VERSION,
        player,
        command
      }));
      this.state = applyPlayerCommandDocument(this.state, document);
    }
    requireRevision(revision) {
      if (revision !== this.state.history.length) throw new Error("Offline revision mismatch.");
    }
    human(command, expectedRevision) {
      this.requireRevision(expectedRevision);
      this.apply(HUMAN_PLAYER, command);
    }
    stepBot(expectedRevision) {
      this.requireRevision(expectedRevision);
      if (this.state.score.completed) return;
      const deal = this.state.currentDeal;
      const player = deal.phase === "BIDDING" ? deal.bidding.currentPlayer : deal.trickSequence?.currentTrick.currentPlayer;
      if (!player) throw new Error("Offline game has no current player.");
      if (player === HUMAN_PLAYER) return;
      const command = chooseOfflineBot(createPlayerClientSnapshot(this.state, player));
      if (!command) throw new Error("Offline bot has no action.");
      this.apply(player, command);
    }
    frame() {
      return {
        revision: this.state.history.length,
        document: createPlayerClientSnapshotDocument(this.state, HUMAN_PLAYER),
        save: JSON.stringify({ formatVersion: OFFLINE_SAVE_VERSION, botPolicy: OFFLINE_BOT_POLICY, replay: createMatchReplayDocument(this.state) })
      };
    }
  };

  // packages/offline-game/src/bridge.ts
  var game = null;
  function request(json) {
    const input = JSON.parse(json);
    if (!input || Array.isArray(input)) throw new Error("Invalid offline request.");
    switch (input.method) {
      case "start":
        if (typeof input.seed !== "number") throw new Error("Missing offline seed.");
        game = OfflineGame.start(input.seed);
        break;
      case "restore":
        if (typeof input.save !== "string") throw new Error("Missing offline save.");
        game = OfflineGame.restore(input.save);
        break;
      case "human":
        if (!game || typeof input.revision !== "number") throw new Error("Missing offline match.");
        game.human(input.command, input.revision);
        break;
      case "bot":
        if (!game || typeof input.revision !== "number") throw new Error("Missing offline match.");
        game.stepBot(input.revision);
        break;
      case "snapshot":
        break;
      default:
        throw new Error("Unknown offline method.");
    }
    if (!game) throw new Error("Offline match has not started.");
    return JSON.stringify(game.frame());
  }
  return __toCommonJS(bridge_exports);
})();
