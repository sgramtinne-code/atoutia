# Historique : portée des réponses asynchrones

## État

Code `854a611` validé : trois CI réussies, 220 JVM, deux APK/lint et **8 UI + 3 politique + 7 historique réellement exécutés**. Les quatre reproductions obsolètes sont corrigées, les trois contrôles actuels conservés. Vérifier les CI de la clôture puis GitHub pour l’intégration ; aucun nouveau scénario PC nécessaire pour ce périmètre de callbacks contrôlés.

[PR nº 13](https://github.com/sgramtinne-code/atoutia/pull/13), branche `fix/android-history-callback-scope`, depuis main `e6def15` (PR nº 12 intégrée et récupération PC propre reçue). Les anciennes validations sont closes, dont main 8 → 7 → 6 → 5, reprise réseau et politique de sauvegarde.

## Constat de code et périmètre

Dans MainActivity, requestMatchHistory applique Loaded, Failed ou SessionExpired à l’état de l’application sans vérifier que la demande appartient encore à l’écran et à la session courants. Les appels HTTP utilisent lifecycleScope de l’Activity, dont la durée n’est pas celle d’une visite de l’historique. Une sortie/retour ou une déconnexion/reconnexion peut donc rendre une réponse obsolète avant son callback UI.

Ce point est maintenant reproduit sur callbacks synthétiques (bilan ci-dessous) ; aucune occurrence réelle sur le compte du développeur n’est annoncée. Le correctif visera l’application des réponses à l’UI, pas les règles d’authentification serveur, la révocation ou le stockage des tokens. Il ne prétendra pas annuler un HTTP déjà engagé. Les callbacks salon/chargement de partie et les parseurs seront des revues distinctes.

## Reproduction isolée exécutée

Le véritable composable AtoutiaApp est hébergé dans une ComponentActivity, avec les dépendances existantes remplacées par des fonctions mémoire. Sa visibilité Kotlin passe de private à internal pour les tests ; aucun comportement n’est corrigé à cette étape. L’hôte de test utilise le portrait pour rendre accessibles les écrans d’accueil/connexion ; sensorLandscape de MainActivity reste intact.

Sept cas contrôlent les clics et l’ordre des réponses :

1. Succès de la demande actuelle affiché.
2. Échec actuel puis Réessayer et succès.
3. Expiration actuelle mène toujours à l’écran déconnecté.
4. Expiration d’historique après Retour ne déconnecte pas l’accueil.
5. Échec d’une ancienne visite ne remplace pas le chargement de la visite suivante.
6. Succès ancien ne remplace pas un échec plus récent.
7. Expiration de l’ancienne session ne déconnecte pas une session recréée après sortie/reconnexion simulées.

Les identités sont synthétiques et la reconnexion est une simple réponse injectée : ni Credential Manager, compte Google, Keystore, stockage privé, backend ni vraie base. Les callbacks sont livrés sur le thread UI comme dans la production ; l’état visible doit rester celui de la demande courante.

Le workflow exécute séparément 8 fixtures UI, 3 tests de politique et ces 7 cas, avec contrôle explicite de chaque total. Aucun lancement de la suite instrumentée globale. La reproduction `c8778c1` a réellement exécuté les sept cas : trois contrôles actuels réussis et quatre réponses obsolètes en échec. Huit UI et trois politiques passent. CI émulateur `40176710644`, job `121118840915` ; Kotlin `40176710597` (220 JVM/APK/lint 11/1) et moteur/backend `40176710705` réussis. Aucun SDK/AVD local assistant.

## Correction validée sur AVD

Une identité de demande est mémorisée pour chaque chargement ; le callback vérifie aussi Historique et la session authentifiée d’origine, compte + session. Une réponse obsolète sort avant toute mutation UI. L’identité est invalidée après traitement, à Retour, au début de déconnexion, avant restauration d’une nouvelle authentification et en sortie de composition. Les branches actuelles conservent leur comportement ; les tests sont inchangés. La correction n’annule pas un HTTP en vol et ne change pas les tokens/services/backend.

Actionlint, diff et documentation vérifiés localement. Les trois CI du correctif sont maintenant réussies (8 UI + 3 politique + 7 historique, 220 JVM/APK/lint et moteur/backend), avec preuves ci-dessous. Vérifier encore les trois CI de la clôture avant intégration. Pas de nouvelle partie N/O, restauration de sauvegarde, test de compte réel ou attente de réseau à demander pour cette simulation déterministe de callbacks. Les autres callbacks Android et un téléphone physique ne sont pas validés par ces fixtures.


## Historique : validation des callbacks reçue — PR nº 13

Le correctif **`854a611`** est confirmé vert : [moteur/backend `40177281277`](https://github.com/sgramtinne-code/atoutia/actions/runs/40177281277), job `121120610407`, **588 moteur/618 backend**, typechecks/builds/CLI ; [Android Kotlin `40177281299`](https://github.com/sgramtinne-code/atoutia/actions/runs/40177281299), job **`121120610387`**, **220/220 JVM**, deux APK/lint, **11 avertissements/1 suggestion** ; [Android UI `40177281283`](https://github.com/sgramtinne-code/atoutia/actions/runs/40177281283), job **`121120610315`**, **OK (8 tests)** UI, **OK (3 tests)** politique puis **OK (7 tests)** historique réellement exécutés sur AVD API36. La reproduction `c8778c1` reste acquise : trois contrôles actuels passaient et quatre cas obsolètes échouaient ; assertions inchangées après correction.

Les réponses tardives ne changent plus l’UI quittée/réouverte ou une nouvelle session ; succès, échec/réessai et expiration actuels restent fonctionnels. L’identité de demande est consommée une fois et invalidée à Retour/déconnexion/nouvelle authentification/dispose ; le callback vérifie destination et compte/session d’origine. Ce résultat porte sur le vrai composable avec services injectés et callbacks livrés sur le thread UI, comme le routage de production. Aucun service réseau/token/stockage, point d’entrée Android, orientation, règle ou protocole modifié ; aucun compte réel, HTTP, Credential Manager, Keystore ou fichier privé utilisé, aucune annulation réseau prétendue. Pas d’incident de compte réel ou de révocation serveur déduit des fixtures.

Les validations nécessaires à cette correction ciblée sont reçues : **ne pas redemander un scénario PC N/O, Google/déconnexion, délai réseau, sauvegarde/restauration ou match complet** pour revalider ces ordres de réponses contrôlés. Les callbacks salon/chargement de partie, parseurs et téléphone physique restent hors de ce bilan ; aucune certification Android exhaustive ou release revendiquée. Ce point est documentaire (liens/bash/diff vérifiés), sans nouveau test applicatif local. Suite : vérifier les trois CI de clôture, rendre PR nº 13 prête/intégrer avec SHA attendu, vérifier PR/main et ses CI, fournir le retour complet sur main. GitHub fait foi pour la fusion, sans PR supplémentaire pour inscrire son propre SHA. Aucune fusion annoncée par avance. [Bilan callbacks](ANDROID_HISTORY_CALLBACKS.md).
