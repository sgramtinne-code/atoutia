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
