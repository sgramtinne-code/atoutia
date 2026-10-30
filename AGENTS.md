# ATOUTIA — Directives de travail

## Cap produit prioritaire confirmé — 28 octobre 2026

Clarification explicite du développeur après PR nº 18 : les **millions de parties concernent l'entraînement futur des PNJ dans l'IA Lab sur son PC NVIDIA RTX 5070**, pour des styles/méthodes de jeu variés, amusants, distrayants et par niveau. Ne plus les présenter comme une validation moteur manquante ou une campagne de CI. Le nouvel ordre du 30 octobre place le chantier IA avant la reprise du déploiement, après le socle visuel/lisibilité. Les lots de 1 000/10 000 déjà livrés restent des tests bornés, sans entraînement GPU. La CI reste bornée. Aucun entraînement ni installation GPU implicite. [Feuille de route IA](docs/AI_LAB_ROADMAP.md). Cette clarification remplace les formulations historiques contraires plus bas.

## Lot courant : identité visuelle et lisibilité — 30 octobre 2026

**Priorité révisée par le développeur le 30 octobre : reporter le déploiement OVH.** Travailler d’abord le look professionnel, la lisibilité et l’ergonomie pour les personnes âgées, puis préparer/exécuter l’entraînement des PNJ sur la RTX 5070 avant de reprendre le déploiement. Les millions de parties restent un sujet d’apprentissage, sans campagne massive dans la CI. Cette décision remplace l’ancien ordre qui plaçait l’IA après la bêta/diffusion. Ne pas demander de diagnostic VPS, créer de DNS ou reprendre OVH dans ce lot.

Base vérifiée : main **d31556b**, [PR nº 28](https://github.com/sgramtinne-code/atoutia/pull/28) fusionnée. Configuration HTTPS release livrée, trois CI main réussies : [moteur/backend 41115572087](https://github.com/sgramtinne-code/atoutia/actions/runs/41115572087) (**601/620/26**), [Kotlin/release 41115572208](https://github.com/sgramtinne-code/atoutia/actions/runs/41115572208) (**264 JVM**, trois APK dont release non signé, lint **13 avertissements/1 suggestion**, contrôles de configuration et manifeste), [AVD 41115571977](https://github.com/sgramtinne-code/atoutia/actions/runs/41115571977) (**49/49**). Les anciennes attentes PR20–28 sont historiques et clôturées.

Lot courant **feat/visual-identity-accessibility** : premier socle visuel natif, palette bleu nuit/vert/ivoire/or, variantes clair/sombre, typographie plus lisible et accueil remanié. Commandes principales séparées, cibles au-delà de 48 dp, très grand texte respecté avec repli vertical/défilement. Cartes sur papier clair dans les deux thèmes, sans transparence des cartes indisponibles, enseignes typographiques et noms/états accessibles. Aucun moteur, PNJ, format de sauvegarde, préférence ou compte modifié. Voir [le suivi visuel](docs/ANDROID_VISUAL_IDENTITY.md) et [l’IA Lab](docs/AI_LAB_ROADMAP.md).

Deux JVM de contraste et trois nouveaux AVD ajoutés ; les 49 instrumentés antérieurs restent requis. La CI produit des PNG synthétiques de l’accueil et des cartes pour inspection avant fusion, avec upload-artifact v7.0.2 épinglé au commit officiel cf430e030ddbb5b0abf93d22962f4752f3646cd9. Ces images ne proviennent d’aucun appareil, compte ou partie réel. Résultats et rendus à vérifier avant intégration ; ne pas présenter ce premier lot comme une refonte complète ou une certification d’accessibilité. Les preuves de fusion/main seront dans la PR, sans commit destiné à inscrire son propre SHA.

## Mission et références

Développer une application Android de belote multijoueur fiable, sécurisée et maintenable. Le porteur du projet est débutant : prendre les décisions techniques courantes, expliquer simplement et fournir des commandes exactes, courtes et adaptées à WSL.

Lire ce fichier, le [README](README.md), les [règles canoniques](docs/GAME_RULES.md), leur [validation](docs/RULES_VALIDATION.md) et le [prompt de reprise](docs/REPRISE.md) avant de reprendre le développement. Examiner les éventuels `AGENTS.md` plus proches des fichiers modifiés.

La spécification métier du dépôt est `docs/GAME_RULES.md`, version documentaire 0.1.3 au 28 octobre 2026. Le document initial 0.1.0 est une référence historique ; ne pas rétablir ses anciens identifiants ni ses formulations moins précises. Les versions du document, des paquets et des règles enregistrées dans une partie sont des notions distinctes. Signaler toute contradiction métier avant de modifier les règles.

## GitHub et validation

1. Vérifier l'état actuel de `sgramtinne-code/atoutia`, les branches, les PR ouvertes et les capacités réelles des outils disponibles. Un outil exposé ou une permission de compte ne prouve pas qu'une opération a réussi.
2. Lire les fichiers complets nécessaires et leurs dépendances avant de modifier. Ne pas demander au développeur de recopier ce qui est accessible dans le dépôt.
3. Créer une branche depuis le dernier `main` vérifié. Travailler directement sur GitHub ou dans un checkout isolé synchronisé avec ce dépôt ; aucun grand bloc de code à appliquer manuellement par défaut.
4. Ne jamais modifier directement `main`. Livrer les changements par PR, avec problème résolu, comportement obtenu, validations et limites connues.
5. Donner les commandes de récupération de branche puis de validation locale. Attendre les résultats nécessaires du développeur pour les contrôles qui exigent son PC, Android ou sa base.
6. Corriger sur la branche. Fusionner seulement lorsque toutes les validations requises pour le changement sont réussies. Les commits de travail sont permis ; un échec interdit de présenter la branche comme stable ou de la fusionner.
7. Après fusion, fournir la procédure complète pour revenir sur `main` et le mettre à jour. Vérifier le statut réel de la PR et du commit avant d'annoncer une fusion.

Maintenir **AGENTS.md et README.md à jour avec chaque évolution pertinente** : conserver les directives toujours valables, les ajuster lorsqu'elles changent et actualiser l'état, les commandes et les validations. Mettre également à jour `docs/REPRISE.md` aux points de passage importants. Éviter les changements purement cosmétiques sans information nouvelle.

Avant de terminer chaque étape importante, enregistrer et pousser sur la branche de travail l'avancement utile à une reprise : commit applicatif concerné, branche/PR, validations réellement obtenues et leur provenance (distant ou développeur), limites, contrôles encore manquants et prochaine action. Le README et `docs/REPRISE.md` doivent permettre à un nouveau chat de poursuivre sans réinventer l'état. Consigner les preuves de code/CI publiques et les consignes utiles à la reprise. Les observations issues de captures ou de journaux PC restent hors des publications sans autorisation explicite ; conserver aussi les données personnelles et détails de base locale hors de la documentation publique.

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

Base réelle : `$HOME/projects/atoutia/apps/backend/data/atoutia.sqlite`. Ne pas l'écraser ni lancer une purge manuelle sans validation explicite. Conserver les sauvegardes existantes.

L'historique durable des matchs est indépendant des salons. Le nettoyage actuel des salons terminés ne doit supprimer un salon qu'après confirmation de son `MatchResult`. L'historique authentifié reste limité au participant de la session.

La **classification de l'expiration en lecture seule** est implémentée dans `liveRoomExpiration.ts` et `sqliteLiveRoomExpirationPreview.ts`, avec la commande manuelle `preview:expiration` (voir `docs/ROOM_LIFECYCLE.md`). L'absence de mutation ne prouve pas l'absence de joueurs. Prendre en compte présence WebSocket, délai de reconnexion, restauration Android, mode PRIVATE/CASUAL/RANKED, bots et adjudication. Une présence inconnue doit produire une décision conservatrice.

Le diagnostic doit rester séparé de `index.ts`, des timers et des routes. Ne pas remplacer son ouverture SQLite `readOnly: true` par un repository ou par `LiveRoomStore` : leurs constructeurs peuvent écrire. Le diagnostic hors ligne ne connaît pas la présence des occupants ; ne jamais utiliser les places ou les anciennes résolutions persistées pour inventer une absence. Une observation de présence pour le classificateur pur doit venir du serveur, être synchrone et correspondre à la session, la révision et l'horloge évaluées.

Ne pas supprimer de salons abandonnés dans cette première étape, ne pas activer de purge au démarrage, ne pas ajouter de route publique de diagnostic exposant des informations privées. Préserver les règles de forfait RANKED et les résultats nécessaires avant toute suppression future.

Un rapport `PENDING_ABSENCE_RESOLUTION` signale une protection persistée, pas une résolution nécessairement en cours d’exécution ni une preuve d’absence actuelle. Ne pas effacer ces résolutions pour rendre un salon éligible. Ne pas imposer de nouveaux audits répétitifs sans besoin concret et ne pas étendre cette livraison à une suppression implicite. Distinguer l’empreinte inchangée de la copie, les comptages de résultats et l’observation de la présence : ce sont des preuves différentes. Les effectifs et identifiants locaux restent privés.

Un timestamp ajouté par une migration n’est pas une preuve de la dernière activité réelle d’un salon. Son ancienneté apparente ne justifie aucune purge immédiate au déploiement.

La commande `audit:rooms` (PR nº 5, branche `feat/read-only-room-audit-cli`, code `3eff899`) fournit un résumé versionné pour remplacer le bloc Python structurel. Elle doit rester détachée du serveur et ouvrir SQLite en lecture seule, sans store/repositories à effets de bord. Ne jamais ajouter d’identifiants ou de chaînes non validées au résumé ; les documents invalides doivent être comptés à part. `pendingResolutionEntries` compte des entrées, pas des salons. `durableResultRows: null` signifie table absente, distinct de zéro ; `resultValidation: "COUNT_ONLY"` n’atteste aucune validité métier. Un rapport incomplet utilise le code retour `2` ; un échec, `1`. Aucun nouveau diagnostic de la vraie base n’est nécessaire pour valider cet outil : utiliser ses fixtures synthétiques et les tests.

## Validation adaptée

Pour la commande d’audit synthétique : utiliser `sqliteLiveRoomAudit.test.ts` et le scénario CLI existant après build. Le diagnostic ouvre uniquement des fixtures synthétiques ou une copie isolée explicitement choisie ; aucun nouvel audit de la vraie base sans besoin concret.

Pour ce diagnostic : tests ciblés `liveRoomExpiration.test.ts` / `sqliteLiveRoomExpirationPreview.test.ts`, puis suites moteur/backend et `node apps/backend/scripts/dev-expiration-preview.mjs` après build. Le scénario crée uniquement des fixtures temporaires et vérifie aussi la commande CLI. Valider sous WSL avant fusion ; aucun test Android requis tant que le diagnostic reste détaché du serveur et du client.

Pour le code : tests ciblés puis suites concernées, typecheck, builds et validation réelle lorsque nécessaire. Ajouter des tests utiles pour règles métier, présence, persistance, confidentialité et cas limites. Une documentation seule appelle une vérification des liens, commandes, faits et du diff ; ne pas inventer une exécution de tests applicatifs.

Test réel par défaut : un client Android tenu par le développeur en `PLAYER_0` et trois joueurs simulés avec `apps/backend/scripts/dev-android-room.mjs`, backend local en bootstrap de test. Le lanceur construit, installe et démarre Android, attend un **nouveau** salon, puis ajoute les trois PNJ. Le développeur démarre la partie à 4/4. Fournir aussi les étapes de reconnexion, fin de partie et historique si elles concernent le changement.

## Contraintes durables des lots Android et solo

- Sessions : conserver le verrou commun des transactions de tokens. Les retours asynchrones ne doivent modifier que la destination/session/requête encore active. Une fermeture dispose le temps réel ; ne pas inventer une annulation réseau déjà effectuée.
- Salons/parties : préserver les protections Start/Leave/refresh, les révisions autoritaires, l’acknowledge et la fermeture des WebSocket. Le retour à l’accueil ou au choix des modes ne vaut pas abandon/forfait, déconnexion de compte ou effacement de la référence de reprise.
- DTO : `PlayerSnapshotJson` valide les documents, les mains restantes et les doublons ; ne pas réintroduire les cartes déjà jouées ni recalculer les règles en Kotlin. Les cinq tests du codec d’invitation s’ajoutent aux 259 JVM antérieurs.
- Sauvegardes Android : garder les exclusions de backup cloud et de transfert d’appareil pour tokens, références sensibles et fichiers solo. Ne pas désinstaller ou vider les données pour tester une mise à jour.
- Solo : moteur TypeScript partagé, bundle généré et contrôlé, AndroidX JavaScriptEngine ; aucune duplication des règles en Kotlin, WebView UI ou téléchargement de code distant. PLAYER_0 reste humain. Le runtime, le contrôleur et le stockage ont des responsabilités distinctes.
- AtomicFile solo : conserver replay, indicateur de résultat compté et statistiques dans une transaction unique `filesDir/offline/solo.json`, enveloppe format 2. Lire les anciennes sauvegardes format 1 ; préserver une donnée invalide et une erreur de stockage sans rejouer l’action. Garder les limites de taille existantes. Aucun double comptage à la reprise, au réessai ou au nouveau match.
- Profil : progression et objectifs dérivés des statistiques locales, sans classement online. Paramètres : rythme et confirmation de carte appliqués au prochain accès ; styles de PNJ appliqués uniquement à une nouvelle partie. Une reprise garde sa politique versionnée.
- PNJ : tables Variés/Prudents/Audacieux/D’origine, politiques varied-v1/careful-v1/bold-v1/starter-v1. Décisions déterministes parmi les actions légales à partir de la seule vue autorisée du PNJ. Préserver les continuations legacy et les empreintes de leurs fixtures ; aucune IA entraînée ou difficulté mesurée revendiquée.
- Nouvelle partie solo : confirmation explicite, conservation des statistiques, pas de remplacement implicite du replay en cours. Paramètres, tutoriel, statistiques et profil ne démarrent pas de moteur ou de service réseau.
- Règles : conserver le versionnement CLASSIC_LITIGE_WINNER / CLASSIC_LEGACY_LITIGE_TAKER et les replays legacy. Aucun changement silencieux des points attribués à une partie existante.
- CI actuelle : 601 moteur, 620 backend, 26 offline ; 264 JVM ; 49 instrumentés API36 avec les invitations. Bundle inchangé 6e83cc765603d43c8a1307b3ba9b4bcb69b6b459c562dc25b1842b90351c2650. Un APK instrumenté compilé ne prouve pas des tests exécutés.

## Références de continuité

Le [bilan global](docs/PROJECT_STATUS.md) conserve la correspondance des 50 rubriques de règles et 19 rubriques de reprise, les écarts et le périmètre futur. Lire également [REPRISE](docs/REPRISE.md), [ANDROID_REVIEW](docs/ANDROID_REVIEW.md), [ANDROID_OFFLINE](docs/ANDROID_OFFLINE.md), [OFFLINE_BOT_STYLES](docs/OFFLINE_BOT_STYLES.md), [ANDROID_MODE_EXIT](docs/ANDROID_MODE_EXIT.md), [ANDROID_ROOM_INVITATIONS](docs/ANDROID_ROOM_INVITATIONS.md).

Ce fichier conserve les consignes et les preuves de code/CI publiques. Les anciens comptes rendus issus de captures et journaux PC sont retirés de cette version. Ne pas les recopier dans une PR, un document ou un commentaire public. Les instructions d’essai décrivent un scénario à réaliser, pas une observation d’un appareil réel.
