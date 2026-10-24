# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 24 octobre 2026

Travail actuel : branche **`feat/android-game-sync-status`**, depuis main **`c0df76e`** récupéré par le développeur. États de synchronisation et Réessayer contextuel proposés : premier jalon `54e81d8` vert (220 JVM et sept fixtures UI réellement exécutées). Le dernier cas de défilement est renforcé ; vérifier ses CI avant l’essai réseau ciblé. Voir [la synchronisation Android](docs/ANDROID_SYNC.md). La livraison paysage de la PR nº 9 est fusionnée et validée ; ses essais ne sont pas à répéter.

La correction paysage de la [PR nº 9](https://github.com/sgramtinne-code/atoutia/pull/9), branche **`fix/android-landscape-hand-visibility`** depuis main **`81b4f2d`**, a reçu toutes ses validations. Code **`8ed63bf`** : **4/4 UI réellement exécutés sur émulateur CI**, **209 JVM**, APK/lint et moteur/backend réussis. Le PC confirme main visible sans défilement et plusieurs cartes locales acceptées suivies de la progression des trois PNJ. Vérifier le statut GitHub et les CI du commit de clôture pour l’intégration ; aucune nouvelle répétition de l’essai n’est nécessaire. Après fusion, prochaine étape séparée : états de synchronisation et action Réessayer contextuelle. [Bilan et procédure paysage](docs/ANDROID_LANDSCAPE.md).

Acquis : PR nº 7 (sessions Kotlin, authentification/Keystore, lanceur WSL/ADB, fin de partie et historique) et PR nº 8 (cycle de vie WebSocket, retour à l’accueil, reprise après coupure/relancement et progression du jeu) intégrées. Main `81b4f2d` a été récupéré proprement par le développeur. Ces validations ne constituent pas une revue exhaustive de l’application ou une validation release ; voir [le bilan Android et ses limites](docs/ANDROID_REVIEW.md).

Test multijoueur : **`node apps/backend/scripts/dev-android-room.mjs`**, N pour PLAYER_0 manuel puis O pour les trois PNJ. Attendre ATTENTE DU NOUVEAU SALON avant de créer ; **aucun identifiant à copier**. Les anciennes parties complètes, tests d’authentification et coupures réseau n’ont pas à être répétés pour le diagnostic UI.

Les sections datées ci-dessous conservent l’historique des étapes ; l’état courant ci-dessus et le dernier bilan paysage définissent la suite.

Le diagnostic d'expiration en lecture seule est livré par la [PR nº 2](https://github.com/sgramtinne-code/atoutia/pull/2), fusionnée dans `deea680`, depuis `main` `4109cec`, sur la branche `feat/live-room-expiration-dry-run`. Son code applicatif est au commit [`a2258b0`](https://github.com/sgramtinne-code/atoutia/commit/a2258b0e09a825ef5a0728b5e0995b8ad664b552) ; les changements suivants de cette PR consignent la validation et la reprise. Vérifier le statut GitHub de la PR et le dernier `main` avant une reprise.

L'étape précédente était `db0d727`, `feat: track live room activity timestamps` (7 octobre 2026), puis la PR documentaire nº 1 fusionnée dans `4109cec`.

Fonctionnalités déjà développées : authentification Google et sessions, salons et placement des joueurs, enchères, jeu des cartes, table Compose paysage, présence WebSocket et reconnexion, gestion des absences selon le mode, bots de test, persistance SQLite, résultats durables, historique, restauration Android et navigation après partie.

Le nettoyage au démarrage des salons terminés conserve leurs résultats durables. Les documents des salons contiennent `createdAtMs` et `lastActivityAtMs`, avec compatibilité des anciens documents au format 1.

Validation historique transmise par le développeur pour `db0d727` : 67 fichiers de tests réussis, 525 tests réussis sur 525, typecheck backend, builds moteur et backend, et `git diff --check` propres. Ces contrôles ne sont pas une nouvelle exécution au 24 octobre.

Fonctionnalité validée : **classification prudente et en lecture seule des salons potentiellement abandonnés**. Le diagnostic SQLite est une commande manuelle séparée ; il ne démarre pas le backend, ne migre aucun timestamp et ne supprime rien. Les places occupées sont protégées si leur présence est inconnue. Aucune expiration automatique n'est activée. Ne pas purger la base réelle.

Voir [le diagnostic et sa validation sur données synthétiques](docs/ROOM_LIFECYCLE.md). Les validations distante et WSL sont réussies. Le diagnostic d’une copie isolée a maintenant été transmis et sa conservation vérifiée. L’audit structurel a aussi été reçu avec copie inchangée : cette première étape est terminée. Les détails de la base locale restent privés.

Validation distante du 24 octobre 2026 (Node.js 24.22.1, pnpm 12.3.4) : **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, dont **55 nouveaux tests ciblés** ; typechecks et builds des deux paquets réussis, scénario CLI synthétique réussi avec empreinte SQLite inchangée, `git diff --check` propre. Ces résultats concernent l’environnement distant, pas le PC du développeur.

Validation WSL transmise par le développeur le 24 octobre 2026 pour le code `a2258b0` : **55/55 tests ciblés**, **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, typechecks et builds des deux paquets réussis, `git diff --check` propre, puis scénario CLI terminé avec `databaseUnchanged: true` et `Synthetic expiration preview passed`. Le journal transmis confirme pnpm 12.3.4. La base réelle et Android ne font pas partie de ce scénario.

Diagnostic sur copie isolée transmis le 24 octobre 2026 : le développeur a récupéré `main` `deea680`, construit le moteur/backend, créé un instantané par l’API de sauvegarde SQLite avec source en lecture seule, puis exécuté la CLI. Le journal se termine par « Copie inchangée après diagnostic. » : l’empreinte de la copie est identique avant/après. Le rapport contient des salons vides au-delà du seuil, des protections pour résolutions en attente et des présences inconnues. Les effectifs, identifiants et chemins temporaires restent dans le contexte privé. Aucun salon n’a été supprimé par ce diagnostic.

Audit structurel reçu le 24 octobre 2026 après récupération de `main` `b79a114` : tous les salons de l’instantané sont PRIVATE avec adjudication ACTIVE ; les parties en cours ont leurs quatre places occupées et les salons en attente ont des places vides ou partiellement occupées. Les entrées d’absence en attente sont exclusivement `MANUAL_ONLY`, cohérentes avec ce mode. Le comptage de `match_results` a été obtenu sur la même copie et `snapshotUnchanged: true` est confirmé. Les effectifs précis, identifiants et chemins restent privés. Ce comptage ne constitue pas une validation du contenu de tous les résultats, des index d’historique ou de la présence actuelle.

La première livraison de classification en lecture seule et son audit local sur copie sont terminés. Aucun contrôle supplémentaire n’est requis pour clôturer ce périmètre ; ne pas redemander ces audits sans changement, anomalie ou besoin d’un nouvel instantané. Prochaine action à la reprise : vérifier le dernier `main` et repartir de ce bilan pour le prochain objectif demandé. Une éventuelle suppression est une évolution distincte, à définir et autoriser explicitement ; aucune suppression, purge au démarrage ou levée des protections n’est livrée.

La consigne de continuité est durable : à chaque étape importante, actualiser et pousser `AGENTS.md`, ce README et `docs/REPRISE.md` avec les validations et la prochaine action.

## Commande d’audit synthétique validée

La livraison par la [PR nº 5](https://github.com/sgramtinne-code/atoutia/pull/5), branche `feat/read-only-room-audit-cli` depuis `main` `528fa4a`, remplace le bloc Python d’audit structurel par une commande versionnée **`audit:rooms`**. La première livraison de classification et ses audits locaux restent validés ; ce travail ne les rouvre pas et ne demande pas de refaire l’inventaire réel.

La nouvelle commande exige un chemin absolu explicite vers une base isolée existante, ouvre SQLite en lecture seule et lit salons et nombre de résultats dans une même transaction. Elle ne produit aucun identifiant de salon ou de participant, aucune main, seed ou donnée d’authentification. Elle distingue les documents invalides et l’absence de la table des résultats. Le décompte des résultats est marqué `COUNT_ONLY` ; il ne valide pas leur contenu.

Après build, pour une prochaine observation sur une copie isolée déjà préparée :

```bash
ATOUTIA_DATABASE_PATH="/chemin/absolu/vers/copie.sqlite" \
pnpm --filter @atoutia/backend audit:rooms
```

Code retour : `0` si l’inventaire structurel a pu être lu sans document invalide et avec une table des résultats ; `2` si le rapport JSON est incomplet (documents invalides ou table de résultats absente) ; `1` si la commande échoue. Le code `0` n’atteste ni la validité de tous les résultats ni l’absence de joueurs. La commande ne démarre pas le backend et ne crée pas de copie. Le rapport reste un inventaire local à garder privé, même sans identifiants.

Validation de cette évolution : tests ciblés `sqliteLiveRoomAudit.test.ts`, suites moteur/backend, builds, puis `node apps/backend/scripts/dev-expiration-preview.mjs`. Le scénario existant vérifie maintenant les deux CLI sur ses propres fixtures temporaires, leurs codes de retour et la conservation SQLite. La validation WSL de cette commande a été reçue et réussie le 24 octobre 2026. Aucun test Android ni nouvel audit de la vraie base n’est requis.

Validation distante de la nouvelle commande le 24 octobre 2026 : **74 tests ciblés réussis** (dont **19 nouveaux tests d’audit**), **59 fichiers / 583 tests moteur**, **70 fichiers / 599 tests backend**, typechecks et builds réussis. Le scénario CLI synthétique a réussi pour les deux commandes, y compris les codes de retour et la conservation des bases. La validation WSL de cette évolution est également réussie ; les audits réels déjà reçus ne sont pas à refaire.

Validation WSL transmise par le développeur le 24 octobre 2026 pour le code applicatif `3eff899` : **74/74 tests ciblés**, **59 fichiers / 583 tests moteur**, **70 fichiers / 599 tests backend**, typechecks et builds réussis, `git diff --check` propre. Le scénario se termine avec `Synthetic aggregate room audit passed.`, `databaseUnchanged: true` et `Synthetic expiration preview passed.`. pnpm 12.3.4 est confirmé dans le journal. Cette exécution utilise des fixtures synthétiques, pas la vraie base ni Android.

Code applicatif validé : [`3eff899`](https://github.com/sgramtinne-code/atoutia/commit/3eff899e567004346297c142afa791e17fc5fb9f). Les derniers changements de la PR nº 5 consignent seulement la validation et la reprise. Prochaine action : vérifier sa fusion, récupérer le dernier `main`, puis poursuivre le prochain objectif demandé. Aucune nouvelle validation de la copie réelle n’est nécessaire pour cette livraison.

## Validation automatique moteur/backend

La [PR nº 6](https://github.com/sgramtinne-code/atoutia/pull/6), branche `ci/engine-backend-validation` depuis `main` `abeff80`, ajoute [le workflow CI](.github/workflows/ci.yml). Il exécute **Engine and backend** sur les PR, après push dans `main` et sur déclenchement manuel : installation `pnpm install --frozen-lockfile`, typecheck/tests/build du moteur, puis du backend, scénarios CLI SQLite synthétiques et contrôles Git.

Environnement : Ubuntu 24.04, Node.js 24.22.1, pnpm 12.3.4 lu depuis `package.json`. Les actions `actions/checkout`, `actions/setup-node` et `pnpm/action-setup` sont épinglées à des commits de leurs releases officielles. Aucun secret applicatif ni base locale ; le job ne déploie rien et ne démarre pas le backend de développement. Il teste aussi les deux CLI d’audit déjà validées sous WSL.

Le workflow a été vérifié avec `actionlint` 1.7.12 et son YAML a été contrôlé. La première exécution réelle sur GitHub est également réussie ; voir le résultat ci-dessous. La CI ne remplace pas les tests Android nécessaires et ne configure pas à elle seule une protection de branche.

Première validation GitHub Actions réussie le 24 octobre 2026 : [run nº 1](https://github.com/sgramtinne-code/atoutia/actions/runs/40086371702), événement `pull_request`, commit `3e306cc`. Le job **Engine and backend** est `success` : installation au lockfile, typechecks/builds, 59 fichiers / 583 tests moteur, 70 fichiers / 599 tests backend, les deux scénarios CLI et les contrôles Git sont réussis. Les logs confirment Node.js 24.22.1 et pnpm 12.3.4. Il s’agit d’une exécution réelle sur GitHub, distincte des résultats WSL précédents.

Suivre les exécutions dans [GitHub Actions](https://github.com/sgramtinne-code/atoutia/actions). La procédure locale complète ci-dessous reste disponible pour reproduire un échec. Un changement portant seulement sur ce workflow sera validé directement dans GitHub Actions ; aucune nouvelle exécution sur le PC du développeur n’est requise si les commandes applicatives restent inchangées et la CI réussit.

## Documents de référence

- [Directives pour les assistants et contributeurs](AGENTS.md)
- [Prompt complet pour reprendre dans un nouveau chat](docs/REPRISE.md)
- [Règles canoniques du moteur — version documentaire 0.1.2](docs/GAME_RULES.md)
- [Validation des règles MVP](docs/RULES_VALIDATION.md)
- [Diagnostic du cycle de vie des salons](docs/ROOM_LIFECYCLE.md)

Le document initial de règles 0.1.0 est historique. Les noms des joueurs, les règles détaillées de score et de litige doivent suivre la spécification actuelle du dépôt.

## Architecture

| Emplacement | Responsabilité |
| --- | --- |
| `packages/belote-engine/` | Règles, états, coups légaux et scores déterministes |
| `apps/backend/` | Authentification, autorité serveur, HTTP, WebSocket, persistance SQLite, présence et résultats |
| `apps/android/` | Client Kotlin / Jetpack Compose, affichage autorisé et commandes au serveur |
| `docs/` | Spécification métier et reprise du projet |

Android ne décide ni de la légalité finale d'un coup, ni du score, ni de la victoire. Les mains adverses et le `baseSeed` restent privés. Le moteur ne dépend ni d'Android, ni du réseau, ni du stockage.

Les ambitions offline, sociales et compétitives restent des directions du projet ; ne pas les confondre avec des fonctionnalités toutes déjà livrées dans Android. OVH et le déploiement public sont des étapes ultérieures.

## Environnement du développeur

Les chemins ci-dessous sont génériques. Avant d'exécuter les exemples, remplacer `<utilisateur-Windows>` et `<GOOGLE_WEB_CLIENT_ID>` par les valeurs de l'environnement local. `$HOME` désigne le répertoire personnel WSL ; adapter aussi le chemin du checkout si nécessaire.

- Windows 11, WSL2 Ubuntu 26.04 LTS, VS Code Remote WSL.
- Dépôt : `$HOME/projects/atoutia`.
- Node.js : `>=24.20.0 <25` ; pnpm : `12.3.4` déclaré par le projet, plage `>=12.3.4 <13`.
- JDK 17 ; Android Kotlin / Jetpack Compose ; Gradle 9.6 selon l'environnement transmis.
- Android : minSdk 26, targetSdk 36, compileSdk 37 ; package `tech.devoo.atoutia` ; paysage `sensorLandscape`.
- ADB Windows : `/mnt/c/Users/<utilisateur-Windows>/AppData/Local/Android/Sdk/platform-tools/adb.exe`.

Vérifier les versions réellement installées et les fichiers du dépôt avant de diagnostiquer une incompatibilité. Le fonctionnement du PC et du backend local n'est pas vérifiable depuis une simple lecture GitHub.

## Récupération et validations du code

Dans WSL, commencer par vérifier les modifications locales :

```bash
cd $HOME/projects/atoutia
git status --short --branch
```

Si le dépôt est propre, récupérer `main` ou la branche de travail indiquée dans la PR. Ne pas changer de branche en écrasant du travail local.

```bash
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
```

Exécuter d'abord les tests ciblés associés au changement. Pour la validation moteur/backend complète, exécuter les blocs suivants dans l'ordre, en s'arrêtant au premier échec :

```bash
cd $HOME/projects/atoutia
pnpm --filter @atoutia/belote-engine typecheck &&
pnpm --filter @atoutia/belote-engine test &&
pnpm --filter @atoutia/belote-engine build
```

```bash
pnpm --filter @atoutia/backend typecheck &&
pnpm --filter @atoutia/backend test &&
pnpm --filter @atoutia/backend build &&
git diff --check
```

Adapter les validations Android au changement. Aucun code en échec ne doit être fusionné dans `main`.

## Diagnostic d'expiration sur données synthétiques

Sur `main` après fusion de la PR nº 2 (ou sur sa branche avant fusion), après récupération et installation, exécuter dans l'ordre et s'arrêter au premier échec :

```bash
cd $HOME/projects/atoutia
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend exec vitest run tests/liveRoomExpiration.test.ts tests/sqliteLiveRoomExpirationPreview.test.ts
```

Exécuter ensuite les validations complètes moteur/backend ci-dessus, puis :

```bash
node apps/backend/scripts/dev-expiration-preview.mjs
```

Le script crée sa propre base temporaire synthétique, teste la vraie commande CLI, vérifie l'empreinte SQLite et retire ses fixtures. Il ignore le chemin `ATOUTIA_DATABASE_PATH` du shell. Résultats attendus : salon vide ancien candidat, salon occupé protégé (`UNKNOWN_PRESENCE`), ancien document protégé (`MISSING_ACTIVITY_TIMESTAMPS`), `databaseUnchanged: true`.

Pour un diagnostic manuel distinct, **uniquement sur une base isolée choisie explicitement** après build :

```bash
ATOUTIA_DATABASE_PATH="/chemin/absolu/vers/base-isolee.sqlite" \
pnpm --filter @atoutia/backend preview:expiration
```

Le chemin n'a aucune valeur par défaut. La commande ouvre la base existante en lecture seule ; elle ne passe ni par les repositories qui créent le schéma, ni par le store qui migre les anciens documents. Elle n'observe pas les WebSockets : elle ne prouve donc aucun abandon d'un salon occupé. Le rapport local contient des identifiants de salons ; ne pas le publier sans anonymisation.

Cette livraison n'appelle aucun changement Android et n'est branchée sur aucun timer, route ou démarrage serveur. Sa validation utilise d'abord SQLite synthétique ; le test Android ci-dessous reste destiné aux changements du fonctionnement multijoueur.

## Test réel local : Android PLAYER_0 et trois PNJ

Cette procédure utilise la base locale habituelle et crée une nouvelle partie de test. Pour une future fonctionnalité d'expiration ou de suppression, préparer d'abord une base isolée et définir `ATOUTIA_DATABASE_PATH` de manière cohérente dans les deux terminaux ; ne pas tester une purge sur la base réelle.

### 1. Vérifier le backend existant

Dans un premier terminal WSL :

```bash
cd $HOME/projects/atoutia
ss -ltnp 'sport = :3000'
curl --fail --silent --show-error http://127.0.0.1:3000/health
```

Si aucun backend n'écoute, l'échec de `curl` est attendu. Si un backend fonctionne déjà, vérifier sa configuration et le réutiliser ; s'il faut le relancer en mode test, l'arrêter proprement avec `Ctrl+C` dans son terminal. Ne pas lancer un second serveur ni tuer un processus inconnu.

### 2. Construire et démarrer le backend si nécessaire

```bash
cd $HOME/projects/atoutia
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build
```

Après réussite du build :

```bash
HOST="127.0.0.1" PORT="3000" \
ATOUTIA_AUTH_BOOTSTRAP_ENABLED="true" \
ATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>" \
pnpm --filter @atoutia/backend start
```

Le bootstrap est réservé aux tests locaux. Les adresses attendues sont `http://127.0.0.1:3000` et `ws://127.0.0.1:3000/ws`. Ne pas exposer ce serveur en `0.0.0.0`.

### 3. Préparer Android et lancer le scénario

Démarrer un seul appareil ou émulateur Android. Dans un deuxième terminal WSL :

```bash
cd $HOME/projects/atoutia
ADB="/mnt/c/Users/<utilisateur-Windows>/AppData/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" devices
curl --fail --silent --show-error http://127.0.0.1:3000/health
```

Il doit y avoir exactement un appareil en état `device`, sans `offline`. Le lanceur actuel ne sélectionne pas un appareil parmi plusieurs.

```bash
node apps/backend/scripts/dev-android-room.mjs
```

Répondre **N** pour l'autoplay de PLAYER_0, puis **O** pour ajouter les trois PNJ. Le lanceur effectue le build debug avec `--no-daemon --max-workers=2`, configure `adb reverse`, installe et lance l'application. Il vérifie aussi la valeur d'autoplay dans le build généré.

### 4. Jouer et vérifier

1. Attendre le message du lanceur demandant la création d'un nouveau salon.
2. Dans Android : se connecter si nécessaire, puis **Jouer → Créer une partie**. Ne pas démarrer immédiatement.
3. Attendre l'ajout des trois PNJ et l'affichage **4/4**, puis toucher **Démarrer la partie**.
4. Jouer comme PLAYER_0 ; vérifier la synchronisation et les actions légales proposées par le serveur.
5. Pour les changements concernés, vérifier aussi reconnexion et restauration après redémarrage Android, sans perdre le salon actif.
6. À la fin, vérifier le résultat et les boutons **Rejouer**, **Historique**, **Accueil** ; retrouver le match dans l'historique.
7. Transmettre les erreurs éventuelles et la fin du journal, après retrait de toute donnée sensible.

Journal : `$HOME/projects/atoutia/logs/dev-android-room-latest.log`. Le lanceur remplace ce journal à chaque exécution.

## Build Android seul

```bash
cd $HOME/projects/atoutia/apps/android
./gradlew --no-daemon --max-workers=2 :app:assembleDebug \
  -PATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>" \
  -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false
```

APK : `$HOME/projects/atoutia/apps/android/app/build/outputs/apk/debug/app-debug.apk`.

## Historique et protection des données

`GET /api/v1/matches/history` est authentifié ; `limit` vaut 20 par défaut, avec un maximum de 100. Exemple : `?limit=10`. L'identité vient de la session ; le client ne choisit pas un participant arbitraire.

Base principale : `$HOME/projects/atoutia/apps/backend/data/atoutia.sqlite`. Ne pas publier, écraser ou purger cette base ni supprimer ses sauvegardes.

Le dernier inventaire local doit être revérifié avant toute opération. Les comptages, identifiants de matchs et emplacements personnels de sauvegardes restent dans le contexte privé de travail.

Les timestamps migrés ne prouvent pas une activité réelle à cette date. Une future politique d'expiration doit protéger présence, reconnexion, parties en cours, adjudications RANKED et historique, et commencer par un diagnostic sans suppression.

## Revue Android Kotlin en cours

Branche `fix/android-shared-auth-session` depuis `main` `5e267e3`. La revue des parcours authentifiés a identifié des gestionnaires de session distincts dont les verrous ne coordonnent pas le renouvellement des tokens. Le backend révoque une session lorsqu’un refresh token déjà consommé est réutilisé. Des tests de concurrence reproduisent les chevauchements refresh/refresh, refresh/déconnexion et refresh/connexion Google. Ils ont échoué avant correction puis réussi avec le verrou partagé entre stockages et coordinateurs.

[Android CI](.github/workflows/android.yml) exécute les tests JVM, la compilation debug et du paquet de tests instrumentés, et le lint. La validation Keystore sur émulateur a maintenant été reçue et réussie ; le parcours Google jusqu’à l’accueil a ensuite été observé, tandis que déconnexion, refresh, restauration et multijoueur restent à recevoir. L’audit complet de l’interface reste ouvert.

La [revue Android détaillée](docs/ANDROID_REVIEW.md) conserve le périmètre et les suites à donner. Reproduction avant correction sur GitHub : [run `40087526338`](https://github.com/sgramtinne-code/atoutia/actions/runs/40087526338), commit `2e707ad` : **192 tests JVM, trois échecs attendus dans les nouveaux tests de concurrence, 189 autres réussis**. Après correction applicative **`46163ef`** : [run Android `40087752809`](https://github.com/sgramtinne-code/atoutia/actions/runs/40087752809) réussi avec **192/192 tests JVM**, compilation de l’APK debug et de l’APK instrumenté, lint et contrôles Git réussis. Le [run moteur/backend `40087752798`](https://github.com/sgramtinne-code/atoutia/actions/runs/40087752798) est aussi réussi. Les trois tests Keystore ont réussi sur l’émulateur du développeur ; le parcours Google jusqu’à l’accueil est observé ; déconnexion, refresh, restauration et multijoueur restent à recevoir avant fusion. La PR nº 7 demeure en brouillon. Les commits documentaires suivants ne changent pas le correctif applicatif.

### Test Keystore sur appareil de test

Cette classe utilise uniquement des tokens synthétiques, sans backend. Elle efface la session de connexion locale de l’application cible : utiliser un appareil de test et se reconnecter ensuite. Elle n’efface pas la base du backend. Ne pas lancer toute la suite instrumentée sans préparer le backend attendu par les autres classes.

Après récupération de la branche et vérification d’un seul appareil ADB en état `device`, construire :

```bash
cd $HOME/projects/atoutia/apps/android &&
./gradlew --no-daemon --max-workers=2 :app:assembleDebug :app:assembleDebugAndroidTest \
  -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false
```

Avec ADB Windows depuis WSL, convertir les chemins pour l’installation :

```bash
cd $HOME/projects/atoutia/apps/android
ADB="/mnt/c/Users/<utilisateur-Windows>/AppData/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" devices
```

Si l’unique appareil est prêt, exécuter dans l’ordre :

```bash
"$ADB" install -r "$(wslpath -w "$PWD/app/build/outputs/apk/debug/app-debug.apk")" &&
"$ADB" install -r "$(wslpath -w "$PWD/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk")" &&
"$ADB" shell am instrument -w \
  -e class tech.devoo.atoutia.auth.AndroidSecureAuthTokenStoreInstrumentedTest \
  tech.devoo.atoutia.test/androidx.test.runner.AndroidJUnitRunner
```

Résultat attendu : `OK (3 tests)`. Conserver le résultat reçu, pas seulement le code retour ADB. Reprendre ensuite le scénario **Android PLAYER_0 et trois PNJ** ci-dessus : le lanceur reconstruit avec le Google Client ID configuré, installe et lance l’application. Vérifier connexion Google, déconnexion depuis l’accueil, redémarrage sans restauration de session après déconnexion, reconnexion Google, nouvelle partie, restauration et historique. Pour vérifier le renouvellement réel, garder la session plus de 15 minutes après la connexion puis actualiser/reconnecter le réseau ; aucune demande de reconnexion Google ni perte de partie ne doit survenir si le refresh reste valide. Ne pas modifier l’horloge de l’appareil pour forcer ce cas.

Dernier contrôle documentaire et CI résumé : commit `f0adaad`, [Android `40088059834`](https://github.com/sgramtinne-code/atoutia/actions/runs/40088059834) et [moteur/backend `40088059833`](https://github.com/sgramtinne-code/atoutia/actions/runs/40088059833) réussis. Android confirme 192/192 tests JVM, les deux APK et le lint ; le lint conserve **14 avertissements et une suggestion**, détaillés dans [le bilan](docs/ANDROID_REVIEW.md#avertissements-lint-observés). Ils concernent notamment heartbeats, extraction/sauvegarde des données et grands écrans. Les essais sur appareil et ces revues restent à terminer.

### Résultat WSL/émulateur reçu et prochaine validation

Journal développeur reçu le 24 octobre 2026 après récupération de `fix/android-shared-auth-session` : `:app:assembleDebug :app:assembleDebugAndroidTest` avec `--no-daemon --max-workers=2` et autoplay désactivé, **BUILD SUCCESSFUL** en 20 secondes ; installation des deux APK via ADB Windows et chemins convertis avec `wslpath -w`, deux `Success` ; classe `AndroidSecureAuthTokenStoreInstrumentedTest`, **OK (3 tests)** en 0,088 seconde. Les trois cas couvrent persistance/relecture par Keystore, effacement et moniteur partagé entre deux stockages. L’émulateur est passé de `offline` à `device` avant ces opérations. Ce résultat ne valide pas encore Google, le refresh réel, la restauration d’une partie ou un téléphone physique. Le journal ne contient pas de SHA local explicite ; la branche distante vérifiée avant cet enregistrement est `80dcab4`, avec correctif applicatif `46163ef` inchangé.

Pour la prochaine validation WSL/ADB Windows, utiliser le démarrage backend local décrit plus haut, puis le build Android avec `-PATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>"` et autoplay désactivé. Installer l’APK avec la conversion `wslpath -w` déjà validée et démarrer `tech.devoo.atoutia/.MainActivity`. Vérifier Google, déconnexion, fermeture et redémarrage sans session, puis reconnexion Google. Rester **16 minutes sur l’accueil**, puis ouvrir l’historique : l’accès doit renouveler la session sans nouvelle demande Google. Effectuer cette attente avant de créer les PNJ, car leur script actuel ne renouvelle pas ses tokens.

Pour la partie, utiliser le lanceur automatique existant depuis la racine du dépôt, sans copier d’identifiant :

```bash
node apps/backend/scripts/dev-android-room.mjs
```

Répondre **N** pour autoplay PLAYER_0 puis **O** pour les trois PNJ. Attendre **ATTENTE DU NOUVEAU SALON**, puis créer un nouveau salon dans Android. Le lanceur le détecte et ajoute les PNJ. Si un salon en attente avait déjà été créé, le quitter avant ce scénario ; ne pas supprimer de données pour recommencer.

À **4/4**, démarrer manuellement et jouer PLAYER_0. Fermer puis relancer Android pendant la partie pour vérifier la restauration ; garder backend et PNJ actifs. Terminer puis consulter le résultat et l’historique. Conserver les sorties utiles sans tokens ni inventaire local. Le lanceur automatique utilise la même logique PNJ, avec la conversion Windows ajoutée dans `09cee69` ; aucun changement Kotlin dans ce correctif de support. Les résultats fonctionnels restent à recevoir et la PR reste en brouillon.

### Connexion Google jusqu’à l’accueil observée

Le 24 octobre 2026, le développeur a récupéré la branche jusqu’à `13be59e`, construit le debug avec Client ID Google et autoplay false (**BUILD SUCCESSFUL**, puis seconde exécution à jour), installé et lancé l’application avec succès. Le journal serveur annonce ensuite HTTP/WebSocket sur loopback, Google et bootstrap activés. Le `curl` en échec dans le journal précédait ce démarrage ; aucun nouvel échec réseau après démarrage n’a été transmis.

Les captures montrent le sélecteur Google puis l’accueil authentifié en paysage. Ce constat valide visuellement l’aboutissement de cette connexion ; il ne prouve pas encore la déconnexion, le maintien déconnecté après redémarrage, le refresh après expiration ou une partie restaurée. Les captures et comptes qu’elles affichent restent hors du dépôt public.

L’accueil est déjà défilant : glisser le contenu vers le haut au milieu de l’écran permet d’atteindre **Historique**, **Paramètres** et **Se déconnecter** sous les boutons initialement visibles. Continuer avec l’installation actuelle et garder le backend ouvert : se déconnecter, fermer/relancer pour vérifier l’écran déconnecté, se reconnecter, attendre 16 minutes sur l’accueil puis ouvrir Historique sans nouvelle demande Google. Les tests de partie avec trois PNJ viennent ensuite ; la PR nº 7 reste en brouillon.

La capture suivante confirme le défilement de l’accueil : Historique, Paramètres et Se déconnecter sont visibles. Le message « Le profil joueur arrive prochainement. » correspond à l’action de profil encore prévue ; ce n’est pas une erreur d’authentification. Les captures suivantes montrent un écran déconnecté puis l’accueil et l’historique chargé ; le redémarrage entre les deux vues déconnectées et le délai de 16 minutes restent à confirmer.

### Écran déconnecté puis historique chargé observés

Le 24 octobre 2026, de nouvelles captures de l’émulateur montrent deux vues « Aucune session Atoutia », puis l’accueil authentifié et un historique effectivement chargé avec du contenu persistant. Les scores, dates et captures brutes restent privés. L’ouverture de l’historique authentifié est donc observée ; ces images ne permettent pas de confirmer le force-stop entre les deux premières vues ni l’attente de 16 minutes après la dernière connexion Google. Ne pas présenter le renouvellement automatique comme validé sur cette seule base.

« Backend non testé » représente l’état initial du bouton de test manuel de santé ; ce libellé ne signale pas une panne. Prochaine action : recevoir la confirmation du redémarrage et du délai depuis la dernière connexion Google. Si l’attente n’a pas été faite, revenir à l’accueil, garder backend et application ouverts 16 minutes, puis rouvrir Historique sans nouvelle demande Google. Les validations Keystore et l’accès initial à l’historique restent acquis ; les essais PNJ et restauration de partie restent à faire, PR nº 7 en brouillon.

### Passage au scénario multijoueur

Après les captures déconnecté/accueil/historique, le développeur transmet le terminal exécutant `am force-stop` puis `am start`, avec lancement réussi, et rapporte que tout semble fonctionner. Le parcours est enregistré comme retour fonctionnel positif du développeur. Le délai exact d’attente et la rotation des tokens ne sont pas mesurés dans cette capture ; ne pas inventer de preuve réseau supplémentaire et ne pas redemander le scénario acquis avant de poursuivre.

Étape actuelle : garder le backend loopback, contrôler `/health` et ADB en état `device`, puis lancer `dev-android-room.mjs`. Répondre N puis O ; attendre son invite, créer un nouveau salon, laisser détecter son ID et remplir les places, puis démarrer sur Android à 4/4. Quand c’est au tour de PLAYER_0 de jouer une carte et avant tout envoi, garder backend et PNJ actifs, fermer/relancer Android dans un autre terminal : la même partie et les mêmes cartes doivent revenir. Terminer et vérifier le résultat ; depuis cet écran toucher Rejouer, vérifier l’écran des salons sans en créer, puis Retour vers l’accueil et Historique pour retrouver le résultat. Les commandes backend, ADB et PNJ sont données plus haut. Résultats de cette partie encore attendus ; PR nº 7 en brouillon.

### Lanceur automatique rétabli pour le test en cours

Le développeur ne peut pas copier l’identifiant et demande le lanceur déjà présent. La procédure manuelle est donc remplacée par `dev-android-room.mjs` : build, vérification autoplay, installation, reverse, démarrage, détection d’un nouveau salon et lancement du script PNJ sont déjà implémentés. Aucun nouvel outil de détection n’est créé.

Correctif de support **`09cee69`** : lors d’un lancement sous Linux/WSL avec adb.exe, le chemin de l’APK est converti par `wslpath -w` avant installation. L’appel passe ses arguments directement sans shell et ne revient pas au chemin Linux si la conversion échoue. ADB natif Linux et l’hôte Windows conservent leur chemin. Helper `dev-adb.mjs` et six tests Vitest, exécutés aussi par la CI moteur/backend.

Validation locale de l’assistant : **6/6 tests Vitest**, syntaxe du lanceur, actionlint et diff réussis. Aucun SDK/émulateur Windows n’est exécuté ici par l’assistant ; le journal développeur reçu valide maintenant le lanceur complet jusqu’à la fin de partie et l’historique. Aucun changement Kotlin ou de détection SQLite/PNJ dans ce correctif. Le code Kotlin reste `46163ef`, la PR nº 7 reste en brouillon jusqu’aux résultats nécessaires.

Intégration des tests du lanceur : le run `40104824613` a signalé un conflit de collecte, car Vitest chargeait le fichier utilisant node:test. Le test utilise maintenant Vitest, comme la suite backend ; les six cas ciblés sont réussis localement. Le job backend existant les exécute directement, sans étape Node distincte. Vérifier le run du dernier commit avant d’annoncer la CI réussie ; aucune fusion sur cet échec intermédiaire.

### Lanceur automatique et partie complète validés sous WSL

Journal développeur reçu le 24 octobre 2026 après récupération explicite de **`6669443`** : backend sain, un émulateur prêt, réponses N/O, build debug réussi, autoplay PLAYER_0 OFF, installation ADB Windows réussie, application lancée, nouveau salon détecté automatiquement sans copier son identifiant. Les trois PNJ remplissent les places et jouent uniquement PLAYER_1 à PLAYER_3 ; PLAYER_0 démarre et joue manuellement. Le script termine normalement avec **FINISHED**, **Test terminé** et retour au terminal.

Les captures montrent la partie en cours, le résultat final et l’historique chargé avec le même résultat. Cela valide le lanceur corrigé et une partie complète sur l’émulateur du développeur ; aucune nouvelle exécution de ce scénario n’est demandée sans changement concerné. Les données de match et le log brut restent privés.

La restauration après fermeture en cours de cette partie reste à confirmer simplement : les vues de jeu ne montrent pas la même révision/main avant et après, et le journal fourni concerne le lanceur, pas le troisième terminal ADB. Ne pas conclure à un échec et ne pas faire rejouer ce match pour obtenir une réponse factuelle. Les boutons de fin sont visibles et l’historique est chargé ; le clic sur Rejouer n’est pas directement montré. La PR nº 7 reste en brouillon en attendant la validation manquante.

## Clôture des validations Android de la PR nº 7

Le développeur a relancé le lanceur automatique avec PLAYER_0 manuel et trois PNJ, puis confirme explicitement la restauration en cours de partie par « oui c’est ok ». Deux captures montrent le même état de jeu et la même main ; la partie revient sans nouvelle connexion Google. Ce retour complète le match déjà terminé et son résultat cohérent dans l’historique. Une nouvelle fin de partie n’est pas requise pour cette seconde exécution centrée sur la restauration.

Les validations nécessaires à cette livraison sont reçues : **192 tests JVM Android**, **583 moteur**, **605 backend dont six helpers**, builds et lint en CI ; **trois tests Keystore sur émulateur**, parcours Google avec retour positif, lanceur WSL/ADB Windows réellement exécuté, partie complète, résultat/historique et restauration confirmée par le développeur. Les résultats restent distincts d’un test sur téléphone physique, d’une trace réseau des tokens et d’une validation exhaustive des composants Compose.

Code Kotlin : `46163ef`. Support du lanceur : `09cee69`, tests intégrés dans `6669443`. Dernier point de contrôle avant clôture documentaire : `4701e96`, runs moteur/backend `40105927418` et Android `40105927594` réussis. Vérifier les contrôles du dernier commit documentaire puis l’intégration de la PR nº 7 ; après fusion, récupérer main. Aucune nouvelle validation WSL de ce code inchangé n’est nécessaire.

La prochaine étape est une revue séparée du cycle de vie WebSocket puis des points UI et de sauvegarde déjà documentés. La release n’est pas prête pour production et les avertissements lint restent visibles. Les instructions historiques « en attente » ci-dessus décrivent les étapes précédentes ; la présente clôture définit l’état courant.

## Revue WebSocket Android en cours

Main `82b0937` et la PR nº 7 sont intégrés et récupérés par le développeur. La branche `fix/android-websocket-lifecycle` ajoute 17 tests déterministes de fermeture/heartbeat : ordonnanceur arrêté, callbacks tardifs, fermeture pendant obtention du token/création du socket et acknowledge concurrent. Les dépendances WebSocket/ordonnanceur sont injectables sans changer leur comportement par défaut à cette première étape. Les tests sont ajoutés avant correction ; leurs résultats restent à obtenir. Voir [le suivi WebSocket](docs/ANDROID_WEBSOCKETS.md).


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


## Paysage Android — main visible confirmée sur le PC (PR nº 9)

Branche **`fix/android-landscape-hand-visibility`**, [PR nº 9 en brouillon](https://github.com/sgramtinne-code/atoutia/pull/9), depuis main **`81b4f2d`** (PR nº 8 intégrée et récupérée proprement sur le PC). Les validations des PR nº 7/8 et les audits SQLite sont clôturés pour leur périmètre ; ne pas les refaire sans anomalie nouvelle. Aucune fusion de la PR nº 9 ni validation release n’est annoncée.

Le grand HUD partageait la colonne défilante avec la main. Le code initial `c4fc8d0` propose un bandeau compact (score/cible, atout, donne/donneur/preneur/révision) à côté du retour à l’accueil, la main fixe et les commandes secondaires seules défilantes. La table conserve sa disposition et ses proportions. Le repli hors paysage garde son contenu défilant. Les retours de carte obsolètes sont masqués à la fin/forfait (`b7e3760`). Aucun changement moteur/backend, de légalité des coups, réseau, authentification, reprise ou persistance. Préserver sensorLandscape et les blocages pendant soumission.

L’erreur initiale de classe de test absente est résolue : le développeur a récupéré `8b68a8e`, vérifié le source, construit/installé les deux APK et réellement exécuté quatre cas. Résultat PC : **un réussi, trois échecs player-hand non affiché**. Ce n’était plus un problème de chargement.

La reproduction distante sur **`9a2b367`** est acquise : [Android UI CI `40126996955`](https://github.com/sgramtinne-code/atoutia/actions/runs/40126996955), job `120970453257`, AVD démarré et deux APK construits/installés, **un cas réussi/trois échoués**. Dans la zone synthétique 640 × 320 dp, les marges système réduisaient le contenu à environ 588 × 268 dp : le seuil de 600 dp évalué après padding choisissait la disposition empilée (`landscape=0 stacked=1`) et la main débutait vers 699 dp, hors écran. Les deux autres cas la plaçaient plus bas encore.

Le correctif applicatif **`8ed63bf`** évalue largeur et rapport largeur/hauteur sur les bornes allouées à GameScreen **avant** les marges, puis applique innerPadding à chacune des dispositions. Le seuil reste 600 dp, les marges protègent le contenu et les assertions de visibilité sont conservées. La règle de test utilise maintenant `androidx.compose.ui.test.junit4.v2.createAndroidComposeRule`, sans avertissement de dépréciation du constructeur v1.

Validations réellement obtenues sur **`8ed63bf`** :

- [Android UI CI `40127445613`](https://github.com/sgramtinne-code/atoutia/actions/runs/40127445613), job **`120971796726`** : **OK (4 tests)** sur AVD Pixel 7 API 36. Huit cartes visibles sans défilement dans 640 × 320 dp ; police 1,3, carte légale/interdite et blocage pendant soumission ; enchères défilant sans déplacer la main, Passer et callback ; fin sans main/erreur obsolète, Rejouer et callback.
- [Android Kotlin CI `40127445634`](https://github.com/sgramtinne-code/atoutia/actions/runs/40127445634), job **`120971796773`** : **209/209 JVM**, APK debug/instrumenté et lint réussis, **12 avertissements et une suggestion**. Le warning de règle Compose v1 a disparu ; les avis lint existants ne sont pas masqués.
- [Moteur/backend CI `40127445594`](https://github.com/sgramtinne-code/atoutia/actions/runs/40127445594) : réussi, typechecks, **583 moteur / 617 backend**, builds et CLI SQLite synthétiques. Aucun code de ces paquets n’a changé.

Le workflow `.github/workflows/android-ui.yml` lance uniquement ces quatre fixtures UI dans une ComponentActivity vide : aucun backend, compte, stockage d’authentification ou vraie base. Il exige explicitement OK (4 tests), pas le seul code retour ADB. Les premiers essais n’avaient pas atteint les fixtures : créateur AVD et émulateur utilisaient des chemins divergents, corrigés par ANDROID_USER_HOME/ANDROID_AVD_HOME communs sous RUNNER_TEMP et vérification ini/liste avant démarrage (`9a2b367`). KVM limité au runner, SwiftShader, ressources/durées bornées, détection de processus arrêté, diagnostic/arrêt ADB bornés et annulation possible. Actions officielles épinglées, permissions lecture, persist-credentials false, aucun pull_request_target. Actionlint, blocs bash, liens locaux et diff vérifiés. Aucun SDK/émulateur local de l’assistant ni essai téléphone physique revendiqué.

**État PC clôturé :** l’installation et la visibilité sont confirmées par la première capture ; la suite du journal N/O et la nouvelle capture attestent maintenant plusieurs actions Android acceptées suivies des coups PNJ et la poursuite de la partie. Le contrôle restant est reçu : ne pas le redemander. Voir la clôture ci-dessous ; les détails de jeu et captures restent privés. La PR peut être intégrée après les CI du dernier commit et vérification de son statut GitHub.


## Premier retour PC sur la visibilité et rôle d’Actualiser

Le développeur confirme « c’est ok » après récupération de **`c2f5981`**, build/install par le lanceur N/O, et transmet une capture privée du nouvel écran. Le bandeau compact, le retour et la main complète sont visibles sans défilement : installation et rendu réel du correctif sont confirmés. Le journal transmis s’arrête à ATTENTE DU NOUVEAU SALON ; la vue montre une partie restaurée avec les autres joueurs absents. Ne pas inventer une nouvelle détection, une action locale acceptée ou une progression PNJ à partir de cet extrait, ni publier la capture ou ses détails de jeu. Ne pas refaire le build ou les quatre tests isolés pour redemander la visibilité déjà acquise. Le contrôle restant avant clôture est seulement la carte locale/progression PNJ lorsque le nouveau salon est créé avec le lanceur actif ; aucun nouveau scénario réseau/authentification ou match complet.

À la question sur **Actualiser la partie**, lecture du code : le callback recharge le snapshot joueur par HTTP authentifié et applique seulement une révision non obsolète. Les révisions WebSocket déclenchent déjà ce rechargement automatiquement ; un polling HTTP de secours existe uniquement en mode WAIT (5 secondes, recul jusqu’à 15 secondes après échec), pas en BID/PLAY_CARD. Les incidents de connexion du client temps réel ne sont actuellement pas exposés comme état de synchronisation dans l’écran. Le bouton reste donc un recours manuel utile ; il ne reconnecte pas les autres joueurs et ne relance pas les PNJ. Décision pour cette livraison : le conserver, aucune modification applicative supplémentaire sur une simple question d’utilité. Évolution suivante proposée : état de synchronisation explicite et action contextuelle Réessayer en cas d’erreur, avant de retirer le gros bouton permanent. Éviter de simplement masquer le seul recours sans remplacer ce comportement. Le présent point est documentaire, sans nouveau test applicatif local revendiqué.

Les trois CI de `c2f5981`, récupéré sur le PC, sont maintenant confirmées réussies : moteur/backend `40127824583`, Android Kotlin `40127824537`, Android UI `40127824661` / job `120972943203`, **OK (4 tests)** réellement exécutés. Le présent ajout ne change que la documentation ; vérifier les contrôles du prochain commit avant fusion.


## Clôture des validations paysage — PR nº 9

Le développeur fournit la suite du même essai WSL/ADB Windows sur **`c2f5981`** (correctif applicatif **`8ed63bf`**) : nouveau salon détecté par le lanceur **N/O**, trois PNJ connectés, 4/4 puis démarrage manuel. Le journal montre ensuite plusieurs actions Android acceptées suivies des coups PNJ et le passage à une donne suivante. La nouvelle capture privée correspond à l’état avancé du journal : main complète visible sans défilement, carte autorisée mise en évidence, bandeau compact et retour disponibles, joueurs connectés. Le contrôle fonctionnel manquant est donc reçu. Aucun identifiant, carte, score, révision de partie réelle, capture ou journal brut n’est publié.

Les validations requises du périmètre PR nº 9 sont réunies : reproduction des trois échecs UI avant correction, quatre fixtures instrumentées réellement réussies après correction sur AVD CI, **209 JVM**, APK debug/instrumenté et lint réussis (**12 avertissements, une suggestion**), **583 moteur / 617 backend**, typechecks/builds/CLI synthétiques ; installation réelle WSL/ADB, main visible et jeu manuel Android avec progression des trois PNJ. Ne pas refaire le build, les quatre fixtures, une partie complète, Keystore/Google ou les coupures réseau pour redemander cette preuve. Le bouton Actualiser reste un secours HTTP dans cette livraison. Aucun essai téléphone physique, revue exhaustive Android ou release production n’est revendiqué.

Les trois CI du dernier jalon documentaire **`c86fbd8`** sont confirmées réussies : moteur/backend **`40128174978`**, Android Kotlin **`40128174997`**, Android UI **`40128174985`**. Vérifier aussi les trois contrôles du commit de clôture avant fusion. Ce point ne modifie aucun code applicatif ; liens, blocs bash et diff documentaire sont vérifiés.

Prochaine action : contrôler les CI de cette clôture, rendre la PR nº 9 prête puis fusionner avec vérification du SHA attendu ; vérifier ensuite le statut GitHub, main et ses CI, et fournir le retour complet sur main. La fusion n’est pas annoncée par avance dans ce document : le statut GitHub fait foi, sans PR supplémentaire pour inscrire son propre SHA de fusion. Après intégration, poursuivre séparément la synchronisation visible (connexion/reprise/erreur et Réessayer contextuel), puis la revue des callbacks, parseurs et sauvegardes/DataExtractionRules. Préserver le secours manuel tant que son remplacement n’est pas testé, sensorLandscape, les sessions et la vraie base. Les anciennes mentions de contrôle PNJ manquant décrivent un état désormais clôturé par ce retour.


## Synchronisation de partie — étape suivante après PR nº 9

Le développeur a récupéré main **`c0df76e`** proprement. La PR nº 9 est fusionnée et clôturée pour son périmètre ; les trois CI de push main `40128870733`, `40128870756`, `40128870943` sont réussies (quatre fixtures UI réellement exécutées, 209 JVM, APK/lint et moteur/backend). Ne pas refaire ces validations ni les anciens scénarios d’authentification, SQLite ou fin de match.

Nouvelle branche **`feat/android-game-sync-status`**, depuis ce main vérifié. Proposition : états Connexion, En direct, Reconnexion, Connexion perturbée, Actualisation impossible et mise à jour en retard ; action **Réessayer** seulement lorsqu’un incident ou un échec justifie une reprise. Le bouton permanent Actualiser est remplacé par ce recours contextuel. Un succès HTTP ne doit pas annoncer que la liaison WebSocket a repris ; une simple ouverture du transport ne suffit pas non plus, il faut une indication SNAPSHOT valide pour le bon salon. La présence des joueurs est une information serveur distincte.

La reprise HTTP doit rester disponible pendant BID/PLAY_CARD en cas de difficulté ou révision non appliquée, en plus du polling WAIT existant ; intervalle initial cinq secondes, recul borné à quinze après échec. Une seule lecture HTTP par écran à la fois, partagée entre révision, timer et clic, invalidée à la sortie d’écran. Les callbacks de synchronisation tardifs sont ignorés hors de cette partie ; une lecture ne doit ni effacer une soumission en cours ni remplacer un état par une révision antérieure. La reconnexion/heartbeat existants restent ceux de la PR nº 8. Aucun changement moteur/backend, protocole, sessions/tokens, persistance, orientation ou placements de cartes.

Onze tests JVM sont ajoutés : états après transport/ouverture/SNAPSHOT valide, fermeture normale, vieux socket, callback tardif, observateur en erreur/fermeture ; polling pendant le tour local, état HTTP distinct du transport, exclusion des lectures simultanées et invalidation à la sortie. Les quatre fixtures UI existantes sont conservées ; trois nouveaux cas couvrent absence du gros bouton au repos, Réessayer contextuel et désactivé pendant chargement/soumission, et main fixe lors de reconnexion/reprise. Le job UI exige désormais explicitement **OK (7 tests)**. Aucune exécution ou réussite de ces nouveaux tests n’est encore revendiquée ; vérifier les CI avant présentation comme correction validée.

Prochaine action : compiler/JVM/lint et exécuter les sept fixtures sur AVD CI, corriger les échecs éventuels ; ouvrir/maintenir une PR en brouillon. Puis recevoir un essai ciblé N/O + relais Android c/r montrant les nouveaux états, Réessayer et reprise automatique avec une carte acceptée/progression PNJ. Pas de nouvelle partie complète, Keystore/Google ou purge ; vraie base et captures restent privées. Procédure et limites : docs/ANDROID_SYNC.md. Ne pas fusionner sans résultats nécessaires.


## Premier contrôle CI de synchronisation réussi

Le code **`54e81d8`**, [PR nº 10](https://github.com/sgramtinne-code/atoutia/pull/10), passe les trois CI : Android Kotlin **`40129990363`** / job **`120979459310`**, **220/220 JVM** (onze nouveaux), deux APK et lint réussis (**12 avertissements et une suggestion**) ; Android UI **`40129990352`** / job **`120979459477`**, **OK (7 tests)** réellement exécutés sur AVD ; moteur/backend **`40129990273`** réussi. Les données sont synthétiques ; aucun résultat PC de cette nouvelle étape n’est encore reçu.

Le dernier cas UI est renforcé pour déclencher une coupure après défilement jusqu’à Passer : un incident doit révéler le retour de synchronisation au lieu de le laisser hors champ. La zone des commandes revient donc au début lors de l’apparition du recours ou du retour à l’état sain ; la main fixe ne défile pas. Même total de sept fixtures, contrôles du nouveau commit à vérifier. Le polling sain n’entraîne pas ce repositionnement ni une annonce répétée d’actualisation à chaque lecture de fond. La PR reste en brouillon jusqu’au contrôle final CI et à l’essai ciblé WSL/émulateur de docs/ANDROID_SYNC.md ; aucune fusion ni validation réseau réelle de cette étape annoncée.
