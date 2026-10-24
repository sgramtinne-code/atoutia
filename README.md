# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 24 octobre 2026

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
