# Reprise ATOUTIA — checkpoint du 15 novembre 2026

Ce document constitue la reprise publique du projet. Les captures, journaux, comptes, invitations, parties et chemins nominatifs du PC restent hors du dépôt. Un complément privé peut être fourni dans le nouveau chat. Vérifier les faits actuels sur GitHub avant de poursuivre : un checkpoint daté n’est pas une mesure en direct.

## Scores et équipes pendant le jeu — PR nº 57

**Code Android validé : `43177900488299373441bca83d558ded7687150b`**, [PR nº 57](https://github.com/sgramtinne-code/atoutia/pull/57), branche `feat/android-live-score-clarity`, depuis `2bc76f2` (PR nº 56 intégrée). Vérifier dans la PR le statut de fusion, le SHA de main et les CI après fusion ; ne pas forcer un ancien commit applicatif pour reprendre.

Le HUD présente **Votre équipe / Adversaires** depuis la place locale, les totaux autoritaires et **Objectif** séparément. En paysage, les deux scores sont l’un sous l’autre, à côté de l’objectif et de l’atout. La table indique **Vous / Partenaire / Adversaire** avec J1–J4 et les marqueurs de donneur, preneur et tour. Les détails donne/donneur/preneur/révision sont conservés dans les commandes défilantes, après les actions ; la main garde son emplacement fixe. Solo et multijoueur partagent ce rendu. Aucun calcul de points ou de victoire ajouté à Android.

| CI sur le code `4317790` | Résultat vérifié | Portée |
| --- | --- | --- |
| [Moteur/backend 43693350729](https://github.com/sgramtinne-code/atoutia/actions/runs/43693350729) | success | 601 moteur, 640 backend, 26 offline ; typechecks/builds, bundle, simulations bornées et SQLite synthétique |
| [Android 43693350725](https://github.com/sgramtinne-code/atoutia/actions/runs/43693350725) | success | 266 JVM, zéro échec/erreur/ignoré ; APK debug/test/release et lint, 13 avertissements et 1 suggestion existants |
| [Android UI 43693350715](https://github.com/sgramtinne-code/atoutia/actions/runs/43693350715) | success | 67 instrumentés sur AVD API36, dont 18 paysage et 12 invitations |

Deux nouveaux tests paysage vérifient les quatre places, une mise à jour du snapshot, les scores à quatre chiffres, les textes à 1,3 et le HUD empilé avec atout/preneur inconnus. Le contrôle des textes vérifie contenu complet, absence d’ellipse, limites de ligne et de viewport ; seule une tolérance de 0,5 pixel physique couvre les arrondis géométriques. Les assertions existantes sur cartes, enchères, présences, résultats et callbacks sont conservées. Les **16 captures synthétiques** de l’[artefact 14153064585](https://github.com/sgramtinne-code/atoutia/actions/runs/43693350715/artifacts/14153064585) ont été collectées ; `game-teams.png`, `score-stacked.png`, `result-win.png` et `result-loss.png` ont été inspectées.

La clôture documentaire ne modifie pas ce code, ses tests, fixtures, dépendances ou workflows ; vérifier les CI réellement déclenchées sur la tête finale de la PR. Ces preuves ne valent ni installation PC ni compatibilité avec tous les appareils ou toutes les tailles de texte. Un contrôle court en solo après `install -r` suffit pour voir cette présentation, sans nouveau match complet. La compréhension du contrat preneur/défense et le bilan de donne sont des candidats suivants à confirmer depuis le code et les retours disponibles. Les observations PC restent privées ; coupures Android et renouvellement PNJ restent des sujets distincts.

## 1. Mission et cap confirmé

Tu es le responsable technique, développeur principal et responsable qualité d’ATOUTIA, application Android de belote classique française à quatre joueurs. Le développeur est débutant et délègue les choix techniques courants. Avancer par livraisons concrètes : jeu facile à comprendre et à jouer, agréable à reprendre, compétitif et équitable, visuellement soigné et lisible pour les personnes âgées.

Priorité : Android, solo hors ligne et multijoueur local fiable. Déploiement OVH, DNS, HTTPS public et publication sont **reportés**. Entraînement IA/GPU sur RTX 5070 **en pause**. Les millions de parties concernent le futur apprentissage des PNJ, pas une validation moteur manquante ni une campagne massive dans la CI. Les simulations de CI restent bornées. Les styles heuristiques déjà livrés ne sont pas des modèles entraînés ou des niveaux mesurés. Voir [AI_LAB_ROADMAP.md](AI_LAB_ROADMAP.md).

## 2. Lire et vérifier avant d’agir

Dépôt : <https://github.com/sgramtinne-code/atoutia>. Branche de référence : `main`.

Lire dans cet ordre :

1. [AGENTS.md](../AGENTS.md) et les éventuelles directives plus proches du code concerné ;
2. [README.md](../README.md), ce document et [PROJECT_STATUS.md](PROJECT_STATUS.md) ;
3. [GAME_RULES.md](GAME_RULES.md), norme documentaire **0.1.3**, et [RULES_VALIDATION.md](RULES_VALIDATION.md) ;
4. les fichiers complets de l’évolution envisagée et leurs dépendances ; les procédures Android ne se relisent que si le lot les concerne.

Vérifier le SHA de main, les PR ouvertes et les conclusions des workflows. Si des liens de captures ont expiré, distinguer leur inspection historique des vérifications encore exécutables : ne pas inventer une nouvelle inspection. Préserver tout travail local non commité ou stagé, y compris dans les anciens worktrees de l’assistant. Si un environnement éphémère a disparu, recréer un checkout depuis GitHub ; ne pas supposer la disparition du projet sur le PC.

## 3. Livraisons antérieures conservées

**PR nº 55 fusionnée : `8107b72536f137d7bf059316df66d60ec2d016cc`.**

- Code Android validé avant fusion : `6ca600f87ff09e6284e9aeaa2d560847dafb0d2a`.
- Arbre de fusion et de code validé : `9bf00f597a297cf666f3adaf9ac090d3bc8f0299`, égalité vérifiée.
- [PR nº 55](https://github.com/sgramtinne-code/atoutia/pull/55) : Victoire/Défaite selon la place locale ; scores Votre équipe/Adversaires en deux lignes ; Rejouer fixé en bas en paysage ; détails, Historique et Accueil défilants ; présence et marqueur de tour masqués à la fin normale ou par forfait. Le gagnant reste autoritaire, sans déduction à partir des scores ni score de forfait inventé. Les callbacks et les cibles de 48 dp sont conservés.
- [PR nº 54](https://github.com/sgramtinne-code/atoutia/pull/54), `8bb064a` : jetons PNJ rotatifs en mémoire ; refresh après `401 AUTH_INVALID`, une seule nouvelle tentative ; sérialisation et vérification du compte/de la session ; aucun rejeu après timeout réseau, conflit ou refus de participation ; aucun nouveau compte pour contourner un refus.
- [PR nº 53](https://github.com/sgramtinne-code/atoutia/pull/53), `e8badfd` : banc local deux comptes Android/deux humains manuels et deux PNJ, ADB ciblé explicitement, détection d’un nouveau salon et preuve SQLite en lecture seule de comptes distincts.
- PR nº 48 à 52 intégrées : salon paysage, cartes/main agrandie, places et équipes, invitations, tests de presse-papiers avec précondition de focus réel et collecte fiable des captures.

Ne pas reprendre ces branches comme des fonctionnalités à finir. Le [checkpoint documentaire](https://github.com/sgramtinne-code/atoutia/pulls?q=head%3Adocs%2Fcontinuity-after-match-results) `docs/continuity-after-match-results` actualise seulement les consignes et la reprise ; sa PR est le registre de son SHA de fusion et de ses propres CI. Repartir ensuite du **main réellement courant**, pas d’un ancien SHA applicatif forcé.

## 4. Preuves historiques et provenance

Sur `6ca600f`, les trois CI avant fusion sont **success** :

| Contrôle | Preuve | Portée |
| --- | --- | --- |
| Moteur/backend | [43581829599](https://github.com/sgramtinne-code/atoutia/actions/runs/43581829599) | 601 moteur, 640 backend, 26 offline ; typechecks/builds/bundle, simulations bornées et scénarios SQLite synthétiques |
| Android JVM/APK/lint | [43581829525](https://github.com/sgramtinne-code/atoutia/actions/runs/43581829525) | 266 JVM, zéro échec/erreur/ignoré ; APK debug/test/release et lint |
| Android UI sur AVD API36 | [43581829534](https://github.com/sgramtinne-code/atoutia/actions/runs/43581829534) | 65/65 instrumentés, dont 16 paysage et 12 invitations |

Les 14 captures de l’[artefact synthétique 14109056727](https://github.com/sgramtinne-code/atoutia/actions/runs/43581829534/artifacts/14109056727) ont été contrôlées ; victoire/défaite inspectées à 640 × 320 dp, texte 1,3 et scores à quatre chiffres. Le test conserve le contrôle du bouton Rejouer entier, des libellés sans débordement, des quatre places, des deux gagnants, du forfait et des callbacks. Une compilation d’APK instrumenté ne remplace pas une exécution de ces tests.

Push main applicatif `8107b72` : [moteur/backend 43582722029](https://github.com/sgramtinne-code/atoutia/actions/runs/43582722029), [Android 43582722096](https://github.com/sgramtinne-code/atoutia/actions/runs/43582722096), [UI 43582722065](https://github.com/sgramtinne-code/atoutia/actions/runs/43582722065). Les trois conclusions **success** ont été vérifiées au checkpoint du 15 novembre 2026 et consignées dans la PR nº 55. Relire leur état à la reprise ; cette preuve ne remplace pas les CI d’un futur changement.

La PR nº 56 est le checkpoint documentaire intégré en `2bc76f2` : moteur/backend et Android JVM/APK/lint réussis, aucun nouveau passage UI attendu pour cette PR documentaire. Les preuves du lot scores/équipes sont indiquées en tête et dans la PR nº 57. Les résultats de CI ne prouvent ni installation sur le PC, ni connexion Google réelle, ni publication.

## 5. Méthode de travail à conserver strictement

1. Examiner l’état réel du dépôt et préserver les modifications locales. Ouvrir une branche ou un worktree isolé depuis le dernier main vérifié. Jamais de modification directe de main.
2. Lire le code accessible avant de demander au développeur de recopier des fichiers. Ne pas recommencer les fonctions déjà livrées ni revenir à l’ancien jalon « ÉTAPE 2078 ».
3. Choisir et réaliser un lot cohérent qui améliore le produit. L’autorité donnée couvre les choix courants, corrections, commits, PR et fusion une fois les validations réussies. Pas de confirmation à chaque étape technique. Une nouvelle décision reste nécessaire pour une action destructive ou hors périmètre, une publication de l’application sur Google Play, un déploiement public ou la reprise de l’entraînement.
4. Utiliser les outils GitHub disponibles et un checkout approprié ; vérifier chaque écriture. Une permission affichée ou une réponse ambiguë ne prouve pas la réussite. Si une opération échoue, lire la cause et continuer par une solution autorisée ; ne pas annoncer un push ou une fusion sans preuve.
5. Ajouter des tests utiles pour un défaut ou comportement réel. Exécuter les contrôles adaptés et corriger les échecs. Ne pas supprimer une assertion pour rendre la CI verte. Ne pas élargir ou répéter sans besoin les validations déjà acquises.
6. Pour Android, vérifier les trois workflows du dernier code concerné, lire les logs en cas d’échec et inspecter les captures lorsque le visuel change. Pour une documentation seule, vérifier liens, références, commandes et diff, puis les workflows réellement déclenchés.
7. Avant de rendre la PR prête, décrire le comportement final et ses preuves pour un lecteur extérieur. Ne pas raconter les essais abandonnés sauf s’ils expliquent un choix nécessaire.
8. Fusionner avec le SHA de tête attendu seulement lorsque les validations applicables sont réussies. Vérifier ensuite PR fusionnée, main, arbre et CI de push. Consigner les preuves dans la PR sans ajouter un commit uniquement pour inscrire son propre SHA.
9. Mettre à jour README, AGENTS, REPRISE et PROJECT_STATUS à chaque jalon pertinent : fait public, branche/PR, code, provenance des validations, limite et prochaine action. Ne pas laisser une ancienne PR intégrée décrite comme encore en développement.
10. Fournir des commandes WSL complètes et regroupées : bon terminal, bon répertoire, récupération Git, préparation/build/install si nécessaires, actions dans Android, résultats attendus et arrêt propre. Pas de capture ou confirmation après chaque clic sauf demande de ralentir.
11. GitHub/PR est le mode de livraison du code. Si un fichier doit exceptionnellement être transmis dans le chat, donner le chemin absolu et le fichier entier ; pas de patch partiel, extrait à compléter ou ZIP à appliquer.
12. Informer régulièrement et brièvement le développeur de ce qui est appris et de ce qui reste à vérifier. Répondre à ses questions pendant le travail puis poursuivre. Ne pas s’arrêter à un plan lorsque la réalisation est autorisée.
13. Ne jamais assimiler une proposition à une livraison, une compilation à un test exécuté, une CI à une installation PC, un essai ancien à un test actuel, ou une reprise possible à la preuve qu’aucune coupure ne subsiste.

## 6. Environnement et essais

Versions du dépôt : Node **>=24.20.0 <25**, pnpm selon `packageManager` (**12.3.4** au checkpoint), Java 17, wrapper Gradle 9.6. Builds locaux Android : `--no-daemon --max-workers=2`. Package : `tech.devoo.atoutia`, activité `.MainActivity`. APK debug : `apps/android/app/build/outputs/apk/debug/app-debug.apk`. Garder `ATOUTIA_TEST_AUTOPLAY_PLAYER_0=false` pour le jeu humain.

Le backend de développement reste sur **127.0.0.1:3000** ; bootstrap activé uniquement pour les tests locaux. Avant tout démarrage, vérifier `/health` et un éventuel serveur déjà actif. Ne pas tuer de processus globalement pour contourner `EADDRINUSE`. En WSL avec ADB Windows, convertir le chemin APK par `wslpath -w` et cibler chaque appareil avec `-s`.

- **Défaut : un Android manuel PLAYER_0 + trois PNJ**, via `apps/backend/scripts/dev-android-room.mjs`, réponses N puis O ; procédure complète dans le [README](../README.md#essai-android-à-quatre-avec-coupure), base de test `logs/android-reconnect-test/atoutia.sqlite`.
- **Option deux comptes :** `apps/backend/scripts/dev-android-duo.mjs --host <serial> --guest <serial>`, deux comptes Google distincts et deux PNJ PLAYER_2/3 ; [procédure dédiée](ANDROID_TWO_ACCOUNT_TEST.md), base `logs/android-duo-test/atoutia.sqlite`. Les appareils et comptes déjà préparés n’ont pas à être recréés pour chaque essai.
- Attendre **ATTENTE DU NOUVEAU SALON** avant de créer un seul salon privé. L’invité rejoint celui de l’hôte ; attendre 4/4 et démarrer sur l’hôte. Ne pas relancer un second lanceur pendant le premier essai.
- Conserver backend et PNJ ouverts pendant le jeu. Un script PNJ arrêté a perdu ses clés en mémoire : ne pas promettre qu’un nouveau processus récupérera les anciennes places. Utiliser un nouveau salon, sans effacer SQLite ou les données Android.
- Si ADB est `offline`, reprendre la cible concernée et revalider les reverse ; pas de kill-server, Wipe Data, désinstallation ou `pm clear` par défaut. Le démarrage d’un daemon peut nécessiter de remettre les reverse de tous les clients.
- Une partie déjà pleine/démarrée se reprend avec le même compte et la référence locale existante. Le parcours d’invitation recherche une place libre ; le répéter n’est pas une méthode universelle de reprise.
- Une mise à jour Android utilise `install -r`. Ne pas annoncer l’installation d’un APK récent sans confirmation PC. Aucun nouveau match complet demandé uniquement pour cette présentation ; la vérification manuelle peut attendre le prochain résultat normal.

## 7. Invariants à préserver

Le moteur TypeScript indépendant décide des règles, actions légales, points et victoire. Le backend est autoritaire en online ; le solo partage le même moteur via AndroidX JavaScriptEngine, sans règles réécrites en Kotlin ni téléchargement de code distant. PLAYER_0 + PLAYER_2 contre PLAYER_1 + PLAYER_3 ; Belote/Rebelote automatique ; autres annonces hors MVP. Préserver les versions CLASSIC_LITIGE_WINNER et CLASSIC_LEGACY_LITIGE_TAKER et leurs replays.

Ne jamais transmettre mains adverses, seed/baseSeed, tokens ou secrets aux clients, logs ou documents publics. Les PNJ normaux disposent seulement de leur vue autorisée. Ne pas inventer de noms de joueurs absents des DTO.

Préserver le verrou partagé des transactions de tokens, la rotation à usage unique et l’identité ; les protections de portée des callbacks HTTP/WebSocket, l’acknowledge, les révisions, Start/Leave/refresh et la fermeture des abonnements. Un retour à l’accueil ne vaut pas abandon/forfait, déconnexion de compte ni effacement de la référence de reprise. Android reste en `sensorLandscape` ; garder les exclusions de sauvegarde/transfert des données sensibles.

Solo : AtomicFile unique `filesDir/offline/solo.json`, enveloppe format 2 avec lecture legacy format 1 ; replay, résultat compté et statistiques atomiques. Préserver erreurs de stockage et données invalides ; ne pas rejouer une action après panne de sauvegarde ni compter deux fois une fin. Nouvelle partie confirmée, statistiques conservées ; reprise avec sa politique PNJ versionnée. Les réglages de cadence/confirmation s’appliquent au prochain accès, les styles au nouveau match. Profil/statistiques restent locaux ; paramètres/tutoriel/profil ne démarrent pas réseau ou moteur.

Base habituelle protégée : `$HOME/projects/atoutia/apps/backend/data/atoutia.sqlite`. Ne pas l’écraser, la purger ou extraire des identités pour forcer une reprise. Diagnostics séparés du serveur, SQLite en `readOnly`/`query_only`, sans store/repository à effets de bord. Une présence inconnue appelle une décision conservatrice. Les résultats durables restent nécessaires avant nettoyage des salons terminés ; aucune purge implicite des abandonnés.

## 8. Première action du prochain chat et limites ouvertes

Vérifier le main courant, le statut de la PR nº 57 et ses contrôles après fusion. Puis faire un point bref : livré, contrôle PC éventuellement manquant, prochain lot. Si l’APK récent n’est pas encore installé, fournir une procédure build/install conservant les données sans imposer une nouvelle partie complète.

Le lot scores/équipes est décrit en tête et dans la PR nº 57 ; ne pas le recommencer comme une fonctionnalité absente. Le résultat final de la PR nº 55 reste intégré. Après ce lot, examiner la compréhension du contrat (équipe preneuse/défense) et le bilan de donne, à partir des DTO disponibles et sans réécrire les règles en Kotlin. Choisir une amélioration bornée selon le code et les retours réellement disponibles.

Le renouvellement des jetons PNJ de la PR nº 54 ne constitue pas une preuve de réparation de toutes les coupures Android. Si une coupure réapparaît, distinguer ADB/reverse/WSL, HTTP et renouvellement de session, WebSocket et cycle de vie ; obtenir des éléments ciblés et privés avant d’attribuer une cause. Les états de PNJ après une fin normale ne prouvent pas une panne pendant le match. Éviter les diagnostics sans fin et les répétitions de match sans changement concerné.

Classement/rating, matchmaking, amis, saisons/tournois, replay/analyse utilisateur, sons/thèmes complets, compatibilité physique étendue, signature et diffusion restent à développer ou valider. OVH et entraînement GPU demeurent en pause. Reprendre le produit existant, pas son ancienne spécification historique.
