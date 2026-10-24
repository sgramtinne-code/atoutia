# Main Android visible en paysage

Branche `fix/android-landscape-hand-visibility`, depuis main `81b4f2d`. La PR nº 8 est intégrée et ses validations sont clôturées. Cette étape traite la disposition Compose de l’écran de jeu.

## Problème et proposition

La main partageait une colonne défilante avec un grand panneau de score et quatre métriques. Sur le téléphone en paysage observé, il fallait défiler pour voir les cartes à son tour. La nouvelle disposition utilise un bandeau compact pour score/cible, atout, donne/donneur/preneur/révision, à côté du retour à l’accueil. La main est séparée des commandes défilantes ; les enchères, retours d’erreur, actualisation et actions de fin restent accessibles dans la zone située dessous. Le tableau conserve ses positions et proportions ; le repli hors paysage conserve son contenu.

La disposition paysage est utilisée quand la largeur est au moins 600 dp et supérieure à la hauteur. Cette proposition conserve sensorLandscape, les tailles et le comportement existants des cartes, les actions autorisées fournies par le serveur et les protections pendant soumission. Aucun changement de règle, réseau, session, schéma ou persistance. Le retour à l’accueil conserve sa sémantique de navigation, sans terminer la partie serveur.

## Contrôles prévus

Quatre tests de `LandscapeGameScreenInstrumentedTest` rendent GameScreen avec des données synthétiques dans une activité vide :

- les huit cartes apparaissent avant tout défilement, avec des bornes contenues dans une zone 640 × 320 dp ;
- une police agrandie à 1,3 conserve la visibilité ; une carte autorisée déclenche le bon callback, une carte interdite ou une soumission en cours ne le permettent pas ;
- atteindre Passer dans les enchères défile seulement les commandes, sans déplacer la main ;
- une partie terminée masque la main et conserve Rejouer accessible.

L’activité de test s’oriente en paysage ; utiliser un émulateur offrant au moins 640 × 320 dp. Les données sont fictives et les callbacks enregistrés localement : aucun backend, compte, token ou référence de reprise n’est lu ou modifié. Les tests ne valident pas une commande métier réelle ; le scénario Android N/O complète cette preuve. Les API Compose existantes sont utilisées, sans ajout de dépendance : [documentation officielle des tests isolés](https://developer.android.com/develop/ui/compose/testing/common-patterns).

À ce point, le diff est contrôlé mais aucun test d’écran n’est exécuté. Les résultats réels de compilation/JVM/lint doivent être relevés dans Android CI, puis les résultats de cette classe sur le PC du développeur avant fusion. Ne jamais présenter assembleDebugAndroidTest comme une exécution sur appareil, ni inventer une reproduction rouge instrumentée avant correction.

## Récupération et tests ciblés sur émulateur

Adapter le chemin ADB et le Client ID Web aux valeurs déjà validées, sans effacer les données Android. Récupérer la branche dans un checkout propre :

```bash
cd "$HOME/projects/atoutia"
git status --short --branch
git fetch origin &&
git switch fix/android-landscape-hand-visibility &&
git pull --ff-only origin fix/android-landscape-hand-visibility
```

Pour WSL avec adb.exe, remplacer les deux valeurs génériques par le chemin ADB et le Client ID déjà validés. Ces tests sont isolés et ne nécessitent pas de démarrer le backend :

```bash
cd "$HOME/projects/atoutia/apps/android"
ADB="<ADB_WINDOWS_PATH>"
"$ADB" devices
./gradlew --no-daemon --max-workers=2 \
  :app:assembleDebug :app:assembleDebugAndroidTest \
  -PATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>" \
  -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false &&
"$ADB" install -r "$(wslpath -w "$PWD/app/build/outputs/apk/debug/app-debug.apk")" &&
"$ADB" install -r "$(wslpath -w "$PWD/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk")" &&
"$ADB" shell am instrument -w \
  -e class tech.devoo.atoutia.ui.game.LandscapeGameScreenInstrumentedTest \
  tech.devoo.atoutia.test/androidx.test.runner.AndroidJUnitRunner
```

Résultat attendu : OK (4 tests). Ne pas lancer toute la suite instrumentée : les tests Keystore déjà acquis manipulent leur stockage et ne concernent pas cette mise en page. Ces quatre cas UI utilisent une activité isolée et n’ont aucun besoin de connexion Google ou de backend.

## Vérification réelle du jeu

Garder le backend déjà sain ; sinon le démarrer dans un terminal dédié avec le Client ID validé à la place du paramètre générique :

```bash
cd "$HOME/projects/atoutia"
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build &&
HOST="127.0.0.1" PORT="3000" \
ATOUTIA_AUTH_BOOTSTRAP_ENABLED="true" \
ATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>" \
pnpm --filter @atoutia/backend start
```

Vérifier health : `curl --fail --silent --show-error http://127.0.0.1:3000/health`. Après health OK et un seul émulateur ADB device, lancer depuis la racine :

```bash
node apps/backend/scripts/dev-android-room.mjs
```

Répondre N pour PLAYER_0 automatique et O pour les trois PNJ. Attendre ATTENTE DU NOUVEAU SALON. Si l’ancienne partie est restaurée, toucher Retour à l’accueil ; quitter un ancien salon d’attente si nécessaire. Créer alors un salon neuf, attendre 4/4 et démarrer. Aucun ID à copier et aucun relais réseau requis dans ce scénario UI.

Vérifier dès la main complète que les huit cartes sont visibles sans défiler et que score/atout/retour restent lisibles. Jouer une carte autorisée, constater la progression des PNJ, puis vérifier que l’actualisation et les éventuels messages restent accessibles sous la main. Laisser backend et PNJ actifs pendant l’observation. Les coupures/reconnexions, Keystore, Google et fin de match de la livraison précédente ne sont pas à répéter sans anomalie nouvelle. Fournir le résultat des quatre tests et une vue de l’écran réel ; ne pas publier la capture brute ni les détails privés dans le dépôt.


## Paysage : compilation et contrôles automatiques réussis, validation appareil attendue

La [PR nº 9](https://github.com/sgramtinne-code/atoutia/pull/9), branche `fix/android-landscape-hand-visibility`, porte le code **`c4fc8d0`** depuis main `81b4f2d`. Android CI **`40123839940`**, job **`120960927123`**, est réussie : **209/209 JVM**, APK debug et instrumenté compilés, lint réussi avec **12 avertissements et une suggestion**. Moteur/backend CI **`40123839913`** réussie ; aucun code moteur/backend n’a changé. Les quatre nouveaux tests UI sont compilés dans l’APK de test mais **n’ont pas encore été exécutés sur appareil**. Aucun résultat visuel réel de cette nouvelle disposition n’est revendiqué.

La documentation et les blocs bash/liens locaux sont vérifiés. Prochaine action : récupérer la branche, construire/installer les deux APK avec le Client ID validé et autoplay false ; exécuter uniquement `tech.devoo.atoutia.ui.game.LandscapeGameScreenInstrumentedTest`, attendu OK (4 tests), puis nouveau salon N/O par le lanceur existant et vue de la main complète sans défilement, carte locale et progression PNJ. Procédure complète dans docs/ANDROID_LANDSCAPE.md. La PR nº 9 reste en brouillon jusqu’aux résultats nécessaires et aux CI du dernier commit. Ne pas fusionner ni annoncer toute l’application validée ; main reste `81b4f2d`. Les contrôles acquis de la PR nº 8 ne sont pas à répéter.
