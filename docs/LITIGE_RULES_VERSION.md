# Attribution du litige et compatibilité des parties

## Correction ciblée

La spécification [GAME_RULES.md](GAME_RULES.md) 0.1.3 précise le terme « vainqueurs » déjà validé dans RULES_VALIDATION : un bonus de litige précédent revient au preneur qui réussit ou à la défense si le preneur chute. Exemple : 81 points en attente, puis preneur à 70 / défense à 92 sans Belote → **0 / 243**. Le comportement historique était **81 / 162**. La Belote reste imprenable ; huit passes gardent le report et les litiges consécutifs gardent leur règle existante.

Quatre tests ciblés ajoutés avant correction échouaient réellement (deux équipes, avec/sans Belote). Les mêmes assertions passent après correction. L'ancien test du comportement historique est conservé avec une sélection explicite des règles legacy.

## Version choisie par partie

Les nouvelles parties créées par le moteur portent `rulesVersion: CLASSIC_LITIGE_WINNER`. Une partie persistée sans champ est interprétée comme `CLASSIC_LEGACY_LITIGE_TAKER` ; son prochain score reste historique. La sélection accompagne toutes les donnes suivantes. Un salon créé avant cette évolution, même encore en attente, reste historique. Pour bénéficier de la correction, créer un nouveau salon après mise à jour/redémarrage du backend.

Aucune réattribution rétroactive, migration de base réelle ou modification de résultat durable. Les documents SQLite existants restent au format 1 ; le champ privé de l'état est conservé par leur sérialisation normale. Deux fixtures SQLite temporaires redémarrent le repository/store puis soumettent la carte décisive par la commande habituelle, pour les deux versions. Aucun compte, stockage Android ou base réelle utilisé.

## Replays et intégrité

- Format **1** : historique, sans champ de règle. Lecture/rejeu legacy, représentation et empreinte conservées. Le fixture synthétique pré-correction contient 332 événements : seed 10, score historique **585 / 913**, hash `d4a9a3e1ef4b4d0ed1c0ede0c7c44919a9f9bf7f8a73f956857a8ecef4aa2cc0`.
- Format **2** : version de règles explicite obligatoire. Le même préfixe joué sous les nouvelles règles donne **666 / 832**. Les anciennes bibliothèques qui ne connaissent que le format 1 refusent ce nouveau format, au lieu de lui appliquer silencieusement l'ancien calcul.
- La version de règles est incluse dans le hash canonique du format 2. Une version inconnue ou un format 2 sans règle est refusé ; un format 1 ne peut pas être réétiqueté avec une règle nouvelle.
- Pour l'API de replay de l'historique brut, sélectionner explicitement la version legacy pour un ancien historique ; préférer les documents de replay qui portent les métadonnées nécessaires.

Le format des snapshots/commandes réseau, leurs `engineVersion` existants, l'application Android et l'orientation ne changent pas. Version documentaire, identifiant de règles de partie, format de replay et version de paquet sont distincts.

## Validation bornée

Le lanceur de simulation accepte `--rules-version`. La CI contrôle deux lots de **1 000** : règles actuelles et legacy, chacun comparé à sa référence. Les rapports 1 000/10 000 de PR nº 18 sont des preuves historiques du comportement legacy, conservées. La nouvelle référence est [le lot actuel](reports/engine-simulation-winner-1000.json). Validation locale assistant : **601 moteur, 620 backend, 14 contrôles**, typechecks/builds/CLI synthétiques réussis. Lot actuel : 10 466 donnes jouées + 1 233 huit passes, 334 912 cartes, 1 000 replays, empreinte `458c11331f5d8d7b5c86069f612e78f08d187c40046c0f62922648ed213dc53b`. Lot legacy : empreinte/compteurs PR18 exactement reproduits. Aucun échec/incomplet. Code **3c2ad4a** validé : [moteur/backend 40747230287](https://github.com/sgramtinne-code/atoutia/actions/runs/40747230287), job 123024146142, **601/620 + 14 contrôles + deux lots de 1 000 et références identiques** ; [Android Kotlin 40747232842](https://github.com/sgramtinne-code/atoutia/actions/runs/40747232842), job 123024147545, **231 JVM/APK/lint**, 11 avertissements/1 suggestion. Les deux CI réussies. Workflow instrumenté non déclenché selon les filtres de chemins ; aucun nouveau résultat AVD revendiqué. Vérifier les deux CI du commit documentaire de clôture de la [PR nº 19](https://github.com/sgramtinne-code/atoutia/pull/19) avant fusion avec SHA attendu, puis main/push.

Ces lots vérifient la correction et la compatibilité ; ils n'entraînent aucune IA. Les millions de parties relèvent du futur [IA Lab sur PC RTX 5070](AI_LAB_ROADMAP.md), pour les styles et niveaux de PNJ amusants/variés. Aucun prérequis de millions avant solo, bêta ou publication, aucun entraînement/installation GPU lancé.

Après intégration, prochaine livraison produit : choix de l'exécution locale du moteur existant et première partie solo offline. Ne pas repartir dans des campagnes massives de validation ni rouvrir les essais Android/SQLite déjà acquis.
