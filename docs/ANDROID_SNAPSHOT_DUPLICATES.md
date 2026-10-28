# Unicité interne des listes de cartes — 28 octobre 2026

[PR nº 17](https://github.com/sgramtinne-code/atoutia/pull/17), branche `fix/android-snapshot-duplicate-cards`, base main `68263e6`.

Le parseur partagé parseCardArray lit hand, match.legalCards et actions.legalCards. La comparaison d’ensembles de PR nº 16 ignorait leur multiplicité. Une vérification séparée par liste refuse désormais une carte répétée : taille de liste différente du nombre de cartes distinctes. La liste reçue et son ordre sont conservés ; le même élément entre plusieurs vues reste normal. Aucun calcul des règles ou changement de format/version.

## Preuves

Reproduction `09f2280` : [Android CI 40731163203](https://github.com/sgramtinne-code/atoutia/actions/runs/40731163203), job `122967549149`, 231 JVM/3 échecs : aucune exception sur les trois doublons ; les 228 antérieurs passent. Compilation réussie, APK/lint ignorés après cet échec attendu.

Le code `a85d54c` est validé : [Android Kotlin 40731689734](https://github.com/sgramtinne-code/atoutia/actions/runs/40731689734), job `122969393918`, **231/231 JVM**, APK/lint (**11 avertissements/1 suggestion**) ; [moteur/backend 40731689470](https://github.com/sgramtinne-code/atoutia/actions/runs/40731689470), job `122969393151`, **588/618**, typechecks/builds/CLI ; [Android UI 40731689330](https://github.com/sgramtinne-code/atoutia/actions/runs/40731689330), job `122969742683`, **OK (8 tests), OK (3 tests), OK (7 tests), OK (5 tests)** sur AVD API36. Reproduction `09f2280` : 231 JVM/3 échecs ; les 228 antérieurs passaient. Trois assertions inchangées après correction.

Les nouveaux cas sont des HTTP JVM loopback avec données synthétiques. Aucun compte, backend métier, Keystore, stockage privé ou SQLite. Les 23 instrumentés couvrent leurs propres périmètres, pas les nouveaux cas HTTP JVM. Pas de SDK/AVD local assistant ; aucune certification exhaustive Android/release revendiquée. UI/orientation, serveur et auth/stockage inchangés. Les doublons du pli courant et relations entre phases restent distincts.

## Reprise

Validations nécessaires reçues ; aucun nouvel essai PC requis pour ce périmètre. Vérifier les CI de clôture, intégrer avec SHA attendu puis vérifier PR/main et ses CI. GitHub définit la fusion sans PR supplémentaire pour inscrire son propre SHA. Suivre ensuite [le bilan global](PROJECT_STATUS.md), qui distingue les acquis techniques des fonctionnalités produit encore à livrer.
