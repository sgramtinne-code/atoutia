# Revue Android Kotlin — 24 octobre 2026

État actualisé : les PR nº 7/8 sont intégrées ; la PR nº 9 a reçu les validations de visibilité paysage et de jeu manuel avec trois PNJ. Voir la clôture en fin de document et `ANDROID_LANDSCAPE.md`. Les sections antérieures conservent l’historique de la revue ; elles ne définissent pas les contrôles encore manquants aujourd’hui. La revue exhaustive et la préparation release restent ouvertes.

## Portée et statut

Livraison `fix/android-shared-auth-session`, depuis `main` `5e267e3`, portée par la [PR nº 7](https://github.com/sgramtinne-code/atoutia/pull/7). Les validations du périmètre sessions/CI/lanceur et restauration sont reçues ; vérifier le statut GitHub de la PR et les contrôles du dernier commit pour l’intégration. Les résultats moteur/backend acquis ne valident pas le client Android. Cette revue est en cours ; aucune certification générale de l’application n’est annoncée.

Lecture des coordinateurs de session/connexion Google, stockage des tokens, restauration, salons, partie et historique, clients WebSocket et configuration Android. Lecture ciblée de leurs appels dans `MainActivity` et `RoomLobbyScreen`. Les parseurs HTTP de partie/historique et l’ensemble des composants Compose ne font pas encore l’objet d’une revue exhaustive. La compilation et les tests ont une portée distincte de cette lecture.

## Défaut de coordination des sessions

`MainActivity` et `RoomLobbyScreen` créent plusieurs `AuthSessionCoordinator` et `AndroidSecureAuthTokenStore` pour les mêmes préférences. Avant correction, chaque coordinateur possède son propre verrou. Deux opérations peuvent lire le même refresh token expiré et le soumettre deux fois. `AuthService.refreshSession` rejette le rejeu d’un token consommé et révoque la session concernée ; Android efface aussi ses tokens après rejet. Il s’agit donc d’un risque de déconnexion involontaire, sans qu’une occurrence sur l’appareil du développeur ait été observée dans ce chat.

Un refresh tardif peut aussi réenregistrer une session après déconnexion ou écraser une nouvelle connexion Google. Le correctif rattache le verrou à `AuthTokenStore.sessionLock`. Toutes les instances Android exposent un même moniteur de processus, utilisé pendant l’opération complète lecture/réseau/écriture par les coordinateurs de session et Google. Les appels directs de stockage utilisent ce même moniteur, notamment pour éviter une création concurrente de clé Keystore. Le chiffrement, les formats persistés et le protocole backend ne changent pas. Cela ne constitue pas un verrou interprocessus ; l’application actuelle déclare un seul processus.

Trois tests JVM forcent les chevauchements refresh/refresh, refresh/logout et refresh/Google sans réseau ni pause arbitraire. La version corrigée utilise des objets de stockage distincts partageant les mêmes données et le même verrou, comme les appelants Android. Un test instrumenté vérifie aussi que deux vrais stockages Android exposent le même verrou ; sa compilation seule ne prouve pas son exécution.

## Contrôles automatisés

[Android CI](../.github/workflows/android.yml) s’exécute sur PR, push dans `main` et lancement manuel : Ubuntu 24.04, JDK 17, wrapper Gradle du dépôt, SDK `platforms;android-37.0` et Build Tools 36.0.0. Actions checkout/setup-java épinglées à des commits officiels ; permissions en lecture seule, aucun secret applicatif ni backend réel.

Commandes depuis `apps/android`, avec `--no-daemon --max-workers=2` et autoplay désactivé :

```bash
./gradlew --no-daemon --max-workers=2 :app:testDebugUnitTest -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false
./gradlew --no-daemon --max-workers=2 :app:assembleDebug :app:assembleDebugAndroidTest -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false
./gradlew --no-daemon --max-workers=2 :app:lintDebug -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=false
```

Les deux premières tentatives de préparation CI n’ont exécuté aucun test : `sdkmanager` absent du PATH, puis nom de paquet SDK incorrect. Utiliser son chemin dans `$ANDROID_HOME/cmdline-tools/latest/bin` et le paquet publié `android-37.0`. Ces échecs de préparation ne constituent pas une reproduction du défaut applicatif.

Reproduction réelle avant correction : commit `2e707ad`, [run `40087526338`](https://github.com/sgramtinne-code/atoutia/actions/runs/40087526338), job `120853393837`. Compilation Kotlin et exécution de **192 tests JVM : 189 réussis et trois échecs**, exactement les nouveaux cas `separateCoordinatorsRefreshTheStoredSessionOnlyOnce`, `logoutWaitsForRefreshAndRevokesTheRotatedCredential` et `googleSignInCannotBeOverwrittenByAnOlderRefresh`. Les logs confirment respectivement le rejet du double refresh, le mauvais token de logout et le remplacement de la nouvelle session Google par l’ancienne session rafraîchie. Les APK et le lint étaient ensuite ignorés à cause de cet échec attendu. Après correction applicative **`46163ef`** : [run `40087752809`](https://github.com/sgramtinne-code/atoutia/actions/runs/40087752809), job `120854042192`, **20 rapports / 192 tests JVM, zéro échec, erreur ou test ignoré**. APK debug et APK instrumenté compilés ; lint et contrôles Git réussis. Le [run moteur/backend `40087752798`](https://github.com/sgramtinne-code/atoutia/actions/runs/40087752798) est également réussi. Ces résultats sont ceux du runner GitHub, pas du PC ou de l’appareil du développeur. Les ajustements suivants de documentation et de résumé lint ne changent pas le code applicatif.

## Validation WSL et Keystore sur émulateur reçue

Journal développeur du 24 octobre 2026, après récupération de la branche `fix/android-shared-auth-session` :

- Build debug et instrumenté avec `--no-daemon --max-workers=2`, autoplay désactivé : **BUILD SUCCESSFUL** en 20 secondes.
- Émulateur passé de `offline` à `device` avant installation ; deux APK installés par ADB Windows avec chemins `wslpath -w`, deux **Success**.
- Exécution de `AndroidSecureAuthTokenStoreInstrumentedTest` : **OK (3 tests)** en 0,088 seconde. Persistance/relecture via Keystore, effacement et identité du verrou entre deux stockages sont vérifiés.

Ces résultats proviennent du PC et de l’émulateur du développeur, pas du runner GitHub. Aucun téléphone physique, compte Google réel ou scénario multijoueur n’est validé par ces trois tests. Le journal n’affiche pas de SHA local ; la tête de branche distante vérifiée avant l’enregistrement est `80dcab4`, avec correctif applicatif `46163ef` inchangé. Les runs de cette tête, Android `40088256774` et moteur/backend `40088256766`, sont tous deux réussis. Ne pas répéter le Keystore sans changement concerné ; poursuivre les essais fonctionnels du README.

## Connexion Google observée sur l’émulateur

Le 24 octobre 2026, après récupération explicite de `13be59e`, le développeur transmet deux builds debug avec Client ID Google et autoplay false réussis, installation ADB Windows et lancement réussis. Le backend annonce loopback HTTP/WebSocket et Google/bootstrap activés. Le curl en échec dans le journal précède son démarrage, sans nouvel échec réseau transmis ensuite.

Les captures montrent le sélecteur Google puis l’accueil authentifié en paysage : l’aboutissement de ce parcours est observé visuellement. Aucune réponse HTTP précise, révocation après déconnexion, durée de session ou restauration de partie n’est déduite de ces images. Les comptes et images restent hors de GitHub.

Le cadrage initial de l’accueil ne montre pas les actions du bas. Le fichier `AuthenticatedHomeScreen.kt` a été relu en entier et possède déjà un défilement vertical. Guider un glissement vers le haut pour atteindre Historique et Se déconnecter ; ce cadrage seul ne prouve pas un défaut de mise en page. La prochaine validation est déconnexion → redémarrage encore déconnecté → reconnexion Google → attente de 16 minutes sur l’accueil → Historique sans nouvel écran Google, avant les essais avec trois PNJ. L’APK actuel suffit ; aucun changement applicatif n’est livré ici.

## Vues déconnectées et accès à l’historique observés

De nouvelles captures de l’émulateur montrent deux vues « Aucune session Atoutia », puis l’accueil authentifié et l’historique chargé avec du contenu persistant. L’accès authentifié à l’historique est observé visuellement ; les données du résultat et les captures restent hors du dépôt.

Ces images ne démontrent pas à elles seules l’exécution du force-stop entre les vues déconnectées, la révocation serveur, ou une attente de 16 minutes depuis la dernière connexion Google. La capture terminal suivante confirme ensuite le force-stop et le relancement réussi ; le développeur rapporte globalement que tout semble fonctionner et demande la suite. Enregistrer ce retour positif comme validation rapportée, sans inventer une mesure du délai ni une trace réseau de rotation. Une reconnexion Google remet le délai à zéro : un long intervalle depuis un ancien lancement ne suffit pas à prouver un refresh. Si l’attente n’a pas été faite, garder l’accueil et le backend ouverts 16 minutes, puis ouvrir l’historique sans nouvel écran Google. Les essais PNJ et restauration de partie restent à effectuer.

Le libellé « Backend non testé » est associé à `BackendCheckState.Idle` dans MainActivity : il décrit le contrôle manuel de santé non lancé dans cet écran, sans constituer une erreur de connexion. Aucun changement applicatif n’est livré par cet enregistrement.

## Avertissements lint observés

Contrôle du commit `f0adaad` : [run Android `40088059834`](https://github.com/sgramtinne-code/atoutia/actions/runs/40088059834), job `120854929369`, réussi avec **192/192 tests JVM**, les deux APK et le lint. Le [run moteur/backend `40088059833`](https://github.com/sgramtinne-code/atoutia/actions/runs/40088059833) est également réussi. Le correctif applicatif reste `46163ef`.

Le lint n’a aucune erreur bloquante mais conserve **14 avertissements et une suggestion** :

| Signal | Nombre | Suite à donner |
| --- | ---: | --- |
| Cible Android, Gradle et versions OkHttp/mockwebserver | 4 | Évaluer les mises à jour et leurs compatibilités ; aucun changement automatique de cible ou de dépendances dans ce correctif. |
| Position du paramètre Compose `Modifier` | 3 | Amélioration d’API Compose à traiter avec la revue UI. |
| `scheduleAtFixedRate` des deux clients WebSocket | 2 | Tester reprise/arrière-plan et fermeture ; envisager une cadence sans rattrapage en rafale. |
| Orientation fixe | 1 | Préserver `sensorLandscape` demandé ; tester les grands écrans où Android peut ignorer cette restriction. |
| `DataExtractionRules` | 1 | Examiner explicitement sauvegardes et transfert d’appareil sur Android récent avant production ; ne pas déduire toute la politique du seul `allowBackup=false`. |
| Icône d’application absente | 1 | Préparation visuelle de la livraison. |
| Extensions KTX pour SharedPreferences | 2 | Suggestion de style ; conserver les garanties de `commit()` et le verrou partagé lors d’une évolution. |
| `AutoboxingStateCreation` | 1 suggestion | Évaluer `mutableIntStateOf` lors de la revue Compose. |

Ces signaux ne sont pas corrigés ni supprimés par une baseline lint. Ils restent visibles dans les logs CI. Une compilation réussie et un lint sans erreur n’attestent ni un essai sur appareil ni l’absence de défaut fonctionnel.

## Vérifications encore nécessaires

- Vérifier les contrôles réels du dernier commit de la PR. La reproduction, la correction JVM et les trois tests Keystore sur émulateur sont acquis ; l’arrivée à l’accueil après sélection Google est observée, mais déconnexion, refresh réel et multijoueur restent à recevoir. Un lint réussi peut comporter des avertissements : consulter le résumé dans les logs.
- Sur appareil : connexion Google, déconnexion, redémarrage/restauration, refresh réel, partie avec trois PNJ, reconnexion et historique. Le test Keystore ciblé est déjà réussi sur émulateur. Suivre la procédure complète du README. Ne pas utiliser les tests HTTP instrumentés qui dépendent d’un backend sans préparer leur environnement.
- Revue du cycle de vie temps réel : le client de salon programme son heartbeat après `onConnected` sans arbitrage avec une fermeture concurrente, et ses callbacks terminaux annulent le heartbeat sans fermer l’exécuteur. Reproduire avec un test dédié avant correction. Le client de partie possède une gestion différente ; vérifier aussi la course entre `acknowledgeRevision` et `close`.
- Revue Compose/navigation : callbacks HTTP tardifs, annulation des effets, transitions salon/partie et restauration après destruction d’activité. Les coordinateurs déjà testés ne couvrent pas automatiquement ces interactions d’écran.
- Préparation d’une release publique : `ATOUTIA_API_BASE_URL` release est encore vide, donc une compilation release ne démontrerait pas une application connectable en production. Le HTTP clair est réservé au manifest debug, les sauvegardes sont désactivées et l’orientation `sensorLandscape` doit rester conservée. Aucune publication ni migration de cible SDK n’est incluse dans ce correctif.

La correction des WebSockets, l’audit complet de l’UI et une livraison production ne sont pas présentés comme terminés par cette PR.

Le passage direct du chemin Linux à adb.exe dans `dev-android-room.mjs` est corrigé par le helper de support `09cee69` décrit ci-dessous ; reprendre le lanceur automatique. `dev-autoplay-room.mjs` ne renouvelle pas ses access tokens ; effectuer l’attente de 16 minutes pour le refresh Android sur l’accueil avant leur création. Seul le passage du chemin APK au lanceur automatique est corrigé dans `09cee69` ; le renouvellement des tokens PNJ reste à examiner.

La capture suivante confirme le défilement de l’accueil : Historique, Paramètres et Se déconnecter sont visibles. Le message « Le profil joueur arrive prochainement. » correspond à l’action de profil encore prévue ; ce n’est pas une erreur d’authentification. Les captures suivantes montrent un écran déconnecté puis l’accueil et l’historique chargé ; le redémarrage entre les deux vues déconnectées et le délai de 16 minutes restent à confirmer.

## Étape actuelle : partie et restauration

Le test de fermeture/relancement a maintenant une preuve terminal supplémentaire et le scénario d’authentification reçoit un retour positif du développeur. Ne pas le refaire avant de passer au multijoueur. L’observation directe et la validation rapportée restent distinctes : aucune mesure du token n’est fournie par ces captures.

Réutiliser backend et APK, puis tester un nouveau salon avec Android PLAYER_0 et trois PNJ via le script existant. Tester fermeture/relancement Android quand PLAYER_0 doit jouer une carte, en gardant backend et PNJ actifs, puis restauration de la même partie/main. À la fin : résultat, Rejouer vers les salons, Retour vers l’accueil puis Historique. Les résultats ne sont pas encore reçus ; PR nº 7 toujours en brouillon, aucun changement applicatif dans cet enregistrement.

## Lanceur automatique et chemins ADB Windows

À la demande du développeur qui ne peut pas copier le salon, rétablissement du lanceur automatique existant comme procédure du test. Détection du nouveau salon, choix PLAYER_0 manuel et ajout des trois PNJ restent ceux de `dev-android-room.mjs` ; aucun identifiant à copier.

Correctif de support **`09cee69`** : `resolveAdbInstallPath` convertit uniquement le chemin APK pour adb.exe lancé sous Linux/WSL avec `wslpath -w`, via arguments directs sans shell. Échec de conversion ou résultat vide arrêtent le lancement au lieu d’utiliser un chemin invalide ; chemins natifs inchangés. Six tests Vitest locaux réussis, syntaxe du lanceur et actionlint réussis, CI moteur/backend étendue avec ces tests. L’exécution réelle complète du lanceur sous WSL est reçue et réussie, jusqu’à FINISHED et affichage cohérent de l’historique, comme détaillé ci-dessous. Aucun changement Kotlin, SQLite ou logique PNJ. La prochaine validation utilise le script automatique, N pour autoplay et O pour les PNJ, puis création du salon seulement à son invite. PR nº 7 en brouillon jusqu’aux résultats multijoueurs.

Intégration des tests du lanceur : le run `40104824613` a signalé un conflit de collecte, car Vitest chargeait le fichier utilisant node:test. Le test utilise maintenant Vitest, comme la suite backend ; les six cas ciblés sont réussis localement. Le job backend existant les exécute directement, sans étape Node distincte. Vérifier le run du dernier commit avant d’annoncer la CI réussie ; aucune fusion sur cet échec intermédiaire.

## Validation réelle du lanceur et d’une partie complète

Le développeur a récupéré explicitement `6669443` puis exécuté `dev-android-room.mjs` sous WSL avec ADB Windows et un émulateur prêt. Le journal confirme backend sain, N/O, build debug réussi, autoplay PLAYER_0 OFF, installation réussie, lancement Android, détection automatique du nouveau salon, ajout des trois PNJ et démarrage manuel à quatre joueurs. Le script ne contrôle que PLAYER_1 à PLAYER_3. Il se termine normalement sur FINISHED et Test terminé, avec retour au shell. Les captures montrent partie en cours, résultat final et historique chargé avec le même résultat. Ni log brut ni détails privés du match ne sont publiés.

La correction de chemin Windows du lanceur est ainsi validée sur le PC du développeur, au-delà des six tests de helper. La CI de `6669443` est réussie : moteur/backend `40105070817` (583 moteur, 605 backend dont six helpers, typechecks/builds et CLI) et Android `40105070837`.

Point restant : confirmation factuelle du force-stop/relancement en cours de CETTE partie avec récupération de la même partie/main sans nouvelle connexion Google. Les deux états de jeu transmis ne sont pas une comparaison avant/après et le journal n’inclut pas le troisième terminal ADB. Demander seulement cette confirmation, sans faire rejouer le match. Les boutons finaux sont visibles et l’historique est chargé ; le clic Rejouer n’est pas directement observé. PR nº 7 en brouillon jusqu’aux validations nécessaires, sans changement applicatif dans ce point documentaire.

## Clôture du périmètre sessions, lanceur et restauration

La confirmation explicite « oui c’est ok » du développeur et deux captures du même état de partie/main complètent la restauration après fermeture/relancement, sans nouvelle connexion Google. Un nouveau journal confirme le lanceur avec N/O, build/installation, détection et PNJ ; cette exécution sert à la restauration, tandis que la première partie complète et son historique sont déjà acquis. Aucune répétition de ces essais n’est nécessaire sans changement concerné.

Ce périmètre est validé : 192 JVM Android, APK/lint, 583 moteur, 605 backend dont six helpers, typechecks/builds/CLI en CI ; Keystore trois tests sur émulateur, Google avec retour positif, automatisation WSL/ADB Windows, partie complète, résultat/historique cohérents et restauration confirmée. Les données locales restent privées. Le dernier point CI avant clôture documentaire est `4701e96`, runs `40105927418` et `40105927594`, tous deux réussis. L’intégration doit être vérifiée sur le dernier commit et dans le statut réel de la PR nº 7.

La revue exhaustive reste ouverte : cycle de vie WebSocket, callbacks Compose, parseurs et avertissements lint/DataExtractionRules/grands écrans, puis configuration release. Cette clôture n’est pas une validation production ni une exécution sur téléphone physique ou de toute la suite instrumentée. Repartir du main intégré pour les corrections suivantes et ne pas rouvrir les tests de ce jalon sans raison concrète.


## WebSocket : correction verte, essais ciblés sur émulateur à recevoir

Correctif Kotlin **`0afd032`** : Android CI `40108167912`, job `120914099092`, réussie avec **209/209 tests JVM**, APK debug et APK de test compilés, lint réussi (**12 avertissements, une suggestion**, deux alertes scheduleAtFixedRate supprimées par le délai fixe). Moteur/backend CI `40108167922` réussie ; le code backend est alors inchangé. La reproduction rouge reste `309fa65` : 14 échecs avant correction. Aucun test instrumenté n’est exécuté par ces builds.

Un outil de test local `apps/backend/scripts/dev-android-network.mjs` ajoute un relais TCP uniquement sur 127.0.0.1:3001 vers le backend 127.0.0.1:3000. Il configure ADB reverse, relance Android pour éliminer les anciennes connexions directes, puis accepte c/r/q (couper/reprendre/quitter). Il détruit les flux Android lors de la coupure et refuse les nouveaux ; backend et PNJ restent sur leur liaison directe. À la sortie normale/Ctrl-C, il ferme le relais et restaure reverse vers 3000. Un arrêt forcé du processus nécessite la commande de restauration manuelle indiquée dans la procédure. Aucune inspection, journalisation de trafic, écriture de base ou modification du backend. Cinq tests Vitest locaux passent, dont transmission, coupure, reprise, fermeture, port occupé et parcours CLI avec ADB simulé ; cela ne prouve pas son exécution sous WSL/ADB Windows.

La PR nº 8 reste en brouillon, main `82b0937`. Prochaine action : vérifier les CI du dernier commit incluant cet outil, puis recevoir les essais ciblés du développeur. Procédure complète : [docs/ANDROID_WEBSOCKETS.md](ANDROID_WEBSOCKETS.md). Faire d’abord le salon seul N/N, quitter/recréer/quitter ; ensuite le lanceur N/O, relais dans un troisième terminal avant création du nouveau salon, démarrage à 4/4, c/r en partie et force-stop/relancement. Aucun ID à copier ni test Keystore/Google à répéter. Conserver les résultats et leurs limites avant fusion.

Contrôle local de l’outil réseau : suite backend complète **72 fichiers, 610 tests réussis** ; cinq nouveaux tests de relais/CLI compris. Syntaxe des deux scripts et diff vérifiés. Le commit **`94dcf75`**, outil réseau compris, est maintenant confirmé vert dans les deux CI : moteur/backend `40108570218` (job `120915296625`) et Android `40108570232` (job `120915296646`). Android : 209/209 JVM, APK debug/instrumenté et lint réussis, 12 avertissements et une suggestion. Backend : 610 tests, moteur : 583, typechecks/builds et CLI synthétiques réussis. Test local supplémentaire de SIGINT avec ADB simulé : sortie 0 et reverse restauré. Les liens locaux et blocs bash de la documentation sont vérifiés. Le Kotlin reste `0afd032`, l’outil réseau `94dcf75`. Vérifier aussi les contrôles du dernier commit documentaire sur la PR ; les seuls résultats fonctionnels encore attendus sont les essais ciblés WSL/émulateur décrits ci-dessus. PR nº 8 en brouillon, aucune fusion annoncée.


## Déblocage du parcours depuis une ancienne partie restaurée

Le développeur a récupéré `8a5adee` et confirmé health OK, puis signale être bloqué dans une ancienne partie en cours. La capture privée montre les autres participants absents et le tour d’un autre joueur : aucune carte locale ne doit être forcée. Le retour à l’accueil était limité aux parties terminées ; la procédure précédente ne couvrait pas cet état initial. Ce retour n’atteste pas encore les nouveaux essais salon/réseau de la PR nº 8.

Correction sur la même branche/PR : bouton **Retour à l’accueil** toujours accessible au-dessus du contenu d’une partie en cours et geste Retour Android équivalent, désactivés pendant une soumission de carte/enchère. Callback dédié `onReturnToHome`, distinct des actions de fin : conserve l’authentification et la référence de reprise, sans clearActiveRoomSession, leaveRoom, abandon, forfait ou suppression SQLite. La sortie d’écran dispose l’abonnement temps réel existant. La partie reste en cours côté serveur ; une nouvelle création enregistrera sa propre référence selon le parcours normal. Ne pas présenter ce retour comme la clôture de la partie.

Le dernier état CI antérieur est `8a5adee` : moteur/backend `40108828266` et Android `40108828264` réussis, 209 JVM ; ce dernier lint contient dix avertissements et une suggestion, les deux avis de versions OkHttp étant absents par rapport au run `94dcf75` sans changement de dépendances. Ces résultats ne valident pas encore le nouveau bouton. Compiler/tester/linter le nouveau commit, puis recevoir le retour WSL/émulateur avant fusion. Pas de SDK local assistant, ni nouvelle validation sur appareil annoncée.

Reprise adaptée : récupérer la branche, vérifier health/ADB puis lancer dev-android-room.mjs avec N/N pour installer le nouvel APK. Attendre ATTENTE DU NOUVEAU SALON ; si l’ancienne partie revient, toucher Retour à l’accueil, puis Jouer/Créer une partie. Quitter/recréer/quitter le salon seul ; ensuite scénario N/O avec relais réseau avant création. Git pull seul ne réinstalle pas Android. Aucun ID à copier, aucune purge ou suppression des données Android. La PR nº 8 reste en brouillon. Procédure complète dans docs/ANDROID_WEBSOCKETS.md.


## Clôture des validations WebSocket, navigation et outils locaux — PR nº 8

Le développeur fournit les vues avant/après de la partie précédemment rechargée et le journal PNJ continu. La première vue correspond à l’état restauré ; la suivante montre une carte locale jouée, la main mise à jour et le pli suivant. Le journal confirme l’action PNJ qui suit. La progression du jeu après relancement est donc acquise, en complément de la coupure TCP mesurée, des refus pendant coupure, du rétablissement sans erreur backend et de la restauration reverse déjà reçus. Les identifiants, cartes, révisions, scores, captures et logs bruts restent privés.

Les validations nécessaires au périmètre PR nº 8 sont réunies : reproduction avant correction (14 échecs parmi 17 nouveaux tests, 192 antérieurs verts), 209 JVM après correction, APK debug/instrumenté compilés et lint réussi ; 583 moteur, 617 backend dont six cas de relais et six SQLite, typechecks/builds/CLI synthétiques ; exécution WSL/ADB Windows, nouveaux salons connectés, N/O avec trois PNJ et jeu manuel, coupure/rétablissement TCP mesurés, partie rechargée puis action locale et progression PNJ observées. Ne pas redemander la confirmation ou une nouvelle partie complète. Il n’y a ni test sur téléphone physique, ni trace exhaustive de chaque échange WebSocket, ni exécution de toute la suite instrumentée dans la CI. La fin de match/historique et Keystore/authentification restent les acquis de la PR nº 7.

Commits applicatifs : WebSocket `0afd032`, retour à l’accueil `5582f63` (conserve reprise/authentification, ne termine pas la partie serveur), lecture SQLite du lanceur `2318c3d`, diagnostic TCP s `9c9c808`. Dernier point CI avant clôture documentaire : **`8920ce7`**, moteur/backend **`40121810617`** et Android **`40121810661`**, tous deux réussis. Les contrôles du commit de clôture doivent aussi réussir avant intégration. Aucun nouveau changement applicatif dans ce point documentaire.

Prochaine action : vérifier les CI de cette clôture et le statut réel de la PR nº 8, la rendre prête puis fusionner en contrôlant le SHA ; vérifier ensuite main et ses CI. Donner la procédure complète de retour sur main. Le statut GitHub fait foi : aucune fusion n’est annoncée dans ce texte avant son exécution, et aucune PR documentaire supplémentaire n’est nécessaire pour inscrire son propre SHA de fusion. Les anciennes mentions « en attente » décrivent l’historique ; la présente clôture définit les validations reçues. Après intégration, poursuivre séparément la revue UI Compose/paysage et visibilité des cartes, parseurs, sauvegardes/DataExtractionRules, grands écrans et préparation release. Préserver sensorLandscape, les garde-fous d’authentification et la vraie base ; aucune purge ou livraison production implicite.


## Nouvelle étape Android : main visible en paysage

Le développeur a confirmé main **`81b4f2d`** propre et à jour après intégration de la PR nº 8. Les validations WebSocket/navigation/outils sont clôturées ; runs de push main `40122399732` et `40122399733` réussis. Ne pas redemander ces essais ni reprendre les anciens audits SQLite.

Nouvelle branche **`fix/android-landscape-hand-visibility`**, depuis ce main vérifié. Le score et les métriques occupaient une grande partie de la même colonne défilante que la main ; les cartes pouvaient être hors de la zone initialement visible. En paysage à partir de 600 dp de large, un bandeau compact rassemble score/cible, atout, donne, donneur, preneur et révision à côté du retour à l’accueil. La main possède une zone fixe ; seules enchères, messages, commandes secondaires et actions de fin défilent dessous. Le tableau de jeu conserve sa disposition et ses proportions. Le repli hors paysage conserve son contenu défilant et son retour accessible.

Aucun changement moteur/backend, de protocole, de légalité des cartes, de token, de reprise ou de SQLite. Préserver sensorLandscape et les callbacks serveur existants ; seuls les coups autorisés restent sélectionnables, la soumission bloque les actions. Les acquis de la PR nº 8 restent valables pour leur périmètre.

Quatre tests Compose instrumentés sont ajoutés avec des DTO fictifs, sans connexion réelle ni accès au compte/stockage : huit cartes visibles sans défilement dans une zone 640 × 320 dp ; police 1,3 et sélection autorisée/soumission ; enchères défilant sans déplacer la main ; actions de fin accessibles. La classe cible est `tech.devoo.atoutia.ui.game.LandscapeGameScreenInstrumentedTest`. Elle utilise ComponentActivity isolée et les dépendances de test déjà présentes, sans nouvelle bibliothèque. Ces tests ne sont PAS encore exécutés sur appareil ; Android CI compile leur APK mais n’exécute pas l’instrumentation. Aucun SDK/émulateur n’est disponible localement à l’assistant.

Prochaine action : vérifier les CI du commit et compiler APK/lint, puis fournir au développeur le build/install et l’exécution de cette seule classe (pas de lancement global des tests Keystore, qui modifient leur stockage). Recevoir ensuite un essai Android réel N/O avec huit cartes visibles et une carte jouée, sans refaire les coupures réseau ni un match complet. Branche/PR à laisser en brouillon jusqu’aux résultats nécessaires. Procédure : docs/ANDROID_LANDSCAPE.md. Les données et captures de jeu restent privées ; aucune livraison production.


## Paysage : compilation et contrôles automatiques réussis, validation appareil attendue

La [PR nº 9](https://github.com/sgramtinne-code/atoutia/pull/9), branche `fix/android-landscape-hand-visibility`, porte le code **`c4fc8d0`** depuis main `81b4f2d`. Android CI **`40123839940`**, job **`120960927123`**, est réussie : **209/209 JVM**, APK debug et instrumenté compilés, lint réussi avec **12 avertissements et une suggestion**. Moteur/backend CI **`40123839913`** réussie ; aucun code moteur/backend n’a changé. Les quatre nouveaux tests UI sont compilés dans l’APK de test mais **n’ont pas encore été exécutés sur appareil**. Aucun résultat visuel réel de cette nouvelle disposition n’est revendiqué.

La documentation et les blocs bash/liens locaux sont vérifiés. Prochaine action : récupérer la branche, construire/installer les deux APK avec le Client ID validé et autoplay false ; exécuter uniquement `tech.devoo.atoutia.ui.game.LandscapeGameScreenInstrumentedTest`, attendu OK (4 tests), puis nouveau salon N/O par le lanceur existant et vue de la main complète sans défilement, carte locale et progression PNJ. Procédure complète dans docs/ANDROID_LANDSCAPE.md. La PR nº 9 reste en brouillon jusqu’aux résultats nécessaires et aux CI du dernier commit. Ne pas fusionner ni annoncer toute l’application validée ; main reste `81b4f2d`. Les contrôles acquis de la PR nº 8 ne sont pas à répéter.


## Clôture des validations paysage — PR nº 9

Le développeur fournit la suite du même essai WSL/ADB Windows sur **`c2f5981`** (correctif applicatif **`8ed63bf`**) : nouveau salon détecté par le lanceur **N/O**, trois PNJ connectés, 4/4 puis démarrage manuel. Le journal montre ensuite plusieurs actions Android acceptées suivies des coups PNJ et le passage à une donne suivante. La nouvelle capture privée correspond à l’état avancé du journal : main complète visible sans défilement, carte autorisée mise en évidence, bandeau compact et retour disponibles, joueurs connectés. Le contrôle fonctionnel manquant est donc reçu. Aucun identifiant, carte, score, révision de partie réelle, capture ou journal brut n’est publié.

Les validations requises du périmètre PR nº 9 sont réunies : reproduction des trois échecs UI avant correction, quatre fixtures instrumentées réellement réussies après correction sur AVD CI, **209 JVM**, APK debug/instrumenté et lint réussis (**12 avertissements, une suggestion**), **583 moteur / 617 backend**, typechecks/builds/CLI synthétiques ; installation réelle WSL/ADB, main visible et jeu manuel Android avec progression des trois PNJ. Ne pas refaire le build, les quatre fixtures, une partie complète, Keystore/Google ou les coupures réseau pour redemander cette preuve. Le bouton Actualiser reste un secours HTTP dans cette livraison. Aucun essai téléphone physique, revue exhaustive Android ou release production n’est revendiqué.

Les trois CI du dernier jalon documentaire **`c86fbd8`** sont confirmées réussies : moteur/backend **`40128174978`**, Android Kotlin **`40128174997`**, Android UI **`40128174985`**. Vérifier aussi les trois contrôles du commit de clôture avant fusion. Ce point ne modifie aucun code applicatif ; liens, blocs bash et diff documentaire sont vérifiés.

Prochaine action : contrôler les CI de cette clôture, rendre la PR nº 9 prête puis fusionner avec vérification du SHA attendu ; vérifier ensuite le statut GitHub, main et ses CI, et fournir le retour complet sur main. La fusion n’est pas annoncée par avance dans ce document : le statut GitHub fait foi, sans PR supplémentaire pour inscrire son propre SHA de fusion. Après intégration, poursuivre séparément la synchronisation visible (connexion/reprise/erreur et Réessayer contextuel), puis la revue des callbacks, parseurs et sauvegardes/DataExtractionRules. Préserver le secours manuel tant que son remplacement n’est pas testé, sensorLandscape, les sessions et la vraie base. Les anciennes mentions de contrôle PNJ manquant décrivent un état désormais clôturé par ce retour.


## Snapshot de main : décalage reproduit sur fixture synthétique

Le moteur a été reconstruit localement depuis les sources du dépôt, puis une fixture déterministe (baseSeed 4000, prise légale, un seul PLAY_CARD légal) a été exécutée sans backend, stockage, compte ou donnée réelle. Avant le coup : huit cartes. Après : `trickSequence.hands[player]` contient sept cartes, tandis que `createPlayerMatchSnapshot(...).hand` en contient toujours huit et inclut encore la carte jouée. Le script diagnostique a vérifié explicitement ces trois résultats. Il ne constitue pas un nouveau test de non-régression ajouté à la suite ; les effectifs de CI moteur/backend restent inchangés.

Cause lue : `createPlayerHand` dans `packages/belote-engine/src/playerMatchSnapshot.ts` construit le champ hand de la phase de jeu depuis `completedDeal.hands`, alors que les cartes légales viennent de `trickSequence.hands`. Les tests de snapshot existants vérifient notamment la main au début du jeu et ne couvrent pas cette réduction après un coup. Le serveur conserve bien sept cartes et sa liste légale reste autoritaire : ce diagnostic ne démontre pas qu’une carte déjà jouée puisse être rejouée.

À traiter séparément après le chantier de synchronisation : ajouter un test qui attend sept cartes et l’absence de la carte jouée, reproduire son échec, vérifier le contrat du format client et les parseurs, puis corriger et tester les phases de jeu/fin. Aucune correction moteur ou changement de format n’est inclus dans la PR nº 10. Cette note et ses comptages proviennent uniquement de la fixture synthétique ; aucune main réelle n’est publiée.


## Clôture fonctionnelle de la synchronisation (PR nº 10)

Le développeur confirme explicitement les deux résultats Android demandés : Reconnexion/Réessayer pendant la coupure, puis En direct et disparition du recours après reprise, avec carte locale acceptée et progression PNJ. Les journaux WSL/ADB sur `03d732b` attestent build/install, N/O à 4/4, coups locaux/PNJ et relais c/r/q avec reverse restauré ; le code applicatif est `35ecc68`. Les sept fixtures UI réelles en CI et 220 JVM passent, APK/lint et moteur/backend aussi. Le périmètre de cette livraison est validé ; vérifier les CI du commit de clôture et le statut réel de la PR avant intégration, sans refaire le scénario. La suite prioritaire après fusion est le décalage de snapshot reproduit ci-dessus, avec test de régression séparé et contrôle du format client. Aucun changement moteur ou donnée réelle dans la clôture.


## Snapshot de main — correction et régressions sur branche

La PR nº 10 est fusionnée dans **`bc7e18a`**, récupéré proprement sur le PC. Les trois CI de push main sont réussies : moteur/backend `40131923801`, Android Kotlin `40131923921` (220 JVM, APK/lint), Android UI `40131923829` (7/7 réellement exécutés). Ne pas rouvrir ses validations acquises.

Nouvelle branche **`fix/player-snapshot-remaining-hand`** depuis ce main. Avant correction : les cinq nouveaux tests moteur donnent **un réussi/quatre échecs**, et le nouveau cas HTTP authentifié échoue (sept anciens cas réussis) sur huit cartes au lieu de sept. Après correction, `createPlayerHand` lit `trickSequence.hands[player]` pour jeu/fin ; les enchères conservent la distribution initiale de cinq cartes. Distribution complète immuable, légalité, scores, format client 1 et persistance inchangés. Aucun changement de règles/version documentaire, aucune vraie base consultée.

Validation locale actuelle : **60 fichiers / 588 moteur**, **73 fichiers / 618 backend**, typechecks/builds et CLI SQLite synthétiques réussis. Régressions : après un coup, tous les plis, fin vide, nouvelle donne à cinq, aller-retour JSON v1 et routes authentifiées commande/snapshot. Parseur Android compatible avec une liste réduite, contrôle des cartes légales conservé. Une huitième fixture Compose met à jour le DTO, vérifie l’absence de la carte jouée, la visibilité et la sélection restantes ; elle attend son exécution CI. Workflow exige explicitement OK (8 tests). Aucun SDK/AVD local de l’assistant.

Prochaine action : pousser le jalon, ouvrir la PR en brouillon et vérifier les trois CI du dernier commit. Avant fusion, recevoir uniquement l’essai PC ciblé : backend reconstruit/redémarré, lanceur N/O, carte retirée visuellement et PNJ poursuivant. Les étapes complètes sont dans [le suivi du snapshot](PLAYER_HAND_SNAPSHOT.md). Aucun nouvel audit SQLite, match complet ou scénario réseau/authentification nécessaire. Les IDs, cartes, scores et logs réels restent privés.
