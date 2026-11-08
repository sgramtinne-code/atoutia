# Premier entraînement sur parties complètes

L’entraînement par lots intégré par la [PR nº 32](https://github.com/sgramtinne-code/atoutia/pull/32) part d’un checkpoint du [pilote d’imitation](AI_LAB_PILOT.md). Le moteur génère les parties à 1 000 points sur CPU. À chaque partie, un siège parmi prudent, solidaire et audacieux échantillonne ses coups légaux selon les scores du modèle. Les autres sièges et toutes les enchères utilisent les heuristiques. Le siège entraîné change à chaque partie.

Après chaque lot, le modèle effectue une mise à jour par gradient de politique, avec une récompense de +1 pour une victoire de l’équipe du siège entraîné et −1 pour une défaite. Chaque partie a le même poids dans cette mise à jour. Les données de la ronde suivante sont produites par les poids sauvegardés. Le moteur valide chaque coup et seules les informations autorisées sont encodées. Les graines partent de l’indice 4096, dans un bloc distinct de celui de l’imitation et du banc d’essai.

`latest.pt` est remplacé après un lot complet. Il contient les poids, l’optimiseur, la configuration, le rapport de départ et les lots terminés. La reprise rejoue au plus le lot interrompu avant sa sauvegarde. Un verrou empêche deux exécutions d’écrire dans le même dossier. Le calcul d’entraînement utilise CUDA par défaut. `--device cpu` permet un essai CPU séparé. La reprise utilise le même type de périphérique et le même nombre de parties par lot.

## Essai sous WSL

Depuis la racine du dépôt, utiliser le checkpoint et l’environnement Python du pilote déjà créé. Les deux commandes lancent d’abord 12 parties puis reprennent jusqu’à 36 parties cumulées.

```bash
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/offline-game build &&
ATOUTIA_CHECKPOINT=$(find ai-lab/data -type f -path '*/pilot.*/model/checkpoint.pt' -printf '%T@ %p\n' | sort -nr | sed -n '1s/^[^ ]* //p') &&
test -f "$ATOUTIA_CHECKPOINT" &&
ATOUTIA_CAMPAIGN=$(mktemp -d "$PWD/ai-lab/data/self-play.XXXXXX") &&
printf 'Checkpoint de départ : %s\nCampagne : %s\n' "$ATOUTIA_CHECKPOINT" "$ATOUTIA_CAMPAIGN/run" &&
ai-lab/.venv/bin/python ai-lab/self-play.py --initial "$ATOUTIA_CHECKPOINT" --output "$ATOUTIA_CAMPAIGN/run" --rounds 1 &&
ai-lab/.venv/bin/python ai-lab/self-play.py --resume --output "$ATOUTIA_CAMPAIGN/run" --rounds 3
```

`--rounds` est le nombre total de lots souhaité. Le maximum de ce pilote est 128. `--matches` fixe entre 3 et 96 parties par lot, par multiples de 3. Pour retrouver une campagne après fermeture du terminal, utiliser son chemin affiché avec `--resume --output`. Le fichier `report.json` compare le modèle initial et le modèle mis à jour avec les heuristiques, sur les mêmes 32 graines réservées et par style. Les victoires affichées pendant l’entraînement concernent les parties d’apprentissage. Les temps affichés séparent la simulation de la mise à jour du modèle. En CUDA, le rapport indique aussi le GPU et le pic mémoire alloué par PyTorch. Le lancement, les exports, les sauvegardes et le banc ont leurs propres coûts.

## Lire le rapport de temps et de périphérique

`modelDevice` indique où se trouvent les paramètres du modèle. Le script vérifie que les entrées, le masque légal et les choix sont sur le même périphérique. Sur CUDA, il attend la fin de la mise à jour avant d’arrêter son chrono. La simulation des parties et le banc d’évaluation s’exécutent dans Node sur CPU.

`roundsCompletedThisRun` et `timingsSecondsThisRun` concernent uniquement le lancement courant. Le rapport ventile l’export des poids, la simulation, la mise à jour, les sauvegardes et le banc. Le temps de mise à jour comprend la préparation des tenseurs et, en CUDA, les transferts et la synchronisation. Le total couvre la campagne à partir du chargement du modèle et s’arrête avant l’écriture du rapport. L’export réutilise le processus Python d’entraînement. La commande séparée `export-policy.py` reste utilisable pour le banc.

## Vérifications en développement

Avec un checkpoint synthétique CPU, trois lots ont produit 36 parties et 1 955 décisions. Une exécution directe, un arrêt après un lot suivi d’une reprise et un SIGINT suivi d’une reprise ont donné les mêmes poids, le même état d’optimiseur, le même historique et les mêmes résultats en match. L’empreinte du fichier sérialisé peut varier entre exécutions. Les victoires sur les graines réservées sont restées à 9, 20 et 8 sur 32 selon le style après trois lots. Le petit essai vérifie la boucle. Il faudra plus de mesures pour sélectionner un modèle.

La vérification de l’export intégré a repris un checkpoint écrit avant la modification. Après quatre lots, les poids, l’optimiseur, l’historique et les mesures en match étaient identiques à ceux d’une campagne démarrée avec le nouveau code. Sur un essai synthétique CPU de trois lots, le temps total observé est passé de 21,8 à 7,0 secondes. L’essai CUDA du nouveau rapport reste à faire.

## Portée

Ce premier lot apprend à partir de parties contre une table fixe. L’autojeu avec plusieurs politiques en évolution et l’apprentissage des enchères sont des travaux suivants. Les checkpoints et rapports sont locaux et les gains éventuels s’évaluent sur [un lot de distributions inédites](AI_LAB_BENCHMARK.md#comparer-le-début-et-la-fin-dune-campagne) avant intégration dans Android.
