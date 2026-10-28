# ATOUTIA — bilan global, exigences et feuille de route

**28 octobre 2026.** Bilan fondé sur le code, les preuves de CI/essais reçus et les deux textes transmis : règles initiales 0.1.0 (50 rubriques) et ancien prompt de reprise (19 rubriques). Le cap produit historique complète ces textes techniques. Aucun pourcentage global non mesuré n’est annoncé.

## 1. État réel

Un socle de belote multijoueur locale fonctionne : moteur TypeScript, backend autoritaire et Android Kotlin/Compose. Le produit complet, son solo hors ligne et la diffusion publique ne sont pas terminés.

Main stable vérifié : `68263e6` (PR nº 16), récupéré proprement sur le PC. PR [nº 17](https://github.com/sgramtinne-code/atoutia/pull/17) sur les doublons : code `a85d54c` validé avec **231 JVM, 23 instrumentés, APK/lint, 588 moteur et 618 backend**. Lint : 11 avertissements/1 suggestion, non masqués. À cette rédaction, vérifier les trois CI de clôture, intégrer avec SHA attendu puis vérifier main et les CI de push. Le statut GitHub fait foi pour la fusion, sans commit supplémentaire pour inscrire son propre SHA. Voir [les preuves](ANDROID_SNAPSHOT_DUPLICATES.md).

Les résultats de tests sont des preuves ciblées, pas une garantie de zéro bug ou une homologation production. Les instrumentés existants ne testent pas les nouveaux cas HTTP JVM sur le PC du développeur.

## 2. Différences de versions à conserver

- La norme actuelle est [GAME_RULES.md](GAME_RULES.md) **0.1.2**, pas le texte initial 0.1.0.
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
| 1–4 | Autorité du moteur, variante classique, joueurs/équipes, paquet unique de 32 cartes | Implémenté ; identifiants adaptés à la norme 0.1.2 ; annonces autres que Belote hors MVP |
| 5–7 | Ordres et valeurs à/hors atout, 152 points + dix de der, Belote séparée | Modules cardRules/scoring et tests présents |
| 8–16 | Donneur, mélange, distribution 5 puis 8, deux tours de prise, tous passent, preneur et entame | Modules random/deck/deal/bidding/dealMachine et tests présents ; revue de l’usage du hasard en production à finaliser |
| 17–26 | Fournir, couper/monter, partenaire maître, défausse, maître et gagnant, quatre cartes/huit plis | legalPlays/trick/trickSequence et tests présents ; préserver autorité du moteur |
| 27–38 | Dix de der, Belote automatique/imprenable, capot, contrat/chute/litige, reports, score cible et victoire | Modules belote/capot/litige/dealResult/matchScore et tests présents ; appliquer les précisions 0.1.2 |
| 39–43 | Revalidation des actions, erreurs sans mutation, phases/invariants, déterminisme | Machines/commandes/DTO et tests présents ; revue des invariants et erreurs restants à borner |
| 44–45 | Replay et versionnement | Modules matchReplay*, validation/intégrité/hash et tests présents ; interfaces utilisateur de replay/analyse et exploitation support/anti-triche non livrées comme produit complet |
| 46 | Annonces, Coinche/Contrée, règles privées/régionales, modes rapides/défis | Évolutions futures ; ne pas les introduire silencieusement dans le MVP |
| 47 | Domaine indépendant des UI, transport, stockage et backend | Séparation moteur/backend/Android existante ; intégration d’exécution locale Android encore à concevoir |
| 48 | Autorité locale offline ; même moteur côté serveur online | Online implémenté ; moteur local dans l’application Android et solo offline non livrés |
| 49 | Batterie de tests puis milliers/millions de parties simulées | 588 tests moteur identifiés ; aucun rapport versionné de la campagne massive demandé initialement retrouvé. À établir avant de revendiquer cette validation |
| 50 | Le moteur décide, humains/bots/UI proposent | Principe conservé ; ne pas calculer de nouvelles règles dans les contrôles de cohérence Android |

Le mélange utilise RandomSource/Mulberry32Random ; le backend génère une baseSeed via node:crypto.randomInt. Cela ne constitue pas à lui seul un audit d’équité, de prédictibilité ou de sécurité pour une compétition publique. Revue et validation production à prévoir.

## 4. Traçabilité des 19 rubriques de l’ancien prompt

| Rubriques | Sujet | État / suite |
| --- | --- | --- |
| 1–2 | Méthode et environnement local | WSL/Android/loopback conservés ; versions et workflow actuels à vérifier plutôt que recopier la baseline ancienne. GitHub/PR actuels prioritaires |
| 3–4 | Architecture et baseline | Architecture conservée ; anciennes valeurs 583/455 historiques, CI actuelles 588/618. Tests ciblés, globaux et builds en place |
| 5 | Google, access/refresh rotatif, logout, bootstrap | Implémentés/testés pour leurs périmètres ; coordination des sessions et stockage renforcés. Bootstrap réservé au local, désactivé par défaut. Ne pas rouvrir les essais acquis sans changement |
| 6–10 | Endpoints salons, start authentifié hôte, lobby temps réel, test réel à quatre, builds Android | Développés et validés pour les périmètres reçus ; scripts automatiques existants évitent la copie d’ID |
| 11–16 | Partie active, HTTP snapshot Bearer, DTO stricts/types, main privée/actions autorisées | Développés : écran, enchères/cartes/scores/pli, commandes, parsing, fin/historique ; correctifs PR nº 7–17 selon statut GitHub. Ne pas recevoir les mains adverses, MatchMachineState ou baseSeed |
| 17 | Ancien sous-test manuel de snapshot après rotation de token | JSON exact de ce sous-test non attesté dans ce prompt ; validations ultérieures existent. Ne pas inventer sa réalisation ni réimposer ce vieux parcours sans besoin concret |
| 18–19 | Vérification Git puis commencer snapshot à l’ÉTAPE 2078 | Dépassé par les livraisons actuelles ; reprendre depuis le main/PR réellement vérifié, pas depuis cet ancien point |

Les sources publiques du bilan n’incluent aucune donnée personnelle de l’ancien prompt.

## 5. Fonctionnalités et lots restant à livrer

1. **Fiabilité bornée** : clôturer PR nº 17, examiner les relations de phases/DTO et callbacks restants, trier les 11 avertissements lint et fixer une liste finie de critères. Pas d’audit interminable présenté comme une livraison produit.
2. **Simulations et validation moteur** : établir une campagne reproductible graduelle de nombreuses seeds/parties avec rapport, invariants et budget d’exécution ; ne pas confondre nombre de tests et nombre de parties. Vérifier le hasard et la compatibilité des replays avant compétition publique.
3. **Exécution locale Android** : choisir et vérifier l’intégration du moteur TypeScript existant, la parité des résultats et le fonctionnement sans backend ; aucune seconde implémentation divergente des règles créée silencieusement.
4. **Solo offline complet** : démarrer/jouer/terminer une partie contre bots locaux, reprendre et sauvegarder localement, sans réseau/backend ni compte online requis pour ce parcours. Les scripts PNJ sont des outils de test, pas ce mode produit.
5. **Expérience solo/utilisateur** : paramètres, tutoriel, progression/statistiques locales et profil. MainActivity contient encore des messages « arrive prochainement » pour profil, classement et paramètres.
6. **Online produit** : parcours des salons/invitations et matchmaking, classement/rating à définir, modes compétitifs. Les politiques serveur PRIVATE/CASUAL/RANKED et forfaits existants ne sont pas un système de classement utilisateur complet.
7. **Social et compétitions progressifs** : amis, saisons/tournois et autres parcours à spécifier avant de les déclarer livrés. Pas besoin de tout ce futur périmètre pour une première bêta.
8. **Replay/IA Lab** : les fondations moteur existent ; outil local d’analyse/expérimentation, interface de replay, support/anti-triche opérationnels et spectateur futur restent des produits distincts à développer. Pas d’entraînement mobile, pas de cartes cachées pour les bots normaux.
9. **Production online** : backend OVH, HTTPS, configuration/auth de production, exploitation, supervision et sauvegarde/restauration opérationnelle. Aucun déploiement public ou bootstrap exposé implicitement.
10. **Release Android/Google Play** : URL backend release encore vide ; préparer environnement, APK signé, icône/présentation, essais physiques et grands écrans, puis publication. La CI debug seule ne démontre pas une release connectable.
11. **Progression visuelle et économie cosmétique** : étapes ultérieures conservant équité et absence de pay-to-win ; stabilité/plaisir prioritaires.
12. **Variantes** : annonces supplémentaires, Coinche, Contrée, règles privées/régionales et défis seulement dans une étape future explicite.
13. **Maintenance des données** : nettoyage protégé des salons terminés et audits en lecture seule existants ; suppression des abandonnés non livrée. Toute évolution doit préserver présence/reconnexions/résultats et nécessiter sa politique autorisée, sans purge implicite.
14. **Support des essais longs** : renouvellement des tokens des scripts PNJ à examiner séparément des sessions Android.

## 6. Cap et priorités de pilotage

Android/Google Play d’abord ; règles correctes, plaisir, fluidité, stabilité, UX, sécurité et équité avant graphismes/monétisation. Solo offline obligatoire. Social, compétition, gamification/cosmétique progressifs, sans pay-to-win. AI Lab local séparé.

L’ordre immédiat est : clôture de PR nº 17 et bilan fiable ; revue restante bornée + campagne de simulations ; décision d’intégration locale et première partie solo offline complète ; reprise/paramètres/tutoriel/statistiques ; parcours online et bêta de production. Ne pas remplacer cette progression produit par une suite indéfinie de micro-correctifs.

## 7. Qui fait quoi et continuité

L’assistant conduit lecture/conception/code sur branches, tests pertinents, CI, PR, preuves et documentation. Le développeur intervient pour les essais dépendant réellement de son PC/appareil, les arbitrages d’expérience et la publication. Aucun nouvel essai PC requis pour PR nº 17 ; ne pas redemander les validations déjà reçues sans changement concerné.

Maintenir ce bilan, README, AGENTS et REPRISE à chaque étape importante. Distinguer prévu, implémenté, testé en CI, observé sur le PC et prêt à publier. Le suivi récent sous-représentait le solo offline et ne rendait pas visible l’absence de rapport de simulations massives : ce sont des lacunes de pilotage corrigées par ce bilan, pas des fonctionnalités subitement déclarées livrées.
