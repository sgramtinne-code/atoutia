# Diagnostic du cycle de vie des salons

Livraison par la [PR nº 2](https://github.com/sgramtinne-code/atoutia/pull/2), branche `feat/live-room-expiration-dry-run`, depuis `main` `4109cec`. Fusion vérifiée dans `deea680`, également récupéré sur le PC. Code applicatif `a2258b0` validé à distance et sous WSL ; vérifier le dernier `main` avant récupération.

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

Validation distante du 24 octobre 2026 (Node.js 24.22.1, pnpm 12.3.4) : **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, dont **55 nouveaux tests ciblés** ; typechecks et builds des deux paquets réussis, scénario CLI synthétique réussi avec empreinte SQLite inchangée, `git diff --check` propre. Ces résultats concernent l’environnement distant, pas le PC du développeur.

## Résultats WSL transmis

Validation WSL transmise par le développeur le 24 octobre 2026 pour le code `a2258b0` : **55/55 tests ciblés**, **59 fichiers / 583 tests moteur**, **69 fichiers / 580 tests backend**, typechecks et builds des deux paquets réussis, `git diff --check` propre, puis scénario CLI terminé avec `databaseUnchanged: true` et `Synthetic expiration preview passed`. Le journal transmis confirme pnpm 12.3.4. La base réelle et Android ne font pas partie de ce scénario.

## Validation locale complète

Dans WSL, vérifier d'abord le travail local :

```bash
cd $HOME/projects/atoutia
git status --short --branch
```

Après fusion de la PR nº 2, si le checkout est propre, récupérer `main` sans écraser de modifications :

```bash
git fetch origin &&
git switch main &&
git pull --ff-only origin main &&
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

Ne pas lancer de suppression ni choisir la base habituelle par habitude. La validation WSL du développeur, prérequis de fusion, a été reçue et réussie le 24 octobre 2026. Le premier diagnostic d’une copie de sa base réelle a également été transmis ; son audit structurel reste à compléter. Les résultats distants et les résultats historiques du 7 octobre doivent rester distincts.


## Procédure de copie isolée, déjà exécutée

Après récupération de `main` et build moteur/backend, préparer une copie via l’API de sauvegarde SQLite. La source est ouverte avec `mode=ro` ; le diagnostic porte uniquement sur la copie. Cette méthode prend aussi en compte les transactions validées présentes dans le WAL, contrairement à une simple copie du fichier principal.

Depuis la racine du dépôt dans WSL :

```bash
python3 - <<'PYTHON'
from contextlib import closing
from hashlib import sha256
from pathlib import Path
import os
import sqlite3
import subprocess
import tempfile

source = Path.cwd() / "apps/backend/data/atoutia.sqlite"
target = Path(tempfile.mkdtemp(prefix="atoutia-diagnostic-")) / "copie.sqlite"
with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as src:
    with closing(sqlite3.connect(target)) as dst:
        src.backup(dst)
print("Copie isolée :", target, flush=True)
before = sha256(target.read_bytes()).hexdigest()
subprocess.run(
    ["node", "apps/backend/dist/previewLiveRoomExpiration.js"],
    env={**os.environ, "ATOUTIA_DATABASE_PATH": str(target)},
    check=True,
)
assert sha256(target.read_bytes()).hexdigest() == before, "La copie a changé."
print("Copie inchangée après diagnostic.")
PYTHON
```

La copie temporaire est conservée pour l’analyse locale et ne doit pas être publiée. Transmettre le résumé du diagnostic dans le chat privé, sans tokens ni mains. Ne pas en déduire que les salons occupés sont abandonnés ; leur présence reste inconnue hors ligne. Le premier résultat a été reçu ; ne le confondre ni avec les fixtures synthétiques ni avec l’état courant du serveur.


## Observation reçue et audit restant

Diagnostic sur copie isolée transmis le 24 octobre 2026 : le développeur a récupéré `main` `deea680`, construit le moteur/backend, créé un instantané par l’API de sauvegarde SQLite avec source en lecture seule, puis exécuté la CLI. Le journal se termine par « Copie inchangée après diagnostic. » : l’empreinte de la copie est identique avant/après. Le rapport contient des salons vides au-delà du seuil, des protections pour résolutions en attente et des présences inconnues. Les effectifs, identifiants et chemins temporaires restent dans le contexte privé. Aucun salon n’a été supprimé par ce diagnostic.

Prochaine action : sur la même copie isolée, obtenir un résumé par mode, phase, nombre de places occupées et adjudication, puis les types de résolutions en attente et le nombre de résultats durables. Le premier rapport ne donne pas ces répartitions ni le décompte actuel des résultats ; ne pas reprendre les anciens inventaires comme preuve. Garder toutes les protections et ne pas lancer de suppression.

Une résolution en attente persistée ne prouve pas que son handler s’exécute, que le joueur est absent ou que la place est occupée. La CLI retourne une raison principale ; d’autres protections peuvent coexister. Une empreinte de copie inchangée prouve sa conservation pendant l’observation ; elle ne constitue pas à elle seule un nouveau décompte des résultats durables ou une validation Android.

Pour obtenir un résumé structurel **sur la copie existante seulement**, adapter le chemin absolu ci-dessous à celui indiqué dans le journal privé. Le programme ouvre SQLite en lecture seule, ne crée pas de fichier absent, utilise une transaction cohérente et ne produit aucune identité de joueur ou de salon. `pendingResolutionEntries` compte des entrées de résolution, pas des salons distincts.

```bash
python3 - <<'AUDIT'
from collections import Counter
from contextlib import closing
from hashlib import sha256
from pathlib import Path
import json
import sqlite3

snapshot = Path("/chemin/absolu/vers/copie.sqlite")
before = sha256(snapshot.read_bytes()).hexdigest()
rooms, pending = Counter(), Counter()
with closing(sqlite3.connect(snapshot.as_uri() + "?mode=ro", uri=True)) as db:
    db.execute("PRAGMA query_only = ON")
    db.execute("BEGIN")
    for (raw,) in db.execute("SELECT document_json FROM live_rooms"):
        doc = json.loads(raw)
        managed = doc["room"]["managedRoom"]
        occupied = sum(v is not None for v in managed["room"]["seats"]["assignments"].values())
        key = (doc["mode"], managed["phase"], occupied, doc["adjudication"]["status"])
        rooms[key] += 1
        for entry in doc["absenceResolutions"]:
            if entry["status"] == "PENDING":
                pending[(*key, entry["action"])] += 1
    results = db.execute("SELECT COUNT(*) FROM match_results").fetchone()[0]
report = {
    "roomsByState": [dict(mode=m, phase=p, occupiedSeats=o, adjudication=a, rooms=n)
                     for (m, p, o, a), n in sorted(rooms.items())],
    "pendingResolutions": [dict(mode=m, phase=p, occupiedSeats=o, adjudication=a,
                               action=x, pendingResolutionEntries=n)
                           for (m, p, o, a, x), n in sorted(pending.items())],
    "durableResultRows": results,
    "snapshotUnchanged": sha256(snapshot.read_bytes()).hexdigest() == before,
}
assert report["snapshotUnchanged"], "La copie a changé."
print(json.dumps(report, indent=2))
AUDIT
```

L’absence de la copie doit interrompre cette observation ; ne pas substituer silencieusement la base principale. Le nombre de lignes de `match_results` est un inventaire, pas un contrôle complet de validité des scores, des participants ou des index d’historique. Les résultats de cet audit sont encore attendus du développeur.
