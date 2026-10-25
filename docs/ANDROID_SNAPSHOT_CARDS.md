# Cohérence des cartes autorisées du snapshot — 25 octobre 2026

[PR nº 16](https://github.com/sgramtinne-code/atoutia/pull/16), branche `fix/android-snapshot-legal-card-validation`, depuis main `3155084` (PR nº 15 intégrée et récupérée proprement sur le PC).

## Problème et correction

createPlayerClientSnapshot assemble createPlayerMatchSnapshot et createPlayerAvailableActions depuis le même MatchMachineState. En PLAY_CARD, les deux producteurs utilisent getLegalCards sur la même main, le même joueur, le même pli et le même atout. Le parseur Android vérifiait déjà match.legalCards dans la main ; actions.legalCards, utilisé par GameScreen pour activer les cartes, n’avait pas ces mêmes contrôles.

Le code `f15b0ea` ajoute deux contrôles après la validation existante des enchères en PLAY_CARD : cartes d’action incluses dans la main et égalité des ensembles match/actions. L’ordre reçu est conservé. Le backend reste l’autorité des coups : aucun calcul local de belote, changement moteur/backend, règle, DTO/version ou resserrement des autres modes. L’unicité globale des cartes et les autres invariants de phase restent distincts.

Une réponse incohérente produit une AtoutiaGameApiException de protocole sans statut 401 ; le parseur ne modifie pas l’authentification ou le stockage. Le rejet d’une réponse de commande n’annule pas une commande déjà acceptée par le serveur. Aucun incident backend, payload ou main réelle du développeur n’est déduit de cette revue.

## Reproduction réelle

Cinq nouveaux tests dans HttpAtoutiaGameApiTest utilisent le vrai client HTTP et HttpServer temporaire sur loopback. Deux documents cohérents sont acceptés (ordre identique/différent) ; trois documents doivent être refusés : actions hors main en lecture et réponse de commande, et actions incluses dans la main mais contradictoires avec match.legalCards. La fixture synthétique contient cinq cartes restantes et un nouveau pli vide ; la main entière est autorisée à l’entame. Le serveur de test renvoie une réponse, sans appliquer de commande métier ni accéder à un compte/Keystore/SQLite.

Commit `7155bcf` : [Android CI `40195346170`](https://github.com/sgramtinne-code/atoutia/actions/runs/40195346170), job `121174874606`, Kotlin compilé puis **228 JVM : 225 réussis/3 échecs**. Les 223 contrôles antérieurs et deux nouveaux contrôles positifs passent ; les trois rejets échouent car aucune exception n’est levée, sans erreur de transport ou compilation. APK/lint ignorés après cet échec attendu ; moteur/backend `40195346168` réussi. Les cinq tests restent inchangés après correction.

## Validation reçue

Le code **`f15b0ea`** est validé : [moteur/backend `40195584297`](https://github.com/sgramtinne-code/atoutia/actions/runs/40195584297), job `121175596402`, **588/618**, typechecks/builds et CLI synthétiques ; [Android Kotlin `40195584302`](https://github.com/sgramtinne-code/atoutia/actions/runs/40195584302), job **`121175596667`**, **228/228 JVM**, deux APK et lint (**11 avertissements/1 suggestion**) ; [Android UI `40195584304`](https://github.com/sgramtinne-code/atoutia/actions/runs/40195584304), job **`121175653489`**, **OK (8 tests)**, **OK (3 tests)**, **OK (7 tests)** et **OK (5 tests)** réellement exécutés sur AVD API36. Reproduction `7155bcf` : 225 réussis/3 échecs, aucune exception sur les trois documents incohérents ; après correction, cinq nouveaux tests et assertions inchangés.

Les nouvelles fixtures sont des tests JVM HTTP, pas une exécution du parseur sur le PC ou un appareil du développeur. Les 23 instrumentés existants protègent leurs propres périmètres ; aucun nouveau cas de parseur exécuté sur appareil revendiqué. Aucun SDK/AVD local assistant, aucun vrai backend métier, compte, stockage privé ou base réelle. Aucun changement d’UI/authentification, donnée existante ou sensorLandscape ; aucune partie complète, validation sur téléphone physique, revue Android exhaustive ou validation release n’est revendiquée.

## Reprise

Validations nécessaires reçues ; aucun nouveau PC N/O, compte/Keystore, coupure, sauvegarde ou match complet à demander pour ces réponses contrôlées. Vérifier les trois CI de clôture avant intégration avec SHA attendu, puis PR/main et ses CI. Le statut GitHub fait foi sans PR documentaire supplémentaire pour inscrire son propre SHA. Ensuite poursuivre séparément les autres invariants de DTO (unicité, phases) et les autres parseurs.
