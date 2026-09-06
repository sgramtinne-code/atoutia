# Atoutia — Validation des règles MVP

Version : 0.1.0

Statut : validation intermédiaire avant gel de `GAME_RULES.md`.

## Référence principale

Les règles du MVP sont basées sur la Belote classique publiée par la Fédération Française de Belote.

## Jeu de la carte

Règles validées :

* fournir la couleur demandée si possible ;
* si le partenaire est maître et que le joueur ne possède pas la couleur demandée, défausse libre ;
* si le partenaire n'est pas maître ou n'a pas encore joué, couper si le joueur possède de l'atout ;
* lorsqu'un joueur est conduit à jouer atout, il doit monter si possible ;
* s'il ne peut pas monter, il joue un atout inférieur.

## Litige

Règle validée :

* en cas d'égalité parfaite, la défense marque immédiatement ses points ;
* les points des preneurs sont placés en litige ;
* ces points sont attribués en bonus aux vainqueurs de la prise suivante.

Règle supplémentaire validée :

* si la donne suivante produit elle aussi un litige, la défense de cette nouvelle donne encaisse le bonus du litige précédent ;
* le bonus précédent n'est donc pas reporté indéfiniment.

## Capot

Règle validée :

* un capot correspond aux huit plis remportés par le même camp ;
* le bonus du dernier pli vaut alors 100 points ;
* le total de points de plis atteint 252 points ;
* une éventuelle Belote reste comptabilisée séparément.

## Belote/Rebelote

Règle validée :

* le Roi et la Dame d'atout doivent être réunis dans la même main ;
* la Belote vaut 20 points ;
* elle est imprenable ;
* dans Atoutia, sa détection sera automatisée par le moteur.

## Décision

Aucun code métier des cartes, plis ou scores ne doit être commencé avant la production et la validation de `GAME_RULES.md` version 0.1.2 consolidée.
