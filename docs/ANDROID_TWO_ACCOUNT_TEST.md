# Essai local entre deux comptes Android

Lanceur intégré par la PR nº 53. Deux clients humains aux places Joueur 1/2 (PLAYER_0/1), puis deux PNJ aux places Joueur 3/4. Chaque humain a un PNJ pour partenaire. Le scénario habituel un Android + trois PNJ reste disponible sans changer ses réponses.

Ce lot prépare un essai local : pas de serveur public, DNS, OVH, classement ou entraînement IA. Deux Android réels/émulés distincts doivent utiliser le même backend de développement via leur propre reverse ADB. Aucune connexion Google ni sélection de compte automatisée.

## Préparer les deux Android

Conserver l’émulateur existant et ses données. Dans Android Studio → View → Tool Windows → Device Manager → + → Create Virtual Device, créer un **nouvel** appareil virtuel nommé `Atoutia_Invite`, avec une image disposant des services Google et un profil de téléphone. Une image Google APIs déjà installée convient si la connexion Google y fonctionne. Ne pas relancer deux fois le même AVD, dupliquer ses données de compte ou utiliser Wipe Data. Démarrer ce nouvel appareil une seule fois et attendre son écran d’accueil. Référence : [Device Manager](https://developer.android.com/studio/run/managing-avds).

Dans PowerShell, vérifier les deux appareils :

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$sdk\platform-tools\adb.exe"
& $adb devices
```

La procédure ci-dessous suppose `emulator-5554` et `emulator-5556`, tous deux en état `device`. Si les numéros diffèrent, utiliser les deux numéros réellement affichés dans les options `--host` et `--guest`. Un téléphone USB autorisé peut remplacer le second émulateur. Ne pas tuer globalement ADB ou les processus d’émulation pour cet essai.

Arrêter dans leurs terminaux les anciens lanceurs de PNJ ; terminer un éventuel relais de coupure par **q**. Aucun autre lanceur ne doit créer/remplir de salon pendant cet essai. Arrêter un ancien backend dans son propre terminal seulement si nécessaire pour libérer 3000 ; ne pas lancer deux backends sur ce port.

## Récupérer le code

Dans WSL, vérifier que `git status --short` ne montre pas de travail local à écraser. Si des fichiers sont modifiés, les conserver et arrêter cette étape pour examiner leur état.

```bash
cd "$HOME/projects/atoutia" &&
git status --short --branch &&
git fetch origin &&
test -z "$(git status --porcelain)" &&
git switch main &&
git pull --ff-only origin main &&
pnpm install --frozen-lockfile
```

La PR nº 53 est intégrée et ses deux CI sur main sont réussies. Le renouvellement des sessions PNJ est intégré par la PR nº 54 (`8bb064a`) ; ses deux CI de push main sont réussies. Le lanceur natif ADB/WSL et les deux connexions Google restent des contrôles PC distincts.

## Terminal WSL 1 : backend de test

Utiliser cette même base dans les deux terminaux. Le lanceur refuse la base habituelle `apps/backend/data/atoutia.sqlite` et ses liens symboliques. Il ne crée ni ne migre lui-même une base.

```bash
cd "$HOME/projects/atoutia" &&
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend build &&
mkdir -p logs/android-duo-test &&
HOST=127.0.0.1 PORT=3000 ATOUTIA_AUTH_BOOTSTRAP_ENABLED=true \
ATOUTIA_DATABASE_PATH="$PWD/logs/android-duo-test/atoutia.sqlite" \
ATOUTIA_GOOGLE_CLIENT_ID="762107394725-hm57vr8pmccle3j8amhsrgp46hpd8i7k.apps.googleusercontent.com" \
pnpm --filter @atoutia/backend start
```

Garder ce terminal ouvert. Le bootstrap crée seulement les identités des PNJ de test ; les humains se connectent eux-mêmes avec Google.

## Terminal WSL 2 : construire et installer sur les deux clients

Le chemin ADB Windows est un exemple à adapter au compte Windows. Aucun identifiant de salon à chercher dans la base ou à recopier dans la commande.

```bash
cd "$HOME/projects/atoutia" &&
curl -fsS http://127.0.0.1:3000/health &&
ATOUTIA_DATABASE_PATH="$PWD/logs/android-duo-test/atoutia.sqlite" \
ATOUTIA_ADB="/mnt/c/Users/COMPTE_WINDOWS/AppData/Local/Android/Sdk/platform-tools/adb.exe" \
node apps/backend/scripts/dev-android-duo.mjs \
  --host emulator-5554 --guest emulator-5556
```

Le lanceur vérifie les deux états ADB, le démarrage complet et le service Activity avant de modifier un appareil. Il construit une fois avec les deux humains manuels, vérifie BuildConfig, convertit le chemin APK avec wslpath si ADB Windows l’exige, puis installe avec `-r` et démarre l’application sur chaque cible explicite `-s`. Les données de compte/solo sont conservées ; aucun pm clear, désinstallation, redémarrage ADB ou effacement d’AVD. Les deux reverse directs relient le port Android 3000 au backend local 3000. Pas de relais de coupure pendant ce premier essai.

## Actions dans les applications

1. Attendre **ATTENTE DU NOUVEAU SALON**. Sur chaque Android, choisir **Jouer en ligne**, puis se connecter avec **deux comptes Google distincts** et ouvrir **Jouer**. Si un compte est déjà actif, vérifier qu’il diffère de celui de l’autre client ; utiliser les commandes normales de connexion/déconnexion au besoin, sans vider les données.
2. Sur l’hôte, **Créer une partie**. Ne créer qu’un nouveau salon. À 1/4, **Copier**, puis transmettre cette invitation à l’autre client avec le moyen choisi par le joueur. Le sélecteur **Partager** n’envoie rien à lui seul. Les presse-papiers des deux émulateurs ne sont pas garantis synchronisés : le champ invité accepte aussi le message complet ou le code saisi/collé explicitement.
3. Sur l’invité, **Coller une invitation**, vérifier **Invitation reconnue. Confirme pour entrer.**, puis **Rejoindre la partie**. Ne pas créer un deuxième salon. Vérifier que les deux écrans montrent le même salon avec les deux places humaines occupées.
4. Le lanceur confirme seulement **deux comptes distincts dans le même salon**, sans imprimer leurs identités. Il ajoute alors les deux PNJ ; attendre **4/4**. L’hôte voit **Démarrer la partie**, l’invité ne peut pas démarrer à sa place. Démarrer sur l’hôte.
5. Jouer quelques plis en intervenant sur les deux humains à leur tour. Vérifier que les révisions/score évoluent sur les deux écrans, que les mains sont celles de chaque joueur, et que seuls Joueur 3/4 sont pilotés par le script. Aucun match complet supplémentaire requis pour ce contrôle.
6. Conserver les deux terminaux pendant les plis. Ensuite arrêter les PNJ avec **Ctrl+C**, puis le backend dans son propre terminal. Ce lanceur ne réinitialise pas la partie ; un prochain essai demande un nouveau salon. Les reverse restent directs vers 3000.

Résultat à rapporter : installation sur les deux cibles, connexion des deux comptes, jonction par invitation, 4/4, démarrage réservé à l’hôte et progression visible sur les deux clients. En cas d’échec, transmettre le message utile sans token, compte, invitation ou base. Les captures et journaux réels restent privés.

## Garanties et limites du banc

Le backend conserve l’autorité. Les PNJ utilisent des comptes bootstrap distincts et seulement leur snapshot/actions légales ; le script n’obtient pas les tokens humains. Le nouveau mode `dev-autoplay-room.mjs <id> --android-players-0-1` réserve PLAYER_0/1, réclame seulement PLAYER_2/3 et attend le démarrage manuel. Les modes `--android-player-0` et `--all-bots` restent disponibles.

La découverte des nouveaux salons et la preuve de deux identités sont des lectures SQLite `readOnly`/`query_only`, avec reprise bornée sur verrou transitoire. La requête de preuve sélectionne uniquement mode, format, session et liaisons des places, sans lire les tables de tokens ni retourner les identités. Les identités `pid1_…` sont liées de façon déterministe au compte authentifié par le serveur. Cette preuve ne dit rien sur la présence temps réel ni sur la disponibilité future du salon. Plusieurs nouveaux salons, une place PNJ occupée ou un salon déjà démarré arrêtent le banc avant l’ajout de PNJ ; aucun choix arbitraire de salon.

Les jetons d’accès des PNJ expirent normalement après 15 minutes. La PR nº 54 conserve leur jeton de renouvellement en mémoire et utilise `/api/v1/auth/refresh` après un rejet explicite `401 AUTH_INVALID`, avec rotation de la paire et une seule nouvelle tentative de la requête refusée. Un timeout réseau, un conflit de révision ou un refus de participation ne rejoue pas une commande. Un renouvellement refusé, ambigu ou destiné à une autre identité arrête le script, sans recréer de compte. Le bootstrap reste nécessaire à la création initiale des PNJ, pas au renouvellement.

Si le processus PNJ est arrêté, ses clés en mémoire sont perdues : un nouveau lanceur ne peut pas reprendre les anciennes places occupées. Utiliser un nouveau salon par les commandes normales de l’application, sans supprimer la base, désinstaller l’application ou vider ses données. Un arrêt du serveur ou une panne ADB reste un problème distinct de l’expiration.

Validation locale du correctif : **640 tests backend**, typecheck/build réussis sous Node 24.22.1/pnpm 12.3.4. L’intégration réelle CLI sur HTTP/WebSocket loopback et SQLite temporaire échoue avant correction après une expiration injectée de 16 minutes ; après correction, deux cycles d’expiration/rotation puis les coups PNJ réussissent, avec les places humaines toujours manuelles. Les tests ciblés couvrent aussi la concurrence, les refus, les réponses perdues, l’identité de session et les diagnostics sans jetons. Ces preuves synthétiques ne simulent ni une installation Android ni Google. La PR nº 54 et ses CI sont intégrées et réussies ; ce correctif ne modifiait ni source ni test Android et aucun nouveau passage UI ne lui est attribué. Les preuves du nouvel affichage de résultat de la PR nº 55 sont distinctes et figurent dans le README.

## Reprise d’un essai interrompu

Ne pas relancer le lanceur d’installation pendant qu’un essai fonctionne : il attend un **nouveau** salon, pas le salon déjà détecté. Garder les terminaux backend et PNJ ouverts pendant le jeu. Un `EADDRINUSE` demande d’identifier le serveur déjà actif ; si sa base et sa configuration conviennent, le conserver plutôt que lancer un doublon.

Si ADB signale une cible `offline`, commencer par les états `adb devices` et une reconnexion ciblée, sans `kill-server`, Wipe Data, désinstallation ou suppression de données. Une remise en route du daemon peut nécessiter de restaurer **chaque** reverse `tcp:3000 tcp:3000` avec son propre `-s`. Un reverse correct ne prouve pas que le backend fonctionne : vérifier aussi `/health` depuis Windows lorsque ADB est Windows et le serveur dans WSL.

Pour retrouver une place déjà occupée dans une partie pleine ou démarrée, conserver le même compte et les données de l’application et utiliser le parcours de reprise existant. Rejouer l’invitation n’est pas une garantie de reprise : le parcours de jonction recherche une place libre. Ne pas créer un nouveau compte, libérer arbitrairement une place ou extraire les identités de SQLite pour forcer l’entrée. Une cause réseau doit être établie par des éléments ciblés, sans republier les journaux privés.
