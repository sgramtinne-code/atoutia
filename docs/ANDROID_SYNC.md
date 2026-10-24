# Synchronisation Android et reprise contextuelle

Branche `feat/android-game-sync-status`, base main `c0df76e` (PR nº 9 validée et fusionnée).

## Comportement proposé

La partie se met déjà à jour par indications de révision WebSocket, puis lecture du snapshot joueur authentifié. Auparavant, les incidents étaient ignorés dans l'écran, le polling de secours ne tournait qu'en WAIT et Actualiser était affiché en permanence. L'état de présence des joueurs ne décrit pas directement la santé de la liaison locale.

La proposition montre un état court dans les commandes secondaires, en préservant la zone fixe des cartes. En fonctionnement sain : En direct, sans gros bouton. Une difficulté de liaison ou de lecture fait apparaître Réessayer ; ce bouton est désactivé pendant une lecture ou une soumission de coup. Une lecture HTTP réussie ne masque pas une reconnexion WebSocket encore en cours. L'ouverture du socket ne suffit pas à annoncer En direct : une indication SNAPSHOT valide, pour ce salon, est nécessaire.

Le polling de secours reste en WAIT et intervient aussi pendant BID/PLAY_CARD lorsque la liaison est incertaine, qu'une lecture a échoué ou qu'une révision annoncée n'est pas appliquée. Cadence initiale cinq secondes, recul après échec jusqu'à quinze secondes. Révisions, timer et bouton partagent une seule lecture en vol par écran. À sa sortie, les réponses tardives sont invalidées ; aucune lecture ne doit réouvrir une partie quittée ou déconnecter une nouvelle destination. Les révisions antérieures sont ignorées. Une lecture qui revient pendant une commande n'efface pas son état Submitting ; sa révision est retenue pour rattrapage après la commande.

Pas de modification du backend, règles, protocole, token, base SQLite, orientation sensorLandscape ou positions de cartes. La fin de partie masque les commandes de synchronisation. Les quatre tests paysage de la PR nº 9 restent conservés.

## Validation automatique

Onze nouveaux tests JVM couvrent les états de connexion et les limites de lecture, en complément des 209 précédents. La classe `LandscapeGameScreenInstrumentedTest` possède sept cas (quatre existants et trois nouveaux) avec DTO fictifs, sans backend, compte ou stockage d'authentification. Le workflow Android UI CI vérifie explicitement OK (7 tests). Une compilation d'APK n'est pas une exécution de ces cas.

À ce stade, les modifications ne sont pas encore validées en CI. Vérifier les résultats réels du commit livré et garder la PR en brouillon jusqu'au scénario ciblé sur PC. Aucun SDK/émulateur local de l'assistant ou téléphone physique revendiqué.

## Essai ciblé WSL et émulateur, après CI verte

Garder le backend actuel s'il répond à `curl --fail --silent --show-error http://127.0.0.1:3000/health`. Sinon, dans un premier terminal :

```bash
cd "$HOME/projects/atoutia" &&
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build &&
HOST="127.0.0.1" PORT="3000" \
ATOUTIA_AUTH_BOOTSTRAP_ENABLED="true" \
ATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>" \
pnpm --filter @atoutia/backend start
```

Utiliser le Client ID déjà validé et conserver ce terminal. Arrêter un ancien lanceur PNJ, puis depuis un second terminal propre :

```bash
cd "$HOME/projects/atoutia" &&
git status --short --branch &&
git fetch origin &&
git switch feat/android-game-sync-status &&
git pull --ff-only origin feat/android-game-sync-status &&
git log -1 --oneline &&
curl --fail --silent --show-error http://127.0.0.1:3000/health &&
node apps/backend/scripts/dev-android-room.mjs
```

Répondre N puis O. Le lanceur valide un seul ADB device, construit avec Client ID/autoplay false, convertit les chemins pour ADB Windows, installe et configure reverse. Attendre ATTENTE DU NOUVEAU SALON **sans créer encore**. Dans un troisième terminal, avec le même chemin ADB Windows validé :

```bash
cd "$HOME/projects/atoutia" &&
ATOUTIA_ADB="<ADB_WINDOWS_PATH>" node apps/backend/scripts/dev-android-network.mjs
```

Le relais relance Android pour que ses connexions passent par lui ; backend et PNJ restent en accès direct. Dans Android, Retour à l'accueil si l'ancienne partie est restaurée (ou Quitter l'ancien salon d'attente), puis Jouer → Créer une partie. Attendre les trois PNJ et 4/4, démarrer. Vérifier En direct et l'absence d'Actualiser, jouer une carte et constater la progression PNJ.

À un tour local, saisir s puis c dans le terminal relais. Vérifier Reconnexion ou Connexion perturbée, et Réessayer accessible dans la zone de commandes sous la main. Toucher Réessayer une fois : pas de lectures parallèles ni de perte des cartes. Reprendre rapidement avec r, attendre le rattrapage (jusqu'à environ vingt secondes si un échec a augmenté l'intervalle), vérifier En direct et la disparition de Réessayer, puis jouer une carte autorisée et constater la progression PNJ. Finir avec q pour restaurer reverse vers le backend direct. Si le relais a été arrêté brutalement : restaurer `adb reverse tcp:3000 tcp:3000` avec le chemin ADB validé.

Aucun ID à copier, test Keystore/Google, nouvelle coupure prolongée, force-stop de restauration ou match complet n'est requis. Garder les preuves et données de jeu privées ; ne pas publier les captures/logs bruts ni lancer un nettoyage de base.


## Premier contrôle CI de synchronisation réussi

Le code **`54e81d8`**, [PR nº 10](https://github.com/sgramtinne-code/atoutia/pull/10), passe les trois CI : Android Kotlin **`40129990363`** / job **`120979459310`**, **220/220 JVM** (onze nouveaux), deux APK et lint réussis (**12 avertissements et une suggestion**) ; Android UI **`40129990352`** / job **`120979459477`**, **OK (7 tests)** réellement exécutés sur AVD ; moteur/backend **`40129990273`** réussi. Les données sont synthétiques ; aucun résultat PC de cette nouvelle étape n’est encore reçu.

Le dernier cas UI est renforcé pour déclencher une coupure après défilement jusqu’à Passer : un incident doit révéler le retour de synchronisation au lieu de le laisser hors champ. La zone des commandes revient donc au début lors de l’apparition du recours ou du retour à l’état sain ; la main fixe ne défile pas. Même total de sept fixtures, contrôles du nouveau commit à vérifier. Le polling sain n’entraîne pas ce repositionnement ni une annonce répétée d’actualisation à chaque lecture de fond. La PR reste en brouillon jusqu’au contrôle final CI et à l’essai ciblé WSL/émulateur de docs/ANDROID_SYNC.md ; aucune fusion ni validation réseau réelle de cette étape annoncée.
