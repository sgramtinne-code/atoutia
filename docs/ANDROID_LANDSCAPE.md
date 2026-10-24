# Main Android visible en paysage

Branche `fix/android-landscape-hand-visibility`, depuis main `81b4f2d`. La PR nº 8 est intégrée et ses validations sont clôturées. Cette étape traite la disposition Compose de l’écran de jeu.

## Problème et proposition

La main partageait une colonne défilante avec un grand panneau de score et quatre métriques. Sur le téléphone en paysage observé, il fallait défiler pour voir les cartes à son tour. La nouvelle disposition utilise un bandeau compact pour score/cible, atout, donne/donneur/preneur/révision, à côté du retour à l’accueil. La main est séparée des commandes défilantes ; les enchères, retours d’erreur, actualisation et actions de fin restent accessibles dans la zone située dessous. Le tableau conserve ses positions et proportions ; le repli hors paysage conserve son contenu.

La disposition paysage est utilisée quand la largeur allouée à l’écran, avant les marges système, est au moins 600 dp et supérieure à la hauteur. Les marges sont ensuite appliquées au contenu de cette disposition. Cette proposition conserve sensorLandscape, les tailles et le comportement existants des cartes, les actions autorisées fournies par le serveur et les protections pendant soumission. Aucun changement de règle, réseau, session, schéma ou persistance. Le retour à l’accueil conserve sa sémantique de navigation, sans terminer la partie serveur.

## Contrôles prévus

Quatre tests de `LandscapeGameScreenInstrumentedTest` rendent GameScreen avec des données synthétiques dans une activité vide :

- les huit cartes apparaissent avant tout défilement, avec des bornes contenues dans une zone 640 × 320 dp ;
- une police agrandie à 1,3 conserve la visibilité ; une carte autorisée déclenche le bon callback, une carte interdite ou une soumission en cours ne le permettent pas ;
- atteindre Passer dans les enchères défile seulement les commandes, sans déplacer la main ;
- une partie terminée masque la main et conserve Rejouer accessible.

L’activité de test s’oriente en paysage ; utiliser un émulateur offrant au moins 640 × 320 dp. Les données sont fictives et les callbacks enregistrés localement : aucun backend, compte, token ou référence de reprise n’est lu ou modifié. Les tests ne valident pas une commande métier réelle ; le scénario Android N/O complète cette preuve. Les API Compose existantes sont utilisées, sans ajout de dépendance : [documentation officielle des tests isolés](https://developer.android.com/develop/ui/compose/testing/common-patterns).

Le correctif applicatif `8ed63bf` passe désormais ces **quatre tests réellement exécutés** dans Android UI CI, après reproduction des trois échecs du PC. Le dernier bilan ci-dessous donne les runs et limites. La prochaine validation sur le PC porte sur le rendu du vrai jeu avec le lanceur N/O ; il n’est pas nécessaire de répéter localement la classe isolée déjà verte en CI. La procédure de cette classe est conservée pour un futur besoin ciblé de diagnostic.

## Récupération et tests ciblés sur émulateur

Adapter le chemin ADB et le Client ID Web aux valeurs déjà validées, sans effacer les données Android. Récupérer la branche dans un checkout propre :

```bash
cd "$HOME/projects/atoutia"
git status --short --branch
git fetch origin &&
git switch fix/android-landscape-hand-visibility &&
git pull --ff-only origin fix/android-landscape-hand-visibility &&
git branch --show-current &&
git log -1 --oneline &&
git ls-files --error-unmatch apps/android/app/src/androidTest/java/tech/devoo/atoutia/ui/game/LandscapeGameScreenInstrumentedTest.kt
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


## Paysage Android — correctif testé, rendu réel à confirmer (PR nº 9)

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

**Prochaine action :** récupérer la branche puis utiliser le lanceur existant **N/O** pour installer le correctif et vérifier le rendu réel sur le PC. Arrêter l’ancien lanceur PNJ s’il tourne, garder le backend sain. Vérifier health, attendre ATTENTE DU NOUVEAU SALON avant de créer ; si une partie est restaurée, Retour à l’accueil, ou Quitter pour un ancien salon d’attente. Créer le nouveau salon, attendre 4/4, démarrer, constater huit cartes sans défilement et score/atout/retour lisibles, jouer une carte autorisée et constater la progression PNJ. Aucun ID à copier, aucun relais, nouveau test Keystore/Google, coupure réseau ou match complet requis. Les quatre tests UI ont déjà réellement tourné en CI : ne pas imposer leur répétition locale pour obtenir la même preuve ; l’essai réel vérifie l’APK et l’intégration sur le PC.

Recevoir ce résultat avant fusion et vérifier alors les CI du dernier commit documentaire aussi. La clôture documentaire enregistre la validation du code `8ed63bf` ; elle ne transforme pas une CI encore en cours sur un commit ultérieur en succès acquis. Voir la procédure de ce document. Captures, identifiants, mains, scores de vraies parties et logs bruts restent privés ; aucune purge ou livraison production.
