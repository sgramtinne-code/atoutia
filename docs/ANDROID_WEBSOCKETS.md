# Cycle de vie WebSocket Android

Branche `fix/android-websocket-lifecycle`, depuis main `82b0937`, après la PR nº 7 validée et récupérée. Le jalon précédent reste acquis. Cette revue porte sur les ressources et courses de fermeture, pas sur le protocole, les règles ou la présence serveur.

## Reproduction avant correction

Les clients reçoivent une fabrique WebSocket et une fabrique d’exécuteur injectables. Les valeurs par défaut gardent leur comportement initial. Dix-sept tests JVM utilisent un ordonnanceur manuel et des sockets enregistrés, sans thread, timer réel, pause ou réseau : ils imposent les entrelacements exacts.

Salon : arrêt de l’exécuteur lors d’une fermeture/erreur distante, ouverture tardive après close, close déclenché dans onConnected, fermeture idempotente, échec synchrone de création, heartbeat capturé après close et cadence sans rattrapage en rafale.

Partie : close pendant recherche du token ou création du socket, acknowledge simultané à close, suppression des callbacks en file après close, heartbeat, échec synchrone/reconnexion et conservation de la validation des révisions négatives.

La reproduction `309fa65` est exécutée dans Android CI : run `40107762457`, job `120912892898`. Compilation réelle réussie, **209 tests, 14 échecs**, tous dans les nouveaux tests (neuf salon, cinq partie). Les 192 tests antérieurs passent. Les trois nouveaux tests déjà verts contrôlent surtout les protections existantes. L’échec rouge est conservé avant le correctif ; les résultats après correction restent à vérifier.

## Périmètre et validation

Préserver les messages HEARTBEAT version 1, l’intervalle nominal de dix secondes, la reconnexion progressive et la fourniture du token à chaque reconnexion de partie. Le serveur conserve son timeout heartbeat de trente secondes et sa grâce de reconnexion ; aucune modification backend, adjudication ou SQLite.

La compilation et la suite JVM seront réellement exécutées dans Android CI. Ensuite, avant fusion, tester sur l’émulateur du développeur les transitions salon/quitter/recréer, démarrage de partie, interruption/reprise du réseau et fermeture/relancement. Réutiliser le lanceur automatique existant, N pour PLAYER_0 manuel et O pour les trois PNJ ; aucun ID à copier et aucun test Keystore à refaire sans raison.


## Correction proposée

La connexion du salon possède un état synchronisé ACTIVE/CLOSING/TERMINATED/LOCALLY_CLOSED. Les chemins terminaux annulent le heartbeat et arrêtent l’ordonnanceur ; une ouverture tardive ne relance rien. Une fermeture locale est idempotente et les événements arrivant ensuite sont ignorés. L’erreur de création synchrone libère également l’exécuteur. Le callback utilisateur est exécuté hors du verrou ; une fermeture concurrente ne peut annuler un callback déjà engagé.

La partie revérifie close après la recherche du token et attache le socket sous un verrou partagé avec close. Un socket créé pendant la fermeture est immédiatement fermé. Acknowledge passe par executeIfActive ; seuls les rejets de l’exécuteur liés à close sont ignorés. Une erreur synchrone de création est signalée et déclenche la reconnexion existante. Le heartbeat est protégé à l’envoi et les deux clients emploient un délai fixe de dix secondes pour éviter le rattrapage en rafale après suspension Android. Le test token couvre retour normal et exception après fermeture, sans nouvel essai de connexion ni erreur remontée.

La [PR nº 8](https://github.com/sgramtinne-code/atoutia/pull/8) reste en brouillon. Les résultats des CI du correctif et les essais WSL/émulateur ciblés doivent être reçus avant fusion ; les validations PR nº 7 restent acquises pour leur périmètre.


## Résultats après correction

Commit applicatif `0afd032` : Android CI `40108167912`, job `120914099092`, **209 tests JVM réussis, zéro échec/erreur/ignoré**, deux APK compilés, lint réussi avec 12 avertissements et une suggestion. Les deux alertes scheduleAtFixedRate ont disparu grâce au délai fixe, sans suppression lint. Moteur/backend CI `40108167922` réussie. Ces résultats ne remplacent pas les essais sur appareil ci-dessous.

## Préparation WSL et Android

Récupérer la branche sans écraser de changements locaux :

```bash
cd "$HOME/projects/atoutia"
git status --short --branch
git fetch origin &&
git switch fix/android-websocket-lifecycle &&
git pull --ff-only origin fix/android-websocket-lifecycle
```

Terminal 1 : vérifier `curl --fail --silent --show-error http://127.0.0.1:3000/health`. Garder le backend déjà sain ; sinon le démarrer dans ce terminal avec le Client ID Web Google déjà validé, en remplaçant le paramètre générique ci-dessous :

```bash
cd "$HOME/projects/atoutia"
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build &&
HOST="127.0.0.1" PORT="3000" \
ATOUTIA_AUTH_BOOTSTRAP_ENABLED="true" \
ATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>" \
pnpm --filter @atoutia/backend start
```

Terminal 2 : définir ADB avec son chemin Windows déjà validé sous WSL, puis `"$ADB" devices` ; un seul émulateur doit être en état device. Le lanceur existant connaît le chemin local utilisé dans les essais précédents ; `ATOUTIA_ADB` permet de le remplacer si nécessaire. Aucun ID de salon n’est saisi.

## Essai du cycle de vie du salon

Dans le terminal 2 :

```bash
cd "$HOME/projects/atoutia"
node apps/backend/scripts/dev-android-room.mjs
```

Répondre **N pour PLAYER_0 automatique et N pour les PNJ**. Attendre ATTENTE DU NOUVEAU SALON, puis Jouer → Créer une partie. À la détection, le script s’arrête sans PNJ. Attendre « Temps réel : connecté », utiliser Quitter le salon ; créer un second salon, vérifier encore la connexion, puis quitter. Attendu : retour sans plantage, pas de message provenant de l’ancien salon. Aucun match à terminer dans cet essai.

## Partie et véritable coupure de transport Android

Dans le terminal 2, relancer la même commande, cette fois **N/O**. Attendre ATTENTE DU NOUVEAU SALON sans le créer immédiatement.

Dans un terminal 3, définir ADB avec le même chemin validé, puis lancer :

```bash
cd "$HOME/projects/atoutia"
ATOUTIA_ADB="$ADB" node apps/backend/scripts/dev-android-network.mjs
```

Le relais écoute uniquement sur 127.0.0.1:3001, configure reverse 3000 → 3001 puis relance Android pour éliminer toute ancienne connexion directe. Il est réservé au backend local standard sur 3000 et à un seul appareil ADB. Attendre son message « créer maintenant le nouveau salon ». Créer alors le salon dans Android, attendre 4/4 et démarrer. Le lanceur reste actif dans le terminal 2 ; le backend et les trois PNJ gardent leur connexion directe à 3000.

À un tour où PLAYER_0 doit jouer une carte, sans la jouer, saisir **c puis Entrée** dans le terminal 3. Le relais ferme les flux Android existants et refuse les nouveaux, sans arrêter le backend ni les PNJ. Après environ cinq à dix secondes, saisir **r puis Entrée**, puis attendre la reconnexion automatique. Reprendre la partie, jouer la carte et vérifier que les PNJ avancent. Rester largement sous la grâce de reconnexion de deux minutes. Un message d’interruption pendant la coupure est attendu ; un plantage, une reconnexion impossible ou des actions dupliquées sont à signaler.

Ne pas utiliser la seule suppression du mapping reverse comme preuve de coupure : les flux existants pourraient subsister. Le relais détruit explicitement les sockets et ses tests couvrent le rétablissement.

Quand le réseau est rétabli et la partie avance, saisir **q puis Entrée**. Le relais ferme ses flux et restaure reverse 3000 → 3000 ; attendre la reconnexion. Dans ce même terminal 3 :

```bash
"$ADB" shell am force-stop tech.devoo.atoutia &&
"$ADB" shell am start -n tech.devoo.atoutia/.MainActivity
```

Vérifier le retour à la même partie et aux mêmes cartes, sans nouvelle connexion Google ; jouer puis constater la progression des PNJ. Cette nouvelle fermeture est ciblée sur les clients modifiés. Une nouvelle partie entière/Keystore n’est pas imposée : leurs validations précédentes restent acquises.

Si le relais est tué brutalement, ou si sa restauration échoue :

```bash
"$ADB" reverse tcp:3000 tcp:3000
```

Le relais ne lit ni n’enregistre les messages/tokens et ne touche pas SQLite. Ses cinq tests locaux utilisent des sockets loopback et un ADB simulé pour le parcours CLI ; la validation WSL/émulateur réelle reste à recevoir. Rapporter simplement les étapes réussies et les erreurs éventuelles, sans données privées du match. Ne pas fusionner avant les CI du dernier commit et les résultats ciblés nécessaires.

Contrôle local de l’outil réseau : suite backend complète **72 fichiers, 610 tests réussis** ; cinq nouveaux tests de relais/CLI compris. Syntaxe des deux scripts et diff vérifiés. Les exécutions Actions du commit incluant cet outil restent à vérifier séparément.
