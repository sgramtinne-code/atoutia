# Comparer la récompense par match et par donne

Le pilote utilise une victoire ou une défaite de l’équipe comme récompense de toutes les décisions du match. Le nouveau mode `deal` utilise l’écart des points réellement ajoutés au score par le moteur à la fin de la donne. Cet écart est divisé par 162 et borné à l’intervalle de −1 à +1. Les poids des décisions sont normalisés par le nombre de décisions du match dans les deux modes. Une donne passée sans décision du modèle ne produit aucun exemple.

Les deux campagnes partent du même checkpoint d’imitation et utilisent le même nombre de lots, de parties et les mêmes blocs de graines. Les enchères et les autres sièges restent heuristiques. Les coups peuvent diverger à mesure que les poids changent. La reprise conserve le mode de récompense. Les checkpoints antérieurs reprennent en mode `match`.

## Exécuter la comparaison

Depuis la racine du dépôt avec la branche `feat/ai-lab-deal-reward`, les builds du moteur et du solo et l’environnement Python du pilote, sélectionner un checkpoint d’imitation. L’exemple lance deux campagnes de 32 lots de 48 parties. Il enregistre les résultats dans un dossier local ignoré par Git.

```bash
ATOUTIA_CHECKPOINT='ai-lab/data/pilot.EXEMPLE/model/checkpoint.pt'
test -f "$ATOUTIA_CHECKPOINT" &&
ATOUTIA_TRIAL=$(mktemp -d "$PWD/ai-lab/data/reward-trial.XXXXXX") &&
printf 'Dossier de comparaison : %s\n' "$ATOUTIA_TRIAL" &&
ai-lab/.venv/bin/python ai-lab/self-play.py --device cuda --initial "$ATOUTIA_CHECKPOINT" --reward match --matches 48 --rounds 32 --output "$ATOUTIA_TRIAL/match" &&
ai-lab/.venv/bin/python ai-lab/self-play.py --device cuda --initial "$ATOUTIA_CHECKPOINT" --reward deal --matches 48 --rounds 32 --output "$ATOUTIA_TRIAL/deal" &&
ai-lab/.venv/bin/python ai-lab/export-policy.py "$ATOUTIA_TRIAL/match/latest.pt" > "$ATOUTIA_TRIAL/match.json" &&
ai-lab/.venv/bin/python ai-lab/export-policy.py "$ATOUTIA_TRIAL/deal/latest.pt" > "$ATOUTIA_TRIAL/deal.json" &&
node ai-lab/benchmark.mjs --reward-trial --policy "$ATOUTIA_TRIAL/match.json" --candidate "$ATOUTIA_TRIAL/deal.json" --seeds 128 > "$ATOUTIA_TRIAL/report.json" &&
cat "$ATOUTIA_TRIAL/report.json"
```

Si une campagne est interrompue après sa première sauvegarde, reprendre le dossier concerné avec `self-play.py --resume --device cuda --rounds 32 --output CHEMIN`. Puis relancer les commandes d’export et d’évaluation. Le mode `--reward-trial` refuse une origine ou un budget différent. Il joue 896 parties sur 128 distributions réservées à partir de l’indice 3328. Dans son rapport, `initialWins` correspond au modèle entraîné en fin de match et `candidateWins` au modèle entraîné par donne. Lire les bascules de victoire et la marge par style. Une amélioration utilisée pour choisir la méthode devra être confirmée sur un autre lot.

## Vérifications en développement

Sur CPU, les deux modes ont entraîné 24 parties chacun et le banc a terminé 896 parties. Les premières parties produisent les mêmes décisions avec les mêmes poids et graines, et le mode par donne associe chaque décision à sa récompense. Les points collectés par donne totalisent les scores finaux du moteur. Le mode historique produit le même lot, octet pour octet, et un ancien checkpoint reprend en mode match. La reprise par donne conserve le mode. Une modification du mode à la reprise ou un budget différent au banc est rejeté. Le premier essai CUDA à 1 536 parties par mode reste à faire.

## Avant une campagne longue

Pour le jeu de carte, confirmer un gain reproductible contre les heuristiques sur un autre lot et vérifier qu’il ne dépend pas d’un seul siège ou style. Ensuite, automatiser les paliers avec suivi des checkpoints, évaluation et arrêt si la qualité se dégrade. L’apprentissage des enchères, les partenaires variables et l’évaluation sur Android restent des jalons distincts.

Pour les interactions, préparer un corpus de situations publiques et de répliques validées, étiquetées par personnage, pertinence, ton et répétition. Commencer par un classement des répliques adaptées au contexte avec un jeu de validation réservé. Vérifier la lisibilité et la cadence avec des joueurs. Un modèle appris de répliques ne doit accéder ni aux mains cachées ni à la décision du moteur.
