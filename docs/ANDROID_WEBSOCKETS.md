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

Répondre **N pour PLAYER_0 automatique et N pour les PNJ**. Le lanceur compile et installe le nouvel APK ; git pull seul ne le remplace pas sur l’émulateur. Attendre ATTENTE DU NOUVEAU SALON. Si une ancienne partie est restaurée, utiliser **Retour à l’accueil**, visible au-dessus du contenu (ou le geste Retour Android), puis Jouer → Créer une partie. Ce retour conserve la référence de reprise et ne termine pas la partie serveur. Ne pas essayer de jouer à la place d’un participant absent. À la détection, le script s’arrête sans PNJ. Attendre « Temps réel : connecté », utiliser Quitter le salon ; créer un second salon, vérifier encore la connexion, puis quitter. Attendu : retour sans plantage, pas de message provenant de l’ancien salon. Aucun match à terminer dans cet essai.

## Partie et véritable coupure de transport Android

Quitter d’abord le salon d’attente actuel avec le bouton Android Quitter le salon. Si un ancien lanceur PNJ tourne encore, l’arrêter par Ctrl-C ; quitter l’ancien relais par q s’il attend des commandes. Garder le backend actif. Dans le terminal 2, relancer la même commande, cette fois **N/O**. Les deux détections N/N déjà reçues ne sont pas à répéter. Attendre ATTENTE DU NOUVEAU SALON sans le créer immédiatement.

Dans un terminal 3, définir ADB avec le même chemin validé, puis lancer :

```bash
cd "$HOME/projects/atoutia"
ATOUTIA_ADB="$ADB" node apps/backend/scripts/dev-android-network.mjs
```

Le relais écoute uniquement sur 127.0.0.1:3001, configure reverse 3000 → 3001 puis relance Android pour éliminer toute ancienne connexion directe. Il est réservé au backend local standard sur 3000 et à un seul appareil ADB. Attendre son message « créer maintenant le nouveau salon ». Si l’ancienne partie est restaurée, toucher Retour à l’accueil ; si un ancien salon est restauré, utiliser Quitter le salon. Créer alors seulement le nouveau salon dans Android, attendre 4/4 et démarrer. Le lanceur reste actif dans le terminal 2 ; le backend et les trois PNJ gardent leur connexion directe à 3000.

Avant de couper, jouer une première carte et constater la progression des PNJ. Au tour PLAYER_0 suivant, sans jouer sa carte, saisir **s puis Entrée** dans le terminal 3 et conserver l’état affiché ; puis **c puis Entrée**. Le relais indique le nombre de connexions TCP fermées. Le relais ferme les flux Android existants et refuse les nouveaux, sans arrêter le backend ni les PNJ. Après dix secondes, saisir **r puis Entrée**. Attendre dix secondes supplémentaires, puis saisir **s puis Entrée** pour voir si de nouvelles connexions sont acceptées et si des erreurs backend sont comptées. L’annonce « relais rouvert » ne prouve pas à elle seule la reconnexion Android. Reprendre la partie, jouer la carte et vérifier que les PNJ avancent. Rester largement sous la grâce de reconnexion de deux minutes. Un message d’interruption pendant la coupure est attendu ; un plantage, une reconnexion impossible ou des actions dupliquées sont à signaler.

Ne pas utiliser la seule suppression du mapping reverse comme preuve de coupure : les flux existants pourraient subsister. Le relais détruit explicitement les sockets et ses tests couvrent le rétablissement.

Quand le réseau est rétabli et la partie avance, saisir **q puis Entrée**. Le relais ferme ses flux et restaure reverse 3000 → 3000 ; attendre la reconnexion. Attendre ensuite un tour de PLAYER_0 et ne pas jouer sa carte. Dans ce même terminal 3 :

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

Contrôle local de l’outil réseau : suite backend complète **72 fichiers, 610 tests réussis** ; cinq nouveaux tests de relais/CLI compris. Syntaxe des deux scripts et diff vérifiés. Le commit **`94dcf75`**, outil réseau compris, est maintenant confirmé vert dans les deux CI : moteur/backend `40108570218` (job `120915296625`) et Android `40108570232` (job `120915296646`). Android : 209/209 JVM, APK debug/instrumenté et lint réussis, 12 avertissements et une suggestion. Backend : 610 tests, moteur : 583, typechecks/builds et CLI synthétiques réussis. Test local supplémentaire de SIGINT avec ADB simulé : sortie 0 et reverse restauré. Les liens locaux et blocs bash de la documentation sont vérifiés. Le Kotlin reste `0afd032`, l’outil réseau `94dcf75`. Vérifier aussi les contrôles du dernier commit documentaire sur la PR ; les seuls résultats fonctionnels encore attendus sont les essais ciblés WSL/émulateur décrits ci-dessus. PR nº 8 en brouillon, aucune fusion annoncée.


## Déblocage du parcours depuis une ancienne partie restaurée

Le développeur a récupéré `8a5adee` et confirmé health OK, puis signale être bloqué dans une ancienne partie en cours. La capture privée montre les autres participants absents et le tour d’un autre joueur : aucune carte locale ne doit être forcée. Le retour à l’accueil était limité aux parties terminées ; la procédure précédente ne couvrait pas cet état initial. Ce retour n’atteste pas encore les nouveaux essais salon/réseau de la PR nº 8.

Correction sur la même branche/PR : bouton **Retour à l’accueil** toujours accessible au-dessus du contenu d’une partie en cours et geste Retour Android équivalent, désactivés pendant une soumission de carte/enchère. Callback dédié `onReturnToHome`, distinct des actions de fin : conserve l’authentification et la référence de reprise, sans clearActiveRoomSession, leaveRoom, abandon, forfait ou suppression SQLite. La sortie d’écran dispose l’abonnement temps réel existant. La partie reste en cours côté serveur ; une nouvelle création enregistrera sa propre référence selon le parcours normal. Ne pas présenter ce retour comme la clôture de la partie.

Le dernier état CI antérieur est `8a5adee` : moteur/backend `40108828266` et Android `40108828264` réussis, 209 JVM ; ce dernier lint contient dix avertissements et une suggestion, les deux avis de versions OkHttp étant absents par rapport au run `94dcf75` sans changement de dépendances. Ces résultats ne valident pas encore le nouveau bouton. Compiler/tester/linter le nouveau commit, puis recevoir le retour WSL/émulateur avant fusion. Pas de SDK local assistant, ni nouvelle validation sur appareil annoncée.

Reprise adaptée : récupérer la branche, vérifier health/ADB puis lancer dev-android-room.mjs avec N/N pour installer le nouvel APK. Attendre ATTENTE DU NOUVEAU SALON ; si l’ancienne partie revient, toucher Retour à l’accueil, puis Jouer/Créer une partie. Quitter/recréer/quitter le salon seul ; ensuite scénario N/O avec relais réseau avant création. Git pull seul ne réinstalle pas Android. Aucun ID à copier, aucune purge ou suppression des données Android. La PR nº 8 reste en brouillon. Procédure complète dans docs/ANDROID_WEBSOCKETS.md.


## Retour développeur reçu : nouvel APK, salons seuls et verrou SQLite intermittent

Le développeur a récupéré explicitement **`5582f63`** sous WSL ; backend sain, un émulateur device, build debug et installation ADB Windows réussis avec PLAYER_0 autoplay OFF. Les captures privées montrent Retour à l’accueil visible pendant la partie restaurée, puis l’accès à de nouveaux salons connectés à 1/4 avec Quitter le salon disponible. Deux détections automatiques N/N réussies sont présentes dans le journal joint. Cela valide l’installation et l’accès aux nouveaux salons ; le geste Retour système, le dernier clic de sortie et les essais réseau ne sont pas attestés séparément. Ne pas refaire le scénario N/N pour redemander la même preuve. Un salon à 1/4 et Démarrer désactivé sont attendus sans PNJ.

Le journal joint contient aussi un premier échec **database is locked** après ATTENTE DU NOUVEAU SALON, avant les deux détections réussies. La lecture SQLite du lanceur n’avait ni mode readOnly ni délai busy ; son rappel bootstrap inconditionnel était trompeur pour cette erreur. Le correctif de support utilise `dev-room-database.mjs` : ouverture readOnly, query_only, busy timeout 250 ms, vingt tentatives au maximum avec attente asynchrone de 100 ms entre connexions fermées. Seuls SQLITE_BUSY/SQLITE_LOCKED (codes étendus compris) sont repris ; une autre erreur remonte immédiatement. Un verrou persistant se termine avec un message dédié. Le rappel bootstrap générique est supprimé. Ni mutation SQLite, ni purge, ni changement de protocole/backend ou Kotlin.

Six tests synthétiques couvrent lecture/filtrage/empreinte inchangée, reproduction réelle SQLITE_BUSY sans attente puis reprise après libération, verrou persistant borné et cause conservée, table absente sans retry, fichier absent non créé et options invalides. Les six tests ciblés et la suite backend complète passent localement : **73 fichiers, 616 tests**. Syntaxe des trois scripts et diff vérifiés ; vérifier aussi les CI du commit livré. Le mode exécutable du lanceur doit rester 100755. Ne jamais essayer ce test de verrou sur la vraie base du développeur.

Jalon Android **`5582f63`** : moteur/backend CI `40109808296` et Android CI `40109808298` / job `120918967712` réussis, 209 JVM, APK debug/instrumenté et lint réussis (12 avertissements et une suggestion), 583 moteur et 610 backend avant ce nouveau helper. Aucun nouveau test instrumenté exécuté. La nouvelle suite backend inclut six cas supplémentaires, soit 616 tests réussis localement ; la CI du commit de support reste à vérifier.

Prochaine action : récupérer le correctif de support, quitter le salon d’attente actuel par Android, puis utiliser le lanceur **N/O** avec le backend bootstrap local sain et un seul ADB device. À ATTENTE DU NOUVEAU SALON, lancer le relais réseau dans un troisième terminal avant la création. Créer, attendre 4/4, démarrer manuellement, couper/reprendre uniquement Android à un tour PLAYER_0, puis tester fermeture/relancement au tour du joueur. Garder backend et PNJ actifs. Aucun ID à copier ni nouvelle suite Keystore/Google/fin complète de match requise. PR nº 8 en brouillon ; les essais réseau réels restent à recevoir avant fusion. Ne publier ni captures, identifiants, mains ou logs privés.


## Essais N/O et commandes de reconnexion reçus — résultat Android à confirmer

Le développeur transmet la récupération explicite de **`2318c3d`** et un journal N/O : backend sain, un émulateur device, build/installation réussis, PLAYER_0 manuel, nouveau salon détecté, trois PNJ connectés, 4/4, démarrage manuel et premières actions PNJ jusqu’à l’attente de PLAYER_0. Aucune nouvelle erreur SQLite n’apparaît dans cet extrait. Il ne prouve pas qu’un vrai verrou a été rencontré et repris ; l’ordre précis entre le lancement du processus et la récupération Git n’est pas établi. Ne pas provoquer un verrou sur sa vraie base pour obtenir une preuve supplémentaire.

Le relais est réellement lancé sous WSL avec ADB Windows ; ses commandes **c**, **r**, **q** ont produit leurs messages attendus, dont restauration de reverse vers le port 3000. Les commandes force-stop/relancement Android ont ensuite démarré MainActivity sans erreur. Cela atteste l’exécution des commandes et la sortie du relais, pas encore le résultat fonctionnel dans Android. Le journal PNJ transmis s’arrête avant toute nouvelle carte locale et ne montre pas sa progression après reprise.

Prochaine action : demander seulement le résultat déjà observé dans Android après r puis après relancement : même partie/main, possibilité de jouer une carte et progression des PNJ, sans nouvelle connexion Google. Ne pas demander de refaire N/N, le build, toute la partie ou les commandes déjà reçues pour cette simple confirmation. Enregistrer le retour avant fusion ; PR nº 8 toujours en brouillon. CI du code `2318c3d` acquises : moteur/backend `40110745088` / job `120921748280` (583 moteur, 616 backend, typechecks/builds/CLI) et Android `40110745083` / job `120921748593` (209 JVM, APK debug/instrumenté compilés et lint réussi, 12 avertissements et une suggestion). Ce point est documentaire ; contrôler ses CI avant intégration, aucun nouveau test applicatif local revendiqué. Les identifiants et détails de jeu restent privés.


## Reprise explicitement demandée ; reconnexion non validée

Le développeur répond « non, recommence » à la demande de résultat Android. Aucun succès de coupure/reprise ou de restauration ne doit en être déduit ; la cause et l’étape exacte du blocage restent inconnues. Sa demande autorise la reprise guidée du scénario N/O, contrairement à la consigne précédente de simple confirmation. Ne pas refaire les suites Keystore/Google/fin de match ni toucher à la vraie base.

Le relais expose maintenant **s** : état OUVERT/COUPÉ, connexions TCP actives/acceptées/refusées et erreurs de liaison au backend. c indique combien de connexions ont été fermées ; r annonce seulement que le relais est rouvert, sans prétendre que l’application est reconnectée. Aucun contenu, token, identité ou ID n’est inspecté/journalisé. Ces compteurs concernent le transport TCP et ne prouvent pas à eux seuls la reprise WebSocket ou du jeu. Les tests existants vérifient compteurs/coupure/reprise ; un sixième test couvre l’échec de liaison backend, et la CLI s est testée avec ADB simulé.

Procédure contrôlée : q sur l’ancien relais s’il tourne ; Ctrl-C sur l’ancien lanceur PNJ, garder le backend actif ; récupérer la branche, vérifier health/ADB, restaurer reverse vers 3000. Relancer N/O. Attendre ATTENTE DU NOUVEAU SALON sans créer ; démarrer ensuite le relais dans un troisième terminal. Son relancement peut restaurer l’ancienne partie : Retour à l’accueil (ou Quitter le salon si salon d’attente), puis créer seulement maintenant un nouveau salon. Attendre 4/4, démarrer. Jouer d’abord une carte hors coupure et constater la progression PNJ ; au tour suivant, s puis c, dix secondes, r, dix secondes puis s, jouer et constater la progression. Enfin q, attendre un tour PLAYER_0, force-stop/relancement et même vérification. Si une étape échoue, garder les journaux et diagnostiquer ce point au lieu d’enchaîner les commandes comme si elle était réussie. Des erreurs_backend positives ou zéro connexion fermée lors de c sont des indices à transmettre.

Six tests ciblés du relais et suite backend complète réussis localement : **73 fichiers, 617 tests**. Syntaxe du relais et diff vérifiés ; vérifier aussi les deux CI du commit livré. Pas de changement Kotlin, de protocole, de persistance ou d’authentification dans cet ajout de diagnostic. PR nº 8 maintenue en brouillon, essais WSL/émulateur à reprendre sans validation présumée. Procédure détaillée : docs/ANDROID_WEBSOCKETS.md.


## Coupure et rétablissement TCP réellement observés ; partie chargée après relancement

Le développeur transmet maintenant l’état s du relais : un flux actif avant c, un flux effectivement fermé, aucune connexion active pendant la coupure, six tentatives refusées, puis un nouveau flux accepté et actif après r. Aucune erreur de liaison backend n’est comptée. q restaure reverse vers le port 3000 ; les commandes force-stop et lancement MainActivity réussissent. Le diagnostic s du code `9c9c808` est donc réellement utilisé sous WSL/ADB Windows. Ces mesures attestent le rétablissement TCP, sans mesurer à elles seules les messages WebSocket ou l’envoi d’une commande de jeu.

La capture privée jointe montre ensuite une partie chargée, tous les joueurs en ligne, le tour local et l’invite de choix d’une carte. La main se trouve sous la zone visible dans la colonne droite défilante ; ce cadrage ne signifie pas que les cartes sont bloquées. Il manque encore une action locale acceptée suivie de la progression PNJ dans le résultat fourni. La correspondance exacte des mains avant/après n’est pas démontrée par une capture unique ; ne publier aucun détail privé de cette vue.

Prochaine action : sans recommencer les scripts ni les coupures, faire défiler la colonne droite vers le bas du contenu (geste vers le haut), toucher une carte mise en évidence et constater la progression des PNJ en gardant backend et lanceur actifs. Recevoir ce résultat avant clôture/fusion ; pas de nouvelle confirmation répétitive des commandes c/r/q déjà prouvées. CI du code `9c9c808` acquises : moteur/backend `40120672647` / job `120951305834` (583 moteur, 617 backend, typechecks/builds/CLI), Android `40120672744` / job `120951306529` (209 JVM, APK et lint réussis, 12 avertissements et une suggestion). Le présent point est documentaire, PR nº 8 toujours en brouillon.
