# Sauvegardes Android : politique et vérification

## État

Code `0a6be38` validé : trois CI réussies, 220 JVM, deux APK/lint, **8 UI et 3 tests de politique réellement exécutés**. La reproduction avant correction reste acquise. L’avertissement DataExtractionRules est résolu ; les 11 autres avertissements/1 suggestion restent affichés. Vérifier les CI du commit de clôture puis GitHub pour l’intégration. Pas de nouveau test sur les données/appareils du développeur nécessaire pour ce périmètre de configuration empaquetée.

[PR nº 12](https://github.com/sgramtinne-code/atoutia/pull/12), branche `fix/android-backup-exclusions`, depuis main `78a46f5` (PR nº 11 intégrée et récupérée sur le PC). Les contrôles de jeu, réseau, compte et SQLite précédents restent acquis.

Le manifeste désactive déjà les sauvegardes avec `allowBackup=false`. Il ne référence aucun fichier fullBackupContent ou dataExtractionRules. La revue vise à expliciter la même politique pour les domaines de stockage, y compris pour les transferts entre appareils Android. Aucune fuite observée ni nouveau système d’export proposé.

## Références vérifiées le 25 octobre 2026

- [Auto Backup — configuration, domaines et exclusions](https://developer.android.com/identity/data/autobackup).
- [Android 12 — changements du transfert D2D et du format XML](https://developer.android.com/about/versions/12/behavior-changes-12#backup-restore).
- [Recommandations de sécurité pour les sauvegardes](https://developer.android.com/privacy-and-security/risks/backup-best-practices).

Android distingue les règles des appareils anciens et celles du cloud/transfert D2D sur Android 12+. La documentation mentionne des fabricants où allowBackup=false ne suffit pas à désactiver D2D. Des règles XML séparées rendent donc la politique explicite. Les tests ci-dessous vérifient les fichiers distribués, pas le comportement de chaque outil de migration constructeur.

## Configuration validée dans l’APK debug

Le manifeste conserve allowBackup=false et déclare des exclusions globales dans `res/xml/backup_rules.xml`, full-backup-content (Android 11 et antérieur) et dans les sections cloud-backup/device-transfer de `res/xml/data_extraction_rules.xml`, data-extraction-rules (Android 12+). Les neuf domaines sont root, file, database, sharedpref, external et les quatre domaines device_root/device_file/device_database/device_sharedpref. Le chemin `.` exclut le contenu du domaine. Cela couvre aussi de futurs fichiers de préférences sans dépendre du nom des tokens ou de la référence de salon.

Aucun changement aux données existantes, au chiffrement Keystore, aux coordinateurs de session, à la restauration locale du salon, aux règles de jeu ou à la vraie base. Pas d’agent de sauvegarde personnalisé, d’intégration iOS ou de transfert interplateforme introduit dans ce périmètre. Ne pas inventer des identifiants d’application iOS pour configurer un tel transfert ; ce chantier serait distinct.

## Validation avant et après correction

Trois tests `tech.devoo.atoutia.security.BackupPolicyInstrumentedTest` sont ajoutés **avant modification de la configuration** :

1. Lire le manifeste binaire de l’APK installé, vérifier FLAG_ALLOW_BACKUP et les références aux deux ressources.
2. Lire la ressource de l’ancien format et vérifier que tous les domaines sont exclus, sans inclusion.
3. Lire les sections cloud et D2D de la ressource moderne et vérifier les mêmes exclusions.

Ils utilisent seulement les métadonnées/ressources de l’application, sans Activity, compte, SharedPreferences, accès Keystore, backup ou restore. Ils ne lisent pas les données du développeur. Ils seront exécutés séparément des huit fixtures UI, sur l’AVD API 36 de la CI. Le workflow exige explicitement OK (8 tests), puis OK (3 tests) ; aucun lancement global des tests instrumentés qui modifierait l’authentification.

La reproduction `8a535bb` est réellement exécutée : [run UI `40173790845`](https://github.com/sgramtinne-code/atoutia/actions/runs/40173790845), job `121110053170`, **8 UI réussis puis 3/3 échecs de politique**, références de règles absentes. [Android Kotlin `40173790769`](https://github.com/sgramtinne-code/atoutia/actions/runs/40173790769) : **220 JVM**, deux APK/lint réussis (12 avertissements/1 suggestion, dont DataExtractionRules). Moteur/backend `40173790843` réussi. La correction XML source passe localement le contrôle des trois sections et des neuf exclusions ; actionlint et diff propres. La compilation et l’exécution du correctif sont maintenant acquises sur AVD CI dans le bilan suivant ; aucun SDK/AVD local de l’assistant.

Une réussite des tests valide le manifeste et les règles présents dans l’APK debug testé. Elle ne prouve ni une migration physique, ni tous les fabricants/versions Android, ni une release connectable (URL release toujours hors de ce chantier). Ne pas lancer de restauration/uninstall/effacement des données de compte pour ce contrôle. Une autre version APK ou un changement de stockage/politique demande une validation adaptée.



## Sauvegardes : validation de configuration reçue — PR nº 12

Le correctif **`0a6be38`** est confirmé vert dans les trois CI : [moteur/backend `40174201049`](https://github.com/sgramtinne-code/atoutia/actions/runs/40174201049), **588 moteur / 618 backend**, typechecks/builds et CLI synthétiques ; [Android Kotlin `40174201045`](https://github.com/sgramtinne-code/atoutia/actions/runs/40174201045), job **`121111265554`**, **220/220 JVM**, deux APK/lint, **11 avertissements et une suggestion**, DataExtractionRules absent du rapport ; [Android UI `40174201046`](https://github.com/sgramtinne-code/atoutia/actions/runs/40174201046), job **`121111265673`**, **OK (8 tests)** UI puis **OK (3 tests)** de politique réellement exécutés sur AVD API 36. La reproduction précédente `8a535bb` avait huit UI réussis mais trois échecs de politique pour références manquantes. Les assertions n’ont pas été assouplies.

Le manifeste et les ressources compilés conservent l’opt-out et les exclusions de tous les neuf domaines pour ancien format/cloud/D2D. Les contrôles isolés n’accèdent à aucun compte/Keystore/préférence/base, ne lancent aucune sauvegarde/restauration et ne changent pas les données du développeur. Aucun Kotlin métier, session, réseau, règle, version ou orientation changé. Les règles appartiennent à src/main ; les tests ont vérifié l’APK debug sur API36, pas une migration physique sur tous fabricants/versions ni une release connectable. Les autres avertissements lint restent visibles, sans baseline/suppression ajoutée.

Les validations nécessaires à ce changement XML sont réunies ; **ne pas demander de nouveau scénario PC N/O, Google/Keystore, transfert physique, restauration/uninstall ou match complet** pour revalider ce périmètre. Cette note est documentaire : liens, bash et diff vérifiés, aucun nouveau test applicatif local revendiqué. Prochaine action : vérifier les trois CI de la clôture, rendre la PR nº 12 prête puis intégrer avec SHA attendu ; vérifier GitHub, main et ses CI, fournir le retour complet sur main. Le statut GitHub définit la fusion sans PR documentaire supplémentaire pour inscrire son propre SHA. Aucune fusion annoncée par avance ; les attentes précédentes sont historiques. Ensuite revue séparée callbacks/parseurs. [Bilan sauvegardes et sources](ANDROID_BACKUP.md).
