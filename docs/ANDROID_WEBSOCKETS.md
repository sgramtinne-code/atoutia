# Cycle de vie WebSocket Android

Branche `fix/android-websocket-lifecycle`, depuis main `82b0937`, après la PR nº 7 validée et récupérée. Le jalon précédent reste acquis. Cette revue porte sur les ressources et courses de fermeture, pas sur le protocole, les règles ou la présence serveur.

## Reproduction avant correction

Les clients reçoivent une fabrique WebSocket et une fabrique d’exécuteur injectables. Les valeurs par défaut gardent leur comportement initial. Dix-sept tests JVM utilisent un ordonnanceur manuel et des sockets enregistrés, sans thread, timer réel, pause ou réseau : ils imposent les entrelacements exacts.

Salon : arrêt de l’exécuteur lors d’une fermeture/erreur distante, ouverture tardive après close, close déclenché dans onConnected, fermeture idempotente, échec synchrone de création, heartbeat capturé après close et cadence sans rattrapage en rafale.

Partie : close pendant recherche du token ou création du socket, acknowledge simultané à close, suppression des callbacks en file après close, heartbeat, échec synchrone/reconnexion et conservation de la validation des révisions négatives.

Les nouveaux tests sont ajoutés avant correction. Les résultats et les preuves avant/après doivent être consignés ici et dans la reprise ; aucune réussite ne découle de la seule lecture du code.

## Périmètre et validation

Préserver les messages HEARTBEAT version 1, l’intervalle nominal de dix secondes, la reconnexion progressive et la fourniture du token à chaque reconnexion de partie. Le serveur conserve son timeout heartbeat de trente secondes et sa grâce de reconnexion ; aucune modification backend, adjudication ou SQLite.

La compilation et la suite JVM seront réellement exécutées dans Android CI. Ensuite, avant fusion, tester sur l’émulateur du développeur les transitions salon/quitter/recréer, démarrage de partie, interruption/reprise du réseau et fermeture/relancement. Réutiliser le lanceur automatique existant, N pour PLAYER_0 manuel et O pour les trois PNJ ; aucun ID à copier et aucun test Keystore à refaire sans raison.
