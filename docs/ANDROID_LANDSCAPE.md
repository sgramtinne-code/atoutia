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

Construire les deux APK dans apps/android avec `--no-daemon --max-workers=2`, le Client ID déjà validé et autoplay PLAYER_0 false. Vérifier un seul appareil en état device puis installer les deux APK avec adb install -r ; sous WSL/adb.exe, convertir chaque chemin par wslpath -w. Exécuter uniquement :

```bash
"$ADB" shell am instrument -w \
  -e class tech.devoo.atoutia.ui.game.LandscapeGameScreenInstrumentedTest \
  tech.devoo.atoutia.test/androidx.test.runner.AndroidJUnitRunner
```

Résultat attendu : OK (4 tests). Ne pas lancer toute la suite instrumentée : les tests Keystore déjà acquis manipulent leur stockage et ne concernent pas cette mise en page. Ces quatre cas UI utilisent une activité isolée et n’ont aucun besoin de connexion Google ou de backend.

## Vérification réelle du jeu

Garder ou démarrer le backend sur 127.0.0.1:3000 avec bootstrap de test et Client ID Google validé. Après health OK et un seul émulateur ADB device, lancer depuis la racine :

```bash
node apps/backend/scripts/dev-android-room.mjs
```

Répondre N pour PLAYER_0 automatique et O pour les trois PNJ. Attendre ATTENTE DU NOUVEAU SALON. Si l’ancienne partie est restaurée, toucher Retour à l’accueil ; quitter un ancien salon d’attente si nécessaire. Créer alors un salon neuf, attendre 4/4 et démarrer. Aucun ID à copier et aucun relais réseau requis dans ce scénario UI.

Vérifier dès la main complète que les huit cartes sont visibles sans défiler et que score/atout/retour restent lisibles. Jouer une carte autorisée, constater la progression des PNJ, puis vérifier que l’actualisation et les éventuels messages restent accessibles sous la main. Laisser backend et PNJ actifs pendant l’observation. Les coupures/reconnexions, Keystore, Google et fin de match de la livraison précédente ne sont pas à répéter sans anomalie nouvelle. Fournir le résultat des quatre tests et une vue de l’écran réel ; ne pas publier la capture brute ni les détails privés dans le dépôt.
