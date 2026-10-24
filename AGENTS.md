# ATOUTIA — Directives de travail

## Mission et références

Développer une application Android de belote multijoueur fiable, sécurisée et maintenable. Le porteur du projet est débutant : prendre les décisions techniques courantes, expliquer simplement et fournir des commandes exactes, courtes et adaptées à WSL.

Lire ce fichier, le [README](README.md), les [règles canoniques](docs/GAME_RULES.md), leur [validation](docs/RULES_VALIDATION.md) et le [prompt de reprise](docs/REPRISE.md) avant de reprendre le développement. Examiner les éventuels `AGENTS.md` plus proches des fichiers modifiés.

La spécification métier du dépôt est `docs/GAME_RULES.md`, version documentaire 0.1.2 au 24 octobre 2026. Le document initial 0.1.0 est une référence historique ; ne pas rétablir ses anciens identifiants ni ses formulations moins précises. Les versions du document, des paquets et des règles enregistrées dans une partie sont des notions distinctes. Signaler toute contradiction métier avant de modifier les règles.

## GitHub et validation

1. Vérifier l'état actuel de `sgramtinne-code/atoutia`, les branches, les PR ouvertes et les capacités réelles des outils disponibles. Un outil exposé ou une permission de compte ne prouve pas qu'une opération a réussi.
2. Lire les fichiers complets nécessaires et leurs dépendances avant de modifier. Ne pas demander au développeur de recopier ce qui est accessible dans le dépôt.
3. Créer une branche depuis le dernier `main` vérifié. Travailler directement sur GitHub ou dans un checkout isolé synchronisé avec ce dépôt ; aucun grand bloc de code à appliquer manuellement par défaut.
4. Ne jamais modifier directement `main`. Livrer les changements par PR, avec problème résolu, comportement obtenu, validations et limites connues.
5. Donner les commandes de récupération de branche puis de validation locale. Attendre les résultats nécessaires du développeur pour les contrôles qui exigent son PC, Android ou sa base.
6. Corriger sur la branche. Fusionner seulement lorsque toutes les validations requises pour le changement sont réussies. Les commits de travail sont permis ; un échec interdit de présenter la branche comme stable ou de la fusionner.
7. Après fusion, fournir la procédure complète pour revenir sur `main` et le mettre à jour. Vérifier le statut réel de la PR et du commit avant d'annoncer une fusion.

Maintenir **AGENTS.md et README.md à jour avec chaque évolution pertinente** : conserver les directives toujours valables, les ajuster lorsqu'elles changent et actualiser l'état, les commandes et les validations. Mettre également à jour `docs/REPRISE.md` aux points de passage importants. Éviter les changements purement cosmétiques sans information nouvelle.

Avant de terminer chaque étape importante, enregistrer et pousser sur la branche de travail l'avancement utile à une reprise : commit applicatif concerné, branche/PR, validations réellement obtenues et leur provenance (distant ou développeur), limites, contrôles encore manquants et prochaine action. Le README et `docs/REPRISE.md` doivent permettre à un nouveau chat de poursuivre sans réinventer l'état. Ne pas laisser une validation reçue uniquement dans la conversation. Conserver les données personnelles et détails de base locale hors de la documentation publique.

En cas d'écriture GitHub indisponible, le dire précisément et proposer une solution courte adaptée. Ne pas prétendre avoir poussé, testé, installé ou fusionné sans résultat correspondant.

## Validation automatique GitHub

Le workflow `.github/workflows/ci.yml` (PR nº 6, branche de livraison `ci/engine-backend-validation`, première exécution GitHub réussie sur `3e306cc`) valide le moteur/backend sur PR, push dans `main` et déclenchement manuel. Le job attendu est **Engine and backend** dans **Engine and backend CI**. Il utilise Ubuntu 24.04, Node.js 24.22.1 et pnpm lu dans le champ `packageManager` racine, avec installation au lockfile, typechecks, tests, builds et scénarios CLI SQLite synthétiques. Actions amont épinglées à des SHA de commits vérifiés ; ne pas remplacer ces références par des tags flottants sans raison.

Vérifier le résultat GitHub réel pour le dernier commit de la PR avant fusion, et consulter les logs du job en cas d’échec. Un YAML valide ou des tests locaux ne prouvent pas une exécution Actions réussie. Si le service ne déclenche pas la CI, documenter le blocage au lieu de déclarer le contrôle vert. Le workflow n’active pas à lui seul une protection de branche obligatoire. La première exécution réussie est le run `40086371702` ; elle ne dispense pas de vérifier le résultat du dernier commit de chaque PR.

Ce contrôle ne remplace pas les validations Android, ADB ou de base locale réellement nécessaires à un changement. Ne pas demander au développeur de répéter des suites déjà réussies en CI sans besoin concret ; conserver la provenance des résultats. Aucun secret applicatif, déploiement, vraie base ou démarrage de `src/index.ts` dans cette CI. Les serveurs de test restent sur loopback et les bases sont synthétiques et temporaires. Garder `permissions: contents: read`, `persist-credentials: false` et les déclenchements non privilégiés ; ne pas utiliser `pull_request_target` pour exécuter le code d’une PR.

## Protection du travail et communication

- Vérifier le statut Git avant toute commande locale de changement de branche. Des changements locaux non poussés doivent être préservés ; ne pas proposer de les écraser.
- Aucune commande destructive telle que `git reset --hard`, `git clean -fd` ou `git push --force` sans nécessité et autorisation explicite.
- Ne jamais mettre `exit 1` dans une commande destinée au terminal interactif du développeur.
- Fournir les chemins absolus utiles sur son PC, sous `$HOME/projects/atoutia`. Ne pas confondre ce PC avec l'environnement d'exécution de l'assistant.
- Redonner le scénario complet nécessaire à la tâche : préparation, démarrage, actions dans Android, vérification et résultats attendus. Éviter de renvoyer à une étape oubliée d'un ancien message.
- Le workflow GitHub remplace les immenses copier-coller. Si un fichier doit exceptionnellement être fourni dans le chat, donner son chemin absolu et son contenu complet ; aucun extrait ou patch à compléter manuellement, ni archive à la place du code.
- Distinguer état vérifié aujourd'hui, validation historique rapportée par le développeur, proposition et travail restant. Ne jamais convertir un ancien résultat de test en validation actuelle.

## Architecture et sécurité

- `packages/belote-engine/` reste un domaine TypeScript indépendant de l'UI, d'Android, du réseau, du stockage et du backend métier.
- En multijoueur, le backend est autoritaire : identité, autorisations, révisions, actions légales, règles, scores et victoire. Android affiche les données autorisées et soumet des commandes.
- Ne jamais envoyer les mains adverses, les secrets ou le `baseSeed` au client. Les bots de jeu normal disposent seulement des informations autorisées.
- Préserver les frontières moteur, backend, persistance, DTO, réseau Android et Compose. Réutiliser les fonctionnalités existantes au lieu de les recréer.
- Belote française à 4 joueurs ; `PLAYER_0` + `PLAYER_2` contre `PLAYER_1` + `PLAYER_3`. Belote/Rebelote automatique ; autres annonces hors MVP. Suivre les détails de score et litige de `docs/GAME_RULES.md`.
- Préserver déterminisme, horloges injectées, compatibilité des documents et versionnement. Les horloges `now` et `activityNow` ont des responsabilités distinctes : ne pas les fusionner sans analyser les effets et les tests.
- Développement sur `127.0.0.1:3000`, jamais exposé via `0.0.0.0`. Bootstrap d'authentification réservé aux tests locaux, désactivé ailleurs. Autoplay Android réservé au debug, désactivé par défaut et en release.
- Ne jamais publier de tokens, secrets, base SQLite, sauvegardes, données personnelles de joueurs ou logs sensibles dans Git.
- Android doit rester en paysage `sensorLandscape`. Conserver `--no-daemon --max-workers=2` dans les builds locaux.

## Données et expiration

Base réelle : `$HOME/projects/atoutia/apps/backend/data/atoutia.sqlite`. Ne pas l'écraser ni lancer une purge manuelle sans validation explicite. Conserver les sauvegardes indiquées dans `docs/REPRISE.md`.

L'historique durable des matchs est indépendant des salons. Le nettoyage actuel des salons terminés ne doit supprimer un salon qu'après confirmation de son `MatchResult`. L'historique authentifié reste limité au participant de la session.

La **classification de l'expiration en lecture seule** est implémentée dans `liveRoomExpiration.ts` et `sqliteLiveRoomExpirationPreview.ts`, avec la commande manuelle `preview:expiration` (voir `docs/ROOM_LIFECYCLE.md`). L'absence de mutation ne prouve pas l'absence de joueurs. Prendre en compte présence WebSocket, délai de reconnexion, restauration Android, mode PRIVATE/CASUAL/RANKED, bots et adjudication. Une présence inconnue doit produire une décision conservatrice.

Le diagnostic doit rester séparé de `index.ts`, des timers et des routes. Ne pas remplacer son ouverture SQLite `readOnly: true` par un repository ou par `LiveRoomStore` : leurs constructeurs peuvent écrire. Le diagnostic hors ligne ne connaît pas la présence des occupants ; ne jamais utiliser les places ou les anciennes résolutions persistées pour inventer une absence. Une observation de présence pour le classificateur pur doit venir du serveur, être synchrone et correspondre à la session, la révision et l'horloge évaluées.

Ne pas supprimer de salons abandonnés dans cette première étape, ne pas activer de purge au démarrage, ne pas ajouter de route publique de diagnostic exposant des informations privées. Préserver les règles de forfait RANKED et les résultats nécessaires avant toute suppression future.

Un rapport `PENDING_ABSENCE_RESOLUTION` signale une protection persistée, pas une résolution nécessairement en cours d’exécution ni une preuve d’absence actuelle. Ne pas effacer ces résolutions pour rendre un salon éligible. Le diagnostic et l’audit structurel de la copie isolée ont été reçus avec empreinte inchangée ; cette première étape en lecture seule est terminée. Ne pas imposer de nouveaux audits répétitifs sans besoin concret et ne pas étendre cette livraison à une suppression implicite. Distinguer l’empreinte inchangée de la copie, les comptages de résultats et l’observation de la présence : ce sont des preuves différentes. Les effectifs et identifiants locaux restent privés.

Les anciens salons ont reçu leurs timestamps lors d'une migration le 7 octobre 2026. Ce ne sont pas des preuves de leur dernière activité réelle. Leur ancienneté apparente ne justifie aucune purge immédiate au déploiement.

La commande `audit:rooms` (PR nº 5, branche `feat/read-only-room-audit-cli`, code `3eff899` validé à distance et sous WSL) fournit un résumé versionné pour remplacer le bloc Python structurel. Elle doit rester détachée du serveur et ouvrir SQLite en lecture seule, sans store/repositories à effets de bord. Ne jamais ajouter d’identifiants ou de chaînes non validées au résumé ; les documents invalides doivent être comptés à part. `pendingResolutionEntries` compte des entrées, pas des salons. `durableResultRows: null` signifie table absente, distinct de zéro ; `resultValidation: "COUNT_ONLY"` n’atteste aucune validité métier. Un rapport incomplet utilise le code retour `2` ; un échec, `1`. Aucun nouveau diagnostic de la vraie base n’est nécessaire pour valider cet outil : utiliser ses fixtures synthétiques et les tests.

## Validation adaptée

Pour la commande d’audit synthétique : ajouter `sqliteLiveRoomAudit.test.ts` aux tests ciblés et exécuter le scénario CLI existant après build. La validation WSL de `3eff899` a été reçue et réussie (74 tests ciblés, 583 moteur, 599 backend, typechecks/builds et scénario CLI). Vérifier la fusion de la PR nº 5 ; ne pas redemander ces contrôles sans changement applicatif ou anomalie. La première livraison déjà clôturée reste acquise.

Pour ce diagnostic : tests ciblés `liveRoomExpiration.test.ts` / `sqliteLiveRoomExpirationPreview.test.ts`, puis suites moteur/backend et `node apps/backend/scripts/dev-expiration-preview.mjs` après build. Le scénario crée uniquement des fixtures temporaires et vérifie aussi la commande CLI. Valider sous WSL avant fusion ; aucun test Android requis tant que le diagnostic reste détaché du serveur et du client.

Pour le code : tests ciblés puis suites concernées, typecheck, builds et validation réelle lorsque nécessaire. Ajouter des tests utiles pour règles métier, présence, persistance, confidentialité et cas limites. Une documentation seule appelle une vérification des liens, commandes, faits et du diff ; ne pas inventer une exécution de tests applicatifs.

Test réel par défaut : un client Android tenu par le développeur en `PLAYER_0` et trois joueurs simulés avec `apps/backend/scripts/dev-android-room.mjs`, backend local en bootstrap de test. Le lanceur construit, installe et démarre Android, attend un **nouveau** salon, puis ajoute les trois PNJ. Le développeur démarre la partie à 4/4. Fournir aussi les étapes de reconnexion, fin de partie et historique si elles concernent le changement.

## Livraison Android validée — PR nº 7

La livraison de `fix/android-shared-auth-session`, depuis `main` `5e267e3`, est validée pour son périmètre : coordination des sessions Kotlin, CI Android et lanceur automatique WSL/ADB Windows. La [PR nº 7](https://github.com/sgramtinne-code/atoutia/pull/7) porte l’intégration ; vérifier son statut GitHub et les CI du dernier commit avant fusion, puis repartir du dernier main. Ne pas annoncer que toute l’application Android ou sa release est validée.

Le Kotlin de session `46163ef` utilise `AuthTokenStore.sessionLock` pendant toute transaction lecture/réseau/écriture, avec moniteur commun aux stockages Android d’un même processus, coordinateurs refresh/logout et Google compris. Ne pas réintroduire de verrou isolé par coordinateur. Chiffrement, formats et protocole backend sont conservés.

Le support `09cee69`, intégré avec tests Vitest dans `6669443`, convertit le chemin APK avec `wslpath -w` pour adb.exe lancé sous Linux/WSL, sans shell, avec erreurs propagées et chemins natifs conservés. Réutiliser `node apps/backend/scripts/dev-android-room.mjs` : N pour PLAYER_0 manuel, O pour les trois PNJ ; attendre ATTENTE DU NOUVEAU SALON avant sa création. Aucun identifiant à copier. Ne pas recréer cette détection ni imposer la copie manuelle par défaut. Le lanceur construit, installe, configure reverse, démarre Android et appelle le script PNJ existant. Un salon en attente déjà créé peut être quitté par l’application avant ce scénario, sans purge de base.

Validations acquises : trois nouveaux tests JVM échouent avant correction puis 192/192 réussissent ; APK debug/instrumenté compilés et lint réussi ; 583 tests moteur et 605 backend dont six helpers réussis en CI, typechecks/builds et scénarios CLI synthétiques réussis. Le lint conserve 14 avertissements et une suggestion, détaillés dans docs/ANDROID_REVIEW.md. Vérifier le run du dernier commit ; un ancien vert ne vaut pas validation automatique d’un nouveau code.

Validations développeur WSL/émulateur : Keystore OK (3 tests), Google/écran déconnecté/reconnexion/historique avec retour positif ; lanceur automatique sous `6669443` réussi avec build/installation, nouveau salon détecté, PLAYER_0 manuel/trois PNJ, partie FINISHED, résultat et historique cohérents. Restauration en cours de partie explicitement confirmée par « oui c’est ok » et deux vues du même état/main, sans reconnexion. La seconde exécution sert à cette restauration ; ne pas imposer de finir une seconde partie pour revalider la fin déjà acquise. Ne publier ni captures brutes, comptes, mains, score, ID ou log local. La validation rapportée du délai d’expiration n’est pas une mesure réseau des tokens.

Les validations nécessaires à cette livraison sont reçues : ne pas redemander Keystore, authentification, partie complète, copie d’ID ou restauration sans nouveau changement concerné. Après les CI finales réussies, clôturer/fusionner la PR nº 7 et donner le retour complet sur main. Aucun essai sur téléphone physique n’est revendiqué. Ne pas transformer une compilation d’APK instrumenté en exécution de toute la suite sur appareil.

Suite séparée après intégration : reproduire les courses de fermeture/heartbeat du salon et acknowledgeRevision/close de partie avant correction ; poursuivre la revue Compose/parseurs, DataExtractionRules et grands écrans en préservant sensorLandscape. Ne pas masquer les avertissements pour rendre le rapport silencieux. L’URL release reste vide ; aucune livraison production. Les PNJ de test ne renouvellent pas leurs tokens : ne pas leur faire porter une attente artificielle de 16 minutes. Les audits SQLite précédents sont clôturés et la vraie base reste protégée.

## Revue WebSocket en cours

La PR nº 7 est fusionnée dans main `82b0937`, récupéré par le développeur. Branche suivante : `fix/android-websocket-lifecycle`. Reproduire les défauts avec des fabriques WebSocket et exécuteurs injectables, puis corriger fermeture/heartbeat du salon et création/acknowledge après fermeture de partie. Dix-sept tests de cycle de vie ajoutés avant correction ; aucune réussite de cette nouvelle livraison encore annoncée. Ne pas redemander les validations d’authentification/Keystore/lanceur acquises ; les essais réseau concernés par cette correction seront distincts.


## Correction WebSocket proposée — PR nº 8

La reproduction `309fa65` est confirmée par Android CI, run `40107762457`, job `120912892898` : compilation réussie, 209 tests JVM exécutés, **14 échecs sur les 17 nouveaux tests**. Les échecs concernent neuf cas salon et cinq partie ; les 192 tests antérieurs restent réussis. La suite moteur/backend de cette reproduction est à vérifier indépendamment.

La branche `fix/android-websocket-lifecycle`, [PR nº 8](https://github.com/sgramtinne-code/atoutia/pull/8) en brouillon, corrige l’arrêt de l’ordonnanceur et les callbacks tardifs du salon, l’attachement d’un socket créé pendant close, la fermeture pendant recherche du token et acknowledge/close de partie. Heartbeats à délai fixe de dix secondes, protocole inchangé. Le test de recherche du token couvre aussi son échec après close, sans remonter d’erreur à l’écran fermé. Une opération déjà en cours peut finir ; une fermeture ne prétend pas interrompre un callback utilisateur déjà engagé.

Prochaine action : vérifier les deux CI du commit corrigé (JVM, APK et lint Android inclus), puis recevoir les essais ciblés WSL/émulateur avant fusion. Utiliser le lanceur automatique N/O et un nouveau salon ; aucun ID à copier. Les contrôles Keystore/authentification/fin de match précédents restent acquis. Main reste `82b0937` ; cette correction n’est pas encore validée sur appareil. Voir [le suivi WebSocket](docs/ANDROID_WEBSOCKETS.md).


## WebSocket : correction verte, essais ciblés sur émulateur à recevoir

Correctif Kotlin **`0afd032`** : Android CI `40108167912`, job `120914099092`, réussie avec **209/209 tests JVM**, APK debug et APK de test compilés, lint réussi (**12 avertissements, une suggestion**, deux alertes scheduleAtFixedRate supprimées par le délai fixe). Moteur/backend CI `40108167922` réussie ; le code backend est alors inchangé. La reproduction rouge reste `309fa65` : 14 échecs avant correction. Aucun test instrumenté n’est exécuté par ces builds.

Un outil de test local `apps/backend/scripts/dev-android-network.mjs` ajoute un relais TCP uniquement sur 127.0.0.1:3001 vers le backend 127.0.0.1:3000. Il configure ADB reverse, relance Android pour éliminer les anciennes connexions directes, puis accepte c/r/q (couper/reprendre/quitter). Il détruit les flux Android lors de la coupure et refuse les nouveaux ; backend et PNJ restent sur leur liaison directe. À la sortie normale/Ctrl-C, il ferme le relais et restaure reverse vers 3000. Un arrêt forcé du processus nécessite la commande de restauration manuelle indiquée dans la procédure. Aucune inspection, journalisation de trafic, écriture de base ou modification du backend. Cinq tests Vitest locaux passent, dont transmission, coupure, reprise, fermeture, port occupé et parcours CLI avec ADB simulé ; cela ne prouve pas son exécution sous WSL/ADB Windows.

La PR nº 8 reste en brouillon, main `82b0937`. Prochaine action : vérifier les CI du dernier commit incluant cet outil, puis recevoir les essais ciblés du développeur. Procédure complète : [docs/ANDROID_WEBSOCKETS.md](docs/ANDROID_WEBSOCKETS.md). Faire d’abord le salon seul N/N, quitter/recréer/quitter ; ensuite le lanceur N/O, relais dans un troisième terminal avant création du nouveau salon, démarrage à 4/4, c/r en partie et force-stop/relancement. Aucun ID à copier ni test Keystore/Google à répéter. Conserver les résultats et leurs limites avant fusion.

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


## Clôture des validations WebSocket, navigation et outils locaux — PR nº 8

Le développeur fournit les vues avant/après de la partie précédemment rechargée et le journal PNJ continu. La première vue correspond à l’état restauré ; la suivante montre une carte locale jouée, la main mise à jour et le pli suivant. Le journal confirme l’action PNJ qui suit. La progression du jeu après relancement est donc acquise, en complément de la coupure TCP mesurée, des refus pendant coupure, du rétablissement sans erreur backend et de la restauration reverse déjà reçus. Les identifiants, cartes, révisions, scores, captures et logs bruts restent privés.

Les validations nécessaires au périmètre PR nº 8 sont réunies : reproduction avant correction (14 échecs parmi 17 nouveaux tests, 192 antérieurs verts), 209 JVM après correction, APK debug/instrumenté compilés et lint réussi ; 583 moteur, 617 backend dont six cas de relais et six SQLite, typechecks/builds/CLI synthétiques ; exécution WSL/ADB Windows, nouveaux salons connectés, N/O avec trois PNJ et jeu manuel, coupure/rétablissement TCP mesurés, partie rechargée puis action locale et progression PNJ observées. Ne pas redemander la confirmation ou une nouvelle partie complète. Il n’y a ni test sur téléphone physique, ni trace exhaustive de chaque échange WebSocket, ni exécution de toute la suite instrumentée dans la CI. La fin de match/historique et Keystore/authentification restent les acquis de la PR nº 7.

Commits applicatifs : WebSocket `0afd032`, retour à l’accueil `5582f63` (conserve reprise/authentification, ne termine pas la partie serveur), lecture SQLite du lanceur `2318c3d`, diagnostic TCP s `9c9c808`. Dernier point CI avant clôture documentaire : **`8920ce7`**, moteur/backend **`40121810617`** et Android **`40121810661`**, tous deux réussis. Les contrôles du commit de clôture doivent aussi réussir avant intégration. Aucun nouveau changement applicatif dans ce point documentaire.

Prochaine action : vérifier les CI de cette clôture et le statut réel de la PR nº 8, la rendre prête puis fusionner en contrôlant le SHA ; vérifier ensuite main et ses CI. Donner la procédure complète de retour sur main. Le statut GitHub fait foi : aucune fusion n’est annoncée dans ce texte avant son exécution, et aucune PR documentaire supplémentaire n’est nécessaire pour inscrire son propre SHA de fusion. Les anciennes mentions « en attente » décrivent l’historique ; la présente clôture définit les validations reçues. Après intégration, poursuivre séparément la revue UI Compose/paysage et visibilité des cartes, parseurs, sauvegardes/DataExtractionRules, grands écrans et préparation release. Préserver sensorLandscape, les garde-fous d’authentification et la vraie base ; aucune purge ou livraison production implicite.


## Nouvelle étape Android : main visible en paysage

Le développeur a confirmé main **`81b4f2d`** propre et à jour après intégration de la PR nº 8. Les validations WebSocket/navigation/outils sont clôturées ; runs de push main `40122399732` et `40122399733` réussis. Ne pas redemander ces essais ni reprendre les anciens audits SQLite.

Nouvelle branche **`fix/android-landscape-hand-visibility`**, depuis ce main vérifié. Le score et les métriques occupaient une grande partie de la même colonne défilante que la main ; les cartes pouvaient être hors de la zone initialement visible. En paysage à partir de 600 dp de large, un bandeau compact rassemble score/cible, atout, donne, donneur, preneur et révision à côté du retour à l’accueil. La main possède une zone fixe ; seules enchères, messages, commandes secondaires et actions de fin défilent dessous. Le tableau de jeu conserve sa disposition et ses proportions. Le repli hors paysage conserve son contenu défilant et son retour accessible.

Aucun changement moteur/backend, de protocole, de légalité des cartes, de token, de reprise ou de SQLite. Préserver sensorLandscape et les callbacks serveur existants ; seuls les coups autorisés restent sélectionnables, la soumission bloque les actions. Les acquis de la PR nº 8 restent valables pour leur périmètre.

Quatre tests Compose instrumentés sont ajoutés avec des DTO fictifs, sans connexion réelle ni accès au compte/stockage : huit cartes visibles sans défilement dans une zone 640 × 320 dp ; police 1,3 et sélection autorisée/soumission ; enchères défilant sans déplacer la main ; actions de fin accessibles. La classe cible est `tech.devoo.atoutia.ui.game.LandscapeGameScreenInstrumentedTest`. Elle utilise ComponentActivity isolée et les dépendances de test déjà présentes, sans nouvelle bibliothèque. Ces tests ne sont PAS encore exécutés sur appareil ; Android CI compile leur APK mais n’exécute pas l’instrumentation. Aucun SDK/émulateur n’est disponible localement à l’assistant.

Prochaine action : vérifier les CI du commit et compiler APK/lint, puis fournir au développeur le build/install et l’exécution de cette seule classe (pas de lancement global des tests Keystore, qui modifient leur stockage). Recevoir ensuite un essai Android réel N/O avec huit cartes visibles et une carte jouée, sans refaire les coupures réseau ni un match complet. Branche/PR à laisser en brouillon jusqu’aux résultats nécessaires. Procédure : docs/ANDROID_LANDSCAPE.md. Les données et captures de jeu restent privées ; aucune livraison production.


## Paysage : compilation et contrôles automatiques réussis, validation appareil attendue

La [PR nº 9](https://github.com/sgramtinne-code/atoutia/pull/9), branche `fix/android-landscape-hand-visibility`, porte le code **`c4fc8d0`** depuis main `81b4f2d`. Android CI **`40123839940`**, job **`120960927123`**, est réussie : **209/209 JVM**, APK debug et instrumenté compilés, lint réussi avec **12 avertissements et une suggestion**. Moteur/backend CI **`40123839913`** réussie ; aucun code moteur/backend n’a changé. Les quatre nouveaux tests UI sont compilés dans l’APK de test mais **n’ont pas encore été exécutés sur appareil**. Aucun résultat visuel réel de cette nouvelle disposition n’est revendiqué.

La documentation et les blocs bash/liens locaux sont vérifiés. Prochaine action : récupérer la branche, construire/installer les deux APK avec le Client ID validé et autoplay false ; exécuter uniquement `tech.devoo.atoutia.ui.game.LandscapeGameScreenInstrumentedTest`, attendu OK (4 tests), puis nouveau salon N/O par le lanceur existant et vue de la main complète sans défilement, carte locale et progression PNJ. Procédure complète dans docs/ANDROID_LANDSCAPE.md. La PR nº 9 reste en brouillon jusqu’aux résultats nécessaires et aux CI du dernier commit. Ne pas fusionner ni annoncer toute l’application validée ; main reste `81b4f2d`. Les contrôles acquis de la PR nº 8 ne sont pas à répéter.


Relecture de la séparation des commandes : conserver l’ancienne condition d’affichage des retours de carte (partie non terminée et main non vide). Une erreur de carte antérieure ne doit pas apparaître au-dessus d’une fin de partie/forfait. Le quatrième test UI vérifie aussi ce cas ; toujours quatre tests instrumentés, sans exécution sur appareil revendiquée. Vérifier les CI du dernier commit de cette petite correction avant intégration.


## Initialisation des tests impossible sur le PC : APK de l’ancienne interface observé

Le développeur transmet un build/install réussi mais `ClassNotFoundException` pour `LandscapeGameScreenInstrumentedTest` : **aucun des quatre tests UI n’a été exécuté**, seul le chargement de classe échoue. Les captures privées montrent encore le grand HUD défilant de l’ancienne interface ; le nouveau bandeau compact n’est pas affiché. Le journal ne montre pas de récupération de la branche PR nº 9 avant cette construction. Un ancien checkout/APK est l’hypothèse principale, sans affirmer la branche locale non transmise. La classe publique et son package sont présents sur la branche distante et compilés dans ses CI.

Le nouveau journal N/O confirme seulement le scénario existant (backend/ADB, installation, trois PNJ et démarrage) ; il ne valide pas la nouvelle disposition. Ne pas modifier le Kotlin pour cette erreur avant d’avoir vérifié la branche et le fichier source. Ne pas demander clean, suppression des données, désinstallation ou nouvelle partie pour diagnostiquer un chargement de classe.

Prochaine action : un bloc continu fetch/switch/pull sur `fix/android-landscape-hand-visibility`, affichage branche/commit, puis **git ls-files --error-unmatch** sur le chemin de la classe avant build. Enchaîner par les deux APK, installations -r via wslpath, puis am instrument ciblant uniquement cette classe. Toute commande en échec arrête la chaîne. Recevoir la sortie de ce bloc ; la validation UI réelle attendra le résultat des quatre tests. La PR nº 9 reste en brouillon, main demeure `81b4f2d`. Aucun nouveau changement applicatif ni résultat instrumenté positif revendiqué dans ce point documentaire.


## Tests paysage réellement exécutés : trois échecs, diagnostic automatisé en cours

Le développeur confirme la récupération de **`8b68a8e`**, la présence de la classe, le build et les deux installations réussis. Les quatre tests instrumentés se chargent maintenant : **un passe et trois échouent** sur player-hand non affiché (visibilité initiale, police agrandie/sélection, enchères). Ce n’est plus une erreur de classe absente ; l’hypothèse du checkout ancien est résolue pour cette exécution. Aucune réussite UI n’est revendiquée, PR nº 9 en brouillon et main `81b4f2d` protégé. L’avertissement createAndroidComposeRule v1 déprécié n’est pas à confondre avec la cause des assertions.

Avant de demander de nouveaux essais au développeur, ajout d’un diagnostic de bornes et branche de disposition dans l’erreur du test, et d’un workflow **Android UI CI / Landscape UI on emulator**. Il exécute uniquement les quatre fixtures UI dans un AVD Pixel 7 API 36 éphémère, sans backend, compte, token ou vraie base. Les actions checkout/Java reprennent les SHA vérifiés ; permissions contents read, persist-credentials false, événements pull_request/push main filtrés Android et manuel, aucun pull_request_target. KVM réservé au runner, logiciel SwiftShader et ressources bornées, arrêt de l’émulateur à la fin ; le job exige explicitement OK (4 tests), car adb am instrument peut sortir avec code zéro malgré des échecs. Le workflow est vérifié par actionlint ; son exécution réelle reste à vérifier.

Ce point n’altère pas le placement : seuls des tags de diagnostic sont ajoutés à la disposition. Prochaine action : relever les dimensions et la disposition active dans Android UI CI, corriger la cause sans affaiblir les assertions, puis obtenir les quatre tests verts à distance avant de demander une validation réelle ciblée sur le PC. Les suites moteur/backend et JVM/lint restent des contrôles distincts ; le nouveau job exécute réellement l’instrumentation contrairement au job Android Kotlin existant. Ne pas fusionner un échec ni redemander une partie complète pour diagnostiquer ces assertions.


Premier démarrage Android UI CI sur `478948b` : échec de démarrage AVD avant build et instrumentation ; aucun résultat de fixture à en déduire. Le diagnostic de fin pouvait lui-même attendre ADB sans limite. Les commandes ADB de diagnostic/arrêt et lecture du boot sont maintenant bornées ; récupérer le journal terminé pour corriger le démarrage avant de conclure sur le placement. Android Kotlin CI `40125782719` et moteur/backend CI `40125782681` réussies pour ce commit. Toujours un test UI réussi/trois échoués sur le PC, PR nº 9 en brouillon.


Le journal CI `40126231565` / job `120969283848` identifie l’échec de démarrage : **Unknown AVD name**, le créateur et l’émulateur ne retrouvent pas le même répertoire par défaut. Ce n’est pas un échec des quatre fixtures, qui ont été ignorées. Le workflow fixe désormais ANDROID_USER_HOME et ANDROID_AVD_HOME dans le dossier temporaire du runner pour les deux outils, vérifie le fichier ini et liste l’AVD avant démarrage. Il détecte aussi l’arrêt du processus immédiatement, borne le boot et l’instrumentation, et laisse l’annulation interrompre le diagnostic. Les fixtures et la géométrie restent inchangées pour obtenir la reproduction initiale. CI Kotlin `40126231523` : 209 JVM, deux APK, lint réussi (12 avertissements et une suggestion) ; moteur/backend `40126231537` réussi.
