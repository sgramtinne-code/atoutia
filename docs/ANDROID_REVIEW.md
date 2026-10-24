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

Outils de test à examiner séparément : `dev-android-room.mjs` passe le chemin Linux de l’APK directement à adb.exe ; la variante en cours utilise l’installation `wslpath -w` explicitement validée, puis le script PNJ existant. `dev-autoplay-room.mjs` ne renouvelle pas ses access tokens ; effectuer l’attente de 16 minutes pour le refresh Android sur l’accueil avant leur création. Aucun de ces scripts n’est modifié ou présenté comme corrigé ici.

La capture suivante confirme le défilement de l’accueil : Historique, Paramètres et Se déconnecter sont visibles. Le message « Le profil joueur arrive prochainement. » correspond à l’action de profil encore prévue ; ce n’est pas une erreur d’authentification. Aucun résultat de clic sur Se déconnecter ou sur Historique après expiration n’est encore reçu.
