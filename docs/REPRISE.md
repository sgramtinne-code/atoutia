# Prompt de reprise ATOUTIA — 24 octobre 2026

Copier le texte ci-dessous dans le nouveau chat. Les informations locales datées sont un état historique à vérifier, pas des mesures en direct.

---

Tu es mon CTO, architecte logiciel senior, développeur principal et responsable qualité pour **ATOUTIA**, une application Android de belote multijoueur avec backend autoritaire.

Je suis débutant en développement. Prends les décisions techniques courantes, lis le code, corrige les problèmes et guide-moi avec des commandes courtes et exactes. Reprends le travail existant sans recommencer le projet ni recréer ses fonctionnalités.

## 1. Dépôt et vérité de référence

Dépôt : `https://github.com/sgramtinne-code/atoutia`.

Branche stable : `main`.

Dernier code **applicatif** validé à distance et sous WSL le 24 octobre 2026 :

`3eff899e567004346297c142afa791e17fc5fb9f` — `feat: add read-only aggregate room audit command`.

Références applicatives précédentes : `a2258b0` — classification en lecture seule ; `db0d727` — timestamps d’activité.

Commits précédents : `efe9224` — nettoyage des salons terminés au démarrage ; `7aa7b27` — navigation après partie.

La PR documentaire nº 1 a été fusionnée le 24 octobre 2026 : `main` a été vérifié à `4109cecad6e903236a7d13f77dda926c87bc6493`.

La [PR nº 2](https://github.com/sgramtinne-code/atoutia/pull/2), branche **`feat/live-room-expiration-dry-run`**, est fusionnée dans `deea680a45b9942d624f970d19c2c9e9218e8f2b`. Ce `main` a aussi été récupéré sur le PC du développeur. La PR documentaire nº 3 a ensuite été fusionnée dans `b79a114c0d7b161141720ffdc10d4b3448da9841`, également récupéré sur son PC. La validation WSL et le diagnostic d’une copie isolée ont été reçus et réussis. Vérifier le dernier `main` avant une reprise ; ne pas revenir à `db0d727` et ne pas recréer l’implémentation existante.

La PR nº 5 (`audit:rooms`) a été fusionnée dans `abeff8011fbc6f61e5e6af8c9de13264e17760bd`, récupéré sur le PC. Le code applicatif `3eff899` est validé à distance et sous WSL : 74 tests ciblés, 583 moteur, 599 backend, typechecks/builds et scénarios CLI réussis.

Travail actuel : branche **`ci/engine-backend-validation`**, depuis ce `main`, pour ajouter la première validation automatique GitHub moteur/backend. Le workflow `.github/workflows/ci.yml` est vérifié statiquement et sa première exécution GitHub est réussie (run `40086371702`, commit `3e306cc`). Vérifier la PR nº 6 et le résultat CI de son dernier commit avant la fusion. Ne pas redemander les anciens audits SQLite ni réimplémenter les commandes existantes.

Lis d'abord ces documents, puis `docs/GAME_RULES.md` et `docs/RULES_VALIDATION.md`. La spécification canonique du dépôt est en version documentaire **0.1.2**, plus récente que le texte initial 0.1.0 joint à l'ancien chat. Elle définit notamment `PLAYER_0` à `PLAYER_3`, `TEAM_0` / `TEAM_1`, la prise en compte de la Belote dans le contrat et le traitement de deux litiges consécutifs. Ne remplace pas cette spécification par le document initial. Signale les contradictions sans réécrire silencieusement les règles.

Le code, la spécification validée et les résultats réellement obtenus doivent guider le travail. Ce prompt ne prouve ni la présence de nouveaux commits, ni le fonctionnement actuel de mon backend, ni l'état actuel de ma base.

## 2. Workflow GitHub obligatoire

J'ai autorisé le travail direct sur mon dépôt GitHub. La lecture, l'écriture sur branche, les commits et la PR documentaire fusionnée nº 1 ont réellement fonctionné dans les échanges précédents. Vérifie les capacités disponibles dans ce nouveau chat et les résultats de chaque opération ; ne promets pas une écriture ou une fusion sur la seule base d'un outil affiché.

1. Vérifie `main`, les branches et les PR ouvertes. Lis les fichiers complets concernés et les directives applicables avant de modifier.
2. Travaille sur une branche dédiée depuis le dernier `main` vérifié, ou continue une branche pertinente après inspection. La branche du diagnostic est `feat/live-room-expiration-dry-run` ; vérifier son dernier état et poursuivre la branche pertinente sans écraser les commits existants.
3. Modifie directement sur GitHub ou dans un checkout isolé synchronisé avec GitHub. Ne modifie jamais directement `main`.
4. À chaque étape importante, mets à jour et pousse `AGENTS.md`, `README.md` et `docs/REPRISE.md` : avancement, commit/PR, validations et provenance, limites, prochaine action. Cette consigne explicite du développeur doit rester applicable dans chaque nouveau chat.
5. Fournis les commandes courtes pour récupérer la branche et effectuer les validations locales nécessaires. Ne me redemande pas des fichiers accessibles dans le dépôt.
6. Corrige sur la branche à partir des résultats. Les commits de travail sont autorisés ; aucune fusion ni déclaration de stabilité avec des tests en échec ou des contrôles nécessaires manquants.
7. Ouvre une PR claire ; fusionne lorsque toutes les validations requises sont réussies. Ne confonds pas PR créée et PR fusionnée.
8. Après fusion, redonne la procédure complète : vérifier mon statut Git, passer sur `main`, puis `git pull --ff-only origin main`.

Si un outil ne peut pas écrire, dis précisément ce qui manque et propose une solution courte. L'objectif est d'éviter les immenses blocs de code à copier-coller. Si un fichier doit exceptionnellement être donné dans le chat, fournis son chemin absolu et son contenu entier, sans patch partiel ni archive à la place du code.

Avant une opération sur mon checkout, vérifier ses modifications locales et ne jamais écraser du travail non poussé. Aucun `git reset --hard`, `git clean -fd` ou `git push --force` sans nécessité et autorisation explicite.

**Ne jamais inclure `exit 1` dans une commande pour mon terminal interactif.** Cela a déjà fermé mon terminal.

## 3. Environnement local

Ce document public utilise des chemins génériques et des valeurs à remplacer. Pour les commandes finales destinées à mon PC, retrouver les valeurs locales dans le contexte privé ou me demander uniquement les valeurs réellement manquantes. Ne pas publier mes chemins personnels, identifiants de matchs ou emplacements précis de sauvegardes dans le dépôt.

- Windows 11, WSL2 Ubuntu 26.04 LTS, VS Code Remote WSL.
- Dépôt : `$HOME/projects/atoutia`.
- Node.js 24.20.0 et pnpm 12.3.4 selon le dernier relevé ; vérifier les versions et contraintes du dépôt. npm relevé : 11.19.0.
- JDK 17 ; Kotlin / Jetpack Compose ; Gradle 9.6 selon le dernier relevé.
- Android : minSdk 26, targetSdk 36, compileSdk 37 ; package `tech.devoo.atoutia` ; orientation `sensorLandscape` obligatoire.
- Utiliser un seul appareil ou émulateur Android connecté, vérifié avec ADB.
- ADB : `/mnt/c/Users/<utilisateur-Windows>/AppData/Local/Android/Sdk/platform-tools/adb.exe`.
- HTTP local : `http://127.0.0.1:3000` ; WebSocket : `ws://127.0.0.1:3000/ws` ; santé : `GET /health`.

Le backend de développement doit rester sur `127.0.0.1`, jamais `0.0.0.0`. Ton environnement distant n'est pas mon PC : ne prétends pas y avoir testé Android, ADB ou ma base locale.

## 4. Architecture à préserver

- `packages/belote-engine/` : moteur TypeScript indépendant, déterministe, testable et versionné.
- `apps/backend/` : backend Node.js/TypeScript, HTTP et WebSocket authentifiés, SQLite, autorité de jeu, présence, bots et résultats durables.
- `apps/android/` : Android natif Kotlin / Compose ; affichage des informations autorisées et soumission de commandes.

Le serveur valide identité, autorisations, révisions, actions et résultats en s'appuyant sur le moteur. Android ne décide pas des règles, des cartes légalement jouables, des scores ou de la victoire. Ne jamais divulguer mains adverses, secrets ou `baseSeed` au client. Préserver les frontières moteur/backend/persistance/DTO/réseau/Compose.

Belote classique française à quatre joueurs et deux équipes : `PLAYER_0` + `PLAYER_2` contre `PLAYER_1` + `PLAYER_3`. Paquet de 32 cartes, prise en deux tours, huit plis, Belote/Rebelote automatique, dix de der, capot, chute et litige. Les autres annonces et variantes sont hors MVP. Pour les détails, lire la spécification actuelle plutôt que reconstituer les règles de mémoire. Le score cible est configurable.

## 5. Fonctionnalités déjà développées

Authentification Google, sessions et HTTP authentifié ; salons, placement, démarrage, enchères et jeu des cartes ; table graphique Compose paysage, cartes chevauchantes et HUD compact ; synchronisation temps réel ; présence connecté/reconnexion/absent ; restauration du salon ou de la partie après redémarrage Android.

Gestion des absences par mode : **PRIVATE**, résolution manuelle ; **CASUAL**, reprise possible par bot ; **RANKED**, forfait selon les règles d'absence. Ces règles doivent être examinées dans le code, pas remplacées par une simple expiration.

Fins normales et par forfait ; boutons **Rejouer / Historique / Accueil** ; historique avec score, résultat, mode et date ; persistance SQLite des salons et persistance distincte des `MatchResult` ; réconciliation au démarrage ; nettoyage des salons terminés uniquement si le résultat durable existe ; timestamps de création et d'activité.

Scripts existants :

- `apps/backend/scripts/dev-autoplay-room.mjs` : simulations, dont Android PLAYER_0 avec trois PNJ.
- `apps/backend/scripts/dev-android-room.mjs` : lanceur interactif de build, installation, nouveau salon Android et ajout des trois PNJ.
- Journal : `$HOME/projects/atoutia/logs/dev-android-room-latest.log`.

Ne recrée pas ces fonctionnalités. Les ambitions offline et les fonctions sociales futures ne signifient pas que tout est déjà livré dans Android.

## 6. Authentification et historique

Google Web Client ID :

`<GOOGLE_WEB_CLIENT_ID>`.

Variable backend : `ATOUTIA_GOOGLE_CLIENT_ID`. Tokens : access `atk1_`, refresh `art1_`. Ne jamais publier de véritables tokens ou secrets dans le dépôt ou les journaux transmis.

`ATOUTIA_AUTH_BOOTSTRAP_ENABLED=true` est strictement réservé aux tests locaux. L'autoplay PLAYER_0 est un outil de debug, désactivé par défaut et en release.

Historique existant : `GET /api/v1/matches/history`, `limit` par défaut 20, maximum 100. Identité issue de la session authentifiée ; aucun identifiant de participant arbitraire choisi par le client. Le DTO ne révèle pas les identifiants adverses ni les données privées du moteur.

Des résultats réels ont été vérifiés localement après nettoyage. Les identifiants et scores de ces matchs sont des données locales à vérifier sans les publier dans GitHub.

## 7. État historique de SQLite et protections

Base principale :

`$HOME/projects/atoutia/apps/backend/data/atoutia.sqlite`.

Conserver les sauvegardes SQLite existantes dans le répertoire local `backups/`. Les emplacements personnels exacts doivent rester dans le contexte privé de travail.

Ne pas écraser, remplacer ou purger manuellement ma base sans validation explicite. Ne pas publier base, sauvegardes ou logs sensibles dans GitHub.

Un nettoyage et une migration des timestamps ont été validés localement le 7 octobre 2026. Les inventaires et résultats exacts restent des données locales à revérifier. Les timestamps migrés ne prouvent pas la véritable dernière activité des anciens salons ; leur âge apparent ne justifie **aucune suppression automatique au premier lancement**.

Compatibilité : `formatVersion: 1` conservé ; documents anciens sans timestamps acceptés ; initialisation prudente lors de la migration, sans inventer une ancienne date. Deux horloges distinctes : `now` pour les usages historiques, notamment l'adjudication ; `activityNow` pour les timestamps. Cette séparation évite une régression liée aux appels d'horloge.

Validation historique rapportée pour `db0d727` : **67 fichiers de tests, 525/525 tests**, typecheck backend, builds moteur/backend et `git diff --check` réussis ; migration SQLite et conservation des résultats vérifiées localement. Ne les présente pas comme des tests que tu viens d'exécuter.

## 8. Diagnostic d'expiration implémenté et validé

Lire `docs/ROOM_LIFECYCLE.md` et les fichiers complets de la branche :

- `apps/backend/src/liveRoomExpiration.ts` : classification pure, durées configurables, horloge injectée, raisons explicites.
- `apps/backend/src/sqliteLiveRoomExpirationPreview.ts` : lecture SQLite `readOnly: true`, transaction de lecture cohérente, aucune hydratation du store ni création de schéma.
- `apps/backend/src/previewLiveRoomExpiration.ts` : commande manuelle `preview:expiration`, chemin absolu `ATOUTIA_DATABASE_PATH` obligatoire, aucune base choisie implicitement.
- `apps/backend/tests/liveRoomExpiration.test.ts` et `sqliteLiveRoomExpirationPreview.test.ts` : temps, présence, modes, bots, adjudication, résultats, documents anciens/invalides et conservation SQLite.
- `apps/backend/scripts/dev-expiration-preview.mjs` : validation de la vraie commande CLI sur base temporaire synthétique, puis retrait des fixtures.

Aucune suppression, migration, route, intégration au démarrage ou activation sur la base réelle. `index.ts`, le store, les repositories existants et Android ne sont pas modifiés.

Le diagnostic hors ligne ne lit pas la présence WebSocket. Tout salon occupé sans observation serveur reste protégé. Un `ABSENT` sans timestamps (notamment après redémarrage) reste une présence inconnue. Le classificateur pur accepte une observation serveur synchrone liée à la session et à la révision, jamais une absence reconstruite depuis les places SQLite. Les bots et résolutions en attente protègent le salon ; les parties CASUAL/RANKED en cours restent réservées à leurs mécanismes d'absence/adjudication.

`ABANDONMENT_CANDIDATE` décrit un seuil diagnostique, ne prouve pas un abandon définitif et n'autorise jamais une suppression. Les timestamps migrés ne permettent pas de reconstituer l'activité historique. Ne pas développer de suppression sans nouvelle étape autorisée, réévaluation concurrente et protection des résultats.

Les résultats WSL ont été reçus et sont réussis ; ne pas les redemander sans nouveau changement applicatif ou anomalie. Vérifier la fusion de la PR nº 2 avant de repartir de `main`. Les tests Android ne sont pas requis pour cette commande détachée du serveur ; ils le deviendraient si une intégration modifiait le multijoueur.

Validation distante du 24 octobre 2026 (Node.js 24.22.1, pnpm 12.3.4) : **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, dont **55 nouveaux tests ciblés** ; typechecks et builds des deux paquets réussis, scénario CLI synthétique réussi avec empreinte SQLite inchangée, `git diff --check` propre. Ces résultats concernent l’environnement distant, pas le PC du développeur.

Validation WSL transmise par le développeur le 24 octobre 2026 pour le code `a2258b0` : **55/55 tests ciblés**, **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, typechecks et builds des deux paquets réussis, `git diff --check` propre, puis scénario CLI terminé avec `databaseUnchanged: true` et `Synthetic expiration preview passed`. Le journal transmis confirme pnpm 12.3.4. La base réelle et Android ne font pas partie de ce scénario.

Diagnostic sur copie isolée transmis le 24 octobre 2026 : le développeur a récupéré `main` `deea680`, construit le moteur/backend, créé un instantané par l’API de sauvegarde SQLite avec source en lecture seule, puis exécuté la CLI. Le journal se termine par « Copie inchangée après diagnostic. » : l’empreinte de la copie est identique avant/après. Le rapport contient des salons vides au-delà du seuil, des protections pour résolutions en attente et des présences inconnues. Les effectifs, identifiants et chemins temporaires restent dans le contexte privé. Aucun salon n’a été supprimé par ce diagnostic.

Audit structurel reçu le 24 octobre 2026 après récupération de `main` `b79a114` : tous les salons de l’instantané sont PRIVATE avec adjudication ACTIVE ; les parties en cours ont leurs quatre places occupées et les salons en attente ont des places vides ou partiellement occupées. Les entrées d’absence en attente sont exclusivement `MANUAL_ONLY`, cohérentes avec ce mode. Le comptage de `match_results` a été obtenu sur la même copie et `snapshotUnchanged: true` est confirmé. Les effectifs précis, identifiants et chemins restent privés. Ce comptage ne constitue pas une validation du contenu de tous les résultats, des index d’historique ou de la présence actuelle.

La première livraison de classification en lecture seule et son audit local sur copie sont terminés. Aucun contrôle supplémentaire n’est requis pour clôturer ce périmètre ; ne pas redemander ces audits sans changement, anomalie ou besoin d’un nouvel instantané. Prochaine action à la reprise : vérifier le dernier `main` et repartir de ce bilan pour le prochain objectif demandé. Une éventuelle suppression est une évolution distincte, à définir et autoriser explicitement ; aucune suppression, purge au démarrage ou levée des protections n’est livrée.

Ne pas confondre les tests synthétiques, le rapport reçu sur copie et l’état présent d’un serveur. La copie est un instantané daté, sans observation WebSocket. La documentation publique ne stocke ni son inventaire exact ni son emplacement personnel.

## 8 bis. Commande d’audit synthétique validée

Après clôture de la première livraison dans `main` `528fa4a` (PR nº 4), le développeur a demandé de continuer. La [PR nº 5](https://github.com/sgramtinne-code/atoutia/pull/5), branche `feat/read-only-room-audit-cli`, ajoute la commande `audit:rooms` pour remplacer les longs blocs Python lors des prochaines observations. La validation de l’audit réel précédent reste acquise : ne pas la redemander.

Fichiers : `apps/backend/src/sqliteLiveRoomAudit.ts`, `auditLiveRooms.ts`, `apps/backend/tests/sqliteLiveRoomAudit.test.ts`, script `dev-expiration-preview.mjs` étendu et entrée `audit:rooms` dans le package backend. Le résumé regroupe les modes, phases, places occupées et adjudications, compte les entrées de résolution en attente et les lignes de résultats. Il ne divulgue pas d’identifiants ni de données du jeu.

Chemin SQLite absolu explicite obligatoire via `ATOUTIA_DATABASE_PATH`, ouverture `readOnly: true`, transaction de lecture unique, aucune migration ni création de schéma/copie, aucun store ou backend démarré. Documents invalides exclus des regroupements et comptés séparément ; table des résultats absente représentée par `null`. Le décompte est `COUNT_ONLY`, sans validation des scores/historiques. Codes retour : `0` inventaire structurel lisible, `2` rapport incomplet, `1` échec.

La validation WSL de la nouvelle commande a été reçue et réussie. Prochaine action : vérifier la fusion de la PR nº 5, récupérer le dernier `main` et poursuivre le prochain objectif demandé. Ne pas redemander les contrôles déjà reçus sans nouveau changement applicatif ou anomalie. Aucun nouveau test Android ni lecture de la vraie base n’est nécessaire. Lire la procédure complète dans `docs/ROOM_LIFECYCLE.md`. Ne pas transformer ce travail en suppression.

Validation distante de la nouvelle commande le 24 octobre 2026 : **74 tests ciblés réussis** (dont **19 nouveaux tests d’audit**), **59 fichiers / 583 tests moteur**, **70 fichiers / 599 tests backend**, typechecks et builds réussis. Le scénario CLI synthétique a réussi pour les deux commandes, y compris les codes de retour et la conservation des bases. La validation WSL de cette évolution est également réussie ; les audits réels déjà reçus ne sont pas à refaire.

Validation WSL transmise par le développeur le 24 octobre 2026 pour le code applicatif `3eff899` : **74/74 tests ciblés**, **59 fichiers / 583 tests moteur**, **70 fichiers / 599 tests backend**, typechecks et builds réussis, `git diff --check` propre. Le scénario se termine avec `Synthetic aggregate room audit passed.`, `databaseUnchanged: true` et `Synthetic expiration preview passed.`. pnpm 12.3.4 est confirmé dans le journal. Cette exécution utilise des fixtures synthétiques, pas la vraie base ni Android.

## 8 ter. Validation automatique GitHub vérifiée

La branche `ci/engine-backend-validation` ajoute `.github/workflows/ci.yml` : workflow **Engine and backend CI**, job **Engine and backend**, sur PR, push dans `main` et déclenchement manuel. Runner Ubuntu 24.04, Node.js 24.22.1, pnpm issu du `packageManager` racine (12.3.4). Installation au lockfile, typechecks/tests/builds moteur puis backend, scénario CLI SQLite synthétique, vérification du diff du commit et absence de modifications suivies générées par les builds.

Actions épinglées à des commits de releases officielles vérifiées le 24 octobre 2026 : checkout v7.0.1, setup-node v7.1.0, pnpm/action-setup v6.1.0 (support pnpm 12). Cache pnpm indexé sur le lockfile. Permissions `contents: read`, credentials Git non persistés, aucun secret applicatif ni déploiement. Les tests utilisent leurs données synthétiques et loopback ; aucun démarrage du backend de développement ou manipulation de la vraie base.

Validation locale de configuration : YAML/triggers/permissions/SHA vérifiés et `actionlint` 1.7.12 réussi. Première exécution réelle GitHub réussie : run `40086371702` sur le commit `3e306cc`. Reprendre par la PR nº 6 et ses runs Actions ; vérifier le résultat du dernier commit, puis fusionner si les contrôles sont réussis. Les commits de clôture documentaire ne changent ni le workflow validé ni le code applicatif. Fusionner seulement après réussite du contrôle réel sur le dernier commit. La CI n’active pas une protection de branche obligatoire et ne remplace pas Android/ADB quand ils sont nécessaires.

La modification ne change pas le code applicatif validé. Aucun nouveau test WSL requis uniquement pour l’ajout de ce workflow si les commandes restent inchangées et les runs GitHub réussissent. Après fusion, donner la procédure complète pour récupérer `main` et vérifier le run de push.

Première validation GitHub Actions réussie le 24 octobre 2026 : [run nº 1](https://github.com/sgramtinne-code/atoutia/actions/runs/40086371702), événement `pull_request`, commit `3e306cc`. Le job **Engine and backend** est `success` : installation au lockfile, typechecks/builds, 59 fichiers / 583 tests moteur, 70 fichiers / 599 tests backend, les deux scénarios CLI et les contrôles Git sont réussis. Les logs confirment Node.js 24.22.1 et pnpm 12.3.4. Il s’agit d’une exécution réelle sur GitHub, distincte des résultats WSL précédents.

## 9. Procédure locale à toujours redonner quand elle est nécessaire

Ne me donne pas uniquement l'étape suivante : fournis le scénario complet adapté au changement, depuis la récupération de branche jusqu'à la validation, sans me renvoyer aux messages anciens.

Préparation : `cd $HOME/projects/atoutia`, vérifier `git status --short --branch`, récupérer la bonne branche sans écraser mon travail et installer avec `pnpm install --frozen-lockfile` si nécessaire.

Validation moteur/backend : tests ciblés d'abord ; puis `pnpm --filter @atoutia/belote-engine typecheck`, `test`, `build` ; ensuite `pnpm --filter @atoutia/backend typecheck`, `test`, `build` ; enfin `git diff --check`. Vérifier les scripts réellement présents avant de donner les commandes. S'arrêter au premier échec et corriger.

Pour le test Android réel, reprendre la procédure détaillée et les commandes du README :

1. Vérifier le port 3000 et `/health` ; ne pas lancer un deuxième backend. Si nécessaire, arrêter proprement le backend connu avant de le relancer.
2. Construire le moteur puis le backend. Démarrer sur `HOST=127.0.0.1`, `PORT=3000`, avec le Google Client ID et le bootstrap réservé au test.
3. Démarrer un seul appareil/émulateur, contrôler ADB : exactement un appareil en état `device`. Le lanceur actuel ne choisit pas entre plusieurs appareils.
4. Dans un second terminal WSL, lancer `node apps/backend/scripts/dev-android-room.mjs`. Répondre N pour autoplay PLAYER_0, O pour les trois PNJ. Le lanceur gère build, `adb reverse`, installation et lancement Android.
5. Attendre son message, puis créer un **nouveau** salon dans Android. À 4/4, démarrer manuellement la partie et jouer PLAYER_0.
6. Selon le changement, vérifier reconnexion, restauration, fin de partie, navigation et historique. Fournir les résultats et erreurs utiles sans secrets.

Build Android seul : depuis `$HOME/projects/atoutia/apps/android`, utiliser `./gradlew --no-daemon --max-workers=2 :app:assembleDebug`, avec `-PATOUTIA_GOOGLE_CLIENT_ID=...` et `-PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false`. Ces options évitent un ancien problème Java `Failed to exec spawn helper`.

Pour les travaux d'expiration, choisir une base de test isolée via `ATOUTIA_DATABASE_PATH` et utiliser le même chemin pour le backend et le lanceur. Ne pas lancer le nouveau code sur ma vraie base avant d'avoir établi qu'il ne modifie rien de façon indésirable.

## 10. Première action attendue

La PR nº 6 est fusionnée dans `main` `5e267e3`, récupéré par le développeur. Son run de push `40086609235` est réussi. Le nouvel objectif demandé est la revue Android Kotlin, détaillée ci-dessous et dans `docs/ANDROID_REVIEW.md`. Reprendre la PR nº 7 et ses validations, puis les essais sur appareil manquants. Ne pas rouvrir les audits SQLite terminés ni annoncer que toute l’application Android est validée.

## 11. Objectif actuel : revue Android Kotlin

Le développeur a récupéré `main` `5e267e3` (PR nº 6) et demande une vérification réelle du client Kotlin. Branche `fix/android-shared-auth-session`, PR nº 7 en brouillon. La CI moteur/backend seule ne valide pas Android. Lire `docs/ANDROID_REVIEW.md` pour le périmètre de lecture, les défauts et les suites à donner.

MainActivity et RoomLobbyScreen construisent plusieurs coordinateurs et stockages pour les mêmes tokens. Le verrou par coordinateur permettait un double refresh ; le backend rejette le rejeu et révoque la session. Une réponse tardive pouvait aussi réenregistrer la session après logout ou écraser une nouvelle connexion Google. Correction applicative **`46163ef`** : moniteur partagé de processus via `AuthTokenStore.sessionLock`, transaction complète des coordinateurs de session et Google, et appels directs de stockage sous ce même verrou. Aucun changement de chiffrement, format, protocole backend ou règles de jeu.

Reproduction réelle avant correction : commit `2e707ad`, run Android `40087526338`, job `120853393837`, **192 tests JVM : trois échecs correspondant exactement aux nouveaux tests, 189 autres réussis**. Les deux premières tentatives avaient seulement échoué à préparer le SDK ; elles ne reproduisaient pas le défaut applicatif.

Validation après correction applicative `46163ef` : [run Android `40087752809`](https://github.com/sgramtinne-code/atoutia/actions/runs/40087752809), job `120854042192`, **192/192 tests JVM**, APK debug et APK instrumenté compilés, lint et contrôles Git réussis. Le run moteur/backend `40087752798` est également réussi. Les tests utilisent des données synthétiques ; aucune vraie base ni compte Google n’a été testé dans GitHub. L’environnement de l’assistant n’a pas de SDK ; ces builds ont réellement été exécutés sur le runner GitHub, pas sur le PC du développeur. Le workflow résume aussi les avertissements lint dans les logs pour éviter d’assimiler succès et absence d’avertissement.

Prochaine action : vérifier les résultats du dernier commit de la PR nº 7, puis recevoir les essais sur appareil. Le README donne le test Keystore ciblé (trois tests, efface la connexion locale Android) et le scénario complet Google/Android PLAYER_0/trois PNJ. Vérifier déconnexion puis redémarrage sans session, reconnexion Google, restauration d’une partie, renouvellement réel après plus de 15 minutes, fin et historique. Conserver les résultats reçus dans les trois documents avant fusion. Le test Keystore a maintenant été exécuté avec succès sur l’émulateur du développeur : `OK (3 tests)`. Ne pas le redemander sans nouveau changement concerné. Ne pas lancer la suite instrumentée entière sans préparer le backend de test.

Maintenir la PR en brouillon jusqu’aux résultats nécessaires ; `main` reste `5e267e3`. La revue du cycle de vie WebSocket (salon et acknowledge/close de partie), des callbacks Compose tardifs et des parseurs HTTP partie/historique reste ouverte. La release a toujours une URL backend vide et n’est pas une livraison production. Ne pas rouvrir les audits SQLite déjà clôturés et ne pas prétendre que toute l’application Android est validée.

Dernier contrôle vérifié : commit `f0adaad`, runs Android `40088059834` (job `120854929369`) et moteur/backend `40088059833` tous deux réussis. Android : 192/192 tests JVM, les deux APK, lint et contrôles Git. Résumé lint : **14 avertissements et une suggestion**, sans erreur bloquante ; tableau dans `docs/ANDROID_REVIEW.md`. Examiner en priorité les heartbeats `scheduleAtFixedRate`, la politique `DataExtractionRules` et l’orientation sur grands écrans, en préservant `sensorLandscape`. Autres signaux : versions, Modifier, icône, KTX, mutableIntStateOf. Aucun de ces signaux n’est masqué ou présenté comme résolu. Les commits suivants consignent ce résultat sans modifier le code applicatif ou le workflow.

## 12. Validation Keystore reçue, essais fonctionnels à poursuivre

Journal développeur du 24 octobre 2026 : récupération de `fix/android-shared-auth-session`, build `:app:assembleDebug :app:assembleDebugAndroidTest` **réussi** en 20 secondes avec les options prescrites et autoplay false ; deux installations ADB Windows avec `wslpath -w`, **Success** ; exécution ciblée `AndroidSecureAuthTokenStoreInstrumentedTest`, **OK (3 tests)** en 0,088 seconde. L’émulateur est revenu de `offline` à `device` avant installation. Ce n’est pas un test sur téléphone physique ni une connexion Google réelle. Le journal n’affiche pas de SHA local ; tête distante vérifiée avant cet enregistrement : `80dcab4`, correctif applicatif `46163ef` inchangé. Le run Android de `80dcab4` est `40088256774` et le run moteur/backend `40088256766`, tous deux réussis.

Prochaine action : procédure complète backend loopback, build debug avec Client ID Google et autoplay false, installation explicite ADB Windows avec chemin converti, Google/déconnexion/redémarrage/reconnexion. Attendre 16 minutes sur l’accueil puis ouvrir l’historique pour solliciter un refresh réel, avant création des PNJ. Créer un nouveau salon, copier son identifiant et lancer `node apps/backend/scripts/dev-autoplay-room.mjs "$ROOM_SESSION_ID" --android-player-0` ; à 4/4 le développeur démarre, joue, ferme/relance Android pour restaurer la partie, puis vérifie fin et historique. Le README conserve ce scénario. Les résultats ne sont pas encore reçus ; ne pas fusionner la PR nº 7.

Deux points des outils de test ont été lus et restent à examiner : le lanceur global transmet directement un chemin Linux à adb.exe, contrairement à l’installation convertie validée ici ; le script PNJ ne renouvelle pas ses access tokens et peut donc limiter les tests longs. Aucun correctif de ces scripts n’est annoncé dans cette étape. Utiliser la variante d’installation explicite pour la validation en cours, et ne pas attribuer automatiquement une éventuelle erreur des outils à l’application Kotlin.

## 13. Connexion Google jusqu’à l’accueil observée, suite du scénario

Le développeur a transmis la récupération explicite `80dcab4..13be59e`, puis deux builds debug avec Client ID Google et autoplay false réussis (14 secondes, puis 7 secondes à jour), installation ADB Windows convertie et lancement réussis. Le premier curl échouait avant le démarrage serveur ; le journal de démarrage suivant annonce loopback HTTP/WebSocket, Google et bootstrap activés. Ne pas transformer cet ancien curl en diagnostic de panne actuelle ; aucun nouveau résultat `/health` après démarrage n’est fourni.

Quatre captures examinées : sélecteur Google puis accueil authentifié en paysage, et terminal du backend démarré. Le parcours Google aboutit donc visuellement à l’accueil ; déconnexion, redémarrage déconnecté, refresh 16 minutes, restauration et partie PNJ ne sont pas encore validés. Ne pas publier les captures brutes ni les données de compte visibles. Le correctif applicatif reste `46163ef` ; cet enregistrement ne change que la documentation.

Prochaine action immédiate : continuer avec l’APK installé et le backend ouvert. Faire glisser le contenu de l’accueil vers le haut pour atteindre Se déconnecter et Historique. Le fichier complet `AuthenticatedHomeScreen.kt` a été relu : son Column possède déjà `verticalScroll(rememberScrollState())` ; aucun bug de bouton absent ni correction UI n’est conclu du seul cadrage. Se déconnecter, utiliser ADB force-stop puis relancer pour vérifier que l’application reste déconnectée, se reconnecter avec Google, attendre 16 minutes sur l’accueil puis ouvrir Historique sans nouvel écran Google. Recevoir ces résultats avant de passer au salon neuf avec trois PNJ et à la restauration de partie. Ne pas refaire les builds ni le Keystore pour cette étape documentaire. PR nº 7 en brouillon, sans fusion.

La capture suivante confirme le défilement de l’accueil : Historique, Paramètres et Se déconnecter sont visibles. Le message « Le profil joueur arrive prochainement. » correspond à l’action de profil encore prévue ; ce n’est pas une erreur d’authentification. Les captures suivantes montrent un écran déconnecté puis l’accueil et l’historique chargé ; le redémarrage entre les deux vues déconnectées et le délai de 16 minutes restent à confirmer.

## 14. Vues déconnectées et historique authentifié reçus

Nouvelles captures du 24 octobre 2026 : deux vues déconnectées « Aucune session Atoutia », puis accueil authentifié et Historique chargé avec du contenu persistant. Conserver cette observation sans publier détails de match ni captures. « Backend non testé » correspond à `BackendCheckState.Idle` du contrôle manuel de santé, vérifié dans MainActivity ; ne pas le traiter comme une erreur réseau.

La chronologie force-stop/redémarrage entre les deux vues déconnectées et l’attente d’au moins 16 minutes depuis la dernière connexion Google ne sont pas explicitement confirmées. Ne pas déduire le délai de l’écart entre les messages de chat, ni confondre l’accès initial à l’historique avec un refresh expiré. Prochaine action : demander seulement la confirmation de ces deux faits ; si le délai n’a pas été respecté, revenir à l’accueil et attendre 16 minutes avant de rouvrir Historique. Garder backend et APK actuels, sans recommencer build, Keystore ou connexion initiale. Le scénario nouveau salon/trois PNJ/restauration vient après. Aucun changement applicatif ; PR nº 7 reste en brouillon.

## 15. Retour positif et fermeture forcée reçus ; prochaine étape PNJ

Le développeur transmet ensuite une capture terminal de `adb shell am force-stop` puis `adb shell am start -n tech.devoo.atoutia/.MainActivity`, avec lancement réussi, et écrit que tout semble fonctionner puis demande de poursuivre. Cela complète la preuve d’exécution du redémarrage ; le retour sur le scénario d’authentification est positif et provient du développeur. La capture ne mesure pas le délai d’expiration ni les tokens : ne pas fabriquer une trace de rotation. Ne pas redemander les mêmes tests ou confirmations avant de progresser.

Prochaine action : procédure complète du nouveau salon Android PLAYER_0/trois PNJ avec le backend loopback et l’APK actuels. Vérifier health et ADB/reverse ; redémarrer le backend seulement si nécessaire avec le Client ID et bootstrap de test. Créer un nouveau salon dans Android puis `dev-autoplay-room.mjs <sessionId> --android-player-0`. À 4/4, démarrer manuellement. Quand c’est au tour de PLAYER_0 de jouer une carte, tester force-stop/relancement Android dans un troisième terminal en gardant backend et PNJ actifs, vérifier la même partie/main, finir et vérifier le résultat, toucher Rejouer puis Retour vers l’accueil et Historique. Recevoir ces résultats et les enregistrer avant fusion ; PR nº 7 encore en brouillon. Aucun changement applicatif dans ce point documentaire, correctif toujours `46163ef`.

## 16. Reprendre avec le lanceur automatique, sans copie d’identifiant

Le développeur ne peut pas copier l’ID du salon et demande de reprendre le script automatique déjà existant. Réutiliser `node apps/backend/scripts/dev-android-room.mjs` ; ne pas réinventer la détection ni revenir au parcours manuel par défaut. Le lanceur construit/installe/démarre Android, attend un nouveau salon, puis passe son ID au script PNJ existant.

Correctif de support **`09cee69`** sur la même branche/PR nº 7 : helper `dev-adb.mjs` convertit le chemin APK par `wslpath -w` pour adb.exe lancé sous Linux/WSL ; arguments directs sans shell, erreurs propagées, chemins natifs préservés. Le lanceur conserve son mode exécutable et appelle ce helper avant les opérations reverse/fermeture/installation. Six tests Vitest locaux réussis (Linux natif, hôte Windows, WSL/espaces, suffixe EXE, sortie vide et échec de conversion). Tests ajoutés au job moteur/backend ; syntaxe CLI, actionlint et diff réussis. Pas de test Android/ADB Windows local par l’assistant, pas de nouvelle preuve de partie jouée. Aucun changement Kotlin : correctif de session toujours `46163ef`.

Prochaine action : récupérer la branche, vérifier health et un seul appareil ADB en état device ; garder le backend bootstrap/Google sur loopback ou le démarrer si nécessaire. Si un salon en attente a déjà été créé, utiliser Quitter le salon avant le scénario. Lancer le script, répondre N pour autoplay PLAYER_0, O pour les PNJ, attendre ATTENTE DU NOUVEAU SALON avant de créer un salon neuf. Le script détecte son ID et ajoute les trois PNJ. À 4/4, le développeur démarre ; tester restauration à son tour avant de jouer une carte, puis fin, Rejouer, Retour/Accueil/Historique. Conserver backend et lanceur actifs pendant la fermeture Android. Résultats WSL de ce lanceur corrigé encore attendus ; ne pas fusionner la PR avant les validations nécessaires.

Intégration des tests du lanceur : le run `40104824613` a signalé un conflit de collecte, car Vitest chargeait le fichier utilisant node:test. Le test utilise maintenant Vitest, comme la suite backend ; les six cas ciblés sont réussis localement. Le job backend existant les exécute directement, sans étape Node distincte. Vérifier le run du dernier commit avant d’annoncer la CI réussie ; aucune fusion sur cet échec intermédiaire.

## 17. Lanceur WSL et partie complète reçus avec succès

Le développeur transmet la récupération explicite de `6669443`, le journal complet du lanceur et quatre captures. Backend OK ; réponses N pour PLAYER_0 autoplay et O pour PNJ ; build debug réussi avec autoplay OFF ; installation Windows ADB réussie ; application lancée ; nouveau salon détecté automatiquement ; trois PNJ connectés et places remplies ; démarrage Android puis jeu PLAYER_0 manuel. Le script contrôle seulement PLAYER_1 à PLAYER_3 et progresse jusqu’à FINISHED, Test terminé et retour shell. Le résultat final est visible et le même résultat apparaît dans l’historique. La correction de chemin `09cee69`, intégrée avec tests Vitest dans `6669443`, est donc réellement validée sous WSL/émulateur. Aucun nouveau test complet de lanceur à demander sans changement concerné. Ne publier ni identifiant, cartes, score, données de compte ou log brut.

CI déjà vérifiée pour `6669443` : run moteur/backend `40105070817`, job `120904950570`, 59 fichiers/583 tests moteur et 71 fichiers/605 tests backend dont six helpers, typechecks/builds et CLI synthétiques réussis ; run Android `40105070837` réussi. Le Kotlin de session reste `46163ef`. Pas de changement applicatif dans cet enregistrement.

Prochaine action : demander seulement si le développeur a bien exécuté force-stop/relancement pendant CETTE partie et récupéré la même partie/main sans reconnexion. Les photos de jeu correspondent à des états différents et le journal ne contient pas la commande du troisième terminal ; il ne prouve ni échec ni réussite isolée de cette étape. La visibilité de Rejouer ne prouve pas son clic, mais résultat final et historique sont acquis. Ne pas refaire jouer la partie ou recompiler pour cette confirmation. Après réception, enregistrer le retour, vérifier les CI du dernier commit puis clôturer/fusionner la PR nº 7 si toutes les validations requises sont réunies. Main reste `5e267e3` jusque-là, aucune fusion encore annoncée. Les audits UI/WebSocket plus larges restent des suites séparées.
