# Diagnostic du cycle de vie des salons

Livraison proposée sur `feat/live-room-expiration-dry-run`, depuis `main` `4109cec`.

## Périmètre

Cette première étape produit une classification **sans suppression**. Elle ne modifie pas les règles de belote, les résolutions d'absence, les résultats, Android ou le démarrage du backend. Aucun timer, nouvelle route HTTP ou traitement automatique ne l'appelle.

Le backend existant conserve son démarrage habituel, avec réconciliation des résultats, nettoyage des salons terminés et éventuelle migration des timestamps anciens. **Ne pas démarrer ce backend pour obtenir un diagnostic sans écriture.** La commande dédiée utilise un autre chemin de lecture.

## Composants

| Fichier | Rôle |
| --- | --- |
| `apps/backend/src/liveRoomExpiration.ts` | Fonction pure `classifyLiveRoomExpiration` ; document, état du résultat, politique, horloge injectée et présence serveur facultative |
| `apps/backend/src/sqliteLiveRoomExpirationPreview.ts` | Lecture d'une base existante avec `DatabaseSync(..., { readOnly: true })`, `query_only` et transaction de lecture ; aucun repository ni store |
| `apps/backend/src/previewLiveRoomExpiration.ts` | CLI `pnpm --filter @atoutia/backend preview:expiration` ; chemin absolu obligatoire, aucun chemin implicite |
| `apps/backend/scripts/dev-expiration-preview.mjs` | Scénario temporaire synthétique de validation de la CLI, sans utiliser la base du shell |

La transaction SQLite fournit un même instantané des documents de salons et de leurs résultats. Les erreurs de structure sont protégées par salon ; une table de résultats absente produit `RESULT_STATE_UNKNOWN`. Une base inexistante n'est pas créée, un schéma absent n'est pas installé. Aucun `INSERT`, `UPDATE`, `DELETE`, DDL, résolution ou migration n'est exécuté par le diagnostic.

La sortie est une observation datée, jamais une autorisation d'action future. Un serveur peut continuer à faire évoluer sa base après l'instantané. Toute suppression future exigerait un contrôle au moment d'agir.

## Politique provisoire configurable

Ces durées sont des seuils diagnostiques, pas des délais de suppression validés pour la production. Les comparaisons utilisent `âge >= seuil`, sans addition de dates susceptible de dépasser les entiers sûrs.

| Champ de politique | Variable de la CLI | Valeur par défaut |
| --- | --- | --- |
| `emptyWaitingIdleMs` | `ATOUTIA_PREVIEW_EMPTY_IDLE_MS` | 1 heure |
| `occupiedWaitingIdleMs` | `ATOUTIA_PREVIEW_WAITING_IDLE_MS` | 24 heures |
| `inProgressIdleMs` | `ATOUTIA_PREVIEW_IN_PROGRESS_IDLE_MS` | 7 jours |
| `confirmedAbsenceMs` | `ATOUTIA_PREVIEW_ABSENCE_MS` | 24 heures après la fin du délai de reconnexion |

Chaque durée doit être un entier sûr strictement positif, en millisecondes. L'horloge est appelée une fois pour tout l'instantané SQLite. Elle reste indépendante des horloges `now` et `activityNow` du store, qui ne changent pas.

## Classifications et protections

| Situation | Classification / raison principale |
| --- | --- |
| Timestamps absents | `PROTECTED` / `MISSING_ACTIVITY_TIMESTAMPS` ; aucune date créée |
| Timestamps invalides, incohérents ou futurs | `PROTECTED` ; aucune correction |
| État du résultat inconnu, corrompu ou incohérent | `PROTECTED` |
| Salon terminé sans résultat durable | `PROTECTED` / `COMPLETED_WITHOUT_RESULT` |
| Salon terminé avec résultat durable cohérent | `COMPLETED` / `COMPLETED_WITH_RESULT` ; résultat conservé, aucune suppression |
| Salon vide en attente, seuil non atteint | `WAITING_EMPTY` |
| Salon vide en attente, seuil atteint | `ABANDONMENT_CANDIDATE` / `EMPTY_WAITING_IDLE_THRESHOLD_REACHED` |
| Salon occupé sans présence fiable | `PROTECTED` / `UNKNOWN_PRESENCE` |
| Joueur connecté même sans action récente | `PROTECTED` / `CONNECTED_PLAYER` |
| Reconnexion ou absence récente | `WAITING_OCCUPIED` ou `INTERRUPTED` ; délai conservé |
| Bot ou résolution d'absence en attente | `PROTECTED` ; aucun bot ou handler exécuté |
| Partie CASUAL en cours avec absences longues | `PROTECTED` / `CASUAL_REQUIRES_ABSENCE_RESOLUTION` |
| Partie RANKED en cours avec absences longues | `PROTECTED` / `RANKED_REQUIRES_ADJUDICATION` |
| Occupants tous absents de façon observée, délais et inactivité atteints | Candidat pour un salon en attente (y compris `READY`) ou une partie PRIVATE interrompue |

Le rapport donne une raison principale ; une autre protection peut aussi s'appliquer. `ABANDONMENT_CANDIDATE` n'affirme pas un abandon définitif et n'autorise aucune purge. Les timestamps initialisés par migration ne prouvent pas la dernière activité réelle.

Une place occupée n'est pas une preuve de connexion. Une place contrôlée par bot n'est pas une preuve que son propriétaire humain a quitté définitivement la partie. Le classificateur protège tous les bots, même si le propriétaire humain n'est pas connecté.

## Présence et redémarrage

La CLI SQLite est **hors ligne** : aucune observation des WebSockets, donc présence inconnue pour les occupants, même si le backend tourne. Les anciennes résolutions d'absence enregistrées ne prouvent pas une absence actuelle. La CLI ne transforme jamais des places persistées en dates de déconnexion.

L'API pure accepte une observation fournie par un appelant serveur de confiance, synchronisée avec le document et son horloge : même `sessionId`, même `revision`, `observedAtMs` égal à l'instant évalué, une entrée par occupant. Cette API n'est pas branchée sur le serveur dans cette livraison. Ne pas alimenter cette observation depuis un client ou un ancien rapport.

Un `ABSENT` avec dates nulles, comme après redémarrage du serveur dans le protocole actuel, reste inconnu. Une déconnexion future/incohérente ou une observation périmée reste protégée. Une reconnexion/connexion observée protège le salon quel que soit son âge. Le calcul d'absence commence à la fin du délai de grâce effectivement observé, sans inventer une absence antérieure.

## Résultats distants

Validation distante du 24 octobre 2026 (Node.js 24.22.1, pnpm 12.3.4) : **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, dont **55 nouveaux tests ciblés** ; typechecks et builds des deux paquets réussis, scénario CLI synthétique réussi avec empreinte SQLite inchangée, `git diff --check` propre. Ces résultats concernent l’environnement distant, pas le PC du développeur. Validation WSL toujours attendue avant fusion.

## Validation locale complète

Dans WSL, vérifier d'abord le travail local :

```bash
cd $HOME/projects/atoutia
git status --short --branch
```

Si le checkout est propre, récupérer la branche sans écraser de modifications :

```bash
git fetch origin &&
git switch feat/live-room-expiration-dry-run &&
git pull --ff-only origin feat/live-room-expiration-dry-run &&
pnpm install --frozen-lockfile
```

S'arrêter au premier échec. Les tests ciblés utilisent des documents synthétiques et des bases temporaires :

```bash
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend exec vitest run tests/liveRoomExpiration.test.ts tests/sqliteLiveRoomExpirationPreview.test.ts
```

Puis les suites complètes et builds :

```bash
pnpm --filter @atoutia/belote-engine typecheck &&
pnpm --filter @atoutia/belote-engine test &&
pnpm --filter @atoutia/belote-engine build &&
pnpm --filter @atoutia/backend typecheck &&
pnpm --filter @atoutia/backend test &&
pnpm --filter @atoutia/backend build &&
git diff --check &&
node apps/backend/scripts/dev-expiration-preview.mjs
```

Le scénario CLI crée un salon vide ancien, un salon occupé et un document ancien sans timestamps dans sa propre base temporaire. Il vérifie les raisons, l'empreinte du fichier, l'absence de fichiers supplémentaires et le refus d'un chemin implicite ou de durées invalides. Les fixtures sont retirées à la fin. La suite SQLite couvre aussi les résultats durables, les documents invalides et une lecture des données validées en WAL sans modifier le fichier principal, le WAL ou la version des données.

Le script ne démarre aucun backend, n'utilise pas ADB et ignore le chemin de base éventuellement défini dans le shell. Aucun test sur la base réelle ni modification Android n'est nécessaire pour ce diagnostic détaché. Toute future intégration au serveur devra ajouter les tests de présence réels et la procédure Android complète du README.

Pour une exécution manuelle distincte, sur une base isolée déjà préparée :

```bash
ATOUTIA_DATABASE_PATH="/chemin/absolu/vers/base-isolee.sqlite" \
pnpm --filter @atoutia/backend preview:expiration
```

Le rapport contient des identifiants de salons mais aucune main, seed, identité de participant ou token. Garder ce rapport local ou l'anonymiser avant transmission. Les messages d'erreur n'incluent pas le contenu des documents.

Ne pas lancer de suppression ni choisir la base habituelle par habitude. La validation WSL du développeur est un prérequis de fusion. Les résultats distants et les résultats historiques du 7 octobre doivent rester distincts.
