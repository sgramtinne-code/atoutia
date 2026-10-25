# Fermeture du coordinateur de salon — 25 octobre 2026

[PR nº 14](https://github.com/sgramtinne-code/atoutia/pull/14), branche `fix/android-lobby-refresh-close`, depuis main `c4f1519` (PR nº 13 intégrée, récupération PC reçue).

## Défaut et correction

Un snapshot engage getRoom dans RoomLobbyRealtimeCoordinator. Le transport protège l’entrée du callback, mais sa fermeture ne rétracte pas le HTTP déjà commencé. L’ancien coordinateur retournait directement la connexion et transmettait encore le succès ou l’erreur après fermeture. RoomLobbyScreen ferme cette connexion lors de la sortie du salon ; aucun incident sur le PC n’est déduit de la lecture ou des fixtures.

Le correctif `660ca56` retourne une connexion qui invalide les notifications avant le close du transport, une seule fois. Un verrou propre à chaque connexion sérialise l’état et la livraison des notifications. getRoom et close du transport restent hors verrou ; le HTTP déjà engagé peut finir sans notifier le listener fermé. Un callback transmis avant fermeture n’est pas rétracté. Les validations de session/mode/révision/siège restent conservées.

## Reproduction réelle

Trois tests JVM ajoutés au même RoomLobbyRealtimeCoordinatorTest : succès HTTP après close, erreur HTTP après close et fermeture idempotente/callbacks tardifs. Deux workers et des latches imposent HTTP commencé → fermeture terminée → résultat livré. Attentes bornées, aucun sommeil arbitraire ; close doit finir avant de libérer le HTTP simulé. Les neuf contrôles antérieurs restent actifs.

Commit `bf91800` : [Android CI `40178838447`](https://github.com/sgramtinne-code/atoutia/actions/runs/40178838447), job `121125320806`, Kotlin compilé puis **223 JVM : 220 réussis/3 échecs**. Succès tardif et erreur tardive étaient transmis ; deux close atteignaient le transport. Aucun timeout ; APK/lint ignorés après l’échec des tests. Après correction, mêmes assertions et **223/223 réussis**.

## Validation reçue

Le code **`660ca56`** est validé : [moteur/backend `40179028025`](https://github.com/sgramtinne-code/atoutia/actions/runs/40179028025), job `121125875880`, **588/618**, typechecks/builds et CLI synthétiques ; [Android Kotlin `40179027934`](https://github.com/sgramtinne-code/atoutia/actions/runs/40179027934), job **`121125875461`**, **223/223 JVM**, deux APK et lint (**11 avertissements/1 suggestion**) ; [Android UI `40179027938`](https://github.com/sgramtinne-code/atoutia/actions/runs/40179027938), job **`121125930846`**, **OK (8 tests)**, **OK (3 tests)** puis **OK (7 tests)** réellement exécutés sur AVD API36. La reproduction `bf91800` avait 220 contrôles réussis et trois échecs ; assertions conservées après correction.

Les nouveaux tests utilisent HTTP/transport fictifs et aucun compte, réseau, Keystore, préférence, fichier privé ou base réelle. Les 18 tests instrumentés existants couvrent leurs propres périmètres ; ils ne sont pas présentés comme un nouveau scénario de salon complet. Aucun SDK/AVD local assistant ; résultats Android du runner GitHub.

Aucun changement Compose, service de session, stockage, backend, protocole, règle, version ou sensorLandscape. Aucune annulation HTTP, validation exhaustive Android ou téléphone physique revendiquée. Le Retour de PlayScreen est déjà bloqué pendant création/join ; aucune course fictive par ce bouton ajoutée au bilan.

## Reprise

Validations nécessaires reçues ; pas de nouveau PC N/O, compte/Keystore, coupure réseau, sauvegarde ou match complet à demander pour ce coordinateur. Vérifier les trois CI de clôture avant intégration avec SHA attendu, puis PR/main et ses CI. Le statut GitHub définit la fusion sans PR supplémentaire pour inscrire son propre SHA. Ensuite revue séparée du démarrage HTTP/WebSocket, du chargement de partie et des parseurs. Aucun autre correctif implicite.
