# IA Lab et personnalités des PNJ

## Cap confirmé par le développeur — 28 octobre 2026

Les **millions de parties** correspondent à l'entraînement futur de l'IA sur son **PC équipé d'une NVIDIA RTX 5070**. Le but est de proposer des PNJ de niveaux différents, avec des méthodes de jeu et des personnalités variées, amusantes et distrayantes. La seule maximisation du taux de victoire ne suffit pas à cet objectif.

Cette étape vient **plus tard**. Elle ne constitue aucun prérequis à la livraison du moteur, du solo offline, de la bêta ou de la publication. Les essais reproductibles de 1 000/10 000 parties déjà livrés restent des outils bornés de validation du moteur ; ils ne sont ni un entraînement GPU ni un jeu de modèles entraînés.

## Progression prévue

1. Livrer un solo offline complet avec des PNJ locaux utilisables sans infrastructure d'entraînement.
2. Définir les styles de jeu, niveaux et critères de plaisir/diversité ; séparer personnalité et force de jeu.
3. Construire l'IA Lab local : génération de parties, apprentissage, comparaison des profils et évaluations reproductibles sur le PC RTX 5070.
4. Après validation technique et ludique, intégrer les stratégies ou modèles retenus dans l'application, avec leurs contraintes d'exécution locale.

Les algorithmes, frameworks et formats de modèles restent à choisir au moment de cette étape, sur des mesures réelles. Aucun entraînement, installation GPU ou volume de millions de parties n'est lancé implicitement aujourd'hui. L'entraînement ne s'effectue pas sur le téléphone. Les PNJ de jeu normal disposent uniquement des informations autorisées, sans accès aux cartes cachées adverses. Préserver une économie sans pay-to-win.


## Premier enrichissement sans entraînement — 29 octobre 2026

Le lot [styles PNJ offline](OFFLINE_BOT_STYLES.md) introduit des heuristiques déterministes prudent/solidaire/audacieux et des tables choisies par le joueur. Il ne mesure pas une échelle de force ni un plaisir garanti. Le botPolicy est conservé avec chaque partie pour ne pas changer une reprise. Les PNJ reçoivent seulement leur main, le pli public et leurs actions autorisées ; les règles restent celles du moteur. Ce premier choix de styles peut guider le retour ludique avant l’IA Lab ; aucun entraînement RTX5070 ou modèle appris n’est déclaré livré.
