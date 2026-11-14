# ATOUTIA

Application Android native de belote française à quatre joueurs, avec moteur TypeScript indépendant et backend multijoueur autoritaire.

## État au 14 novembre 2026

**Cap PNJ.** Entraîner sur RTX 5070 un ensemble de joueurs de belote avec des styles cohérents et des niveaux mesurés. Faire varier les tables et donner à chaque personnage de courtes répliques contextuelles, désactivables. Faire grandir les campagnes locales selon les progrès et les limites mesurées. Android exécute les politiques retenues en solo hors ligne. [Feuille de route IA](docs/AI_LAB_ROADMAP.md).

**Priorité révisée par le développeur le 30 octobre : reporter le déploiement OVH.** Poursuivre le multijoueur Android, la lisibilité et l’ergonomie pour les personnes âgées. L’entraînement des PNJ sur la RTX 5070 est en pause. Les millions de parties restent un sujet d’apprentissage, sans campagne massive dans la CI. Cette décision remplace l’ancien ordre qui plaçait l’IA après la bêta/diffusion. Ne pas demander de diagnostic VPS, créer de DNS ou reprendre OVH dans ce lot.

## Point de reprise — après la PR nº 55

**Code applicatif intégré : `8107b72536f137d7bf059316df66d60ec2d016cc`**, [PR nº 55](https://github.com/sgramtinne-code/atoutia/pull/55), issue du code validé `6ca600f87ff09e6284e9aeaa2d560847dafb0d2a`. L’arbre de fusion `9bf00f597a297cf666f3adaf9ac090d3bc8f0299` est identique à celui du code testé. Les PR nº 53 et 54 sont également intégrées ; ne pas les présenter comme des lots à terminer.

| Livraison récente | État et comportement |
| --- | --- |
| [PR nº 53](https://github.com/sgramtinne-code/atoutia/pull/53) · `e8badfd` | Banc local deux comptes Android manuels, deux PNJ, cibles ADB explicites et nouveau salon détecté automatiquement |
| [PR nº 54](https://github.com/sgramtinne-code/atoutia/pull/54) · `8bb064a` | Renouvellement rotatif des jetons PNJ après `401 AUTH_INVALID`, une seule nouvelle tentative, clés uniquement en mémoire |
| [PR nº 55](https://github.com/sgramtinne-code/atoutia/pull/55) · `8107b72` | Victoire/Défaite selon la place locale, scores Votre équipe/Adversaires, Rejouer fixe en paysage, présence et marqueur de tour masqués après fin normale ou forfait |

**Preuves du dernier code Android avant fusion :** [moteur/backend](https://github.com/sgramtinne-code/atoutia/actions/runs/43581829599), [Android JVM/APK/lint](https://github.com/sgramtinne-code/atoutia/actions/runs/43581829525) et [Android UI](https://github.com/sgramtinne-code/atoutia/actions/runs/43581829534), tous conclus **success** sur `6ca600f`. Socle : **601 tests moteur, 640 backend, 26 offline, 266 JVM et 65 instrumentés** (dont 16 paysage et 12 invitations). Les **14 captures synthétiques** ont été collectées ; victoire/défaite ont été inspectées à 640 × 320 dp, texte 1,3 et scores à quatre chiffres. Ce sont des preuves de CI, pas une installation sur le PC ou une publication Google Play.

**Push main applicatif `8107b72` :** [moteur/backend](https://github.com/sgramtinne-code/atoutia/actions/runs/43582722029), [Android JVM/APK/lint](https://github.com/sgramtinne-code/atoutia/actions/runs/43582722096), [Android UI](https://github.com/sgramtinne-code/atoutia/actions/runs/43582722065). Les trois conclusions **success** ont été vérifiées au checkpoint du 14 novembre 2026 et consignées dans la PR nº 55 ; relire leur état à la reprise. La [préparation documentaire](https://github.com/sgramtinne-code/atoutia/pulls?q=head%3Adocs%2Fcontinuity-after-match-results) `docs/continuity-after-match-results` ne modifie aucune source, fixture, configuration ou suite applicative ; son SHA de fusion et ses CI sont à consigner dans sa PR, sans commit destiné à inscrire son propre SHA.

**Suite :** lire `AGENTS.md`, `README.md`, `docs/REPRISE.md` et `docs/PROJECT_STATUS.md`, vérifier main/PR/CI, puis poursuivre un lot Android visible et borné. Le prochain candidat est la compréhension du score et des équipes pendant le jeu ; vérifier le code avant de le choisir. L’installation PC du dernier APK doit être confirmée séparément, sans nouvel essai de partie complète imposé pour la seule présentation des résultats. Le renouvellement des scripts PNJ, la restauration d’une partie Android et le diagnostic d’une coupure réseau restent trois sujets distincts. Les données et observations PC restent privées.


Le banc de la règle du dernier joueur est intégré à `main` en **e739508** ([PR nº 45](https://github.com/sgramtinne-code/atoutia/pull/45)). Les travaux d’apprentissage des PNJ sont en pause. La [procédure de partie Android à quatre avec coupure et reprise](#essai-android-à-quatre-avec-coupure) est intégrée dans **83c73ab** (PR nº 46). La correction des plis est intégrée par la PR nº 47. Le salon en paysage est intégré par la PR nº 48. La PR nº 49 ajoute « Agrandir la main » : grandes cartes séparées, actions autorisées conservées et retour au jeu après sélection. Les petites mains utilisent mieux la largeur disponible. La PR nº 50 affiche les quatre places occupées ou libres, votre place, votre partenaire et les adversaires. La PR nº 51 améliore les invitations : actions Copier/Partager sur toute la largeur, sections Inviter/Rejoindre côte à côte en paysage et empilées sur largeur étroite, puis confirmation explicite après reconnaissance du texte. La reconnaissance du format ne prouve ni l’existence ni la disponibilité du salon : le serveur reste seul à accepter l’entrée. Le contrôle entre deux comptes est décrit dans la procédure de test dédiée ; les données et observations PC restent privées.

**[Bilan global et feuille de route ATOUTIA](docs/PROJECT_STATUS.md)** : rapprochement des 50 rubriques de règles et 19 rubriques de l’ancien prompt avec le code actuel. Le multijoueur local est jouable ; premier solo offline intégré par la PR nº 20, enrichissements solo/fonctions utilisateur et diffusion publique restent à terminer ; le chantier Android est prioritaire. Le hors-ligne est une exigence, pas une option abandonnée.

## Reprendre dans un nouveau chat

Lire d’abord le [prompt de reprise](docs/REPRISE.md) et les [directives](AGENTS.md), puis vérifier l’état réel du dépôt et des CI. Ce checkpoint remplace les anciennes mentions « PR nº 53/54/55 à terminer ». La méthode reste branche isolée → code et tests pertinents → CI et captures nécessaires → PR → fusion avec SHA attendu → vérification de main → commandes WSL adaptées. Les décisions techniques courantes sont déléguées à l’assistant ; les essais réellement liés au PC restent accompagnés d’une procédure complète et regroupée. Aucun déploiement OVH, entraînement GPU ou publication implicite.

## Architecture et fonctionnalités

- `packages/belote-engine` : règles classiques, commandes et actions légales, score, litige versionné, replay déterministe et simulations bornées.
- `apps/backend` : authentification Google/sessions, autorité sur les salons et parties, places, HTTP/WebSocket, présences et absences selon le mode, SQLite et résultats durables, historique authentifié.
- `packages/offline-game` : même moteur pour le solo local, politiques PNJ versionnées et bundle Android contrôlé.
- `apps/android` : Kotlin/Compose en sensorLandscape, parties et reprise online, solo hors connexion avec reprise AtomicFile, statistiques, profil, paramètres, tutoriel et styles PNJ. Le choix des modes reste accessible depuis les états de connexion ou d’erreur online.

Le solo utilise les politiques PNJ intégrées. La feuille de route IA conserve les futurs travaux sur les styles et les niveaux. La version documentaire des règles est 0.1.3 ; elle est distincte de la version du paquet moteur et de la version des règles enregistrée dans chaque replay.

## Développement local

Prérequis : Node.js 24, pnpm selon `packageManager` dans package.json, Java 17 et Android SDK pour les builds Android. Installer les dépendances à partir du lockfile :

```bash
cd "$HOME/projects/atoutia" &&
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

### Contrôle visuel du salon

Salon livré par la PR nº 48. Après installation avec le lanceur ci-dessus, créer un nouveau salon privé. À 1/4, Démarrer reste désactivé et Quitter reste accessible. En paysage, faire défiler les invitations à gauche et vérifier que les actions restent fixes à droite. Copier et partager conservent la confirmation explicite et les protections existantes.

Avec les trois PNJ du lanceur, attendre 4/4 puis démarrer depuis le compte hôte. Vérifier le chargement de la partie. Ce contrôle porte sur le salon et la transition vers le jeu. Conserver les terminaux backend et PNJ ouverts pendant le test. Les captures de CI utilisent des salons synthétiques.

### Contrôle de la main

Main agrandie livrée par la PR nº 49. En solo (sans backend) ou avec le lanceur Android à quatre sur base de test, jouer quelques tours. Les index restent dans l’ordre d’affichage ; toucher une carte indisponible ne joue aucune carte. Avec trois cartes restantes, les cartes s’écartent lorsque la largeur le permet. Appuyer sur **Agrandir la main** dans la zone des commandes : les grandes cartes sont séparées et la grille défile si nécessaire. Une carte autorisée passe par la même commande ou confirmation solo ; **Fermer** revient au jeu sans jouer. Ce contrôle est court et ne demande pas de terminer une nouvelle partie.

### Places et équipes dans le salon

Affichage livré par la PR nº 50. Dans le salon, les quatre places indiquent **Occupée** ou **Libre**. Votre partenaire est le joueur de la même équipe, y compris lorsque votre place diffère de celle de l’hôte. L’occupation ne signifie pas une connexion temps réel active. La liste figure dans la colonne des détails, qui défile si le texte ou la hauteur le demandent ; Démarrer et Quitter restent fixes en paysage. Les noms des comptes ne sont pas reçus par ce résumé de salon et ne sont pas inventés.

### Invitation et entrée dans une partie

PR nº 51 intégrée. Dans **Jouer**, les sections **Inviter mes amis** et **Rejoindre une partie** sont côte à côte en paysage et empilées sur une largeur étroite. Créer et Coller restent visibles dès l’arrivée à 640 × 320 dp et texte agrandi à 1,3. Un collage valide affiche **Invitation reconnue. Confirme pour entrer.** et prépare le bouton Rejoindre ; aucune entrée automatique. Les erreurs de collage conservent le champ courant et bloquent la confirmation jusqu’à correction. Dans le salon, Copier et Partager utilisent des boutons séparés sur toute la largeur, avec une cible d’au moins 52 dp. La [procédure ciblée](docs/ANDROID_ROOM_INVITATIONS.md#essai-local-ciblé-après-intégration) conserve des places libres et ne demande pas une partie complète.

### Essai entre deux comptes Android

Intégré par la PR nº 53, le lanceur construit une fois et installe sur deux cibles ADB explicites avec `-r`, sans effacer leurs données. L’hôte crée un salon, l’autre compte le rejoint par invitation, puis le lanceur ajoute seulement Joueurs 3/4. Les deux humains jouent manuellement. Le backend reste sur loopback ; chaque Android utilise son propre reverse direct.

La [procédure complète à deux comptes](docs/ANDROID_TWO_ACCOUNT_TEST.md) comprend le deuxième AVD distinct, les commandes WSL, la base de test dédiée et les observations attendues. Les tests synthétiques ne remplacent pas une installation ADB/Google sur le PC. La PR nº 54 renouvelle les sessions des PNJ de test ; ce correctif de scripts ne demandait pas de reconstruction Android/backend. Un processus PNJ déjà arrêté ne peut pas récupérer ses clés perdues : utiliser un nouveau salon, sans effacer les données Android. Aucun match complet supplémentaire requis.

### Résultat de partie

Intégré par la PR nº 55, le résultat indique Victoire ou Défaite pour la place locale, puis Votre équipe et Adversaires avec leurs points. Les informations de présence ne sont plus utiles une fois le résultat acquis et sont masquées à ce stade ; une vraie déconnexion en cours de partie garde son affichage et sa procédure de reprise. En paysage, Rejouer reste fixe en bas et les détails, Historique et Accueil défilent au-dessus ; les trois actions conservent leurs callbacks et des cibles d’au moins 48 dp. Le forfait reste identifié séparément, sans transformer des points intermédiaires en score final inventé.

Contrôle : CI synthétique à 640 × 320 dp avec texte 1,3, quatre places et deux équipes gagnantes, absence de vainqueur, forfait et actions finales. Les captures `result-win.png` et `result-loss.png` utilisent uniquement des fixtures. Ce lot d’affichage ne demande pas de nouvelle partie complète sur le PC ; son contrôle visuel peut se faire au prochain résultat normal solo ou online après une mise à jour `install -r`, sans effacer les données.

## Validation et données

Les trois workflows GitHub vérifient moteur/backend, JVM/APK/lint et scénarios Android isolés sur émulateur. Consulter les exécutions du dernier commit de la PR avant fusion, puis celles du push main. Les preuves du dernier code applicatif sont indiquées en tête ; ce ne sont pas des observations d’un téléphone physique ni une validation de publication.

Utiliser des identifiants/comptes synthétiques dans les tests. Ne publier aucune base, sauvegarde, token, invitation réelle, capture ou journal privé. Les diagnostics SQLite sont séparés du serveur et ouverts en lecture seule sur une copie isolée ; aucune suppression automatique de salons abandonnés n’est activée par ces outils.

## Documentation

- [Bilan global et feuille de route](docs/PROJECT_STATUS.md) — exigences initiales, fonctions livrées, écarts et suite produit.
- [Reprise du projet](docs/REPRISE.md) et [directives de travail](AGENTS.md).
- [Règles canoniques](docs/GAME_RULES.md), [décisions MVP](docs/RULES_VALIDATION.md), [litige et compatibilité](docs/LITIGE_RULES_VERSION.md), [simulations](docs/ENGINE_SIMULATION.md).
- [Revue Android](docs/ANDROID_REVIEW.md), [paysage](docs/ANDROID_LANDSCAPE.md), [synchronisation](docs/ANDROID_SYNC.md), [backup](docs/ANDROID_BACKUP.md).
- [Solo hors ligne](docs/ANDROID_OFFLINE.md), [statistiques](docs/ANDROID_OFFLINE_STATS.md), [profil](docs/ANDROID_SOLO_PROFILE.md), [paramètres et tutoriel](docs/ANDROID_SOLO_SETTINGS_TUTORIAL.md), [styles PNJ](docs/OFFLINE_BOT_STYLES.md).
- [Identité visuelle et lisibilité](docs/ANDROID_VISUAL_IDENTITY.md), [configuration release HTTPS](docs/ANDROID_RELEASE_CONFIG.md), [invitations privées](docs/ANDROID_ROOM_INVITATIONS.md), [cycle de vie des salons](docs/ROOM_LIFECYCLE.md), [IA Lab RTX 5070](docs/AI_LAB_ROADMAP.md).

Ce README présente les fonctions et les preuves publiques. Les anciens comptes rendus issus de captures et journaux PC ne sont pas repris dans cette version.
