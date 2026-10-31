# IA Lab et personnalités des PNJ

## Priorité révisée — 30 octobre 2026

Le développeur demande de reporter le déploiement OVH. Les priorités sont maintenant la qualité visuelle, la lisibilité pour les personnes âgées et l’entraînement des PNJ sur le PC NVIDIA RTX 5070, avant de reprendre la diffusion serveur. Cette décision remplace l’ancien ordre « bêta/déploiement puis IA plus tard ». Les millions de parties restent des données d’apprentissage, jamais une validation moteur ou une CI massive obligatoire.

L’objectif est double : des niveaux de force mesurés et des manières de jouer variées, amusantes et distrayantes. La personnalité ne doit pas être réduite à une force plus faible ; la maximisation du taux de victoire ne suffit pas à mesurer le plaisir.

## Lots de travail avant déploiement

1. **Identifier l’environnement GPU réel** : VRAM disponible, pilote, visibilité de la RTX dans l’environnement choisi et versions d’outils. Mesurer un petit benchmark avant de choisir framework, précision, taille de modèle ou lots. Ne pas changer globalement les pilotes ou environnements des autres projets. L’assistant ne dispose pas du GPU du PC : l’exécution locale doit être lancée sur celui-ci.
2. **Préparer les observations et actions** : même moteur TypeScript, historique public et main du PNJ uniquement ; schéma versionné, masque des actions légales et récompense d’équipe. Aucune carte adverse cachée dans les entrées du PNJ normal. Séparer entraînement, validation et évaluation reproductible.
3. **Construire le laboratoire local** : génération de parties par lots, premier entraînement borné sur GPU, checkpoints et reprise, mesures VRAM/débit/durée. Augmenter progressivement vers les campagnes massives après vérification, sans annoncer un délai ou un nombre de parties à la seconde avant mesure.
4. **Comparer force et styles** : confrontations contre les politiques actuelles, mêmes distributions avec permutations de positions, parties hors entraînement, actions toujours légales. Mesurer les résultats, la variété et les prises de risque ; recueillir séparément le retour des joueurs sur le plaisir et le rythme.
5. **Intégrer les modèles retenus** : export compatible avec le solo Android hors ligne, budget mémoire/latence/énergie mesuré, politique et manifeste versionnés, tests de reprise et de compatibilité. Le téléphone exécute une stratégie retenue ; il n’effectue pas les millions de parties d’entraînement.

Les frameworks et formats restent à choisir à partir des compatibilités officielles et de mesures réelles. Un modèle entraîné sur le PC n’est pas automatiquement exécutable dans le runtime mobile actuel. Les jeux de données, checkpoints et journaux locaux restent hors du Git public ; publier seulement les scripts, schémas, fixtures synthétiques et résultats autorisés.

## Base disponible

Le [solo offline](ANDROID_OFFLINE.md), les replays et les [simulations bornées](ENGINE_SIMULATION.md) fournissent les fondations. Les [styles PNJ actuels](OFFLINE_BOT_STYLES.md) sont des heuristiques déterministes prudent/solidaire/audacieux et des tables choisies par le joueur. Ils ne constituent pas des modèles entraînés ou une échelle de difficulté mesurée.

La politique est conservée avec chaque partie : une nouvelle préférence ou un nouveau modèle ne doit pas modifier silencieusement une reprise. Préserver les sauvegardes legacy, l’autorité du moteur et une économie sans pay-to-win. Le chantier visuel courant ne lance aucun entraînement et n’installe aucune dépendance GPU ; le diagnostic du PC sera la prochaine entrée concrète du lot IA Lab.
