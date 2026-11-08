# IA Lab et personnalités des PNJ

## Priorité révisée — 30 octobre 2026

Le développeur demande de reporter le déploiement OVH. Les priorités sont maintenant la qualité visuelle, la lisibilité pour les personnes âgées et l’entraînement des PNJ sur le PC NVIDIA RTX 5070, avant de reprendre la diffusion serveur. Cette décision remplace l’ancien ordre « bêta/déploiement puis IA plus tard ». Les millions de parties restent des données d’apprentissage, jamais une validation moteur ou une CI massive obligatoire.

## Vision du jeu

Les tables solo doivent donner l’impression de retrouver des partenaires et des adversaires avec leur propre caractère. Chaque PNJ possède un profil cohérent et identifiable, avec une manière de prendre, d’aider son partenaire, de gérer l’atout et de réagir à la partie. Proposer plusieurs personnages par niveau et plusieurs niveaux par style permet de renouveler les tables. La force se mesure en partie. La personnalité se mesure aussi par les décisions et par le retour des joueurs sur le plaisir, le rythme et la variété.

Les personnages peuvent échanger entre eux et s’adresser au joueur humain. Commencer par de courtes répliques écrites, choisies selon leur personnalité et des événements publics comme une prise, un pli remporté ou la fin de partie. Garder les textes lisibles, espacés et désactivables. Les répliques ne doivent jamais révéler une carte cachée ni influencer la règle ou le résultat. Identifier clairement les personnages comme PNJ. Envisager la voix après essai des textes et mesure du confort de jeu.

## Cap d’apprentissage et d’intégration

Utiliser la RTX 5070 pour des campagnes locales d’autojeu par lots, jusqu’aux volumes utiles que permettent le débit, le stockage et le temps mesurés. L’objectif de millions de parties reste une ambition d’apprentissage. Le premier palier est une boucle qui produit des décisions, sauvegarde et reprend l’entraînement, puis compare les nouveaux modèles à des adversaires de référence. Augmenter le volume seulement si les mesures montrent que les modèles progressent ou se diversifient. Conserver des graines et adversaires réservés, permuter les places et mesurer les résultats d’équipe. L’imitation peut servir de point de départ, puis les résultats de partie peuvent guider l’apprentissage.

Sur Android, sélectionner et compacter les politiques utiles au solo hors ligne. Mesurer la latence d’un coup, la mémoire, la taille du paquet et le comportement en partie sur appareil. La sélection et la variété des personnages doivent rester compatibles avec les reprises de partie. L’interface, les cartes et les contrôles essentiels restent lisibles quand les personnages parlent.

## Lots de travail avant déploiement

1. **Identifier l’environnement GPU réel** : VRAM disponible, pilote, visibilité de la RTX dans l’environnement choisi et versions d’outils. Mesurer un petit benchmark avant de choisir framework, précision, taille de modèle ou lots. Ne pas changer globalement les pilotes ou environnements des autres projets. L’assistant ne dispose pas du GPU du PC : l’exécution locale doit être lancée sur celui-ci.
2. **Préparer les observations et actions** : même moteur TypeScript, historique public et main du PNJ uniquement ; schéma versionné, masque des actions légales et récompense d’équipe. Aucune carte adverse cachée dans les entrées du PNJ normal. Séparer entraînement, validation et évaluation reproductible.
3. **Construire le laboratoire local** : génération de parties par lots, premier entraînement borné sur GPU, checkpoints et reprise, mesures VRAM/débit/durée. Augmenter progressivement vers les campagnes massives après vérification, sans annoncer un délai ou un nombre de parties à la seconde avant mesure.
4. **Comparer force et styles** : confrontations contre les politiques actuelles, mêmes distributions avec permutations de positions, parties hors entraînement, actions toujours légales. Mesurer les résultats, la variété et les prises de risque ; recueillir séparément le retour des joueurs sur le plaisir et le rythme.
5. **Intégrer les modèles retenus** : export compatible avec le solo Android hors ligne, budget mémoire/latence/énergie mesuré, politique et manifeste versionnés, tests de reprise et de compatibilité. Le téléphone exécute une stratégie retenue ; il n’effectue pas les millions de parties d’entraînement.

Le [pilote d’imitation](AI_LAB_PILOT.md) utilise PyTorch avec CUDA 13.0 pour la première mesure locale. Les choix pour les campagnes longues et le format mobile suivront les mesures. Un modèle entraîné sur le PC n’est pas automatiquement exécutable dans le runtime mobile actuel. Les jeux de données, checkpoints et journaux locaux restent hors du Git public ; publier seulement les scripts, schémas, fixtures synthétiques et résultats autorisés.

## Base disponible

Le [solo offline](ANDROID_OFFLINE.md), les replays et les [simulations bornées](ENGINE_SIMULATION.md) fournissent les fondations. Les [styles PNJ actuels](OFFLINE_BOT_STYLES.md) sont des heuristiques déterministes prudent/solidaire/audacieux et des tables choisies par le joueur. Ils ne constituent pas des modèles entraînés ou une échelle de difficulté mesurée.

La politique est conservée avec chaque partie : une nouvelle préférence ou un nouveau modèle ne doit pas modifier silencieusement une reprise. Préserver les sauvegardes legacy, l’autorité du moteur et une économie sans pay-to-win. Le premier socle visuel est intégré. Le pilote d’imitation est intégré par la PR nº 30. Le [banc en parties complètes](AI_LAB_BENCHMARK.md) mesure maintenant les résultats de chaque style par comparaison appariée.

Le [premier entraînement sur parties complètes](AI_LAB_SELF_PLAY.md) ajoute un adversaire de référence fixe, la sauvegarde entre lots et la mesure avant/après sur le banc réservé.

La [comparaison des récompenses](AI_LAB_REWARD_TRIAL.md) prépare le choix de la méthode et les contrôles d’une campagne longue. Les interactions auront un corpus et des critères de validation propres.
