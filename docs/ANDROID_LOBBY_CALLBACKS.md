# Fermeture du coordinateur de salon — 25 octobre 2026

Base : main `c4f1519`, PR nº 13 intégrée, récupération PC reçue. Branche `fix/android-lobby-refresh-close`.

## Problème examiné

RoomLobbyRealtimeCoordinator reçoit un snapshot puis appelle getRoom synchroniquement. Le transport vérifie son état avant d'appeler le coordinateur, mais une fermeture pendant getRoom ne protège pas la suite déjà engagée. Le coordinateur retourne directement la connexion du transport et transmet encore un succès ou une erreur après cette lecture. RoomLobbyScreen ferme cette connexion lors de la sortie du salon ; ce constat de code ne prouve pas un incident observé sur le PC.

PlayScreen désactive déjà Retour pendant création/join. Aucun changement de ces actions ou des callbacks de démarrage/chargement de partie dans ce périmètre.

## Reproduction préparée

Trois nouveaux tests JVM dans RoomLobbyRealtimeCoordinatorTest :

- succès de getRoom après fermeture : aucun onRoomUpdated attendu ;
- erreur de getRoom après fermeture : aucun onFailure attendu ;
- fermeture répétée : un seul close du transport et aucun nouveau callback/HTTP après fermeture.

Les deux premiers utilisent deux workers, latches et attentes bornées. La fermeture doit se terminer avant la libération du HTTP simulé. Les neuf tests antérieurs restent les contrôles du fonctionnement actif et du protocole. Fixtures synthétiques uniquement : aucun compte, réseau, Keystore, préférence, base ou émulateur du développeur.

État : code de production inchangé, compilation/reproduction distante à obtenir. Diff source vérifié localement ; aucun SDK Android local assistant. Après échecs réellement obtenus : protéger l'état fermé et les notifications, sans verrou pendant getRoom ni attente de sa fin dans close. Aucune annulation du HTTP déjà engagé ne sera revendiquée.

## Validation requise

CI Android Kotlin : exécution des JVM, APK debug/instrumenté et lint. Contrôler aussi les CI moteur/backend et UI existantes (8 paysage/sync + 3 politique + 7 historique). Aucun nouveau scénario PC N/O, compte ou match complet nécessaire pour cet ordre de callbacks simulé. Ne pas annoncer de fusion avant vérification du dernier commit et des CI.


## Salon : trois échecs reproduits, correction proposée — PR nº 14

La reproduction **`bf91800`** est réelle : [Android CI `40178838447`](https://github.com/sgramtinne-code/atoutia/actions/runs/40178838447), job **`121125320806`**, **223 tests JVM : 220 réussis/3 échecs**. Les deux réponses après close déclenchent encore un callback (succès/erreur) ; deux close sont transmis au transport. Kotlin compilé, aucun échec de timeout ; APK/lint ignorés après l'échec attendu des tests. Moteur/backend `40178838560` réussi.

Correction proposée dans la [PR nº 14](https://github.com/sgramtinne-code/atoutia/pull/14) : un état fermé par connexion invalide les notifications avant le close du transport et rend close idempotent. État et livraison des callbacks sont sérialisés ; getRoom et fermeture du transport restent hors verrou. Le HTTP commencé peut finir mais ne livre plus de résultat au listener fermé. Validations de protocole et tests inchangés ; aucune annulation HTTP revendiquée, aucun changement Compose/session/authentification/persistance/backend/règles/sensorLandscape. Les callbacks déjà transmis avant close ne sont pas rétractés. Diff et liens/bash documentaires vérifiés localement ; aucun SDK local assistant. Suite : obtenir les trois CI du correctif, dont 223 JVM/APK/lint et 8+3+7 instrumentés, avant intégration. Aucun nouveau compte, scénario PC N/O, coupure ou match complet requis.
