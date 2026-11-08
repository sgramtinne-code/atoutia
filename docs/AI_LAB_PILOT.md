# Premier essai local du laboratoire IA

Pilote intégré à `main` par la [PR nº 30](https://github.com/sgramtinne-code/atoutia/pull/30). Le pilote apprend à reproduire le choix de carte des PNJ prudent, solidaire et audacieux de la table Variés. Le moteur déroule des parties synthétiques à 1 000 points. Les enchères restent jouées par les heuristiques existantes.

L’entrée comprend la main du PNJ, l’atout, les cartes du pli courant par siège relatif et le style choisi. Le moteur fournit le masque des cartes autorisées. Chaque exemple possède au moins deux choix, afin que les coups forcés ne gonflent pas la mesure. Les matchs de validation utilisent un bloc de graines séparé de celui de l’apprentissage. L’encodage utilise 167 cases binaires par exemple, avec la main aux indices 0–31, l’atout aux indices 32–35, les cartes du pli aux indices 36–163 (quatre sièges relatifs, le siège du PNJ restant vide) et le style aux indices 164–166. L’ordre des cartes est enregistré dans le jeu de données et dans le checkpoint.

Le modèle comprend une couche cachée de 128 unités. Il apprend par imitation supervisée, sur 64 parties d’apprentissage et 16 parties de validation par défaut, pendant cinq passages. Le rapport mesure l’accord avec les PNJ existants, par style et au total, et le compare au choix uniforme parmi les cartes légales. La force en match et le plaisir de jeu nécessiteront des confrontations et des essais distincts.

## Exécuter le pilote sous WSL

Depuis la racine du dépôt, lancer le bloc suivant. PyTorch 2.12.1 avec CUDA 13.0 dispose d’un paquet Linux x86-64 pour CPython 3.14. Le téléchargement peut prendre quelques minutes. [Paquets officiels PyTorch](https://download.pytorch.org/whl/cu130/torch/).

```bash
pnpm install --frozen-lockfile &&
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/offline-game build &&
python3 -m venv ai-lab/.venv &&
ai-lab/.venv/bin/python -m pip install 'torch==2.12.1' --index-url https://download.pytorch.org/whl/cu130 &&
mkdir -p ai-lab/data &&
ATOUTIA_PILOT_RUN=$(mktemp -d "$PWD/ai-lab/data/pilot.XXXXXX") &&
node ai-lab/generate.mjs > "$ATOUTIA_PILOT_RUN/choices.json" &&
ai-lab/.venv/bin/python ai-lab/train.py "$ATOUTIA_PILOT_RUN/choices.json" --output "$ATOUTIA_PILOT_RUN/model"
```

La première ligne d’entraînement affiche la version de PyTorch, la version CUDA et le GPU sélectionné. Le programme s’arrête si CUDA est indisponible. Pour un essai CPU volontaire, passer `--device cpu` et un nouveau chemin de sortie. `report.json` contient les mesures et `checkpoint.pt` contient les poids, l’état de l’optimiseur et les métadonnées. Chaque lancement crée un dossier local distinct ignoré par Git. La mémoire rapportée est le pic alloué par PyTorch, et la cadence concerne les exemples traités, validation comprise. La génération des parties s’exécute sur CPU.

## Vérifications

Deux générations par défaut ont produit des données identiques, avec 10 195 décisions d’apprentissage et 2 665 de validation. L’essai de cinq passages sur CPU avec PyTorch 2.12.1 a terminé avec 66,6 % d’accord global et 33,5 % pour le choix uniforme. Le contrôle du masque a accepté toutes les prédictions et le checkpoint a été écrit. Le [banc en parties complètes](AI_LAB_BENCHMARK.md) réutilise un checkpoint existant pour comparer les politiques. La reprise d’entraînement reste une étape séparée.
