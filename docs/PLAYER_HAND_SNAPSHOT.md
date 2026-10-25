# Cartes restantes dans le snapshot joueur

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

Les trois CI du bilan `7e16977` sont également réussies : moteur/backend `40133294999`, Android Kotlin `40133294980`, Android UI `40133294950`. Le retour PC suivant ne valide toutefois pas le retrait visuel ; reprendre le diagnostic ci-dessous avant toute fusion. La PR reste en brouillon ; aucun nouveau match complet, Keystore/Google, réseau ou diagnostic de vraie base requis.

## Retour PC et vérification du paquet compilé

Le journal reçu confirme build/install Android et nouveau N/O à 4/4 avec plusieurs actions locales acceptées suivies des PNJ. Les trois captures gardent huit cartes malgré ces coups : le retrait visuel n’est pas validé. La récupération de branche, le build moteur/backend et son redémarrage ne sont pas attestés par cet extrait. Un ancien paquet ou processus reste une hypothèse ; ne pas la présenter comme une cause certaine. Les captures et détails du match restent privés.

Le lanceur existant construit Android uniquement. Le serveur importe le paquet moteur compilé lors de son démarrage ; reconstruire les fichiers ne recharge pas un ancien processus Node. La version 0.1.0 affichée par health n’identifie pas le correctif.

`dev-check-player-hand.mjs` importe `@atoutia/belote-engine` depuis le même espace backend. Sur une fixture synthétique sans réseau ni SQLite, il exige une main de huit puis sept cartes, sans la carte jouée. Résultat local réussi avec le paquet corrigé ; un paquet temporaire recompilé avec l’ancien snapshot est rejeté sur huit au lieu de sept, puis supprimé. Syntaxe Node/actionlint vérifiés. Le workflow moteur/backend exécute aussi ce contrôle après build. Il vérifie le paquet chargé par ce nouveau processus, **pas un backend déjà actif**. Garder le redémarrage explicite.

## Blocage courant confirmé : port occupé

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

## Démarrage après libération du port et essai ciblé

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

La PR reste en brouillon jusqu’aux résultats CI et à ce contrôle ciblé. Le statut GitHub fait foi pour son numéro et son intégration. La base réelle, l’historique et les sauvegardes sont conservés.
