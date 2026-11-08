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

## Confirmer avec les mêmes checkpoints

Le mode `--history-confirmation` rejoue les deux politiques exportées sur 512 distributions inédites. Les quatre blocs de 128 commencent aux indices 16384, 16512, 16640 et 16768, après les indices utilisés par les campagnes actuelles. Réserver ces indices hors de tout futur entraînement. Chaque distribution produit sept parties, soit 3 584 au total. Les modèles sont figés pendant l’évaluation.

Depuis la racine du dépôt, renseigner le dossier du premier essai, qui contient déjà les deux exports. Le calcul se fait sur CPU.

```bash
ATOUTIA_MEMORY='ai-lab/data/trick-memory.EXEMPLE'
test -s "$ATOUTIA_MEMORY/off.json" &&
test -s "$ATOUTIA_MEMORY/on.json" &&
ATOUTIA_CONFIRM=$(mktemp -d "$PWD/ai-lab/data/history-confirmation.XXXXXX") &&
node ai-lab/benchmark.mjs --history-confirmation \
  --policy "$ATOUTIA_MEMORY/off.json" --candidate "$ATOUTIA_MEMORY/on.json" \
  > "$ATOUTIA_CONFIRM/report.json" &&
cat "$ATOUTIA_CONFIRM/report.json"
```

Comparer `byStyle` pour le total et `byBlock` pour la répartition. Un gain concentré dans un seul bloc mérite davantage de prudence qu’un écart qui se retrouve dans plusieurs blocs. Ce rapport confirme ou nuance un résultat sur deux checkpoints précis. La variabilité entre plusieurs entraînements s’évalue séparément.

## Répéter l’entraînement et permuter les places

Le script entraîne trois paires de modèles avec les graines 1234, 1235 et 1236. Au sein d’une paire, le jeu de données, l’initialisation et le budget d’entraînement sont identiques. Le profil audacieux est ensuite joué aux sièges `PLAYER_1`, `PLAYER_2` et `PLAYER_3`. L’entrée de style reste audacieuse, tandis que les cartes du pli courant et des plis terminés restent encodées relativement au siège réellement occupé.

Pour chaque siège et chaque distribution, le banc joue trois parties. L’heuristique audacieuse de l’application est la référence et gère les enchères dans les trois variantes. Les trois autres sièges utilisent la politique d’origine dans chaque partie. Cette composition définit un nouveau banc et ses scores bruts se lisent dans ce contexte. Les 128 indices réservés vont de 16896 à 17023. Les trois paires jouent ces mêmes distributions, pour 3 456 exécutions. Les résultats de différentes paires ou places sur une même distribution ne constituent pas des observations indépendantes.

Depuis la racine du dépôt, construire le moteur et le solo, puis utiliser le fichier `data.json` issu de `generate.mjs --history` et l’environnement CUDA du pilote. La commande crée un sous-dossier pour chaque paire et écrit le rapport global après la dernière.

```bash
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/offline-game build &&
ATOUTIA_DATA="$PWD/ai-lab/data/trick-memory.EXEMPLE/data.json" &&
test -s "$ATOUTIA_DATA" &&
ATOUTIA_STUDY=$(mktemp -d "$PWD/ai-lab/data/bold-memory.XXXXXX") &&
ai-lab/.venv/bin/python ai-lab/bold-memory-study.py "$ATOUTIA_DATA" --output "$ATOUTIA_STUDY/run" --device cuda &&
cat "$ATOUTIA_STUDY/run/report.json"
```

Comparer les victoires, les bascules et la variation de marge pour chaque initialisation et chaque place. `referenceWins` donne la force de l’heuristique audacieuse dans les mêmes conditions. Les rapports par paire restent disponibles si l’exécution est interrompue après une paire terminée. Une nouvelle exécution utilise un dossier distinct. L’apprentissage utilise PyTorch sur CUDA et le banc joue les parties sur CPU.

## Faire tourner l’audacieux pendant l’imitation

Les deux variantes apprennent uniquement des décisions de l’heuristique audacieuse avec la mémoire des plis. Les trois autres joueurs utilisent la politique d’origine. La variante `fixed` place l’audacieux au siège `PLAYER_3`, affiché « Joueur 4 ». La variante `rotated` alterne les trois sièges PNJ à chaque partie. Le profil transmis au modèle reste audacieux et les cartes restent encodées depuis le siège réellement occupé.

Les deux générateurs partagent 768 indices d’apprentissage de 32000 à 32767 et 192 indices de validation de 32768 à 32959. Le jeu tournant prélève le même nombre de décisions à chaque siège. Le jeu fixe prélève autant de décisions au total. Les décisions sont espacées régulièrement dans chaque liste. Les deux variantes utilisent les mêmes trois initialisations, la même architecture et dix époques. Le témoin à place fixe est réentraîné pour contrôler le budget et l’environnement de jeu.

Le banc compare les deux modèles et la référence à chaque place sur les 256 indices réservés de 30720 à 30975, soit 6 912 parties. `meanMarginChange` mesure la variation de marge du modèle tournant par rapport au modèle fixe. Les modèles partagent les distributions, et chaque variante valide ses poids sur ses propres exemples. Le banc en parties complètes sert à comparer leur jeu dans des conditions communes.

```bash
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/offline-game build &&
mkdir -p ai-lab/data &&
ATOUTIA_SEATS=$(mktemp -d "$PWD/ai-lab/data/bold-seat-imitation.XXXXXX") &&
printf 'Dossier de comparaison : %s\n' "$ATOUTIA_SEATS/run" &&
ai-lab/.venv/bin/python ai-lab/bold-seat-imitation.py --output "$ATOUTIA_SEATS/run" --device cuda &&
cat "$ATOUTIA_SEATS/run/report.json"
```

La simulation des parties et la génération des données tournent sur CPU. Les poids sont entraînés sur CUDA. Les deux jeux de données, les checkpoints, les exports et le rapport sont enregistrés dans le nouveau dossier local.
