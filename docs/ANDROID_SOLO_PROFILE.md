# Profil et progression solo

29 octobre 2026 — depuis main `39ba540`, branche `feat/android-solo-progression`.

## Parcours

Ouvrir **Statistiques solo → Mon profil solo**. Le profil montre le palier d’activité, l’avancement vers le suivant, le nombre d’objectifs accomplis et six objectifs avec leurs barres. Retour aux statistiques conserve les chiffres ; Retour à l’accueil puis Solo hors ligne reprend la partie enregistrée. Le bouton **Mon profil** de l’accueil authentifié ouvre ce même profil solo dans une fenêtre ; Fermer le profil revient à l’écran online sans le recréer. Les cinq choix du menu principal sont conservés.

| Parties solo terminées | Palier | Libellé |
| ---: | ---: | --- |
| 0 | 1 | Découverte |
| 1 | 2 | Premiers plis |
| 5 | 3 | À la table |
| 10 | 4 | Rendez-vous belote |
| 25 | 5 | Habitué du solo |
| 50 | 6 | Fidèle au poste |
| 100 et plus | 7 | Cent parties |

Chaque barre de palier couvre l’intervalle entre le seuil courant et le suivant. À 100, tous les paliers sont atteints et le compteur continue. Victoires et défaites font avancer ce parcours de parties terminées. Six objectifs : terminer 1, 5, 25 et 100 parties ; gagner 1 et 10 parties en équipe. Les barres d’objectif sont plafonnées à leur cible ; Accompli indique qu’elle est atteinte. Les victoires sont celles de l’équipe humaine selon le résultat déjà fourni par le moteur, sans recalcul de règles ou de score en Kotlin.

Ces paliers décrivent l’activité locale. Le profil de compte online, le classement compétitif, les récompenses/cosmétiques et les niveaux/personnalités de PNJ restent des fonctions distinctes. Le réglage de cadence ne change pas leur stratégie ; l’IA entraînée sur PC RTX5070 reste ultérieure.

## Données existantes

Le profil est une vue pure des compteurs `OfflineStatistics` persistés avec le replay depuis PR22. Aucun fichier de progression, champ JSON, attribution de récompense ou migration ajouté ; consulter ne réécrit pas la sauvegarde de partie/statistiques. La préférence d’écran ouvert reste mémorisée par la navigation existante, indépendamment de ces compteurs. Les résultats déjà enregistrés alimentent immédiatement les paliers. Les parties remplacées avant la création des statistiques ne peuvent pas être reconstituées ; une ancienne sauvegarde moteur au format 1 continue de suivre le comportement documenté dans [ANDROID_OFFLINE_STATS.md](ANDROID_OFFLINE_STATS.md).

Une partie en cours ne fait pas avancer le profil ; commencer une nouvelle partie conserve les compteurs existants. Le marqueur atomique de PR22 protège déjà le résultat unique à travers fin, reprise et réessai. Le profil le lit et n’attribue rien une seconde fois. Les grands compteurs Long sont conservés ; divisions de barres effectuées après bornage ou dans un intervalle fini, sans multiplication de ces grands nombres. Un document inconnu/invalide produit une erreur visible et Réessayer, sans profil inventé à zéro ni écrasement. Lecture asynchrone commune aux statistiques et au profil, annulation de coroutine conservée ; aucun moteur/compte/backend lancé pour consulter.

Formats local 2, moteur/replay, bundle Android, préférences de PR23, sessions, autorité online, règles 0.1.3, SQLite et sensorLandscape inchangés. Les informations d’activité ne sont jamais utilisées comme classement online. Aucun reset de partie ou de données privées requis.

## Validation

Cinq JVM ajoutés : profil vide, bornes de chaque palier, objectifs parties/victoires distincts et plafonnés, Long maximal sans dépassement, anciennes sauvegardes/reprise/nouvelle partie sans double attribution. Le test instrumenté existant de match complet réel vérifie aussi le passage au palier 2, la victoire selon l’équipe gagnante et le même profil après reprise puis nouvelle partie.

Quatre nouveaux instrumentés isolés : statistiques synthétiques déjà persistées + replay actif du vrai moteur, consultation/reconsultation sans modification des octets et reprise réelle, à 640 × 320 dp/police 1,3 ; document invalide conservé et réessai après réparation explicite de fixture ; grands compteurs/palier final/barres accessibles ; fenêtre du profil puis paramètres conservant une composition online factice. Ces agrégats synthétiques ne représentent pas des parties jouées sur le PC. Le test de fenêtre ne prouve pas une reconnexion de compte réel. Les 32 contrôles antérieurs sont conservés, workflow enrichi avec exigence explicite OK (4 tests), total attendu 36.

Code **3d1d164f0e600fcf579019225fa3c9fc2a4078af**, arbre **ae14e56c663c15049a57bdb5736923a45510763d**, validé dans [moteur/backend 40943869393](https://github.com/sgramtinne-code/atoutia/actions/runs/40943869393), job **123693977155** (601/620/11 offline, typechecks/builds/bundle et scénarios existants), [Kotlin 40943869344](https://github.com/sgramtinne-code/atoutia/actions/runs/40943869344), job **123693976587** (**253 JVM, zéro échec/erreur/ignoré**, deux APK/lint **13 avertissements/1 suggestion**), et [AVD 40943869345](https://github.com/sgramtinne-code/atoutia/actions/runs/40943869345), tentative 2/job **123694668233** (**OK (9), OK (3), OK (7), OK (5), OK (3), OK (5), OK (4)** = **36/36 instrumentés**). Première tentative/job 123693976514 arrêtée pendant la préparation du SDK émulateur, avant compilation/tests ; seul ce contrôle a été relancé, sans changement de code. Les quatre nouveaux contrôles et les 32 antérieurs passent. Bundle identique : **61e960aedf5208d94cdbff4911ac684c6251763d5bcaa48c89028dd986715431**. [PR nº 24](https://github.com/sgramtinne-code/atoutia/pull/24) : vérifier les trois CI de clôture documentaire, puis main et ses CI ; conserver la preuve de fusion dans la PR, sans commit destiné à son propre SHA. Sources/tests de la clôture identiques au code validé. YAML/shell/diff vérifiés localement ; pas de SDK Android local assistant ni nouveau scénario sur sa vraie base ou son compte. Après intégration : installation debug sur main puis Statistiques solo → Mon profil solo, retour aux statistiques et reprise du solo. Zéro partie terminée est normal tant que la partie courante n’est pas finie ; aucun nouveau match complet PC demandé. Suite : enrichissement des PNJ et parcours online/bêta, avec entraînement RTX5070 séparé et ultérieur.
