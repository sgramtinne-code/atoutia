# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 24 octobre 2026

Travail actuel : [PR nº 7](https://github.com/sgramtinne-code/atoutia/pull/7), revue Android et correction de la concurrence des sessions, depuis `main` `5e267e3`. Voir [le bilan Android et ses limites](docs/ANDROID_REVIEW.md). Les livraisons SQLite et la CI moteur/backend ci-dessous sont acquises ; elles ne prouvent pas une validation Android.

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

Créer ensuite un **nouveau** salon dans Android, copier son identifiant et utiliser le remplissage existant depuis la racine du dépôt :

```bash
read -r -p "Identifiant du nouveau salon (ms1_...) : " ROOM_SESSION_ID
node apps/backend/scripts/dev-autoplay-room.mjs "$ROOM_SESSION_ID" --android-player-0
```

À **4/4**, démarrer manuellement et jouer PLAYER_0. Fermer puis relancer Android pendant la partie pour vérifier la restauration ; garder backend et PNJ actifs. Terminer puis consulter le résultat et l’historique. Conserver les sorties utiles sans tokens ni inventaire local. Cette variante utilise la même logique PNJ que le lanceur global, avec l’installation Windows explicitement convertie déjà vérifiée ; aucun script ni comportement applicatif n’est modifié par cette étape documentaire. Les résultats fonctionnels restent à recevoir et la PR reste en brouillon.

### Connexion Google jusqu’à l’accueil observée

Le 24 octobre 2026, le développeur a récupéré la branche jusqu’à `13be59e`, construit le debug avec Client ID Google et autoplay false (**BUILD SUCCESSFUL**, puis seconde exécution à jour), installé et lancé l’application avec succès. Le journal serveur annonce ensuite HTTP/WebSocket sur loopback, Google et bootstrap activés. Le `curl` en échec dans le journal précédait ce démarrage ; aucun nouvel échec réseau après démarrage n’a été transmis.

Les captures montrent le sélecteur Google puis l’accueil authentifié en paysage. Ce constat valide visuellement l’aboutissement de cette connexion ; il ne prouve pas encore la déconnexion, le maintien déconnecté après redémarrage, le refresh après expiration ou une partie restaurée. Les captures et comptes qu’elles affichent restent hors du dépôt public.

L’accueil est déjà défilant : glisser le contenu vers le haut au milieu de l’écran permet d’atteindre **Historique**, **Paramètres** et **Se déconnecter** sous les boutons initialement visibles. Continuer avec l’installation actuelle et garder le backend ouvert : se déconnecter, fermer/relancer pour vérifier l’écran déconnecté, se reconnecter, attendre 16 minutes sur l’accueil puis ouvrir Historique sans nouvelle demande Google. Les tests de partie avec trois PNJ viennent ensuite ; la PR nº 7 reste en brouillon.

La capture suivante confirme le défilement de l’accueil : Historique, Paramètres et Se déconnecter sont visibles. Le message « Le profil joueur arrive prochainement. » correspond à l’action de profil encore prévue ; ce n’est pas une erreur d’authentification. Les captures suivantes montrent un écran déconnecté puis l’accueil et l’historique chargé ; le redémarrage entre les deux vues déconnectées et le délai de 16 minutes restent à confirmer.

### Écran déconnecté puis historique chargé observés

Le 24 octobre 2026, de nouvelles captures de l’émulateur montrent deux vues « Aucune session Atoutia », puis l’accueil authentifié et un historique effectivement chargé avec du contenu persistant. Les scores, dates et captures brutes restent privés. L’ouverture de l’historique authentifié est donc observée ; ces images ne permettent pas de confirmer le force-stop entre les deux premières vues ni l’attente de 16 minutes après la dernière connexion Google. Ne pas présenter le renouvellement automatique comme validé sur cette seule base.

« Backend non testé » représente l’état initial du bouton de test manuel de santé ; ce libellé ne signale pas une panne. Prochaine action : recevoir la confirmation du redémarrage et du délai depuis la dernière connexion Google. Si l’attente n’a pas été faite, revenir à l’accueil, garder backend et application ouverts 16 minutes, puis rouvrir Historique sans nouvelle demande Google. Les validations Keystore et l’accès initial à l’historique restent acquis ; les essais PNJ et restauration de partie restent à faire, PR nº 7 en brouillon.
