# Styles des PNJ solo

29 octobre 2026 — depuis main `1489a7f`, branche `feat/offline-bot-personalities`.

## Utilisation

Paramètres → Styles des PNJ :

| Choix | Comportement | Politique sauvegardée |
| --- | --- | --- |
| Variés | Joueur 2 prudent, partenaire Joueur 3 solidaire, Joueur 4 audacieux | varied-v1 |
| Prudents | Prises plus sélectives, économie des atouts, tentative de gain peu coûteuse lorsqu’ils jouent en dernier | careful-v1 |
| Audacieux | Prises plus fréquentes, attaques avec les cartes gagnantes fortes et les atouts | bold-v1 |
| D’origine | Comportement des premiers PNJ du solo, conservé à l’identique | starter-v1 |

Le style solidaire charge un partenaire maître avec des points quand une défausse appropriée est autorisée ; sinon il cherche une carte gagnante peu coûteuse. Ce sont des heuristiques locales, pas des modèles entraînés ou une échelle de difficulté étalonnée. Le plaisir et la diversité perçue demandent un retour de jeu ; aucun taux de victoire supérieur garanti. [L’IA Lab sur RTX5070 reste ultérieur](AI_LAB_ROADMAP.md).

Une modification concerne la **prochaine nouvelle partie**. Solo hors ligne reprend toujours la sauvegarde avec ses propres PNJ. Dans la zone de commandes, après les actions de jeu, PNJ actuels indique la table effectivement chargée ; Nouvelle partie solo ouvre une confirmation rappelant le choix futur et le remplacement de la partie. Annuler ne change rien. Confirmer démarre un autre replay et conserve les statistiques/progression. La main reste fixe et les actions d’enchères restent prioritaires ; aucun libellé de style n’est ajouté au-dessus de la main ou des enchères. À la fin, Rejouer utilise également la table choisie. Le rythme et la confirmation des cartes restent indépendants.

## Informations et autorité

`botPolicies.ts` ne reçoit que `PlayerClientSnapshot` : main du PNJ, pli/score publics et actions autorisées. Les cartes proposées appartiennent à la liste légale ; les prises sont choisies parmi les actions fournies. Aucun accès aux mains adverses, historique privé ou seed dans la politique, aucune invocation pour l’humain. Les helpers getCardPoints/getCardStrength/getPlayerTeam/getTrickWinner du moteur sont réutilisés ; aucune règle de légalité ou de victoire réécrite. Les choix sont déterministes et les égalités gardent l’ordre reçu. Les scores servant à choisir une prise ont des seuils 46/35/22 pour prudent/solidaire/audacieux ; ils expriment une heuristique, pas des niveaux mesurés.

La fonction starter-v1 reste inchangée. Les nouvelles tables ont leurs propres identifiants versionnés ; modifier une politique existante ne doit pas changer silencieusement une partie sauvegardée. Une évolution de stratégie demande un nouvel identifiant et une compatibilité explicitement testée. Les PNJ online/scripts de test ne sont pas modifiés par ce lot.

## Sauvegardes et préférences

Le document moteur local garde ses trois champs au format 1 : formatVersion, botPolicy et replay. De nouvelles valeurs botPolicy sont autorisées ; elles sont enregistrées avec chaque partie puis réutilisées à la restauration, indépendamment des préférences du moment. Les anciennes parties starter-v1 continuent avec la même politique. Replays/règles/hashes métier, DTO online et enveloppe atomique replay/statistiques au format 2 restent inchangés. Une politique inconnue est refusée, jamais remplacée silencieusement ; une erreur de runtime n’écrase pas la sauvegarde.

Le fichier indépendant de préférences passe au format 2 avec botTable. Lecture du format 1 : rythme et confirmation conservés, table D’origine ; aucune écriture à la seule lecture. Sans fichier de préférences, la table initiale est Variés. La première modification écrit atomiquement le format 2. Une partie existante n’est jamais remplacée à cause de cette conversion ; seule la confirmation de Nouvelle partie le permet. Les anciens APK ne comprennent pas les nouvelles politiques/préférences : aucune compatibilité de downgrade revendiquée. Pas de reset implicite ni d’effacement des statistiques. Les exclusions de backup existantes couvrent ces fichiers privés.

## Validation et provenance

**Local assistant acquis : 26 tests offline, typecheck/build et bundle:check réussis.** Nouveau bundle **6e83cc765603d43c8a1307b3ba9b4bcb69b6b459c562dc25b1842b90351c2650**, 69 147 octets, même moteur. Avant modification, le vrai ancien bundle **61e960aedf5208d94cdbff4911ac684c6251763d5bcaa48c89028dd986715431** a produit deux sauvegardes synthétiques actives et leurs empreintes finales. Elles sont figées dans starter-v1-compat.json. Le nouveau code poursuit ces parties jusqu’aux mêmes révisions et aux mêmes empreintes : seed 1, 380 commandes, d8071d2f6370ca7edfdb02bef9a5c6e14172d8c6ab8e17a3c5121cc9c2da12b3 ; seed 37, 412 commandes, 04f24e18f2ea24439f7a3b1155716c3b41115257eadbcaf165b8c7fb88a03e22. Aucune donnée d’un joueur réel.

Quinze tests supplémentaires : décisions distinctes sur la même vue, comportement à la prise/partenariat/dernier joueur, absence de mutation et de lecture de champs privés, humain jamais joué ; parties complètes et restauration déterministe pour les quatre politiques sur trois seeds ; deux continuations historiques ; politiques invalides sans remplacement de la partie ; parité module/bundle isolé pour les trois tables nouvelles. Campagne bornée, aucun million ou entraînement.

Six JVM ajoutés pour formats de préférences, anciennes valeurs, politique active et choix futur, rejet avant écrasement. Deux nouvelles fixtures de départ produites par le vrai bundle ; les cinq fixtures historiques restent identiques. Trois instrumentés ajoutés : vrai match varié à 1 000 points avec reprise gardant sa politique et nouveau match gardant les totaux ; préférences futures sans modification des anciens PNJ, annulation/confirmation explicite du remplacement à 640 × 360 dp/police 1,3 ; persistance des quatre choix et migration des anciennes préférences. Les 36 contrôles précédents restent conservés. YAML/shell/diff à vérifier, résultats Kotlin/APK/lint et AVD à obtenir avant intégration ; aucun SDK Android local assistant.

Après intégration : installer l’APK main, ouvrir Paramètres/Styles des PNJ puis reprendre le solo. Vérifier la table actuelle ; choisir Nouvelle partie solo seulement si le remplacement est souhaité, ou Annuler pour garder la partie. Un nouveau match complet PC n’est pas requis pour valider l’installation ; retour ludique sur quelques tours utile ensuite. Aucun backend, compte ou script N/O requis pour ce lot. Suite : parcours online/bêta, avec entraînement RTX5070 séparé et ultérieur.
