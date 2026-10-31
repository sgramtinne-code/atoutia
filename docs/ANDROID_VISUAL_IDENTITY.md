# Identité visuelle et lisibilité ATOUTIA

31 octobre 2026 — branche feat/visual-identity-accessibility, base main d31556b.

## Direction retenue pour le premier lot

Une identité de club de belote : bleu nuit, vert profond, ivoire et accents dorés sobres. L’accueil possède une signature typographique, un emblème et deux actions principales clairement distinctes. Les couleurs clair/sombre suivent le système. Il ne s’agit pas encore de la refonte complète des tables, avatars, sons ou animations d’un jeu finalisé.

Les textes essentiels utilisent des paires de couleurs contrôlées à au moins 7:1. Le corps de texte est agrandi, les polices du système ne sont pas réduites pour faire tenir un écran. Les commandes de l’accueil dépassent 48 dp et restent séparées ; avec un très grand texte, la disposition devient verticale et défilante. Ces choix s’appuient sur [le contraste renforcé W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html) et [les recommandations tactiles Compose](https://developer.android.com/develop/ui/compose/accessibility/api-defaults). Les contrôles de quelques paires de couleurs ne constituent pas une certification d’accessibilité de toute l’application.

Les cartes gardent leur papier clair et une encre rouge/noire contrastée dans les deux thèmes. Une carte indisponible reste lisible ; elle n’est plus rendue translucide. Les indices sont simplifiés et les enseignes demandent le rendu typographique monochrome, sans emoji coloré imposé. Chaque carte possède un nom parlé et un état accessible, sans faire lire plusieurs fois ses indices décoratifs. Les actions autorisées restent celles du moteur.

## Portée et validations

Le thème partagé, l’accueil des modes et les faces de cartes sont concernés. Les cinq choix de menu, callbacks, préférences, sauvegardes, règles, PNJ et transactions réseau restent conservés. Aucun changement silencieux du rythme ou de la confirmation de carte.

Deux tests JVM vérifient les couleurs essentielles et les encres de cartes, y compris indisponibles. Trois contrôles instrumentés vérifient l’accueil 640 × 320 dp à police 1,3, les cibles tactiles et les cinq callbacks ; l’accès aux commandes à police 2 ; le nom et l’état des cartes, le clic autorisé et l’absence d’envoi au toucher d’une carte indisponible. Les 49 instrumentés antérieurs restent requis. Le contrôle à police 2 exige aussi que les deux choix de jeu soient entièrement visibles avant défilement.

La CI produit quatre captures synthétiques de l’accueil et des cartes dans un AVD isolé, puis un artefact temporaire atoutia-visual-qa. Aucune image, invitation, compte ou partie du PC du développeur n’y est introduite. Les quatre rendus du code 8352973 ont été inspectés le 31 octobre ; une compilation seule ne prouve pas la qualité visuelle. Aucun SDK Android local assistant.

## Preuves du code et inspection

Code **83529737f06528a46d19bf5988ac3f0a3a554616**, arbre **9c6243cbf75898855cfc521da5e9f19ff5381a48**, [PR nº 29](https://github.com/sgramtinne-code/atoutia/pull/29).

- [Moteur/backend/offline 41171553729](https://github.com/sgramtinne-code/atoutia/actions/runs/41171553729), job 124450396823 : 601/620/26 tests réussis, 14 scénarios de simulation, builds et bundle contrôlés.
- [Kotlin/release 41171553733](https://github.com/sgramtinne-code/atoutia/actions/runs/41171553733), job 124450396805 : 266 tests JVM, 29 rapports, zéro échec/erreur/ignoré ; debug, instrumentés et release non signé compilés ; configuration release/manifeste vérifiés ; lint inchangé à 13 avertissements et 1 suggestion.
- [AVD 41171553740](https://github.com/sgramtinne-code/atoutia/actions/runs/41171553740), job 124450396743 : 52 tests exécutés, groupes 9/3/7/5/3/5/4/3/4/6/3, tous réussis.

Artefact synthétique **13031039423**, quatre PNG 1680 × 840, SHA-256 ZIP **3413a62ce9a09ddd68618d842c732504fbc84b6361061ac3ab6e460dafea3e12**, empreinte vérifiée au téléchargement. Les accueils clair/sombre conservent les cinq libellés sans mots coupés. À police 2, les deux commandes de jeu sont visibles ; les commandes secondaires défilent. Les cartes montrent des enseignes monochromes, une encre lisible et une bordure de sélection distincte. Ces fixtures isolées ne prouvent ni tous les écrans, ni un retour de joueurs âgés.

Le premier passage a révélé une erreur de compilation dans le calcul des bornes du test, corrigée sans retirer ses seuils. L’inspection suivante a motivé la largeur complète des commandes secondaires et l’en-tête allégé à police 2. Les résultats ci-dessus portent sur le code final corrigé. Aucun SDK Android local assistant ; les exécutions Android sont celles de GitHub. La clôture documentaire ne modifie pas ce code/workflow ; toutes ses CI restent requises avant intégration. Preuves de fusion/main à enregistrer dans la PR.

## Suite visuelle et IA

- Revoir la table complète, les placements et la hiérarchie du score ; rendre les grandes cartes et une main moins superposée disponibles dans un parcours de confort réellement testé.
- Définir les portraits et identités des PNJ, les transitions et sons, avec contrôle du rythme et réduction des effets ; conserver des libellés lisibles et des états compréhensibles sans dépendre uniquement de la couleur.
- Faire essayer les parcours à des joueurs, dont des personnes âgées, pour mesurer compréhension, erreurs de toucher et confort ; ne pas déduire leur retour d’une CI ou d’une capture unique.
- Préparer puis exécuter l’[IA Lab RTX 5070](AI_LAB_ROADMAP.md) avant de reprendre le déploiement, avec niveaux mesurés et styles distincts. OVH, DNS et publication restent en attente selon la nouvelle priorité.
