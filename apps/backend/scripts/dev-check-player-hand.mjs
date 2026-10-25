import assert from "node:assert/strict";
import {
  applyMatchBiddingAction,
  applyMatchCardPlay,
  createMatchMachine,
  createPlayerMatchSnapshot,
} from "@atoutia/belote-engine";

// Import the built workspace package exactly as the backend does.
// Only synthetic state: no server, account, SQLite or real game is accessed.
let state = createMatchMachine({ baseSeed: 4000 });
state = applyMatchBiddingAction(state, {
  type: "TAKE",
  player: state.currentDeal.bidding.currentPlayer,
  suit: state.currentDeal.initialDeal.turnUpCard.suit,
});
const player = state.currentDeal.trickSequence.currentTrick.currentPlayer;
const before = createPlayerMatchSnapshot(state, player);
assert.equal(before.hand.length, 8, "La fixture doit commencer avec huit cartes.");
const played = before.legalCards[0];
assert.ok(played, "La fixture doit proposer un coup légal.");
state = applyMatchCardPlay(state, player, played).state;
const after = createPlayerMatchSnapshot(state, player);
assert.equal(after.hand.length, 7,
  "Le paquet compilé conserve huit cartes : reconstruire le moteur avant de démarrer le backend.");
assert.ok(!after.hand.some(card => card.suit === played.suit && card.rank === played.rank),
  "La carte jouée est encore dans le snapshot compilé.");
assert.deepEqual(after.hand, state.currentDeal.trickSequence.hands[player]);
console.log("Moteur compilé vérifié : 8 → 7 cartes, carte jouée retirée.");
console.log("Ce contrôle synthétique ne vérifie pas un backend déjà lancé : le redémarrer après le build.");
