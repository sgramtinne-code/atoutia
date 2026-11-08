# Comparer le jeu avec et sans mémoire des plis

L’expérience ajoute 128 entrées au modèle du laboratoire. Elles indiquent quelle carte a été jouée par quel siège relatif dans les plis terminés de la donne en cours. La mémoire repart à zéro à chaque donne. Le moteur transmet uniquement les plis déjà terminés. La main du joueur, l’atout, le pli courant et le style restent les entrées de base. Le masque du moteur continue à limiter les coups aux cartes légales.

Le jeu de données est généré une seule fois. Les deux modèles utilisent les mêmes 295 entrées, la même initialisation et les mêmes exemples. Dans le témoin `off`, les 128 entrées de mémoire valent zéro pendant l’entraînement, la validation et les parties. Dans la variante `on`, elles portent les cartes des plis terminés. Le jeu de données et le nombre d’époques sont vérifiés par le banc avant comparaison.

La mémoire représente l’ensemble des cartes déjà jouées par siège. Elle ne conserve pas l’ordre des anciens plis. Ce premier test couvre l’imitation et l’évaluation en partie. Les checkpoints avec mémoire ont un format distinct. L’apprentissage par renforcement avec mémoire et l’intégration Android restent des étapes suivantes.

## Exécuter sous WSL

Depuis la racine du dépôt sur `feat/ai-lab-trick-memory`, utiliser l’environnement Python CUDA du pilote et les builds du moteur et du solo. La commande crée un nouveau dossier local et entraîne deux modèles pendant dix époques chacun.

```bash
ATOUTIA_MEMORY=$(mktemp -d "$PWD/ai-lab/data/trick-memory.XXXXXX") &&
printf 'Dossier de comparaison : %s\n' "$ATOUTIA_MEMORY" &&
node ai-lab/generate.mjs --history --train 256 --validation 64 > "$ATOUTIA_MEMORY/data.json" &&
ai-lab/.venv/bin/python ai-lab/train.py "$ATOUTIA_MEMORY/data.json" --device cuda --epochs 10 --history-mode off --output "$ATOUTIA_MEMORY/off" &&
ai-lab/.venv/bin/python ai-lab/train.py "$ATOUTIA_MEMORY/data.json" --device cuda --epochs 10 --history-mode on --output "$ATOUTIA_MEMORY/on" &&
ai-lab/.venv/bin/python ai-lab/export-policy.py "$ATOUTIA_MEMORY/off/checkpoint.pt" > "$ATOUTIA_MEMORY/off.json" &&
ai-lab/.venv/bin/python ai-lab/export-policy.py "$ATOUTIA_MEMORY/on/checkpoint.pt" > "$ATOUTIA_MEMORY/on.json" &&
node ai-lab/benchmark.mjs --history-trial --policy "$ATOUTIA_MEMORY/off.json" --candidate "$ATOUTIA_MEMORY/on.json" --seeds 128 > "$ATOUTIA_MEMORY/report.json" &&
cat "$ATOUTIA_MEMORY/report.json"
```

Le banc joue 896 parties sur 128 nouvelles distributions à partir de l’indice 3584. `initialWins` correspond au témoin sans mémoire et `candidateWins` au modèle avec mémoire. Les bascules de victoire et la variation moyenne de marge sont mesurées par style. Si cette comparaison sert à choisir la méthode, confirmer le résultat sur d’autres distributions.

## Vérifications en développement

Le générateur historique, l’export v1 et son rapport de banc sont identiques octet pour octet aux versions précédentes. Sur un jeu de données réduit de 16 matchs d’apprentissage et 4 de validation, 2 601 décisions incluent des plis terminés. Pour chaque ligne, les cartes légales, la cible et les entrées de base correspondent au jeu historique. Les deux modèles CPU ont terminé deux époques et 896 parties d’évaluation. Le banc refuse des jeux de données différents et l’entraînement par renforcement v1 refuse un checkpoint avec mémoire. La première mesure CUDA avec le budget complet reste à faire.
