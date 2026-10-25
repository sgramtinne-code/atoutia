# Cartes restantes dans le snapshot joueur

## État prioritaire

Le contrôle PC est reçu : nouveau N/O, captures **8 → 7 → 6 → 5 cartes**, coups locaux acceptés et progression PNJ. Les étapes de diagnostic ci-dessous sont historiques ; ne pas demander de les refaire. Les validations nécessaires sont réunies, sous réserve des trois CI du dernier commit documentaire avant fusion. Lire le bilan de clôture en fin de document ; GitHub définit le statut d’intégration.

## Périmètre

Branche `fix/player-snapshot-remaining-hand`, depuis main `bc7e18a` (PR nº 10 intégrée et récupérée sur le PC).

Le snapshot de jeu lisait `completedDeal.hands`, la distribution initiale de huit cartes. Les cartes légales lisaient déjà `trickSequence.hands`, qui retire chaque carte jouée. Le client recevait donc encore les cartes jouées, grisées. Cela ne permettait pas de les rejouer : les règles et la validation serveur utilisent les cartes restantes.

`createPlayerHand` lit maintenant les cartes restantes pour les phases PLAYING et FINISHED, et conserve les cinq cartes initiales en BIDDING. Les cartes et la liste restent copiées et gelées ; la distribution d’origine reste intacte. Une donne suivante retrouve ses cinq nouvelles cartes. La main est vide en fin normale de partie. Aucun changement de règle, de score, de format/version client, de protocole ou de stockage.

## Preuves locales

Avant correction, les cinq nouveaux tests moteur donnent quatre échecs et un succès : huit cartes après le coup, huit à la fin, JSON reproduisant ce défaut ; le cas de nouvelle donne passe. Le nouveau cas HTTP authentifié échoue également sur huit cartes au lieu de sept, les sept anciens cas passent.

Après correction : **588/588 moteur** (60 fichiers), **618/618 backend** (73 fichiers), typechecks/builds moteur/backend et CLI SQLite synthétiques réussis. Les cas suivent les mains des quatre joueurs pendant les 32 coups, la fin, la nouvelle donne, l’immuabilité, le JSON v1, les réponses HTTP commande et snapshot authentifiées et la main du joueur suivant. Aucun compte ni stockage réel utilisé.

Le parseur Android accepte une liste de taille variable et vérifie que les cartes légales sont dans la main ; le coordinateur utilise ces listes serveur. Compose affiche cette main. Aucun changement Kotlin de production nécessaire. Une huitième fixture instrumentée fournit le snapshot suivant à la même composition et vérifie disparition de la carte, visibilité des cartes restantes et sélection légale. Elle ne prouve pas à elle seule une communication serveur : cette frontière est couverte séparément par le test HTTP. Le workflow exige **OK (8 tests)**. Les résultats CI de ce code sont acquis dans le bilan suivant ; aucun test Android local de l’assistant revendiqué.

## Validation GitHub du code

La [PR nº 11](https://github.com/sgramtinne-code/atoutia/pull/11) porte le code **`8f87f21`**. Ses trois CI sont réellement réussies : [moteur/backend `40132855394`](https://github.com/sgramtinne-code/atoutia/actions/runs/40132855394), job `120988100760`, **588 moteur / 618 backend**, typechecks/builds/CLI synthétiques ; [Android Kotlin `40132855436`](https://github.com/sgramtinne-code/atoutia/actions/runs/40132855436), job `120988100769`, **220/220 JVM**, deux APK et lint (**12 avertissements, une suggestion**) ; [Android UI `40132855362`](https://github.com/sgramtinne-code/atoutia/actions/runs/40132855362), job `120988100603`, **OK (8 tests)** sur AVD CI. Le nouveau cas retire une carte du snapshot dans la même composition, vérifie sa disparition puis une sélection légale restante. Aucun SDK/émulateur local de l’assistant ni donnée réelle utilisé.

Les trois CI du bilan `7e16977` sont également réussies : moteur/backend `40133294999`, Android Kotlin `40133294980`, Android UI `40133294950`. Les retours non concluants et le diagnostic ci-dessous sont historiques ; la clôture fonctionnelle suivante reçoit le contrôle manquant. Vérifier encore les CI du dernier commit avant intégration.

## Historique : premier retour PC et paquet compilé

Le journal reçu confirme build/install Android et nouveau N/O à 4/4 avec plusieurs actions locales acceptées suivies des PNJ. Les trois captures gardent huit cartes malgré ces coups : le retrait visuel n’est pas validé. La récupération de branche, le build moteur/backend et son redémarrage ne sont pas attestés par cet extrait. Un ancien paquet ou processus reste une hypothèse ; ne pas la présenter comme une cause certaine. Les captures et détails du match restent privés.

Le lanceur existant construit Android uniquement. Le serveur importe le paquet moteur compilé lors de son démarrage ; reconstruire les fichiers ne recharge pas un ancien processus Node. La version 0.1.0 affichée par health n’identifie pas le correctif.

`dev-check-player-hand.mjs` importe `@atoutia/belote-engine` depuis le même espace backend. Sur une fixture synthétique sans réseau ni SQLite, il exige une main de huit puis sept cartes, sans la carte jouée. Résultat local réussi avec le paquet corrigé ; un paquet temporaire recompilé avec l’ancien snapshot est rejeté sur huit au lieu de sept, puis supprimé. Syntaxe Node/actionlint vérifiés. Le workflow moteur/backend exécute aussi ce contrôle après build. Il vérifie le paquet chargé par ce nouveau processus, **pas un backend déjà actif**. Garder le redémarrage explicite.

## Historique : blocage confirmé par port occupé

Le retour sur `3cb42be` prouve la récupération de branche, les builds et le précontrôle 8 → 7 sous WSL. Le lancement suivant échoue sur **EADDRINUSE 127.0.0.1:3000** : le nouveau backend n’a pas démarré. Le lanceur poursuivi après cette erreur utilise le serveur qui écoutait déjà ; ses quatre captures gardent huit cartes. Le commit chargé par ce processus n’est pas identifié. Les trois CI de `3cb42be` sont réussies : `40171715009`, `40171715011`, `40171715012`. Aucun retrait visuel validé sur le nouveau backend ; PR en brouillon.

Arrêter le lanceur PNJ par Ctrl-C, puis identifier le port sans arrêter de processus :

```bash
ss -ltnp 'sport = :3000'
for atoutia_pid in $(ss -ltnp 'sport = :3000' | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u); do
  ps -p "$atoutia_pid" -o pid=,ppid=,args=
  readlink -f "/proc/$atoutia_pid/cwd"
done
```

Recevoir cette sortie et vérifier la commande ainsi que le répertoire du dépôt avant l’arrêt ciblé. Aucun arrêt global de Node ou de tout occupant du port. Pas de nouveau build, précontrôle ou installation APK à cette étape : ils sont déjà acquis. Une fois l’ancien backend identifié et arrêté, attendre l’annonce de nouvelle écoute avant N/O. Les données restent privées.

## Procédure de référence après libération du port (contrôle PC clôturé)

Vérifier les CI du dernier jalon ; `3cb42be` a déjà ses trois validations CI et ses builds/précontrôle PC réussis. Identifier et arrêter l’ancien backend selon le diagnostic ci-dessus. Si le relais tourne encore, q restaure sa connexion directe. Ne pas supprimer de données.

Terminal backend, depuis la racine du dépôt récupéré : remplacer la valeur de Client ID par celle déjà validée pour ce poste.

```bash
HOST="127.0.0.1" PORT="3000" \
ATOUTIA_AUTH_BOOTSTRAP_ENABLED="true" \
ATOUTIA_GOOGLE_CLIENT_ID="<GOOGLE_WEB_CLIENT_ID>" \
pnpm --filter @atoutia/backend start
```

Le nouveau backend doit annoncer son écoute ; le contrôle compilé 8 → 7 est déjà reçu sous WSL. Si le lancement échoue ou si le port est occupé, conserver l’erreur et ne pas poursuivre le scénario comme si le redémarrage avait réussi. Garder ce terminal actif. Dans un autre terminal à la racine du dépôt :

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/health &&
node apps/backend/scripts/dev-android-room.mjs
```

Répondre **N**, puis **O**. Le lanceur construit et installe Android, configure ADB reverse, détecte automatiquement le nouveau salon et ajoute les trois PNJ ; aucun ID à copier. Attendre ATTENTE DU NOUVEAU SALON avant de créer. Si une ancienne partie revient, Retour à l’accueil ; pour un salon d’attente, Quitter le salon. Créer, attendre 4/4, démarrer manuellement.

À son tour, jouer une carte autorisée. Vérifier qu’elle disparaît de la main et que les PNJ poursuivent ; au tour local suivant, les sept cartes restantes sont visibles et une carte légale peut être jouée. Une carte jouée peut naturellement apparaître sur la table du pli. Pas de nouveau match complet, test Keystore/Google ou coupure réseau demandé. Communiquer le résultat fonctionnel, sans publier ID, main, score ou journal brut.

Le contrôle PC est maintenant reçu : ne pas le refaire. Vérifier les CI de la clôture avant intégration ; le statut GitHub fait foi. La base réelle, l’historique et les sauvegardes sont conservés.


## Clôture des validations de main restante — PR nº 11

Après l’identification du backend déjà actif et la procédure d’arrêt ciblé, le développeur fournit une nouvelle exécution N/O avec build/install Android, nouveau salon détecté automatiquement, trois PNJ, 4/4 et démarrage manuel. Les vues du jeu montrent la main réduite successivement à **huit, sept, six puis cinq cartes**. Le journal confirme plusieurs actions locales acceptées suivies des coups PNJ. Le retrait visuel et la poursuite du jeu sont donc validés. Le dernier extrait ne contient pas la commande d’arrêt ni l’annonce de nouvelle écoute : ne pas inventer leur sortie ou le PID final ; ne pas redemander ces éléments pour revalider le résultat fonctionnel déjà visible. Captures brutes, cartes, scores, identifiants et logs restent privés.

Validations requises réunies : cinq régressions moteur (quatre rouges avant correction) et une HTTP authentifiée rouge avant correction ; **588/588 moteur**, **618/618 backend**, typechecks/builds et CLI synthétiques ; **220 JVM**, APK debug/instrumenté, lint réussi (**12 avertissements, une suggestion**) ; **8/8 fixtures UI réellement exécutées sur AVD CI** ; récupération de branche/builds/précontrôle compilé 8 → 7 réussis sous WSL, installation Android et réduction visible avec PNJ. Le code reste `8f87f21`, le précontrôle `3cb42be`. Les trois CI du jalon précédent **`17349c6`** sont réussies : moteur/backend **`40172228456`**, Android Kotlin **`40172228447`** / job **`121105315442`**, Android UI **`40172228485`** / job **`121105315736`**, log **OK (8 tests)**. La fin vide, nouvelle donne et contrat JSON sont couverts par les tests synthétiques ; aucun nouveau match complet réel ou téléphone physique revendiqué.

Ce jalon ne change que la documentation ; liens, blocs bash et diff sont vérifiés. Prochaine action : vérifier les trois CI de ce commit, rendre la PR nº 11 prête puis fusionner avec SHA attendu, vérifier PR/main et ses CI, fournir le retour complet sur main. Le statut GitHub fait foi : aucune fusion n’est annoncée par avance, aucune PR supplémentaire nécessaire pour inscrire son propre SHA de fusion. **Ne pas refaire les essais PC reçus** ni les anciens Keystore/Google, coupures réseau, historique/partie complète ou audit SQLite. Les anciennes attentes et le blocage de port décrivent l’historique ; le présent bilan définit le résultat reçu. Suite séparée : revue callbacks/parseurs et sauvegardes Android/DataExtractionRules, en préservant sensorLandscape, sessions et vraie base. Aucun changement de règles, purge ou livraison production implicite. Voir [le bilan du snapshot](PLAYER_HAND_SNAPSHOT.md).
