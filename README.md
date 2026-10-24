# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 24 octobre 2026

Le dernier commit applicatif stable vérifié sur `main` est [`db0d727`](https://github.com/sgramtinne-code/atoutia/commit/db0d727a37bff7d37a40fe65a9e36e108161964a), `feat: track live room activity timestamps` (7 octobre 2026). La PR documentaire nº 1 a ensuite été fusionnée dans `4109cec`. La branche `feat/live-room-expiration-dry-run` propose maintenant le diagnostic décrit ci-dessous, sans modifier le démarrage du serveur.

Fonctionnalités déjà développées : authentification Google et sessions, salons et placement des joueurs, enchères, jeu des cartes, table Compose paysage, présence WebSocket et reconnexion, gestion des absences selon le mode, bots de test, persistance SQLite, résultats durables, historique, restauration Android et navigation après partie.

Le nettoyage au démarrage des salons terminés conserve leurs résultats durables. Les documents des salons contiennent `createdAtMs` et `lastActivityAtMs`, avec compatibilité des anciens documents au format 1.

Validation historique transmise par le développeur pour `db0d727` : 67 fichiers de tests réussis, 525 tests réussis sur 525, typecheck backend, builds moteur et backend, et `git diff --check` propres. Ces contrôles ne sont pas une nouvelle exécution au 24 octobre.

Nouvelle étape proposée : **classification prudente et en lecture seule des salons potentiellement abandonnés**. Le diagnostic SQLite est une commande manuelle séparée ; il ne démarre pas le backend, ne migre aucun timestamp et ne supprime rien. Les places occupées sont protégées si leur présence est inconnue. Aucune expiration automatique n'est activée. Ne pas purger la base réelle.

Voir [le diagnostic et sa validation sur données synthétiques](docs/ROOM_LIFECYCLE.md). La validation WSL du développeur reste nécessaire avant fusion de cette branche ; Android et la base réelle n'ont pas été testés à distance.

Validation distante du 24 octobre 2026 (Node.js 24.22.1, pnpm 12.3.4) : **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, dont **55 nouveaux tests ciblés** ; typechecks et builds des deux paquets réussis, scénario CLI synthétique réussi avec empreinte SQLite inchangée, `git diff --check` propre. Ces résultats concernent l’environnement distant, pas le PC du développeur. Validation WSL toujours attendue avant fusion.

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

Sur la branche `feat/live-room-expiration-dry-run`, après récupération et installation, exécuter dans l'ordre et s'arrêter au premier échec :

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
