# Banc d’essai en parties complètes

Le pilote d’imitation est intégré à main par la PR nº 30. Le banc d’essai mesure l’effet du modèle sur le résultat d’une partie à 1 000 points. Il lit le checkpoint existant, exporte ses poids en JSON et fait jouer le moteur sur CPU.

Pour chaque graine, le banc joue une référence avec les quatre heuristiques, puis rejoue trois parties en remplaçant successivement le jeu de carte du prudent (joueur 1), du solidaire (joueur 2) et de l’audacieux (joueur 3). La distribution initiale et le premier donneur sont les mêmes dans les quatre parties. Le reste de la partie suit les décisions prises. Les enchères, le partenaire et les adversaires conservent leurs heuristiques. Le moteur fournit les cartes légales et valide chaque coup. Les graines du banc appartiennent à un troisième bloc, distinct de l’apprentissage et de la validation d’imitation.

## Exécuter sous WSL

Depuis la racine du dépôt avec le code du banc d’essai, utiliser l’environnement Python du [pilote](AI_LAB_PILOT.md). La commande sélectionne le checkpoint du pilote modifié le plus récemment. Vérifier le chemin affiché si plusieurs modèles sont disponibles.

```bash
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/offline-game build &&
ATOUTIA_CHECKPOINT=$(find ai-lab/data -type f -path '*/pilot.*/model/checkpoint.pt' -printf '%T@ %p\n' | sort -nr | sed -n '1s/^[^ ]* //p') &&
test -f "$ATOUTIA_CHECKPOINT" &&
printf 'Checkpoint utilisé : %s\n' "$ATOUTIA_CHECKPOINT" &&
ATOUTIA_BENCHMARK=$(mktemp -d "$PWD/ai-lab/data/benchmark.XXXXXX") &&
ai-lab/.venv/bin/python ai-lab/export-policy.py "$ATOUTIA_CHECKPOINT" > "$ATOUTIA_BENCHMARK/policy.json" &&
node ai-lab/benchmark.mjs --policy "$ATOUTIA_BENCHMARK/policy.json" --seeds 32 > "$ATOUTIA_BENCHMARK/report.json" &&
cat "$ATOUTIA_BENCHMARK/report.json"
```

Le rapport est enregistré dans `ai-lab/data/benchmark.*/report.json`. `baselineWins` et `modelWins` comptent les victoires de l’équipe du siège évalué sur les mêmes graines. `gainedWins` compte les défaites de référence transformées en victoires et `lostWins` l’inverse. `meanMarginChange` mesure l’écart moyen entre les deux versions, en points d’avance sur l’équipe adverse. Les résultats se lisent par style et par siège. La limite est de 128 graines, soit 512 parties.

## Vérifications en développement

Le générateur produit le même jeu de données que celui de la PR nº 30, octet pour octet. Sur 2 043 décisions légales de nouvelles parties, le calcul Node a choisi les mêmes cartes que PyTorch avec le même checkpoint synthétique. Le rapport à 32 graines est reproductible et le lot maximal a terminé ses 512 parties. Des poids de forme invalide, un ordre de cartes incompatible et un nombre de graines hors limites ont été rejetés.

Sur le checkpoint synthétique CPU, les victoires de l’équipe du siège évalué sont passées de 11 à 9 pour le prudent, de 21 à 20 pour le solidaire et de 11 à 8 pour l’audacieux, sur 32 graines par style. Ce résultat dépend du checkpoint et du lot. Le banc compare un remplacement à la fois, et des essais distincts resteront nécessaires pour évaluer un duo entraîné ou le plaisir de jeu.
