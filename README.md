# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 30 octobre 2026

**Cap PNJ confirmé :** les millions de parties sont prévus plus tard pour l'entraînement local sur le PC NVIDIA RTX 5070, afin de créer des PNJ aux styles et niveaux variés, amusants et distrayants. Ils ne bloquent ni le solo offline ni la publication. Les simulations de la PR nº 18 sont des tests de moteur, sans entraînement. [Feuille de route IA](docs/AI_LAB_ROADMAP.md).

Base vérifiée : main **5dde517**, [PR nº 27](https://github.com/sgramtinne-code/atoutia/pull/27) fusionnée. Les invitations privées copier/partager/coller avec jonction explicite sont livrées. Trois CI de push main conclues success : [moteur/backend 41109870194](https://github.com/sgramtinne-code/atoutia/actions/runs/41109870194) (**601 moteur/620 backend/26 offline**), [Kotlin 41109870153](https://github.com/sgramtinne-code/atoutia/actions/runs/41109870153) (**264 JVM**, deux APK, lint **13 avertissements/1 suggestion**), [AVD 41109870354](https://github.com/sgramtinne-code/atoutia/actions/runs/41109870354) (**49/49 instrumentés**). Fusion, arbre et preuves main consignés dans la PR ; les anciennes attentes PR20–27 sont historiques et clôturées.

Lot courant **feat/android-release-endpoint** : rendre configurable l’origine HTTPS du backend dans un build Android release, via la propriété Gradle ATOUTIA_RELEASE_API_BASE_URL, sinon la variable d’environnement du même nom. Sans valeur, l’URL reste vide et le solo reste accessible ; le debug garde son serveur local. Une valeur renseignée doit être une origine https:// absolue, sans identifiants, chemin autre que /, paramètres ou fragment, avec un port valide. Une barre finale est normalisée. Aucun domaine réel choisi ou contacté, aucune signature ou publication, aucun déploiement implicite. Voir [la configuration release](docs/ANDROID_RELEASE_CONFIG.md).

Le script CI scripts/check-release-config.sh vérifie le BuildConfig réellement généré : configuration vide, repli environnement, priorité de la propriété, neuf rejets de valeurs invalides et autoplay toujours désactivé en release. Il compile ensuite un APK release non signé vers une origine synthétique .test et contrôle le manifeste fusionné (HTTP clair/debug interdits, backup et sensorLandscape conservés). Les suites debug, les 49 instrumentés et les nouveaux contrôles Gradle/APK sont réussis dans les journaux publics du code 65f5450. Aucun SDK Android local assistant. Moteur, backend, PNJ, protocole et sauvegardes inchangés.

Code **65f5450** de la [PR nº 28](https://github.com/sgramtinne-code/atoutia/pull/28) : [moteur/backend 41112884393](https://github.com/sgramtinne-code/atoutia/actions/runs/41112884393), job **124259513968**, **601 moteur/620 backend/26 offline**, typechecks/builds/bundle et scénarios synthétiques réussis ; [Kotlin/release 41112884438](https://github.com/sgramtinne-code/atoutia/actions/runs/41112884438), job **124259513706**, **264 JVM sans échec/erreur/ignoré**, APK debug/instrumenté et **release non signé** compilés, lint **13 avertissements/1 suggestion** conservés ; [AVD 41112884409](https://github.com/sgramtinne-code/atoutia/actions/runs/41112884409), job **124259513875**, **49/49 instrumentés debug API36** (9+3+7+5+3+5+4+3+4+6). Les trois lectures du vrai BuildConfig release et les neuf rejets sont réussis ; le manifeste release vérifie HTTP clair/debug interdits, backup false et sensorLandscape. Aucun test d’exécution de l’APK release sur appareil revendiqué. Bundle solo inchangé **6e83cc765603d43c8a1307b3ba9b4bcb69b6b459c562dc25b1842b90351c2650**. Les trois workflows du code sont conclus success ; vérifier aussi les trois CI du dernier commit de clôture avant intégration.

Clôture documentaire : sources, tests, script CI, workflow et bundle identiques à 65f5450. Lire le suivi ANDROID_RELEASE_CONFIG pour les commandes et limites. Vérifier les CI du dernier commit de la PR avant intégration avec SHA attendu, puis PR/main/arbre et CI de push ; consigner la fusion dans la PR sans commit destiné à son propre SHA. La connexion entre amis demande encore une origine de serveur réellement joignable en HTTPS, sa configuration/auth de production et une distribution signée. Les observations issues d’appareils/captures/journaux restent privées ; ne publier que code, fixtures et preuves CI publiques. Aucun nouveau match complet ou audit de la vraie SQLite requis pour ce lot. L’IA Lab RTX5070 reste ultérieur.

**[Bilan global et feuille de route ATOUTIA](docs/PROJECT_STATUS.md)** : rapprochement des 50 rubriques de règles et 19 rubriques de l’ancien prompt avec le code actuel. Le multijoueur local est jouable ; premier solo offline intégré par la PR nº 20, enrichissements solo/fonctions utilisateur et diffusion publique restent à terminer ; l’entraînement IA massif est une étape ultérieure. Le hors-ligne est une exigence, pas une option abandonnée.

## Architecture et fonctionnalités

- `packages/belote-engine` : règles classiques, commandes et actions légales, score, litige versionné, replay déterministe et simulations bornées.
- `apps/backend` : authentification Google/sessions, autorité sur les salons et parties, places, HTTP/WebSocket, présences et absences selon le mode, SQLite et résultats durables, historique authentifié.
- `packages/offline-game` : même moteur pour le solo local, politiques PNJ versionnées et bundle Android contrôlé.
- `apps/android` : Kotlin/Compose en sensorLandscape, parties et reprise online, solo hors connexion avec reprise AtomicFile, statistiques, profil, paramètres, tutoriel et styles PNJ. Le choix des modes reste accessible depuis les états de connexion ou d’erreur online.

Le solo et les simulations actuels n’entraînent aucun modèle. La feuille de route IA vise ultérieurement des PNJ amusants aux styles et niveaux variés. La version documentaire des règles est 0.1.3 ; elle est distincte de la version du paquet moteur et de la version des règles enregistrée dans chaque replay.

## Développement local

Prérequis : Node.js 24, pnpm selon `packageManager` dans package.json, Java 17 et Android SDK pour les builds Android. Installer les dépendances à partir du lockfile :

```bash
cd /home/morpheus/projects/atoutia &&
pnpm install --frozen-lockfile &&
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build
```

Le backend local écoute sur 127.0.0.1:3000. Vérifier `/health` avant de lancer un deuxième serveur. Si le port est occupé, identifier le processus et son répertoire ; aucun arrêt global ou aveugle. Le bootstrap est réservé aux tests locaux et doit rester désactivé en production. Ne pas écraser la vraie SQLite ni lancer de purge pour un essai Android.

Le lanceur multijoueur construit avec --no-daemon --max-workers=2, installe -r, configure le reverse ADB et attend un nouveau salon :

```bash
cd /home/morpheus/projects/atoutia &&
ATOUTIA_ADB="/mnt/c/Users/drupy/AppData/Local/Android/Sdk/platform-tools/adb.exe" \
node apps/backend/scripts/dev-android-room.mjs
```

Répondre N pour PLAYER_0 manuel. Pour un essai de jeu à quatre, répondre O aux trois PNJ ; attendre ATTENTE DU NOUVEAU SALON avant de créer, puis 4/4 avant Démarrer. Pour les invitations de ce lot, répondre **N aux trois PNJ** afin de conserver des places libres. [Procédure ciblée](docs/ANDROID_ROOM_INVITATIONS.md). Aucun match complet, compte réinitialisé ou audit de vraie base requis pour ces boutons.

## Validation et données

Les trois workflows GitHub vérifient moteur/backend, JVM/APK/lint et scénarios Android isolés sur émulateur. Consulter les exécutions du dernier commit de la PR avant fusion, puis celles du push main. Les preuves de code du lot courant sont indiquées en tête ; ce ne sont pas des observations d’un téléphone physique ni une validation de publication.

Utiliser des identifiants/comptes synthétiques dans les tests. Ne publier aucune base, sauvegarde, token, invitation réelle, capture ou journal privé. Les diagnostics SQLite sont séparés du serveur et ouverts en lecture seule sur une copie isolée ; aucune suppression automatique de salons abandonnés n’est activée par ces outils.

## Documentation

- [Bilan global et feuille de route](docs/PROJECT_STATUS.md) — exigences initiales, fonctions livrées, écarts et suite produit.
- [Reprise du projet](docs/REPRISE.md) et [directives de travail](AGENTS.md).
- [Règles canoniques](docs/GAME_RULES.md), [décisions MVP](docs/RULES_VALIDATION.md), [litige et compatibilité](docs/LITIGE_RULES_VERSION.md), [simulations](docs/ENGINE_SIMULATION.md).
- [Revue Android](docs/ANDROID_REVIEW.md), [paysage](docs/ANDROID_LANDSCAPE.md), [synchronisation](docs/ANDROID_SYNC.md), [backup](docs/ANDROID_BACKUP.md).
- [Solo hors ligne](docs/ANDROID_OFFLINE.md), [statistiques](docs/ANDROID_OFFLINE_STATS.md), [profil](docs/ANDROID_SOLO_PROFILE.md), [paramètres et tutoriel](docs/ANDROID_SOLO_SETTINGS_TUTORIAL.md), [styles PNJ](docs/OFFLINE_BOT_STYLES.md).
- [Configuration release HTTPS](docs/ANDROID_RELEASE_CONFIG.md), [invitations privées](docs/ANDROID_ROOM_INVITATIONS.md), [cycle de vie des salons](docs/ROOM_LIFECYCLE.md), [IA Lab futur](docs/AI_LAB_ROADMAP.md).

Ce README présente les fonctions et les preuves publiques. Les anciens comptes rendus issus de captures et journaux PC ne sont pas repris dans cette version.
