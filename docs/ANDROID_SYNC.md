# Synchronisation Android et reprise contextuelle

Branche `feat/android-game-sync-status`, base main `c0df76e` (PR nº 9 validée et fusionnée).

## Comportement proposé

La partie se met déjà à jour par indications de révision WebSocket, puis lecture du snapshot joueur authentifié. Auparavant, les incidents étaient ignorés dans l'écran, le polling de secours ne tournait qu'en WAIT et Actualiser était affiché en permanence. L'état de présence des joueurs ne décrit pas directement la santé de la liaison locale.

La proposition montre un état court dans les commandes secondaires, en préservant la zone fixe des cartes. En fonctionnement sain : En direct, sans gros bouton. Une difficulté de liaison ou de lecture fait apparaître Réessayer ; ce bouton est désactivé pendant une lecture ou une soumission de coup. Une lecture HTTP réussie ne masque pas une reconnexion WebSocket encore en cours. L'ouverture du socket ne suffit pas à annoncer En direct : une indication SNAPSHOT valide, pour ce salon, est nécessaire.

Le polling de secours reste en WAIT et intervient aussi pendant BID/PLAY_CARD lorsque la liaison est incertaine, qu'une lecture a échoué ou qu'une révision annoncée n'est pas appliquée. Cadence initiale cinq secondes, recul après échec jusqu'à quinze secondes. Révisions, timer et bouton partagent une seule lecture en vol par écran. À sa sortie, les réponses tardives sont invalidées ; aucune lecture ne doit réouvrir une partie quittée ou déconnecter une nouvelle destination. Les révisions antérieures sont ignorées. Une lecture qui revient pendant une commande n'efface pas son état Submitting ; sa révision est retenue pour rattrapage après la commande.

Pas de modification du backend, règles, protocole, token, base SQLite, orientation sensorLandscape ou positions de cartes. La fin de partie masque les commandes de synchronisation. Les quatre tests paysage de la PR nº 9 restent conservés.

## Validation automatique

Onze nouveaux tests JVM couvrent les états de connexion et les limites de lecture, en complément des 209 précédents. La classe `LandscapeGameScreenInstrumentedTest` possède sept cas (quatre existants et trois nouveaux) avec DTO fictifs, sans backend, compte ou stockage d'authentification. Le workflow Android UI CI vérifie explicitement OK (7 tests). Une compilation d'APK n'est pas une exécution de ces cas.

Le code applicatif `35ecc68` est validé en CI : 220 JVM, sept fixtures UI réellement exécutées, APK/lint et moteur/backend réussis. Les références complètes sont dans le dernier bilan ci-dessous. Garder la PR nº 10 en brouillon jusqu'au scénario ciblé sur PC et aux contrôles du dernier commit documentaire. Aucun SDK/émulateur local de l'assistant ou téléphone physique revendiqué.

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


## Synchronisation Android — validations reçues (PR nº 10)

La PR nº 9 est intégrée dans main **`c0df76e`**, récupéré proprement sur le PC. La [PR nº 10](https://github.com/sgramtinne-code/atoutia/pull/10), branche **`feat/android-game-sync-status`**, porte le code applicatif **`35ecc68`**, depuis ce main. Les validations nécessaires de synchronisation sont maintenant reçues ; vérifier les contrôles du commit de clôture et le statut GitHub avant intégration. Aucune fusion ou livraison production n’est annoncée par avance dans ce document.

L’écran expose Connexion, En direct, Reconnexion, Connexion perturbée et les difficultés de lecture ; **Réessayer** remplace le bouton Actualiser permanent en cas d’incident. Son action est désactivée pendant une lecture ou une soumission de coup. L’incident et le retour sain ramènent seulement les commandes secondaires au début, même après défilement des enchères ; la main reste fixe. Un polling sain ne déplace pas les commandes et son libellé reste stable.

En direct attend une indication SNAPSHOT valide pour le bon salon, pas la seule ouverture du transport. Un succès HTTP ne masque pas une reconnexion WebSocket encore nécessaire. Les lectures de révision, polling et clic partagent une seule opération HTTP en vol par écran, invalidée à sa sortie. Les callbacks de synchronisation hors de cette partie et les révisions antérieures sont ignorés ; une réponse pendant une commande ne la remet pas à Idle, et la révision reçue reste à rattraper. Le polling WAIT est conservé et couvre aussi BID/PLAY_CARD en cas de liaison incertaine, d’échec ou de révision en retard, initialement cinq secondes et jusqu’à quinze après échec. Présence serveur, état de la liaison et résultat HTTP restent des informations distinctes. Aucun changement backend, moteur, protocole, tokens, SQLite, sensorLandscape ou positions de cartes.

Validation du code **`35ecc68`** : [Android UI `40130467785`](https://github.com/sgramtinne-code/atoutia/actions/runs/40130467785), job **`120980899215`**, **OK (7 tests)** réellement exécutés sur AVD Pixel 7 API 36 ; [Android Kotlin `40130467847`](https://github.com/sgramtinne-code/atoutia/actions/runs/40130467847), job **`120980899520`**, **220/220 JVM**, deux APK et lint réussis (**12 avertissements, une suggestion**) ; [moteur/backend `40130467788`](https://github.com/sgramtinne-code/atoutia/actions/runs/40130467788) réussi, **583 moteur / 617 backend**, typechecks/builds/CLI synthétiques. Onze nouveaux JVM couvrent états de connexion, fermetures/callbacks tardifs, polling local et exclusion/invalidation des lectures. Les quatre fixtures paysage restent conservées et trois cas couvrent le recours contextuel, les actions désactivées et le retour visible après défilement. Premier jalon `54e81d8` également vert ; le cas de défilement est renforcé dans `35ecc68`.

Le développeur a récupéré **`03d732b`** sous WSL : build/install ADB Windows réussis, nouveau salon N/O détecté, trois PNJ connectés, 4/4 et démarrage manuel, plusieurs coups Android acceptés suivis des PNJ. Le relais c ferme un flux, compte neuf refus pendant coupure sans erreur backend ; r rouvre, q restaure reverse vers 3000. Son compteur immédiatement après r ne mesurait pas encore la reconnexion terminée. Les trois CI de ce jalon sont réussies : moteur/backend **`40130918153`**, Android Kotlin **`40130918162`**, Android UI **`40130918197`**.

La réponse explicite **« oui et oui »** complète le résultat Android déjà observé : Reconnexion et Réessayer visibles pendant c ; En direct revenu et recours disparu après r ; carte locale acceptée et PNJ poursuivant après la reprise. Cette confirmation rapportée, complétant les journaux, valide le comportement de reprise pour ce périmètre. Aucun comptage TCP ultérieur ou appui physique sur Réessayer pendant coupure n’est déduit ; le clic et son callback sont vérifiés par les fixtures UI. Les validations nécessaires sont réunies : **ne pas redemander** nouveau build, scripts/coupure, sept fixtures CI, Keystore/Google ou partie complète. Aucun téléphone physique, revue exhaustive ou release revendiqué ; captures, logs et détails du match restent privés.

Ce point de clôture est documentaire : liens, blocs bash et diff vérifiés. Prochaine action : vérifier les trois CI de ce commit, rendre la PR nº 10 prête et fusionner avec le SHA attendu, puis vérifier GitHub, main et ses CI et fournir le retour complet sur main. Le statut GitHub fait foi, sans PR supplémentaire pour inscrire son propre SHA de fusion. Les anciennes attentes sont closes par le retour reçu.

Après intégration, traiter séparément le décalage de snapshot déjà reproduit après reconstruction moteur sur fixture synthétique : sept cartes restantes dans `trickSequence.hands[player]` après un coup légal, mais huit cartes dans snapshot.hand incluant la carte jouée. Le serveur et ses cartes légales restent autoritaires ; ce point ne prouve pas qu’une carte puisse être rejouée. Ajouter une régression qui attend sept cartes et l’absence de la carte jouée, constater son échec, vérifier format client/parseurs/phases de jeu et de fin, puis corriger sur une nouvelle branche. Aucun moteur modifié dans la PR nº 10 ; la vraie base reste protégée. Détails : docs/ANDROID_REVIEW.md.
