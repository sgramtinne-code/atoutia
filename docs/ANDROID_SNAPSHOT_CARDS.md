# Cohérence des cartes autorisées du snapshot — 25 octobre 2026

Base main `3155084`, PR nº 15 intégrée et récupération PC reçue. Branche `fix/android-snapshot-legal-card-validation`.

## Contrat examiné

createPlayerClientSnapshot assemble createPlayerMatchSnapshot et createPlayerAvailableActions depuis le même MatchMachineState. En PLAY_CARD, les deux producteurs appellent getLegalCards sur la même main, le même joueur, le même pli et le même atout. HttpAtoutiaGameApi contrôle déjà l’appartenance de match.legalCards à la main, mais actions.legalCards n’a pas le même contrôle ni de comparaison des deux vues. GameScreen utilise cette seconde liste pour activer la main.

Une réponse malformée peut donc annoncer dans actions une carte absente de la main, ou un ensemble contradictoire avec match.legalCards, tout en passant le parseur actuel. C’est un constat de code à reproduire, pas un incident backend ou une réponse réelle observée sur le PC. Le backend reste autoritaire ; ces contrôles doivent comparer les informations reçues, sans recalculer les règles de belote.

## Tests préparés avant correction

Cinq tests dans HttpAtoutiaGameApiTest via un serveur HttpServer temporaire sur loopback et le vrai client HTTP :

- PLAY_CARD cohérent accepté ;
- mêmes ensembles de cartes dans un ordre différent acceptés et ordre reçu conservé ;
- actions hors main refusées en lecture de snapshot ;
- actions incluses dans la main mais contradictoires avec match.legalCards refusées ;
- actions hors main refusées dans une réponse de commande.

La fixture contient une main restante de cinq cartes, un nouveau pli vide et l’ensemble de la main autorisé à l’entame. Elle dérive du JSON synthétique existant ; aucun compte, partie, main ou log du développeur. Le serveur de test renvoie un document et n’applique aucune commande métier. Les erreurs attendues sont des AtoutiaGameApiException sans statut d’authentification. Le code de production reste inchangé à cette étape ; compilation/reproduction distante à obtenir. Diff vérifié localement ; aucun SDK/AVD local assistant.

## Périmètre et suite

Vérifier d’abord la reproduction, puis contrôler actions.legalCards dans la main et l’égalité des ensembles en PLAY_CARD. L’ordre n’est pas une règle de légalité. Aucun changement moteur/backend/DTO/version, aucun nouveau calcul des coups Android et aucune mutation de stockage/session. L’unicité globale des cartes, les autres modes/phases et les autres parseurs restent distincts.

Validation requise : JVM ciblés puis suite Android/APK/lint, moteur/backend et les 23 instrumentés existants en CI. Ces derniers couvrent leurs propres périmètres, pas ces cas de parseur HTTP JVM. Aucun nouveau scénario PC N/O, compte/Keystore, réseau coupé, sauvegarde ou match complet nécessaire pour ces réponses synthétiques malformées. Ne pas déduire du rejet d’une réponse qu’une commande acceptée côté serveur aurait été annulée. Garder la PR en brouillon jusqu’aux validations et consigner les résultats avant intégration.
