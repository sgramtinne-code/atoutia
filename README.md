# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 30 octobre 2026

**Cap PNJ confirmé :** les millions de parties sont prévus plus tard pour l'entraînement local sur le PC NVIDIA RTX 5070, afin de créer des PNJ aux styles et niveaux variés, amusants et distrayants. Ils ne bloquent ni le solo offline ni la publication. Les simulations de la PR nº 18 sont des tests de moteur, sans entraînement. [Feuille de route IA](docs/AI_LAB_ROADMAP.md).

Base vérifiée avant ce lot : main **cfca5e5**, [PR nº 26](https://github.com/sgramtinne-code/atoutia/pull/26) fusionnée. Trois CI de push main réussies : [moteur/backend 40960576218](https://github.com/sgramtinne-code/atoutia/actions/runs/40960576218) (**601 moteur/620 backend/26 offline**), [Kotlin 40960576016](https://github.com/sgramtinne-code/atoutia/actions/runs/40960576016) (**259 JVM**, deux APK, lint 13 avertissements/1 suggestion), [AVD 40960575970](https://github.com/sgramtinne-code/atoutia/actions/runs/40960575970) (**43 instrumentés**). Le retour visible aux modes depuis la connexion/erreur online est livré ; ses preuves de fusion/main sont consignées dans la PR. Les anciennes attentes de fusion PR20–26 sont historiques et clôturées.

Lot courant **feat/android-room-invitations** : copier/partager une invitation textuelle depuis un salon privé en attente avec place libre, puis coller le code ou le message dans Rejoindre une partie. Le partage ouvre le sélecteur Android après clic ; le joueur choisit l’application et l’envoi. Le message ne contient que son titre et le code du salon. Le presse-papiers est consulté seulement sur Coller une invitation ; les URI/Intent ne sont pas résolus. Coller ne rejoint pas : confirmation explicite par bouton ou clavier. Format strict et borné à 1 024 caractères, compatible code brut canonique ms1_ suivi de 32 hexadécimaux minuscules ; pas de récupération d’un code dans un texte arbitraire ou une URL. Contrôles désactivés pendant création/jonction/démarrage/sortie, et invitation indisponible si le salon est plein. Les permissions de place, révisions, authentification et erreurs restent décidées par le serveur. L’écran Jouer défile pour conserver l’accès aux commandes en paysage/police agrandie. Un collage invalide conserve le champ mais bloque Rejoindre jusqu’à une correction ou un collage valide ; un écho IME sans changement ne masque pas l’erreur de longueur. Cinq tests JVM et six instrumentés ajoutés ; résultats détaillés ci-dessous. Les 43 instrumentés antérieurs restent réussis. Aucun moteur, PNJ, protocole, format de sauvegarde ou donnée de compte modifié. Voir [les invitations privées](docs/ANDROID_ROOM_INVITATIONS.md).

Code **3cc5dbd** de la [PR nº 27](https://github.com/sgramtinne-code/atoutia/pull/27) : [moteur/backend 41101162990](https://github.com/sgramtinne-code/atoutia/actions/runs/41101162990), job **124218488421**, **601 moteur/620 backend/26 offline**, typechecks/builds, bundle:check, simulations bornées et CLI synthétiques réussis dans le journal ; [Kotlin 41101162993](https://github.com/sgramtinne-code/atoutia/actions/runs/41101162993), job **124218488443**, **264 JVM sans échec/erreur/ignoré**, deux APK et lint réussis (**13 avertissements/1 suggestion** conservés) ; [AVD 41101163020](https://github.com/sgramtinne-code/atoutia/actions/runs/41101163020), job **124219862046**, **49/49 instrumentés API36** (9 + 3 + 7 + 5 + 3 + 5 + 4 + 3 + 4 + 6). Les six nouveaux scénarios et les 43 antérieurs réussissent dans le journal AVD. Bundle solo inchangé **6e83cc765603d43c8a1307b3ba9b4bcb69b6b459c562dc25b1842b90351c2650**. Les trois workflows de 3cc5dbd sont conclus success. La clôture ne change que la documentation ; les trois CI de son dernier commit doivent être réussies avant intégration. Aucun SDK Android local assistant ni nouvel essai PC revendiqué.

Clôture documentaire : sources, tests, fixtures, workflows et bundle conservés identiques à 3cc5dbd. Vérifier les trois CI du dernier commit de la PR nº 27, intégrer avec SHA attendu, puis vérifier PR/main/arbre et CI de push. Consigner la fusion et les preuves main dans la PR sans créer un commit uniquement pour inscrire son propre SHA. Donner la procédure complète main/backend local/lanceur Android ; répondre N/N pour garder les places libres. Essai ciblé copier/partager, puis Quitter le salon → Jouer → Coller → Rejoindre sur le même émulateur ; aucun nouveau match complet ni purge. Les échanges entre comptes/appareils réels, messageries tierces et backend public HTTPS restent distincts pour la bêta. IA Lab RTX5070 ultérieur conservé.

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
- [Invitations privées](docs/ANDROID_ROOM_INVITATIONS.md), [cycle de vie des salons](docs/ROOM_LIFECYCLE.md), [IA Lab futur](docs/AI_LAB_ROADMAP.md).

Ce README présente les fonctions et les preuves publiques. Les anciens comptes rendus issus de captures et journaux PC ne sont pas repris dans cette version.
