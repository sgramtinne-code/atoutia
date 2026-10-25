# Réponses de démarrage et annonce temps réel — 25 octobre 2026

[PR nº 15](https://github.com/sgramtinne-code/atoutia/pull/15), branche `fix/android-start-callback-scope`, depuis main `6d7a630` (PR nº 14 intégrée et récupérée proprement sur le PC).

## Problème et correction

La route start appelle roomStore.start avant sendJson. La mutation persiste puis notifie les listeners ; réponses HTTP et WebSocket suivent deux transports. RoomLobbyScreen peut donc recevoir IN_PROGRESS et ouvrir GameLoading avant le retour HTTP de startRoom. L’ancien callback appliquait encore Started/SessionExpired sans vérifier si l’UI avait quitté le salon. Aucun incident réel sur le PC n’est déduit de cette lecture ou des fixtures.

Le code `918d2bb` compare la destination actuelle à l’instance de Lobby d’origine et l’état authentifié au compte/session d’origine avant toute mutation UI. Une réponse dépassée par le temps réel est ignorée. Les branches actuelles et les validations réseau/backend restent conservées. Il n’annule pas un HTTP déjà engagé ni sa mutation acceptée côté serveur.

## Reproduction réelle

StartCallbackInstrumentedTest exécute le vrai AtoutiaApp et RoomLobbyScreen dans une ComponentActivity en portrait, avec restauration/HTTP/temps réel injectés en mémoire. Le connecteur optionnel évite les services Android réels dans ces tests ; sans injection, construction et fermeture de production sont conservées.

Cinq cas : succès HTTP actuel/un chargement, échec actuel/réessai, expiration actuelle ; puis succès et expiration tardifs après annonce IN_PROGRESS et échec contrôlé du chargement. Avant la réponse tardive, les tests vérifient l’écran d’échec, Réessayer, un seul chargement et la fermeture du connecteur fictif. Après la réponse, ces invariants doivent rester vrais. Le chargement volontairement simulé en erreur permet d’observer une autre destination ; ce n’est pas un test d’une partie complète ou d’un serveur réellement indisponible.

Commit `6ef6a40` : [Android UI `40180468998`](https://github.com/sgramtinne-code/atoutia/actions/runs/40180468998), job `121130246714`, **8+3+7 réussis**, puis **5 démarrage : 3 réussis/2 échecs**. Les trois contrôles actuels passent ; les deux échecs sont aux assertions finales après livraison HTTP tardive (lignes 130/136), sans timeout. L’écran courant a disparu après le retour tardif. [Android Kotlin `40180468952`](https://github.com/sgramtinne-code/atoutia/actions/runs/40180468952), job `121130246479`, 223 JVM/APK/lint (11 avertissements/1 suggestion) réussi ; moteur/backend `40180468972` réussi. Les assertions restent identiques après correction.

## Validation reçue

Le code **`918d2bb`** est validé : [moteur/backend `40180936288`](https://github.com/sgramtinne-code/atoutia/actions/runs/40180936288), job `121131652108`, **588/618**, typechecks/builds/CLI synthétiques ; [Android Kotlin `40180936289`](https://github.com/sgramtinne-code/atoutia/actions/runs/40180936289), job **`121131652207`**, **223/223 JVM**, deux APK et lint (**11 avertissements/1 suggestion**) ; [Android UI `40180936438`](https://github.com/sgramtinne-code/atoutia/actions/runs/40180936438), job **`121131652819`**, **OK (8 tests)**, **OK (3 tests)**, **OK (7 tests)** puis **OK (5 tests)** réellement exécutés sur AVD API36. Reproduction `6ef6a40` : les trois réponses actuelles passaient, les deux réponses tardives échouaient après leur livraison ; assertions inchangées après correction.

Résultats Android du runner GitHub, aucun SDK/AVD local assistant. Les services livrent les callbacks sur le thread UI comme en production ; l’annonce injectée traverse les vrais effets du salon. Aucun compte, réseau, Keystore, préférence, fichier privé ou base réelle utilisé par ces fixtures. Les tests couvrent cette transition, sans prétendre tester une reconnexion de compte réelle ou une révocation serveur.

Aucun changement d’authentification serveur/stockage, règle, format, backend, sensorLandscape ou nouveau composant Android exporté. Aucun HTTP prétendu annulé, match complet, téléphone physique ou revue exhaustive Android/release revendiqué. Les autres callbacks de chargement et les parseurs restent hors de cette correction.

## Reprise

Validations nécessaires reçues ; aucun nouveau PC N/O, compte/Keystore, coupure réseau, sauvegarde ou match complet à demander pour cet ordre de réponses. Vérifier les trois CI de clôture puis intégrer avec SHA attendu ; vérifier PR/main et ses CI. Le statut GitHub fait foi pour la fusion sans PR documentaire supplémentaire pour inscrire son propre SHA. Ensuite poursuivre séparément les autres callbacks de chargement et les parseurs.
