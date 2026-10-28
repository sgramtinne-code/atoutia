# Unicité interne des listes de cartes — 28 octobre 2026

Base main `68263e6`, branche `fix/android-snapshot-duplicate-cards`.

Le parseur partagé parseCardArray lit hand, match.legalCards et actions.legalCards. La comparaison des ensembles introduite par PR nº 16 conserve intentionnellement l’ordre et ignore la multiplicité : elle ne refuse pas une carte répétée dans une seule liste. Les producteurs moteur copient une main issue du paquet unique et ses cartes légales ; aucune répétition interne n’est nécessaire à ce contrat. Le même élément entre plusieurs vues est, en revanche, normal.

Trois tests ajoutés dans HttpAtoutiaGameApiTest dupliquent une carte valide séparément dans chacune de ces listes. Ils utilisent le vrai client HTTP et le serveur loopback synthétique existant ; les contrôles cohérents et d’ordre de la PR nº 16 restent présents. Aucun backend métier, compte, Keystore, stockage ou SQLite réel. Ce n’est pas une réponse privée observée sur le PC.

Production inchangée à cette étape ; compilation et reproduction CI à obtenir avant correction. Le contrôle prévu rejette les doublons par liste sans calculer les règles ni changer les DTO/version, services ou orientation. Les doublons du pli courant et les autres relations entre phases restent distincts.

Validation : JVM puis APK/lint, moteur/backend et les 23 instrumentés existants. Les nouveaux cas sont des HTTP JVM ; les instrumentés couvrent leurs propres périmètres. Pas de nouveau scénario PC, compte ou partie complète requis. Garder la PR en brouillon tant que les contrôles nécessaires ne sont pas réussis et consigner les résultats avant intégration.


## Reproduction reçue et correction proposée — PR nº 17

Reproduction `09f2280` : [Android CI 40731163203](https://github.com/sgramtinne-code/atoutia/actions/runs/40731163203), job `122967549149`, **231 tests JVM : 228 réussis/3 échecs**, zéro erreur/test ignoré. Les trois nouveaux cas échouent parce qu’aucune exception n’est levée pour les doublons internes ; compilation Kotlin réussie. APK/lint ignorés après l’échec attendu. Moteur/backend 40731163078 réussi.

Le correctif proposé dans la [PR nº 17](https://github.com/sgramtinne-code/atoutia/pull/17) vérifie après lecture de chaque liste que sa taille correspond au nombre de cartes distinctes. Une AtoutiaGameApiException sans statut HTTP signale le doublon. Les listes reçues et leur ordre sont conservés ; aucune comparaison d’unicité entre les différentes vues. Trois tests inchangés, règles/serveur/format/stockage/authentification/UI/sensorLandscape inchangés. Les autres relations entre cartes et phases restent distinctes. Les trois CI du correctif restent à obtenir avant intégration, sans nouvel essai PC requis.
