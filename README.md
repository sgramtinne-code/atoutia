# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 30 octobre 2026

**Cap PNJ confirmé :** les millions de parties sont prévus plus tard pour l'entraînement local sur le PC NVIDIA RTX 5070, afin de créer des PNJ aux styles et niveaux variés, amusants et distrayants. Ils concernent l’apprentissage, sans bloquer rétroactivement le solo livré ; le chantier IA est maintenant prioritaire avant la reprise du déploiement. Les simulations de la PR nº 18 sont des tests de moteur, sans entraînement. [Feuille de route IA](docs/AI_LAB_ROADMAP.md).

**Priorité révisée par le développeur le 30 octobre : reporter le déploiement OVH.** Travailler d’abord le look professionnel, la lisibilité et l’ergonomie pour les personnes âgées, puis préparer/exécuter l’entraînement des PNJ sur la RTX 5070 avant de reprendre le déploiement. Les millions de parties restent un sujet d’apprentissage, sans campagne massive dans la CI. Cette décision remplace l’ancien ordre qui plaçait l’IA après la bêta/diffusion. Ne pas demander de diagnostic VPS, créer de DNS ou reprendre OVH dans ce lot.

Base vérifiée : main **d31556b**, [PR nº 28](https://github.com/sgramtinne-code/atoutia/pull/28) fusionnée. Configuration HTTPS release livrée, trois CI main réussies : [moteur/backend 41115572087](https://github.com/sgramtinne-code/atoutia/actions/runs/41115572087) (**601/620/26**), [Kotlin/release 41115572208](https://github.com/sgramtinne-code/atoutia/actions/runs/41115572208) (**264 JVM**, trois APK dont release non signé, lint **13 avertissements/1 suggestion**, contrôles de configuration et manifeste), [AVD 41115571977](https://github.com/sgramtinne-code/atoutia/actions/runs/41115571977) (**49/49**). Les anciennes attentes PR20–28 sont historiques et clôturées.

Lot courant **feat/visual-identity-accessibility** : premier socle visuel natif, palette bleu nuit/vert/ivoire/or, variantes clair/sombre, typographie plus lisible et accueil remanié. Commandes principales séparées, cibles au-delà de 48 dp, très grand texte respecté avec repli vertical/défilement. Cartes sur papier clair dans les deux thèmes, sans transparence des cartes indisponibles, enseignes typographiques et noms/états accessibles. Aucun moteur, PNJ, format de sauvegarde, préférence ou compte modifié. Voir [le suivi visuel](docs/ANDROID_VISUAL_IDENTITY.md) et [l’IA Lab](docs/AI_LAB_ROADMAP.md).

Deux JVM de contraste et trois nouveaux AVD ajoutés ; les 49 instrumentés antérieurs restent requis. La CI produit des PNG synthétiques de l’accueil et des cartes pour inspection avant fusion, avec upload-artifact v7.0.2 épinglé au commit officiel cf430e030ddbb5b0abf93d22962f4752f3646cd9. Ces images ne proviennent d’aucun appareil, compte ou partie réel. Résultats et rendus à vérifier avant intégration ; ne pas présenter ce premier lot comme une refonte complète ou une certification d’accessibilité. Les preuves de fusion/main seront dans la PR, sans commit destiné à inscrire son propre SHA.

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
- [Identité visuelle et lisibilité](docs/ANDROID_VISUAL_IDENTITY.md), [configuration release HTTPS](docs/ANDROID_RELEASE_CONFIG.md), [invitations privées](docs/ANDROID_ROOM_INVITATIONS.md), [cycle de vie des salons](docs/ROOM_LIFECYCLE.md), [IA Lab RTX 5070](docs/AI_LAB_ROADMAP.md).

Ce README présente les fonctions et les preuves publiques. Les anciens comptes rendus issus de captures et journaux PC ne sont pas repris dans cette version.
