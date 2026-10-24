# Revue Android Kotlin — 24 octobre 2026

## Portée et statut

Branche `fix/android-shared-auth-session`, depuis `main` `5e267e3`, [PR nº 7](https://github.com/sgramtinne-code/atoutia/pull/7) en brouillon. Les résultats moteur/backend acquis ne valident pas le client Android. Cette revue est en cours ; aucune certification générale de l’application n’est annoncée.

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

Correctif de support **`09cee69`** : `resolveAdbInstallPath` convertit uniquement le chemin APK pour adb.exe lancé sous Linux/WSL avec `wslpath -w`, via arguments directs sans shell. Échec de conversion ou résultat vide arrêtent le lancement au lieu d’utiliser un chemin invalide ; chemins natifs inchangés. Six tests Vitest locaux réussis, syntaxe du lanceur et actionlint réussis, CI moteur/backend étendue avec ces tests. L’exécution réelle complète sous WSL reste à recevoir. Aucun changement Kotlin, SQLite ou logique PNJ. La prochaine validation utilise le script automatique, N pour autoplay et O pour les PNJ, puis création du salon seulement à son invite. PR nº 7 en brouillon jusqu’aux résultats multijoueurs.

Intégration des tests du lanceur : le run `40104824613` a signalé un conflit de collecte, car Vitest chargeait le fichier utilisant node:test. Le test utilise maintenant Vitest, comme la suite backend ; les six cas ciblés sont réussis localement. Le job backend existant les exécute directement, sans étape Node distincte. Vérifier le run du dernier commit avant d’annoncer la CI réussie ; aucune fusion sur cet échec intermédiaire.
