# Android — premier solo hors ligne

28 octobre 2026. Branche `feat/android-offline-solo`, depuis main `4d20422` (PR nº 19 livrée). Le développeur a confirmé les builds moteur/backend et le démarrage local de ce main. Cette évolution ajoute un vrai parcours Android ; les scripts PNJ multijoueur restent des outils séparés.

## Parcours du premier solo

Au premier lancement, choisir **Solo hors ligne** ou **Jouer en ligne**. Le solo démarre sans compte, sans connexion Google et sans backend : PLAYER_0 humain, trois PNJ locaux, belote classique jusqu'à 1 000 points. Prendre/passer puis jouer uniquement les cartes légales. Le moteur décide scores, Belote, litige et victoire. Le dernier mode sélectionné est retenu ; Retour à l'accueil permet de changer de mode. En ligne, le bouton Retour Android depuis l'accueil permet de retrouver ce choix.

Chaque action acceptée et la création de partie sauvegardent dans `filesDir/offline/solo.json` par Android AtomicFile. Revenir à l'accueil ou relancer l'application reprend le replay sauvegardé, avec la même politique de PNJ. Nouvelle partie/Rejouer demandent confirmation avant remplacement. Une sauvegarde invalide affiche une erreur et reste conservée jusqu'au choix explicite d'une nouvelle partie. Une erreur d'écriture n'annule pas une action jouée : Réessayer sauvegarde l'état actuel sans renvoyer la commande. Continuer après cette erreur peut perdre les actions non enregistrées lors d'un arrêt.

Ce premier lot ne livre pas encore statistiques/progression permanentes, tutoriel, paramètres de difficulté ou choix de personnalités. Les PNJ `starter-v1` ont trois petites heuristiques déterministes de prise/choix de carte ; ils reçoivent seulement leur main et les informations publiques/actions autorisées. Aucune IA entraînée revendiquée. Les millions de parties sur le PC RTX 5070 et les PNJ variés/amusants/par niveau restent le [chantier IA ultérieur](AI_LAB_ROADMAP.md).

## Même moteur, exécution locale

`packages/offline-game` importe `@atoutia/belote-engine`. Un bundle IIFE esbuild 0.28.2 est embarqué dans les assets APK et exécuté par **AndroidX JavaScriptEngine 1.1.1**. Compose reste natif ; aucune seconde implémentation des règles en Kotlin, téléchargement de code ou WebView d'interface. Les demandes locales sont limitées à start/restore/snapshot/human/bot. La révision empêche les commandes obsolètes ; un pas de PNJ n'avance jamais le joueur humain.

[Documentation Android officielle](https://developer.android.com/develop/ui/views/layout/webapps/jsengine) : API 26 minimum et fournisseur WebView compatible requis. L'application vérifie `JavaScriptSandbox.isSupported()` et propose une erreur compréhensible si indisponible ; mettre à jour Android System WebView. [Release officielle 1.1.1](https://developer.android.com/jetpack/androidx/releases/javascriptengine), [API du sandbox](https://developer.android.com/reference/androidx/javascriptengine/JavaScriptSandbox), [bundle esbuild](https://esbuild.github.io/api/). Il faut vérifier la compatibilité des appareils visés avant diffusion ; aucune universalité revendiquée.

Le sandbox est exécuté sur worker IO, fermé quand le solo quitte la composition, avec fermeture des connexions tardives après abandon. Pas de réseau, compte ou API HTTP dans le contrôleur solo. Les services online ne sont composés qu'après sélection du mode online. Le parseur `PlayerSnapshotJson` est extrait sans modifier les contrôles du client HTTP ; il valide aussi le document joueur local. L'écran reçoit un GameViewState sans inventer de session serveur.

Le fichier de sauvegarde local contient un replay complet pour permettre la reprise du moteur. Cette information complète reste interne au solo ; le snapshot d'écran et celui de chaque PNJ restent privés par joueur. Rien de ce mécanisme ne permet au serveur online d'envoyer baseSeed ou mains adverses au client. Les sauvegardes solo sont exclues des sauvegardes Android par les règles existantes couvrant les fichiers ; aucune migration des comptes, salons ou base SQLite.

## Bundle reproductible et validation

Après modification du moteur ou du contrôleur TypeScript :

```bash
pnpm install --frozen-lockfile
pnpm --filter @atoutia/belote-engine build
pnpm --filter @atoutia/offline-game bundle
pnpm --filter @atoutia/offline-game typecheck
pnpm --filter @atoutia/offline-game test
pnpm --filter @atoutia/offline-game bundle:check
pnpm --filter @atoutia/offline-game build
```

Commiter ensemble asset, manifest d'empreintes et fixtures JVM générées. `bundle:check` reconstruit en mémoire et refuse toute divergence avec les entrées compilées et les trois fixtures. L'installation pnpm garde `allowBuilds.esbuild: false` : le binaire de plateforme optionnel fonctionne sans script d'installation. Aucun téléchargement de moteur à l'exécution Android.

Validation locale assistant reçue : **11 tests offline** (dont quatre matchs complets, reprise déterministe, actions illégales/obsolètes sans mutation, parité du bundle livré avec le module sans API réseau). Typecheck/build/fraîcheur du bundle confirmés par la CI 40756019124 du code 34d4ed3. Les six nouveaux JVM ciblent le contrôleur et le parseur partagé, notamment reprise, panne de sauvegarde sans double commande, fermeture et documents malformés. Les 231 JVM existants sont conservés.

Deux instrumentés ajoutés utilisent le vrai asset et JavaScriptSandbox : match de 1 000 points avec reprise intermédiaire/finale depuis fichier temporaire ; choix solo, prise, main visible, retour/reprise et isolation des services online. Ils ne sont jamais ignorés si le runtime est indisponible. Le workflow conserve les 23 contrôles instrumentés antérieurs. Pas de SDK Android dans l'environnement assistant : les preuves Android proviennent des exécutions GitHub citées, pas d’un test appareil local assistant. Ces tests ne prouvent pas toutes les combinaisons de WebView/appareils ni le plaisir des heuristiques.

Avant intégration : trois CI du dernier commit vertes, puis essai de ce nouveau parcours sur l'émulateur du développeur si nécessaire (mode avion, nouvelle partie, jouer, fermeture/relance et reprise). Aucun redémarrage backend ou nouvel audit SQLite pour le solo. Après ce premier lot : statistiques locales, paramètres/niveaux de départ et tutoriel, puis amélioration des PNJ ; ne pas remplacer ce travail produit par des campagnes massives de validation.


Validation intermédiaire PR nº 20, code `3c0ddb7` : [moteur/backend 40754781348](https://github.com/sgramtinne-code/atoutia/actions/runs/40754781348), job 123050686069, **601 moteur/620 backend/11 offline**, builds/typechecks/bundle et références de simulation réussis. [Android Kotlin 40754781125](https://github.com/sgramtinne-code/atoutia/actions/runs/40754781125), job 123050685102 : **237 JVM, zéro échec/ignoré**, deux APK et lint réussis (**13 avertissements/1 suggestion**, deux avertissements de style supplémentaires dans ce lot). [Instrumentés 40754781374](https://github.com/sgramtinne-code/atoutia/actions/runs/40754781374), job 123050686215 : les **23 existants passent**, et le vrai moteur Android termine le match à 1 000 points avec reprise AtomicFile intermédiaire/finale ; le test UI échoue à son geste de défilement sur le bouton fixe Retour (ligne 104), après entrée/prise. Correction du test uniquement : vérifier le bouton affiché puis cliquer, sans défilement ; mêmes assertions métier/reprise/isolation, aucune suppression de test. Les deux nouveaux instrumentés et les trois CI du dernier commit restent requis avant fusion ; aucun succès global annoncé sur ce premier run.


## Validation reçue du premier solo — 29 octobre 2026

Code **`34d4ed3`** validé dans les trois CI : [moteur/backend 40756019124](https://github.com/sgramtinne-code/atoutia/actions/runs/40756019124), job **123055012584**, **601 moteur/620 backend/11 offline**, typechecks/builds/bundle et références de simulation inchangées ; [Android Kotlin 40756019046](https://github.com/sgramtinne-code/atoutia/actions/runs/40756019046), job **123055012659**, **237 JVM, zéro échec/ignoré**, deux APK et lint (**13 avertissements/1 suggestion**, dont deux avertissements de style ajoutés par le lot) ; [Android UI 40756018978](https://github.com/sgramtinne-code/atoutia/actions/runs/40756018978), job **123055012437**, **OK (8 tests), OK (3 tests), OK (7 tests), OK (5 tests), OK (2 tests)** réellement exécutés sur AVD API36. Les deux nouveaux contrôles utilisent le vrai JavaScriptSandbox et le bundle APK : partie à 1 000 points avec reprise intermédiaire/finale AtomicFile ; choix solo, prise, main visible, retour/reprise et construction online seulement après sélection. Le premier échec était un geste de défilement du test sur un bouton fixe, corrigé sans enlever les assertions.

Cette clôture ne change que des documents : sources/fixtures/bundle/tests identiques au code validé. Liens/blocs shell/YAML/diff à vérifier ; aucune nouvelle exécution Android locale assistant revendiquée. Vérifier les trois CI du dernier commit de la PR nº 20 avant de la rendre prête et de l'intégrer avec SHA attendu ; vérifier ensuite PR/main/arbre et CI de push. Inscrire SHA de fusion et CI main dans la PR sans nouveau commit destiné à inscrire son propre SHA. Donner la récupération complète de main et le build/install Android ; le solo ne demande ni compte ni backend ni PNJ de script. L'essai sur l'émulateur du développeur reste distinct des preuves AVD et sera utile pour sa compatibilité WebView et l'expérience en mode avion, sans bloquer artificiellement la livraison déjà testée. Compatibilité de tous les appareils, release Google Play et plaisir des PNJ non attestés par ces tests. Suite produit : statistiques/progression locales, paramètres et tutoriel ; entraînement RTX5070 futur conservé, aucun million de validation requis.
