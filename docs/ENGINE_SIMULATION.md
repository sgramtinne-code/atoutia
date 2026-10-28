# Campagnes reproductibles de parties complètes

## But et périmètre

L'exigence initiale de simulations nombreuses est distincte des 588 tests unitaires du moteur. Le nouvel outil exécute le moteur compilé existant, dans un processus Node séparé du backend et d'Android. Il ne crée aucun compte, salon, serveur ou fichier SQLite et ne modifie aucune règle ni aucun export du domaine.

Chaque partie va jusqu'à un vainqueur au **score cible de 1 000 points**, avec plusieurs donnes si nécessaire. Ce ne sont pas des donnes uniques présentées comme des parties complètes.

## Commandes depuis la racine

```bash
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/belote-engine test:simulation &&
node packages/belote-engine/scripts/simulate-matches.mjs \
  --matches 1000 --start-seed 20261028 --max-duration-ms 300000
```

`pnpm --filter @atoutia/belote-engine simulate` est le raccourci du lanceur après build. `--help` décrit les options. Le moteur doit être recompilé après tout changement de ses sources ; l'outil importe `dist/index.js`.

Le JSON va sur stdout et l'avancement sur stderr. Pour enregistrer le même JSON, ajouter `--report /chemin/vers/un-nouveau-rapport.json` ; le parent doit exister et le fichier ne doit pas exister. L'écriture exclusive refuse un écrasement. Aucun fichier n'est écrit par défaut.

Le nombre de parties est borné entre 1 et 1 000 000 ; le plafond d'actions par partie vaut 20 000 par défaut. Le budget de campagne vaut 120 secondes par défaut, jusqu'à 24 heures explicitement. Un plafond n'est pas une preuve que ce nombre de parties a été exécuté.

## Reproduction

- Version de politique : `seeded-legal-v1` ; versions de format, moteur et Node présentes dans le rapport.
- Partie d'index i : `baseSeed = (startSeed + imul(i, 16777619)) >>> 0`. Le pas impair répartit les graines de partie dans l'espace 32 bits ; le moteur conserve sa progression propre de graines de donne. Cela ne démontre pas l'indépendance statistique de toutes les distributions.
- Premier donneur : `PLAYER_POSITIONS[baseSeed % 4]`. Les compteurs `dealer_PLAYER_*` concernent ce **premier donneur par partie**, pas toutes les donnes.
- Les décisions utilisent un PRNG séparé, initialisé avec `baseSeed ^ 0x5bd1e995`. Pour chaque donne, une position de prise de 0 à 7, ou huit passes, est choisie ; la couleur vient des choix autorisés par le moteur. Les cartes sont choisies parmi les cartes légales de la main du joueur courant.
- Cette politique n'est pas un bot stratégique. Ses choix n'utilisent pas les mains adverses ; les assertions de l'outil inspectent l'état autoritaire complet pour contrôler les invariants.
- Une graine se rejoue seule avec `--matches 1 --start-seed BASE_SEED`, en conservant version du code et limites. L'historique partiel et la dernière action sont fournis sur un échec.
- `transcriptSha256` agrège dans l'ordre les graines et empreintes des historiques/résultats complets. Il exclut la durée et les métadonnées d'exécution. Même code/configuration de jeu : même empreinte ; une campagne plus longue a une autre empreinte.

## Contrôles exécutés

Après chaque action : partition valide des 32 cartes, absence de doublon/perte, taille des mains, ordre des joueurs, quatre cartes par pli, gagnant et entame suivante cohérents, progression des graines/donneur, historique et score cible. Le dernier pli est compté une seule fois, même si le moteur a déjà ouvert la donne suivante.

À chaque donne terminée : 32 cartes jouées/huit plis, 152 points des cartes et 162 points bruts avec dix de der, conservation des points attribués + litige en tenant compte du capot et de la Belote, ajout du résultat au score et transfert du litige. Les huit passes ne modifient ni score ni report.

Deux actions invalides par partie sont également soumises : enchère hors tour et carte absente de la main. Elles doivent être refusées sans mutation. À la fin de **chaque** partie, son historique est rejoué par `replayMatch` et l'état complet comparé à l'original. Les compteurs de prises aux deux tours, passes, contrats, litiges, capots, Belotes, atouts et vainqueurs décrivent les cas réellement observés.

Les 13 contrôles Node de l'outil incluent reproductibilité, rejeu isolé d'une graine, fautes injectées (doublon, carte perdue, tour erroné, victoire incohérente), limites, arguments et vrai parcours CLI/fichier. Ils sont séparés des tests Vitest et exécutés **après build**, afin de vérifier le paquet compilé.

## Résultats et limites

Codes de sortie : **0** pour toutes les parties demandées validées ; **1** pour échec, arguments invalides ou erreur d'écriture ; **2** pour campagne `INCOMPLETE` lorsque son budget est épuisé. Une erreur de configuration peut sortir sans rapport JSON. Le budget est coopératif, vérifié pendant le jeu et avant/après le replay ; ce n'est pas une interruption OS à la milliseconde. Un arrêt externe brutal peut ne laisser aucun rapport final.

Les totaux et l'empreinte ne comptent que les parties entièrement validées/rejouées ; la partie interrompue ou échouée reste décrite à part. Les compteurs rares ne remplacent pas les tests métier ciblés. Rejouer le même moteur contrôle sa reproductibilité, pas une seconde preuve indépendante de chaque règle. Ces simulations ne certifient ni équité/prédictibilité du hasard de production, ni qualité des bots, ni réseau, Android ou comportement de vrais utilisateurs.

Premier palier **réellement exécuté dans l'environnement assistant** : [1 000 parties](reports/engine-simulation-1000.json), 10 475 donnes jouées, 1 236 donnes à huit passes, 335 200 cartes, 1 000 replays identiques ; aucun échec/incomplet. Empreinte `4a21bca7581b7e1696c6fb56af16a19332faf7796b2029024d5864aae332c20e`. Node 24.22.1 ; les 13 contrôles de l'outil, les 588/618 tests et typechecks/builds/CLI synthétiques passent localement. Ce n'est pas une exécution sur le PC du développeur. Le code publié correspondant est [`106423b`](https://github.com/sgramtinne-code/atoutia/commit/106423b452bf5943f01b473d35ccd2ac9714eafb).

Palier **[10 000 parties complètes](reports/engine-simulation-10000.json) réellement réussi dans le même environnement** : 105 139 donnes jouées + 12 861 huit passes, 3 364 448 cartes, 3 941 577 actions, 20 000 rejets invalides sans mutation et 10 000 replays identiques ; 967 litiges, 2 340 capots et 23 829 Belotes observés. Aucun échec/incomplet. Empreinte `60ed84a648f2c5c018c938ca1bb54c48dfc4d7089d0bb67092372f7b09ec42ff`. Le même début de campagne contient le palier 1 000 ; ne pas additionner les deux comme des parties distinctes. Les millions restent non validés.

## CI et suite

Le workflow moteur/backend exécute les 13 contrôles puis **1 000 parties**, budget de 300 secondes, étape limitée à six minutes. Il compare empreinte, compteurs et configuration de jeu au rapport versionné du palier 1 000 ; durée, budget et version Node sont des métadonnées distinctes. Une évolution métier légitime peut nécessiter une nouvelle référence explicitement revue. Le JSON est inscrit dans ses logs et dans un fichier temporaire du runner ; ce fichier n'est pas annoncé comme un artifact téléchargeable. Code `106423b` : [moteur/backend 40742507356](https://github.com/sgramtinne-code/atoutia/actions/runs/40742507356), job `123007544194`, **588/618 + 13 contrôles + 1 000 parties**, comparaison du rapport réussie ; [Android Kotlin 40742507601](https://github.com/sgramtinne-code/atoutia/actions/runs/40742507601), job `123007547337`, **231 JVM/APK/lint**, 11 avertissements/1 suggestion. Le workflow instrumenté ne se déclenche pas sur ces chemins : aucun nouveau résultat AVD revendiqué. Vérifier les CI du dernier commit documentaire de la [PR nº 18](https://github.com/sgramtinne-code/atoutia/pull/18), puis main après fusion avec SHA attendu ; GitHub fait foi pour les statuts définitifs. La CI Android existante garde son périmètre ; aucun nouvel essai manuel PC/ADB/base réelle nécessaire pour cet outil.

Après validation du palier et de la PR : arrêter la revue à des critères finis, puis décider l'intégration locale du moteur pour la première partie solo offline. Un futur palier de centaines de milliers/millions doit être explicitement exécuté avec budget/rapport et peut être réparti en lots ; il ne doit pas bloquer indéfiniment l'avancement produit.

## Écart métier concret à reprendre séparément

Les contrôles de conservation et de replay ne suffisent pas à certifier l'équipe bénéficiaire d'un bonus. Un écart a été constaté entre GAME_RULES.md §50 (« équipe qui réussit le contrat de la donne suivante »), RULES_VALIDATION.md (« vainqueurs de la prise suivante ») et le test existant de litige qui exige le bonus pour le preneur même quand il chute.

Reproduction synthétique sur le moteur compilé : bonus précédent 81 ; PLAYER_0 preneur ; nouvelle donne TEAM_0=70 / TEAM_1=92 sans Belote, donc chute. Le code actuel attribue **TEAM_0=81 / TEAM_1=162**, report ensuite nul. Ce comportement est explicitement attendu par `litige.test.ts` ; ce n'est pas un incident de données réelles. La somme est conservée et le replay identique : la campagne passe sans trancher ce point normatif.

Cette PR ne change ni règle, score, test métier existant ou version. Reprendre ce cas dans un lot métier séparé : clarifier l'attribution selon les références canoniques avant correction éventuelle et examiner les conséquences de version/replay et des parties déjà enregistrées. C'est un critère de revue précis avant de prétendre certifier les scores, pas une raison de rouvrir les essais Android/SQLite acquis.
