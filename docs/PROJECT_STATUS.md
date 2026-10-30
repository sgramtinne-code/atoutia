# ATOUTIA — bilan global, exigences et feuille de route

**30 octobre 2026.** Bilan fondé sur le code, les preuves de CI publiques et les deux spécifications de référence : règles initiales 0.1.0 (50 rubriques) et ancien prompt de reprise (19 rubriques). Le cap produit historique complète ces textes techniques. Aucun pourcentage global non mesuré n’est annoncé.

## 1. État réel

Un socle de belote multijoueur locale fonctionne : moteur TypeScript, backend autoritaire et Android Kotlin/Compose. Le premier solo hors ligne est livré ; ses enrichissements et la diffusion publique restent à terminer.

Base vérifiée : main **5dde517**, [PR nº 27](https://github.com/sgramtinne-code/atoutia/pull/27) fusionnée. Les invitations privées copier/partager/coller avec jonction explicite sont livrées. Trois CI de push main conclues success : [moteur/backend 41109870194](https://github.com/sgramtinne-code/atoutia/actions/runs/41109870194) (**601 moteur/620 backend/26 offline**), [Kotlin 41109870153](https://github.com/sgramtinne-code/atoutia/actions/runs/41109870153) (**264 JVM**, deux APK, lint **13 avertissements/1 suggestion**), [AVD 41109870354](https://github.com/sgramtinne-code/atoutia/actions/runs/41109870354) (**49/49 instrumentés**). Fusion, arbre et preuves main consignés dans la PR ; les anciennes attentes PR20–27 sont historiques et clôturées.

Lot courant **feat/android-release-endpoint** : rendre configurable l’origine HTTPS du backend dans un build Android release, via la propriété Gradle ATOUTIA_RELEASE_API_BASE_URL, sinon la variable d’environnement du même nom. Sans valeur, l’URL reste vide et le solo reste accessible ; le debug garde son serveur local. Une valeur renseignée doit être une origine https:// absolue, sans identifiants, chemin autre que /, paramètres ou fragment, avec un port valide. Une barre finale est normalisée. Aucun domaine réel choisi ou contacté, aucune signature ou publication, aucun déploiement implicite. Voir [la configuration release](ANDROID_RELEASE_CONFIG.md).

Le script CI scripts/check-release-config.sh vérifie le BuildConfig réellement généré : configuration vide, repli environnement, priorité de la propriété, neuf rejets de valeurs invalides et autoplay toujours désactivé en release. Il compile ensuite un APK release non signé vers une origine synthétique .test et contrôle le manifeste fusionné (HTTP clair/debug interdits, backup et sensorLandscape conservés). Les suites debug, les 49 instrumentés et les nouveaux contrôles Gradle/APK sont réussis dans les journaux publics du code 65f5450. Aucun SDK Android local assistant. Moteur, backend, PNJ, protocole et sauvegardes inchangés.

Code **65f5450** de la [PR nº 28](https://github.com/sgramtinne-code/atoutia/pull/28) : [moteur/backend 41112884393](https://github.com/sgramtinne-code/atoutia/actions/runs/41112884393), job **124259513968**, **601 moteur/620 backend/26 offline**, typechecks/builds/bundle et scénarios synthétiques réussis ; [Kotlin/release 41112884438](https://github.com/sgramtinne-code/atoutia/actions/runs/41112884438), job **124259513706**, **264 JVM sans échec/erreur/ignoré**, APK debug/instrumenté et **release non signé** compilés, lint **13 avertissements/1 suggestion** conservés ; [AVD 41112884409](https://github.com/sgramtinne-code/atoutia/actions/runs/41112884409), job **124259513875**, **49/49 instrumentés debug API36** (9+3+7+5+3+5+4+3+4+6). Les trois lectures du vrai BuildConfig release et les neuf rejets sont réussis ; le manifeste release vérifie HTTP clair/debug interdits, backup false et sensorLandscape. Aucun test d’exécution de l’APK release sur appareil revendiqué. Bundle solo inchangé **6e83cc765603d43c8a1307b3ba9b4bcb69b6b459c562dc25b1842b90351c2650**. Les trois workflows du code sont conclus success ; vérifier aussi les trois CI du dernier commit de clôture avant intégration.

Clôture documentaire : sources, tests, script CI, workflow et bundle identiques à 65f5450. Lire le suivi ANDROID_RELEASE_CONFIG pour les commandes et limites. Vérifier les CI du dernier commit de la PR avant intégration avec SHA attendu, puis PR/main/arbre et CI de push ; consigner la fusion dans la PR sans commit destiné à son propre SHA. La connexion entre amis demande encore une origine de serveur réellement joignable en HTTPS, sa configuration/auth de production et une distribution signée. Les observations issues d’appareils/captures/journaux restent privées ; ne publier que code, fixtures et preuves CI publiques. Aucun nouveau match complet ou audit de la vraie SQLite requis pour ce lot. L’IA Lab RTX5070 reste ultérieur.

Les résultats de tests sont des preuves ciblées, pas une garantie de zéro bug ou une homologation production. Les instrumentés existants ne testent pas les nouveaux cas HTTP JVM sur le PC du développeur.

## 2. Différences de versions à conserver

- La norme actuelle est [GAME_RULES.md](GAME_RULES.md) **0.1.3**, pas le texte initial 0.1.0.
- Positions/équipes : PLAYER_0…3 et TEAM_0/1 ; ne pas restaurer NORTH/EAST/SOUTH/WEST ou TEAM_NS/EW dans les DTO. Ne pas déduire une correspondance fixe avec les positions d’affichage.
- Belote/Rebelote entre dans la comparaison du contrat ; le traitement de deux litiges consécutifs est précisé dans la norme actuelle.
- Les noms de phases sont des concepts adaptés à l’implémentation, pas une raison de renommer toutes les machines à états selon le premier texte.
- Le bloc « snapshot authentifié puis lobby → partie » et l’ÉTAPE 2078 sont historiques : ces fonctions ont été développées depuis. Ne pas les recommencer.
- La méthode actuelle utilise branches, PR et CI ; ne pas rétablir les anciens copier-coller ni interdire les commits de reproduction sur une branche de travail. Aucune fusion avec des contrôles requis en échec.
- Les vrais identifiants de compte/salon présents dans l’ancien prompt restent privés et ne sont pas recopiés ici.

## 3. Traçabilité des 50 rubriques de règles initiales

« Implémenté/testé » décrit le code et ses tests actuels, sans certification exhaustive.

| Rubriques initiales | Exigence | État / suite |
| --- | --- | --- |
| 1–4 | Autorité du moteur, variante classique, joueurs/équipes, paquet unique de 32 cartes | Implémenté ; identifiants adaptés à la norme 0.1.3 ; annonces autres que Belote hors MVP |
| 5–7 | Ordres et valeurs à/hors atout, 152 points + dix de der, Belote séparée | Modules cardRules/scoring et tests présents |
| 8–16 | Donneur, mélange, distribution 5 puis 8, deux tours de prise, tous passent, preneur et entame | Modules random/deck/deal/bidding/dealMachine et tests présents ; revue de l’usage du hasard en production à finaliser |
| 17–26 | Fournir, couper/monter, partenaire maître, défausse, maître et gagnant, quatre cartes/huit plis | legalPlays/trick/trickSequence et tests présents ; préserver autorité du moteur |
| 27–38 | Dix de der, Belote automatique/imprenable, capot, contrat/chute/litige, reports, score cible et victoire | Modules belote/capot/litige/dealResult/matchScore et tests présents ; appliquer les précisions 0.1.3 |
| 39–43 | Revalidation des actions, erreurs sans mutation, phases/invariants, déterminisme | Machines/commandes/DTO et tests présents ; revue des invariants et erreurs restants à borner |
| 44–45 | Replay et versionnement | Modules matchReplay*, validation/intégrité/hash et tests présents ; interfaces utilisateur de replay/analyse et exploitation support/anti-triche non livrées comme produit complet |
| 46 | Annonces, Coinche/Contrée, règles privées/régionales, modes rapides/défis | Évolutions futures ; ne pas les introduire silencieusement dans le MVP |
| 47 | Domaine indépendant des UI, transport, stockage et backend | Séparation moteur/backend/Android existante ; moteur local partagé livré par PR20 (ANDROID_OFFLINE.md) |
| 48 | Autorité locale offline ; même moteur côté serveur online | Online implémenté ; premier solo moteur local livré par PR20, 25 contrôles AVD documentés par la CI de PR20 |
| 49 | Tests moteur et simulations, portée précisée par le développeur | Outil borné livré par PR nº 18 ; lot actuel 601 tests/14 contrôles et 1 000 parties de chaque version. Les millions concernent l’entraînement IA futur sur RTX 5070, pas une validation moteur bloquante |
| 50 | Le moteur décide, humains/bots/UI proposent | Principe conservé ; ne pas calculer de nouvelles règles dans les contrôles de cohérence Android |

Le mélange utilise RandomSource/Mulberry32Random ; le backend génère une baseSeed via node:crypto.randomInt. Cela ne constitue pas à lui seul un audit d’équité, de prédictibilité ou de sécurité pour une compétition publique. Revue et validation production à prévoir.

## 4. Traçabilité des 19 rubriques de l’ancien prompt

| Rubriques | Sujet | État / suite |
| --- | --- | --- |
| 1–2 | Méthode et environnement local | WSL/Android/loopback conservés ; versions et workflow actuels à vérifier plutôt que recopier la baseline ancienne. GitHub/PR actuels prioritaires |
| 3–4 | Architecture et baseline | Architecture conservée ; anciennes valeurs 583/455 historiques, CI main précédente 601/620 et 253 JVM ; lot PNJ validé en PR : 259 JVM/39 instrumentés. Tests ciblés, globaux et builds en place |
| 5 | Google, access/refresh rotatif, logout, bootstrap | Implémentés/testés pour leurs périmètres ; coordination des sessions et stockage renforcés. Bootstrap réservé au local, désactivé par défaut. Ne pas rouvrir les essais acquis sans changement |
| 6–10 | Endpoints salons, start authentifié hôte, lobby temps réel, test réel à quatre, builds Android | Développés, avec contrôles automatisés et scripts existants pour le scénario à quatre ; aucune copie d’ID requise par le lanceur |
| 11–16 | Partie active, HTTP snapshot Bearer, DTO stricts/types, main privée/actions autorisées | Développés : écran, enchères/cartes/scores/pli, commandes, parsing, fin/historique ; correctifs PR nº 7–17 selon statut GitHub. Ne pas recevoir les mains adverses, MatchMachineState ou baseSeed |
| 17 | Ancien sous-test manuel de snapshot après rotation de token | JSON exact de ce sous-test non attesté dans ce prompt ; validations ultérieures existent. Ne pas inventer sa réalisation ni réimposer ce vieux parcours sans besoin concret |
| 18–19 | Vérification Git puis commencer snapshot à l’ÉTAPE 2078 | Dépassé par les livraisons actuelles ; reprendre depuis le main/PR réellement vérifié, pas depuis cet ancien point |

Les sources publiques du bilan n’incluent aucune donnée personnelle de l’ancien prompt.

## 5. Fonctionnalités et lots restant à livrer

1. **Fiabilité bornée** : correctif du litige/versionnement livré par PR19 ; trier ensuite les 13 avertissements et 1 suggestion lint selon leur impact sans transformer les audits sans défaut démontré en blocage produit. Pas d’audit interminable présenté comme une livraison produit.
2. **Validation moteur** : outils et rapports bornés livrés par PR nº 18 ; compatibilité actuel/legacy pour le litige livrée par PR19. Aucun objectif de millions avant le produit : ils concernent l’IA future. La revue du hasard de production reste distincte.
3. **Exécution locale Android** : solution choisie et implémentée sur feat/android-offline-solo (AndroidX JavaScriptEngine, même moteur, bundle contrôlé) ; parité TypeScript et exécution réelle AVD API36 réussies ; compatibilité des appareils visés à vérifier avant diffusion.
4. **Premier solo jouable** : démarrer/jouer/terminer à 1 000 points avec trois bots locaux, sauvegarder/reprendre ; implémentation livrée par PR20. Les contrôles AVD exécutent un match complet, une reprise de fichier et le parcours solo avec le vrai moteur embarqué. Statistiques/tutoriel/niveaux restent distincts. Les scripts PNJ multijoueur restent des outils de test.
5. **Expérience solo/utilisateur** : statistiques locales livrées par PR22 (parties/victoires/défaites/dernier résultat) ; paramètres solo et tutoriel livrés par PR23 (248 JVM/32 instrumentés) ; profil/progression d’activité livré par PR24 (253 JVM/36 instrumentés) ; styles PNJ livrés par PR25 (259 JVM/39 instrumentés) ; accès depuis l’erreur online livré par PR26 (259 JVM/43 instrumentés). Les paramètres de sons/thèmes, le profil de compte online et le classement ne sont pas livrés comme fonctions complètes.
6. **Online produit** : invitations textuelles privées livrées par PR27 ; matchmaking, classement/rating à définir, modes compétitifs. Les politiques serveur PRIVATE/CASUAL/RANKED et forfaits existants ne sont pas un système de classement utilisateur complet.
7. **Social et compétitions progressifs** : amis, saisons/tournois et autres parcours à spécifier avant de les déclarer livrés. Pas besoin de tout ce futur périmètre pour une première bêta.
8. **Replay/IA Lab** : fondations moteur présentes ; interfaces de replay/analyse et IA Lab local restent à développer. [Entraînement futur sur PC NVIDIA RTX 5070](AI_LAB_ROADMAP.md), avec millions de parties pour des PNJ de styles/méthodes et niveaux variés, amusants et distrayants. Aucun entraînement mobile ni carte cachée pour les PNJ normaux ; aucun blocage du solo ou de la publication par cette étape future.
9. **Production online** : backend OVH, HTTPS, configuration/auth de production, exploitation, supervision et sauvegarde/restauration opérationnelle. Aucun déploiement public ou bootstrap exposé implicitement.
10. **Release Android/Google Play** : URL backend release vide par défaut ; configuration HTTPS et compilation non signée préparées dans le lot courant. Préparer ensuite serveur réel, signature, icône/présentation, essais physiques et grands écrans, puis publication. La CI debug seule ne démontre pas une release connectable.
11. **Progression visuelle et économie cosmétique** : étapes ultérieures conservant équité et absence de pay-to-win ; stabilité/plaisir prioritaires.
12. **Variantes** : annonces supplémentaires, Coinche, Contrée, règles privées/régionales et défis seulement dans une étape future explicite.
13. **Maintenance des données** : nettoyage protégé des salons terminés et audits en lecture seule existants ; suppression des abandonnés non livrée. Toute évolution doit préserver présence/reconnexions/résultats et nécessiter sa politique autorisée, sans purge implicite.
14. **Support des essais longs** : renouvellement des tokens des scripts PNJ à examiner séparément des sessions Android.

## 6. Cap et priorités de pilotage

Android/Google Play d’abord ; règles correctes, plaisir, fluidité, stabilité, UX, sécurité et équité avant graphismes/monétisation. Solo offline obligatoire. Social, compétition, gamification/cosmétique progressifs, sans pay-to-win. AI Lab local séparé.

Priorité : configuration release HTTPS, puis validation entre amis et parcours bêta de production. Les invitations privées sont livrées par PR27. Le retour au menu depuis une erreur online est livré par PR26. Le profil/progression solo de PR24 est livré. Les paramètres/tutoriel de PR23 sont livrés. Les statistiques locales de PR22 sont livrées. Les styles actuels sont des heuristiques distinctes ; le réglage de cadence reste indépendant et aucun niveau mesuré n’est livré. Ne pas remplacer cette progression produit par une suite indéfinie de micro-correctifs.

## 7. Qui fait quoi et continuité

L’assistant conduit lecture/conception/code sur branches, tests pertinents, CI, PR, preuves et documentation. Le développeur intervient pour les essais dépendant réellement de son PC/appareil, les arbitrages d’expérience et la publication. Aucun nouvel essai PC requis pour PR nº 17 ; ne pas redemander les validations déjà reçues sans changement concerné.

Maintenir ce bilan, README, AGENTS et REPRISE à chaque étape importante. Distinguer prévu, implémenté, testé en CI, observé sur le PC et prêt à publier. Le suivi récent sous-représentait le solo offline et avait confondu validation moteur et entraînement IA massif. Le développeur a précisé que les millions concernent l’IA future sur son PC RTX 5070, pour des PNJ variés et plaisants par niveau. Cette clarification corrige le cap ; aucun entraînement n’est déclaré livré.


## 8. Preuves du premier solo hors ligne — 29 octobre 2026

Code **`34d4ed3`** validé dans les trois CI : [moteur/backend 40756019124](https://github.com/sgramtinne-code/atoutia/actions/runs/40756019124), job **123055012584**, **601 moteur/620 backend/11 offline**, typechecks/builds/bundle et références de simulation inchangées ; [Android Kotlin 40756019046](https://github.com/sgramtinne-code/atoutia/actions/runs/40756019046), job **123055012659**, **237 JVM, zéro échec/ignoré**, deux APK et lint (**13 avertissements/1 suggestion**, dont deux avertissements de style ajoutés par le lot) ; [Android UI 40756018978](https://github.com/sgramtinne-code/atoutia/actions/runs/40756018978), job **123055012437**, **OK (8 tests), OK (3 tests), OK (7 tests), OK (5 tests), OK (2 tests)** réellement exécutés sur AVD API36. Les deux nouveaux contrôles utilisent le vrai JavaScriptSandbox et le bundle APK : partie à 1 000 points avec reprise intermédiaire/finale AtomicFile ; choix solo, prise, main visible, retour/reprise et construction online seulement après sélection. Le premier échec était un geste de défilement du test sur un bouton fixe, corrigé sans enlever les assertions.

Cette clôture ne change que des documents : sources/fixtures/bundle/tests identiques au code validé. Liens/blocs shell/YAML/diff à vérifier ; aucune nouvelle exécution Android locale assistant revendiquée. Vérifier les trois CI du dernier commit de la PR nº 20 avant de la rendre prête et de l'intégrer avec SHA attendu ; vérifier ensuite PR/main/arbre et CI de push. Inscrire SHA de fusion et CI main dans la PR sans nouveau commit destiné à inscrire son propre SHA. Donner la récupération complète de main et le build/install Android ; le solo ne demande ni compte ni backend ni PNJ de script. L'essai sur l'émulateur du développeur reste distinct des preuves AVD et sera utile pour sa compatibilité WebView et l'expérience en mode avion, sans bloquer artificiellement la livraison déjà testée. Compatibilité de tous les appareils, release Google Play et plaisir des PNJ non attestés par ces tests. Suite produit : statistiques/progression locales, paramètres et tutoriel ; entraînement RTX5070 futur conservé, aucun million de validation requis.


## Preuves CI des enchères — 29 octobre 2026

Code **692f91a** validé dans les trois CI : [moteur/backend 40826913637](https://github.com/sgramtinne-code/atoutia/actions/runs/40826913637), job **123291943219**, **601 moteur/620 backend/11 offline**, typechecks/builds/bundle et contrôles existants réussis ; [Android Kotlin 40826913728](https://github.com/sgramtinne-code/atoutia/actions/runs/40826913728), job **123291943550**, **237 JVM, zéro échec/ignoré**, deux APK et lint (**13 avertissements/1 suggestion**) ; [Android UI 40826913635](https://github.com/sgramtinne-code/atoutia/actions/runs/40826913635), job **123291942932**, **OK (9 tests), OK (3 tests), OK (7 tests), OK (5 tests), OK (2 tests)** sur AVD API36, soit **26/26 instrumentés**. Le premier choix est entièrement contenu dans la zone des commandes avant défilement à 640 × 360 dp/police 1,3 ; callback exact, blocage pendant validation, Passer et main immobile vérifiés. Les 25 contrôles antérieurs restent réussis, dont le vrai moteur solo/reprise AtomicFile.


## Statistiques solo validées — 29 octobre 2026

Code **67ec669** validé dans les trois CI : [moteur/backend 40831462142](https://github.com/sgramtinne-code/atoutia/actions/runs/40831462142), job **123306404706**, **601 moteur/620 backend/11 offline**, typechecks/builds/bundle et contrôles existants réussis ; [Android Kotlin 40831462163](https://github.com/sgramtinne-code/atoutia/actions/runs/40831462163), job **123306404500**, **245 JVM, zéro échec/ignoré**, deux APK et lint (**13 avertissements/2 suggestions**, aucune suppression) ; [Android UI 40831462171](https://github.com/sgramtinne-code/atoutia/actions/runs/40831462171), job **123306404510**, **OK (9 tests), OK (3 tests), OK (7 tests), OK (5 tests), OK (3 tests)** sur AVD API36, soit **27/27 instrumentés**. Les huit nouveaux JVM passent. Le test réel du moteur prouve migration legacy à mi-match, fin comptée une fois, reprise et nouveau match gardant les totaux. L'UI vérifie consultation sans mutation, zéro moteur/service démarré pour les statistiques, erreur/réessai et trois choix visibles à 640 × 320 dp/police 1,3. Les agrégats du test d'affichage sont synthétiques ; le test de panne disque est un mock JVM, pas une saturation physique.
