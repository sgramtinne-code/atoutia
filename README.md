# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 8 novembre 2026

**Cap PNJ.** Entraîner sur RTX 5070 un ensemble de joueurs de belote avec des styles cohérents et des niveaux mesurés. Faire varier les tables et donner à chaque personnage de courtes répliques contextuelles, désactivables. Faire grandir les campagnes locales selon les progrès et les limites mesurées. Android exécute les politiques retenues en solo hors ligne. [Feuille de route IA](docs/AI_LAB_ROADMAP.md).

**Priorité révisée par le développeur le 30 octobre : reporter le déploiement OVH.** Poursuivre le multijoueur Android, la lisibilité et l’ergonomie pour les personnes âgées. L’entraînement des PNJ sur la RTX 5070 est en pause. Les millions de parties restent un sujet d’apprentissage, sans campagne massive dans la CI. Cette décision remplace l’ancien ordre qui plaçait l’IA après la bêta/diffusion. Ne pas demander de diagnostic VPS, créer de DNS ou reprendre OVH dans ce lot.

Base vérifiée **6543403**, [PR visuelle nº 29](https://github.com/sgramtinne-code/atoutia/pull/29) fusionnée. Contrôles de `main` réussis avec 601/620/26 tests moteur/backend/offline, 266 JVM et 52 tests sur émulateur. Les preuves et rendus synthétiques sont détaillés dans la PR et dans [le suivi visuel](docs/ANDROID_VISUAL_IDENTITY.md). Les anciens lots PR20–29 sont intégrés.

Le banc de la règle du dernier joueur est intégré à `main` en **e739508** ([PR nº 45](https://github.com/sgramtinne-code/atoutia/pull/45)). Les travaux d’apprentissage des PNJ sont en pause. La priorité est la [partie Android à quatre avec coupure et reprise](#essai-android-à-quatre-avec-coupure).

**[Bilan global et feuille de route ATOUTIA](docs/PROJECT_STATUS.md)** : rapprochement des 50 rubriques de règles et 19 rubriques de l’ancien prompt avec le code actuel. Le multijoueur local est jouable ; premier solo offline intégré par la PR nº 20, enrichissements solo/fonctions utilisateur et diffusion publique restent à terminer ; le chantier Android est prioritaire. Le hors-ligne est une exigence, pas une option abandonnée.

## Architecture et fonctionnalités

- `packages/belote-engine` : règles classiques, commandes et actions légales, score, litige versionné, replay déterministe et simulations bornées.
- `apps/backend` : authentification Google/sessions, autorité sur les salons et parties, places, HTTP/WebSocket, présences et absences selon le mode, SQLite et résultats durables, historique authentifié.
- `packages/offline-game` : même moteur pour le solo local, politiques PNJ versionnées et bundle Android contrôlé.
- `apps/android` : Kotlin/Compose en sensorLandscape, parties et reprise online, solo hors connexion avec reprise AtomicFile, statistiques, profil, paramètres, tutoriel et styles PNJ. Le choix des modes reste accessible depuis les états de connexion ou d’erreur online.

Le solo utilise les politiques PNJ intégrées. La feuille de route IA conserve les futurs travaux sur les styles et les niveaux. La version documentaire des règles est 0.1.3 ; elle est distincte de la version du paquet moteur et de la version des règles enregistrée dans chaque replay.

## Développement local

Prérequis : Node.js 24, pnpm selon `packageManager` dans package.json, Java 17 et Android SDK pour les builds Android. Installer les dépendances à partir du lockfile :

```bash
cd /home/morpheus/projects/atoutia &&
pnpm install --frozen-lockfile &&
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build
```

Le backend local écoute sur 127.0.0.1:3000. Vérifier `/health` avant de lancer un deuxième serveur. Si le port est occupé, identifier le processus et son répertoire ; aucun arrêt global ou aveugle. Le bootstrap est réservé aux tests locaux et doit rester désactivé en production. Ne pas écraser la vraie SQLite ni lancer de purge pour un essai Android.

Pour tester les invitations avec des places libres, suivre la [procédure dédiée](docs/ANDROID_ROOM_INVITATIONS.md).

### Essai Android à quatre avec coupure

Démarrer un seul émulateur. Libérer le port 3000 en arrêtant, dans son propre terminal, un éventuel backend ATOUTIA déjà lancé. Utiliser une base de test dédiée. La commande reprend le Client ID Web Google par défaut du lanceur.

**Terminal 1 · Backend de test**

```bash
cd "$HOME/projects/atoutia" &&
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build &&
mkdir -p logs/android-reconnect-test &&
HOST=127.0.0.1 PORT=3000 ATOUTIA_AUTH_BOOTSTRAP_ENABLED=true \
ATOUTIA_DATABASE_PATH="$PWD/logs/android-reconnect-test/atoutia.sqlite" \
ATOUTIA_GOOGLE_CLIENT_ID="762107394725-hm57vr8pmccle3j8amhsrgp46hpd8i7k.apps.googleusercontent.com" \
pnpm --filter @atoutia/backend start
```

**Terminal 2 · Installation et PNJ**

```bash
cd "$HOME/projects/atoutia" &&
curl -fsS http://127.0.0.1:3000/health &&
ATOUTIA_DATABASE_PATH="$PWD/logs/android-reconnect-test/atoutia.sqlite" \
node apps/backend/scripts/dev-android-room.mjs
```

Répondre **N**, puis **O**. Attendre `ATTENTE DU NOUVEAU SALON` avant de passer au terminal 3.

**Terminal 3 · Coupure de transport**

Remplacer le chemin ADB d’exemple par celui de l’installation Windows.

```bash
cd "$HOME/projects/atoutia" &&
ATOUTIA_ADB="/mnt/c/Users/COMPTE_WINDOWS/AppData/Local/Android/Sdk/platform-tools/adb.exe" \
node apps/backend/scripts/dev-android-network.mjs
```

1. Une fois le relais ouvert, revenir à l’accueil si une ancienne partie est affichée. Se connecter si l’application le demande, puis choisir **Jouer en ligne → Jouer → Créer une partie**. Attendre **4/4** et démarrer.
2. Jouer une carte, puis attendre **À vous de jouer** et **En direct**. Taper **s** dans le terminal 3. Lorsque `TCP actives` vaut au moins 1, taper **c** et vérifier qu’au moins une connexion a été fermée. Attendre dix secondes, puis taper **r**.
3. Laisser l’écran de jeu ouvert pendant 30 secondes sans appuyer sur **Réessayer**. Noter si **En direct** revient dans ce délai. Si l’écran reste en reconnexion, appuyer sur **Réessayer** et vérifier la reprise manuelle. Vérifier le score et la main, puis jouer une carte et vérifier que la révision avance et que les PNJ poursuivent la partie.
4. Garder les terminaux ouverts et terminer la partie. Ouvrir **Historique** depuis l’écran du résultat et vérifier qu’une seule entrée correspond au résultat final. Taper **q** dans le terminal 3 pour restaurer le reverse direct, puis arrêter le backend de test avec **Ctrl+C** dans le terminal 1.

## Validation et données

Les trois workflows GitHub vérifient moteur/backend, JVM/APK/lint et scénarios Android isolés sur émulateur. Consulter les exécutions du dernier commit de la PR avant fusion, puis celles du push main. Les preuves de code du lot courant sont indiquées en tête ; ce ne sont pas des observations d’un téléphone physique ni une validation de publication.

Utiliser des identifiants/comptes synthétiques dans les tests. Ne publier aucune base, sauvegarde, token, invitation réelle, capture ou journal privé. Les diagnostics SQLite sont séparés du serveur et ouverts en lecture seule sur une copie isolée ; aucune suppression automatique de salons abandonnés n’est activée par ces outils.

## Documentation

- [Bilan global et feuille de route](docs/PROJECT_STATUS.md) — exigences initiales, fonctions livrées, écarts et suite produit.
- [Reprise du projet](docs/REPRISE.md) et [directives de travail](AGENTS.md).
- [Règles canoniques](docs/GAME_RULES.md), [décisions MVP](docs/RULES_VALIDATION.md), [litige et compatibilité](docs/LITIGE_RULES_VERSION.md), [simulations](docs/ENGINE_SIMULATION.md).
- [Revue Android](docs/ANDROID_REVIEW.md), [paysage](docs/ANDROID_LANDSCAPE.md), [synchronisation](docs/ANDROID_SYNC.md), [backup](docs/ANDROID_BACKUP.md).
- [Solo hors ligne](docs/ANDROID_OFFLINE.md), [statistiques](docs/ANDROID_OFFLINE_STATS.md), [profil](docs/ANDROID_SOLO_PROFILE.md), [paramètres et tutoriel](docs/ANDROID_SOLO_SETTINGS_TUTORIAL.md), [styles PNJ](docs/OFFLINE_BOT_STYLES.md).
- [Identité visuelle et lisibilité](docs/ANDROID_VISUAL_IDENTITY.md), [configuration release HTTPS](docs/ANDROID_RELEASE_CONFIG.md), [invitations privées](docs/ANDROID_ROOM_INVITATIONS.md), [cycle de vie des salons](docs/ROOM_LIFECYCLE.md), [IA Lab RTX 5070](docs/AI_LAB_ROADMAP.md).

Ce README présente les fonctions et les preuves publiques. Les anciens comptes rendus issus de captures et journaux PC ne sont pas repris dans cette version.
