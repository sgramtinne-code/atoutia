# Android — premier solo hors ligne

28 octobre 2026. Branche `feat/android-offline-solo`, depuis main `4d20422` (PR nº 19 livrée). Le développeur a confirmé les builds moteur/backend et le démarrage local de ce main. Cette évolution ajoute un vrai parcours Android ; les scripts PNJ multijoueur restent des outils séparés.

## Parcours proposé

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

Validation locale assistant reçue : **11 tests offline** (dont quatre matchs complets, reprise déterministe, actions illégales/obsolètes sans mutation, parité du bundle livré avec le module sans API réseau). Typecheck/build/fraîcheur du bundle à confirmer dans la CI du dernier commit. Les six nouveaux JVM ciblent le contrôleur et le parseur partagé, notamment reprise, panne de sauvegarde sans double commande, fermeture et documents malformés. Les 231 JVM existants sont conservés.

Deux instrumentés ajoutés utilisent le vrai asset et JavaScriptSandbox : match de 1 000 points avec reprise intermédiaire/finale depuis fichier temporaire ; choix solo, prise, main visible, retour/reprise et isolation des services online. Ils ne sont jamais ignorés si le runtime est indisponible. Le workflow conserve les 23 contrôles instrumentés antérieurs. Pas de SDK Android dans l'environnement assistant : attendre les résultats GitHub réels, pas de compilation ou test appareil local revendiqué. Ces tests ne prouvent pas toutes les combinaisons de WebView/appareils ni le plaisir des heuristiques.

Avant intégration : trois CI du dernier commit vertes, puis essai de ce nouveau parcours sur l'émulateur du développeur si nécessaire (mode avion, nouvelle partie, jouer, fermeture/relance et reprise). Aucun redémarrage backend ou nouvel audit SQLite pour le solo. Après ce premier lot : statistiques locales, paramètres/niveaux de départ et tutoriel, puis amélioration des PNJ ; ne pas remplacer ce travail produit par des campagnes massives de validation.
