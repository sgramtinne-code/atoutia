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
