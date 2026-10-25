# Réponses de démarrage et annonce temps réel — 25 octobre 2026

Base main `6d7a630` (PR nº 14 intégrée, récupération PC reçue). Branche `fix/android-start-callback-scope`.

## Ordre examiné

La route start appelle roomStore.start avant sendJson. La mutation persiste puis notifie les listeners ; les réponses HTTP et WebSocket suivent deux transports. RoomLobbyScreen peut donc recevoir IN_PROGRESS et ouvrir GameLoading avant le callback HTTP de startRoom. Ce dernier applique encore Started/SessionExpired sans vérifier si l’UI a quitté le salon. La lecture identifie une course possible ; elle ne prouve pas un incident sur le PC.

## Fixtures préparées avant correction

StartCallbackInstrumentedTest exécute le vrai AtoutiaApp et RoomLobbyScreen dans une ComponentActivity en portrait. Restauration/HTTP/temps réel injectés en mémoire, compte/salon synthétiques ; aucun service Android d’authentification, Keystore, fichier privé, réseau ou base réelle. Un connecteur optionnel remplace uniquement l’ouverture temps réel dans les tests ; sans injection, la construction de production et la fermeture existantes sont conservées.

Cinq cas :

- succès HTTP actuel lance un seul chargement ;
- échec actuel reste visible et permet un nouveau démarrage ;
- expiration actuelle affiche la déconnexion ;
- WebSocket annonce IN_PROGRESS, le chargement finit par un échec contrôlé, puis le succès HTTP tardif ne doit pas relancer ce chargement ;
- même ordre, expiration HTTP tardive : l’écran courant doit rester visible.

Le chargement final est volontairement simulé en erreur pour observer une destination distincte du salon ; cela ne teste pas une partie complète ou un serveur réellement indisponible. Les assertions vérifient l’erreur actuelle, Réessayer et le nombre de chargements. La connexion fictive doit avoir été fermée avant la livraison tardive. Les services fournissent leurs résultats sur le thread UI comme le routage de production ; l’annonce injectée traverse les vrais effets du salon.

État : traitement des réponses encore inchangé ; compilation/reproduction CI à obtenir. Le workflow garde les 8+3+7 instrumentés et lance séparément ces cinq cas, avec OK (5 tests) exigé. Actionlint et diff source vérifiés localement ; aucun SDK/AVD local assistant.

## Suite

Obtenir les échecs réels avant correction. Protéger ensuite le callback HTTP par la destination et la session d’origine ; conserver les réponses actuelles et les assertions. Aucune annulation de HTTP déjà engagé ne sera revendiquée. JVM/APK/lint, moteur/backend et tests instrumentés du dernier commit doivent réussir avant intégration. Aucun nouveau scénario PC N/O, compte, coupure réseau ou match complet nécessaire pour cet ordre contrôlé. Les parseurs et les autres callbacks sont hors de cette livraison.
