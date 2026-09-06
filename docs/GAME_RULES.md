# Atoutia — Règles du moteur Belote

Version du document : 0.1.2

Statut : spécification normative du MVP.

---

# 1. Objet

Ce document définit les règles métier appliquées par :

`@atoutia/belote-engine`

pour la première variante jouable d'Atoutia.

La variante initiale est :

**Belote classique française à 4 joueurs, sans annonces autres que Belote/Rebelote.**

Cette spécification constitue la référence métier du moteur.

---

# 2. Principes du moteur

Le moteur doit être :

* indépendant de React Native ;
* indépendant d'Android ;
* indépendant de l'interface ;
* indépendant du backend ;
* indépendant du réseau ;
* indépendant de PostgreSQL ;
* indépendant de Redis ;
* déterministe ;
* testable ;
* reproductible ;
* versionné.

Le moteur est l'autorité unique sur les règles.

---

# 3. Joueurs

Une partie comporte quatre joueurs.

Positions logiques :

* PLAYER_0 ;
* PLAYER_1 ;
* PLAYER_2 ;
* PLAYER_3.

Le moteur ne dépend pas d'une orientation graphique de table.

---

# 4. Équipes

Deux équipes sont constituées.

TEAM_0 :

* PLAYER_0 ;
* PLAYER_2.

TEAM_1 :

* PLAYER_1 ;
* PLAYER_3.

Les partenaires sont opposés dans l'ordre logique de jeu.

---

# 5. Ordre de jeu

Le moteur utilise un ordre circulaire explicite des joueurs.

Il doit pouvoir déterminer pour chaque joueur :

* le joueur suivant ;
* le joueur précédent ;
* son partenaire ;
* ses deux adversaires.

Dans la représentation physique traditionnelle, le jeu progresse dans le sens inverse des aiguilles d'une montre.

Dans le moteur, cette notion est abstraite par l'ordre logique des positions.

---

# 6. Paquet

Le paquet contient exactement 32 cartes.

Il existe quatre couleurs :

* CLUBS ;
* DIAMONDS ;
* HEARTS ;
* SPADES.

Chaque couleur comporte huit valeurs :

* SEVEN ;
* EIGHT ;
* NINE ;
* TEN ;
* JACK ;
* QUEEN ;
* KING ;
* ACE.

Chaque combinaison couleur/valeur existe exactement une fois.

---

# 7. Ordre hors atout

De la plus forte à la plus faible :

1. ACE ;
2. TEN ;
3. KING ;
4. QUEEN ;
5. JACK ;
6. NINE ;
7. EIGHT ;
8. SEVEN.

---

# 8. Valeur hors atout

| Carte | Points |
| ----- | -----: |
| ACE   |     11 |
| TEN   |     10 |
| KING  |      4 |
| QUEEN |      3 |
| JACK  |      2 |
| NINE  |      0 |
| EIGHT |      0 |
| SEVEN |      0 |

---

# 9. Ordre à l'atout

De la plus forte à la plus faible :

1. JACK ;
2. NINE ;
3. ACE ;
4. TEN ;
5. KING ;
6. QUEEN ;
7. EIGHT ;
8. SEVEN.

---

# 10. Valeur à l'atout

| Carte | Points |
| ----- | -----: |
| JACK  |     20 |
| NINE  |     14 |
| ACE   |     11 |
| TEN   |     10 |
| KING  |      4 |
| QUEEN |      3 |
| EIGHT |      0 |
| SEVEN |      0 |

---

# 11. Valeur totale des cartes

La somme des 32 cartes vaut :

**152 points**

Le dernier pli ajoute normalement :

**10 points**

Une donne normale contient donc :

**162 points de plis**

hors Belote/Rebelote.

---

# 12. Donneur

Une donne possède exactement un donneur.

Le premier donneur est déterminé par la configuration de partie ou par une procédure déterministe.

Après chaque donne, le joueur suivant devient donneur.

Cela s'applique également lorsqu'aucun joueur ne prend.

---

# 13. Mélange

Le paquet est mélangé avant chaque distribution.

Dans le moteur numérique, le mélange doit utiliser un générateur pseudo-aléatoire contrôlable.

Il doit accepter une seed.

À seed identique et état initial identique :

* ordre du paquet identique ;
* distribution identique ;
* résultats reproductibles.

---

# 14. Distribution initiale

Chaque joueur reçoit cinq cartes.

La distribution logique reproduit une distribution physique de type :

* 3 cartes puis 2 ;

ou :

* 2 cartes puis 3.

Le moteur n'a pas besoin d'animer ces paquets physiques, mais l'état résultant doit correspondre à cinq cartes par joueur.

Après ces vingt cartes, une carte est retournée.

Elle est appelée :

**la retourne**

---

# 15. Premier tour de prise

La parole commence au joueur suivant le donneur.

Chaque joueur peut :

* PASS ;
* TAKE.

Au premier tour, `TAKE` signifie obligatoirement :

**choisir la couleur de la retourne comme atout.**

Aucune autre couleur n'est autorisée.

---

# 16. Fin du premier tour

Dès qu'un joueur prend :

* la prise s'arrête immédiatement ;
* ce joueur devient le preneur ;
* son équipe devient l'équipe preneuse ;
* l'autre équipe devient la défense ;
* la couleur de la retourne devient l'atout.

Il n'existe aucune surenchère dans cette variante.

---

# 17. Deuxième tour de prise

Si les quatre joueurs passent au premier tour, un deuxième tour commence.

Chaque joueur peut :

* PASS ;
* choisir une couleur d'atout parmi les trois couleurs différentes de la retourne.

La couleur de la retourne est interdite au deuxième tour.

---

# 18. Tous passent

Si les quatre joueurs passent également au deuxième tour :

* aucun contrat n'est créé ;
* aucun point n'est attribué ;
* aucun litige n'est créé ;
* les cartes sont récupérées ;
* le joueur suivant devient donneur ;
* une nouvelle donne commence.

---

# 19. Complément de distribution

Lorsqu'un joueur prend :

* le preneur reçoit la retourne ;
* il reçoit ensuite deux cartes supplémentaires ;
* chacun des trois autres joueurs reçoit trois cartes supplémentaires.

Chaque joueur possède alors exactement huit cartes.

Les 32 cartes sont distribuées.

---

# 20. Preneur

Le moteur conserve explicitement :

* le joueur preneur ;
* son équipe ;
* la couleur d'atout ;
* le tour de prise durant lequel il a pris.

---

# 21. Premier pli

Le joueur suivant le donneur joue la première carte.

Cette carte peut être n'importe quelle carte de sa main.

Sa couleur devient :

**la couleur demandée**

---

# 22. Structure d'un pli

Un pli contient exactement quatre cartes.

Chaque joueur joue exactement une carte, dans l'ordre du tour.

Lorsque quatre cartes ont été jouées :

* le gagnant est déterminé ;
* le pli est attribué à son équipe ;
* le gagnant entame le pli suivant.

Une donne complète comporte huit plis.

---

# 23. Fournir

Si un joueur possède au moins une carte de la couleur demandée :

**il doit fournir cette couleur.**

Toute autre carte est illégale.

---

# 24. Fournir hors atout

Lorsque la couleur demandée n'est pas l'atout :

* le joueur doit fournir s'il le peut ;
* il n'est pas obligé de jouer une carte supérieure.

Il n'existe pas d'obligation générale de monter hors atout.

---

# 25. Absence de la couleur demandée

Si le joueur ne possède aucune carte de la couleur demandée, le moteur doit déterminer :

1. si son partenaire a déjà joué ;
2. si son partenaire est actuellement maître ;
3. si le joueur possède de l'atout ;
4. si un atout a déjà été joué ;
5. si le joueur possède un atout permettant de monter.

---

# 26. Partenaire maître

Si :

* le joueur ne possède pas la couleur demandée ;
* son partenaire est actuellement maître ;

alors le joueur peut jouer n'importe quelle carte.

Il peut :

* se défausser ;
* jouer un atout volontairement.

Il n'est pas obligé de couper.

---

# 27. Partenaire non maître

Si :

* le joueur ne possède pas la couleur demandée ;
* son partenaire n'est pas maître ;

alors :

* il doit couper s'il possède de l'atout ;
* il peut se défausser uniquement s'il ne possède aucun atout.

---

# 28. Partenaire n'ayant pas encore joué

Un partenaire qui n'a pas encore joué ne peut pas être considéré comme maître.

Le joueur qui ne possède pas la couleur demandée doit donc couper s'il possède de l'atout.

---

# 29. Coupe

Couper consiste à jouer un atout lorsque la couleur demandée n'est pas l'atout.

Lorsqu'une coupe est obligatoire :

* jouer une couleur autre que l'atout est illégal.

---

# 30. Atout déjà présent

Lorsqu'un joueur est tenu de jouer de l'atout et qu'un atout est déjà présent dans le pli :

* il doit jouer un atout supérieur au meilleur atout présent s'il en possède un.

Cette action correspond à une montée à l'atout.

Lorsqu'elle dépasse une coupe adverse, il s'agit d'une surcoupe.

---

# 31. Impossible de monter

Si un joueur est tenu de jouer atout mais ne possède aucun atout supérieur :

* il doit tout de même jouer un atout ;
* il joue un atout inférieur de son choix.

Il ne peut pas utiliser l'impossibilité de monter comme motif de défausse.

---

# 32. Sous-coupe

Une sous-coupe consiste à jouer un atout inférieur au meilleur atout du pli.

Elle est légale uniquement si :

* le joueur est tenu de jouer atout ;
* aucun de ses atouts ne permet de monter.

Si une surcoupe est possible, la sous-coupe est illégale.

---

# 33. Atout demandé

Lorsque l'entame est un atout :

* l'atout est la couleur demandée ;
* tout joueur possédant de l'atout doit fournir.

Il doit :

* monter s'il possède un atout supérieur au meilleur atout présent ;
* jouer un atout inférieur s'il ne peut pas monter.

---

# 34. Coupe adverse

Lorsqu'un adversaire a coupé et que le joueur ne possède pas la couleur demandée :

* le joueur doit également jouer atout s'il en possède ;
* il doit surcouper s'il peut ;
* sinon il joue un atout inférieur.

---

# 35. Coupe du partenaire

Si le partenaire est actuellement maître grâce à une coupe :

* le joueur qui ne possède pas la couleur demandée n'est pas obligé de couper ;
* il peut se défausser ;
* il peut également jouer atout volontairement.

La règle du partenaire maître reste prioritaire.

---

# 36. Défausse

Une défausse consiste à jouer une carte différente de la couleur demandée sans obligation de jouer atout.

Elle est légale lorsque :

* le joueur ne possède pas la couleur demandée et son partenaire est maître ;

ou :

* le joueur ne possède ni la couleur demandée ni aucun atout.

---

# 37. Maître provisoire

Pendant un pli incomplet, le moteur doit déterminer le joueur actuellement maître.

Si au moins un atout est présent :

* le meilleur atout est maître.

Sinon :

* la meilleure carte de la couleur demandée est maître.

Une carte d'une autre couleur non-atout ne peut pas gagner le pli.

---

# 38. Gagnant du pli

Lorsque les quatre cartes sont jouées :

si un ou plusieurs atouts sont présents :

* le meilleur atout remporte le pli.

Sinon :

* la meilleure carte de la couleur demandée remporte le pli.

---

# 39. Belote

Un joueur possède la Belote s'il détient simultanément :

* KING d'atout ;
* QUEEN d'atout.

La Belote vaut :

**20 points**

Les deux cartes doivent appartenir au même joueur.

---

# 40. Belote/Rebelote numérique

Dans Atoutia, la déclaration est automatisée.

Lorsque le joueur possédant KING + QUEEN d'atout joue la première de ces deux cartes :

* le moteur émet un événement `BELOTE`.

Lorsqu'il joue la seconde :

* le moteur émet un événement `REBELOTE`.

Le bonus est attribué automatiquement.

Le joueur ne doit pas avoir à presser un bouton pour réclamer un bonus que le moteur peut déterminer sans ambiguïté.

---

# 41. Belote imprenable

Les 20 points de Belote/Rebelote restent acquis à l'équipe concernée :

* en cas de contrat réussi ;
* en cas de chute ;
* en cas de capot.

Le bonus est modélisé séparément des points de plis.

---

# 42. Dix de der

L'équipe remportant le huitième pli reçoit normalement :

**10 points supplémentaires**

Ces points font partie du score de plis.

---

# 43. Capot

Un camp réalise un capot s'il remporte les huit plis.

Dans ce cas :

* le bonus du dernier pli vaut 100 points au lieu de 10 ;
* les 152 points des cartes + 100 points donnent 252 points.

Le score de plis du camp gagnant est donc :

**252 points**

La Belote éventuelle reste séparée.

---

# 44. Score de plis

Le score de plis comprend :

* les points des cartes capturées ;
* le dix de der ;

ou :

* le bonus de capot.

Il n'inclut pas la Belote/Rebelote.

---

# 45. Score utilisé pour le contrat

Pour comparer preneurs et défense, le moteur prend en compte :

* les points de plis ;
* la Belote/Rebelote.

Aucune autre annonce n'existe dans le MVP.

---

# 46. Contrat réussi

Le contrat est réussi lorsque l'équipe preneuse obtient un total :

**strictement supérieur**

à celui de la défense.

Chaque équipe marque alors ses points.

---

# 47. Chute

Le contrat est chuté lorsque l'équipe preneuse obtient un total :

**strictement inférieur**

à celui de la défense.

Dans ce cas :

* les preneurs marquent 0 point de plis ;
* ils conservent leur Belote éventuelle ;
* la défense marque 162 points de chute ;
* la défense conserve également sa Belote éventuelle.

---

# 48. Capot subi

Lorsqu'un camp ne réalise aucun pli :

* le camp gagnant marque 252 points de capot ;
* le camp perdant ne marque aucun point de plis ;
* une Belote éventuelle du camp perdant reste acquise.

---

# 49. Litige

Lorsque les totaux servant à déterminer le contrat sont exactement égaux :

**il y a litige.**

Cas classiques :

* 81 / 81 ;
* 91 / 91 lorsqu'une Belote entre dans le calcul.

---

# 50. Traitement du litige

Lors d'un litige :

* la défense marque immédiatement son propre total ;
* le total des preneurs n'est pas inscrit immédiatement ;
* ce total devient un bonus de litige en attente.

Ce bonus est attribué à l'équipe qui réussit le contrat de la donne suivante.

Le moteur conserve explicitement cette valeur dans l'état de la partie.

---

# 51. Deuxième litige consécutif

Si la donne immédiatement suivante produit elle aussi un litige alors qu'un bonus de litige précédent est encore en attente :

* la défense de cette nouvelle donne encaisse le bonus provenant du litige précédent ;
* le bonus précédent est alors consommé ;
* le nouveau litige génère à son tour son propre bonus selon les points des nouveaux preneurs.

Ainsi :

**un bonus de litige précédent n'est jamais reporté indéfiniment de donne en donne.**

Cette règle doit faire l'objet de tests spécifiques.

---

# 52. État de litige

Le moteur représente explicitement :

* l'existence ou non d'un bonus de litige ;
* sa valeur ;
* la donne l'ayant généré.

Le litige ne doit jamais être implémenté comme une simple correction ponctuelle du score.

---

# 53. Annonces exclues

Le MVP ne compte pas :

* tierce ;
* cinquante ;
* cent ;
* carré.

Seule Belote/Rebelote est prise en compte.

---

# 54. Fin d'une donne

Une donne avec contrat se termine lorsque :

* huit plis ont été joués ;
* toutes les cartes ont été jouées ;
* le huitième pli a été attribué ;
* le score des cartes est calculé ;
* dix de der ou capot est appliqué ;
* Belote/Rebelote est appliquée ;
* réussite, chute ou litige est déterminé ;
* le score de partie est mis à jour.

---

# 55. Invariant de fin de donne

À la fin d'une donne avec contrat :

* chaque joueur possède zéro carte ;
* exactement 32 cartes ont été jouées ;
* chaque carte a été jouée exactement une fois ;
* exactement huit plis existent ;
* chaque pli contient quatre cartes.

---

# 56. Score cible

Le score cible d'une partie est configurable.

Exemples possibles :

* 501 ;
* 1000 ;
* autre valeur.

Il ne doit pas être codé en dur dans les primitives du moteur.

---

# 57. Fin de partie

Lorsqu'une ou plusieurs équipes atteignent ou dépassent le score cible :

* l'équipe ayant le score le plus élevé gagne.

Si les deux équipes atteignent le seuil avec exactement le même score :

* une donne supplémentaire les départage.

Les particularités de tournoi ou variantes de fin de partie doivent être configurables et ne doivent pas contaminer les règles fondamentales du moteur.

---

# 58. Actions métier

Le moteur devra progressivement accepter des actions explicites comme :

* PASS ;
* TAKE ;
* SELECT_TRUMP ;
* PLAY_CARD.

Les noms TypeScript définitifs seront définis lors de l'implémentation.

---

# 59. Autorité sur les coups

Le moteur est l'unique autorité concernant la légalité d'un coup.

L'interface ne décide pas qu'une carte est légale.

Un bot ne décide pas qu'une carte est légale.

Le serveur ne doit pas réimplémenter séparément les règles.

---

# 60. Coups légaux

Pour chaque joueur à son tour, le moteur doit pouvoir fournir :

* toutes les actions légales ;
* toutes les cartes légales ;
* la raison d'un refus d'action illégale.

---

# 61. Action hors tour

Toute action provenant d'un joueur qui n'a pas la main est refusée.

Cela concerne notamment :

* PASS ;
* TAKE ;
* sélection d'atout ;
* jeu d'une carte.

---

# 62. Carte absente

Un joueur ne peut jouer qu'une carte réellement présente dans sa main.

Sont interdits :

* carte inexistante ;
* carte appartenant à un autre joueur ;
* carte déjà jouée ;
* carte ayant déjà quitté la main.

---

# 63. Unicité des cartes

Une carte ne peut être présente qu'à un seul emplacement logique à un instant donné.

Emplacements possibles :

* paquet ;
* retourne ;
* main ;
* pli courant ;
* pli terminé.

Aucune duplication n'est autorisée.

---

# 64. États de la donne

Le moteur utilisera une machine à états explicite.

États conceptuels possibles :

* DEAL_SETUP ;
* FIRST_BIDDING_ROUND ;
* SECOND_BIDDING_ROUND ;
* DEAL_COMPLETION ;
* PLAYING ;
* SCORING ;
* DEAL_FINISHED ;
* MATCH_FINISHED.

Les noms définitifs pourront évoluer.

Une action incompatible avec l'état courant est refusée.

---

# 65. Déterminisme

À état identique et action identique :

* le nouvel état produit doit être identique.

Aucun résultat métier ne dépend :

* de l'heure système ;
* d'un timer UI ;
* du réseau ;
* d'un état global caché.

---

# 66. Seed

Tout comportement pseudo-aléatoire doit pouvoir dépendre d'une seed explicite.

La seed fait partie des informations nécessaires à la reproduction d'une partie.

---

# 67. Replay

Une partie doit pouvoir être reproduite à partir de :

* version du moteur ;
* version des règles ;
* configuration ;
* seed ;
* ordre initial des joueurs ;
* liste ordonnée des actions.

Le replay doit produire le même état final.

---

# 68. Version des règles

Une partie enregistrée doit contenir la version des règles utilisées.

Une future modification du moteur ne doit pas rendre ambigu le résultat d'un ancien replay.

---

# 69. Erreurs métier

Le moteur doit utiliser des erreurs métier explicites.

Exemples futurs :

* NOT_PLAYER_TURN ;
* CARD_NOT_IN_HAND ;
* MUST_FOLLOW_SUIT ;
* MUST_TRUMP ;
* MUST_OVERTRUMP ;
* INVALID_TRUMP_SELECTION ;
* INVALID_BIDDING_ACTION ;
* DEAL_ALREADY_FINISHED.

La liste sera construite progressivement.

---

# 70. IA

Une IA normale reçoit uniquement les informations auxquelles un joueur réel aurait accès.

Elle ne doit pas accéder arbitrairement aux cartes cachées adverses.

Le moteur fournit les coups légaux.

L'IA choisit uniquement parmi eux.

---

# 71. Entraînement IA

Les simulations d'entraînement peuvent utiliser des informations supplémentaires uniquement dans un environnement d'AI Lab explicitement séparé du jeu normal.

Une telle capacité ne doit jamais permettre à un bot de tricher dans une vraie partie.

---

# 72. Multijoueur

Lors d'une partie compétitive online :

* le serveur est autoritaire ;
* le client envoie une intention ;
* le serveur applique le moteur ;
* le serveur valide ou refuse ;
* l'état résultant devient l'état officiel.

Le client ne décide jamais :

* du mélange ;
* de la distribution ;
* de la légalité finale ;
* du gagnant d'un pli ;
* du score.

---

# 73. Mode offline

Le même moteur doit fonctionner entièrement hors ligne.

Une partie contre des bots ne dépend pas :

* du backend ;
* de PostgreSQL ;
* de Redis ;
* de WebSocket ;
* d'Internet.

---

# 74. Variantes hors MVP

Ne sont pas inclus :

* Coinche ;
* Surcoinche ;
* Contrée ;
* enchères chiffrées ;
* Sans Atout ;
* Tout Atout ;
* tierce ;
* cinquante ;
* cent ;
* carré ;
* variantes régionales.

---

# 75. Extensibilité

L'architecture doit permettre d'ajouter ultérieurement des variantes sans réécrire toutes les primitives.

Il faut séparer raisonnablement :

* cartes ;
* classement des cartes ;
* prise ;
* légalité des coups ;
* score ;
* règles de variante.

Cette extensibilité ne doit pas conduire à de l'over-engineering.

---

# 76. Indépendance du domaine

Le cœur métier ne doit importer directement aucune bibliothèque liée à :

* React ;
* React Native ;
* Expo ;
* Android ;
* Express ;
* Socket.IO ;
* PostgreSQL ;
* Redis ;
* graphiques ;
* IA.

Le moteur est une bibliothèque TypeScript autonome.

---

# 77. Tests minimum obligatoires

Le moteur doit disposer de tests pour :

* création du paquet ;
* exactement 32 cartes ;
* unicité des cartes ;
* ordre hors atout ;
* ordre atout ;
* valeurs hors atout ;
* valeurs atout ;
* mélange déterministe ;
* seed ;
* distribution initiale ;
* premier tour de prise ;
* deuxième tour ;
* tous passent ;
* complément de distribution ;
* fournir ;
* partenaire maître ;
* partenaire non maître ;
* coupe ;
* montée à l'atout ;
* surcoupe ;
* sous-coupe légale ;
* sous-coupe interdite si surcoupe possible ;
* gagnant du pli ;
* huit plis ;
* dix de der ;
* Belote ;
* Rebelote ;
* chute ;
* capot ;
* litige ;
* deuxième litige consécutif ;
* fin de donne ;
* fin de partie ;
* transitions d'états ;
* états impossibles ;
* replays.

---

# 78. Tests de non-régression

Tout bug métier corrigé doit, autant que possible, produire un test reproduisant exactement le problème.

Le test doit :

1. échouer avant correction ;
2. réussir après correction ;
3. rester dans la suite de tests.

---

# 79. Priorité métier

En cas de contradiction entre :

* moteur ;
* interface ;
* animation ;
* bot ;
* réseau ;

la spécification métier validée prévaut.

Le composant fautif doit être corrigé.

---

# 80. Première milestone

La première milestone du moteur sera atteinte lorsqu'il pourra :

* créer une partie ;
* créer un paquet ;
* mélanger avec seed ;
* distribuer ;
* effectuer les deux tours de prise ;
* compléter les mains ;
* calculer tous les coups légaux ;
* jouer huit plis ;
* déterminer les gagnants ;
* calculer le score ;
* gérer Belote/Rebelote ;
* gérer réussite ;
* gérer chute ;
* gérer capot ;
* gérer litige ;
* gérer un second litige consécutif ;
* enchaîner les donnes ;
* terminer une partie ;
* reproduire la partie depuis sa seed et ses actions ;

sans interface graphique et sans connexion réseau.

---

# 81. Règle de développement

Aucune règle ne doit être considérée comme terminée sans tests appropriés.

La priorité absolue est :

**exactitude des règles avant fonctionnalités secondaires.**
