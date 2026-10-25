# Sauvegardes Android : politique et vérification

## État

[PR nº 12](https://github.com/sgramtinne-code/atoutia/pull/12), branche `fix/android-backup-exclusions`, depuis main `78a46f5` (PR nº 11 intégrée et récupérée sur le PC). Les contrôles de jeu, réseau, compte et SQLite précédents restent acquis.

Le manifeste désactive déjà les sauvegardes avec `allowBackup=false`. Il ne référence aucun fichier fullBackupContent ou dataExtractionRules. La revue vise à expliciter la même politique pour les domaines de stockage, y compris pour les transferts entre appareils Android. Aucune fuite observée ni nouveau système d’export proposé.

## Références vérifiées le 25 octobre 2026

- [Auto Backup — configuration, domaines et exclusions](https://developer.android.com/identity/data/autobackup).
- [Android 12 — changements du transfert D2D et du format XML](https://developer.android.com/about/versions/12/behavior-changes-12#backup-restore).
- [Recommandations de sécurité pour les sauvegardes](https://developer.android.com/privacy-and-security/risks/backup-best-practices).

Android distingue les règles des appareils anciens et celles du cloud/transfert D2D sur Android 12+. La documentation mentionne des fabricants où allowBackup=false ne suffit pas à désactiver D2D. Des règles XML séparées rendent donc la politique explicite. Les tests ci-dessous vérifient les fichiers distribués, pas le comportement de chaque outil de migration constructeur.

## Configuration proposée

Le manifeste conserve allowBackup=false et déclare des exclusions globales dans `res/xml/backup_rules.xml`, full-backup-content (Android 11 et antérieur) et dans les sections cloud-backup/device-transfer de `res/xml/data_extraction_rules.xml`, data-extraction-rules (Android 12+). Les neuf domaines sont root, file, database, sharedpref, external et les quatre domaines device_root/device_file/device_database/device_sharedpref. Le chemin `.` exclut le contenu du domaine. Cela couvre aussi de futurs fichiers de préférences sans dépendre du nom des tokens ou de la référence de salon.

Aucun changement aux données existantes, au chiffrement Keystore, aux coordinateurs de session, à la restauration locale du salon, aux règles de jeu ou à la vraie base. Pas d’agent de sauvegarde personnalisé, d’intégration iOS ou de transfert interplateforme introduit dans ce périmètre. Ne pas inventer des identifiants d’application iOS pour configurer un tel transfert ; ce chantier serait distinct.

## Validation avant et après correction

Trois tests `tech.devoo.atoutia.security.BackupPolicyInstrumentedTest` sont ajoutés **avant modification de la configuration** :

1. Lire le manifeste binaire de l’APK installé, vérifier FLAG_ALLOW_BACKUP et les références aux deux ressources.
2. Lire la ressource de l’ancien format et vérifier que tous les domaines sont exclus, sans inclusion.
3. Lire les sections cloud et D2D de la ressource moderne et vérifier les mêmes exclusions.

Ils utilisent seulement les métadonnées/ressources de l’application, sans Activity, compte, SharedPreferences, accès Keystore, backup ou restore. Ils ne lisent pas les données du développeur. Ils seront exécutés séparément des huit fixtures UI, sur l’AVD API 36 de la CI. Le workflow exige explicitement OK (8 tests), puis OK (3 tests) ; aucun lancement global des tests instrumentés qui modifierait l’authentification.

La reproduction `8a535bb` est réellement exécutée : [run UI `40173790845`](https://github.com/sgramtinne-code/atoutia/actions/runs/40173790845), job `121110053170`, **8 UI réussis puis 3/3 échecs de politique**, références de règles absentes. [Android Kotlin `40173790769`](https://github.com/sgramtinne-code/atoutia/actions/runs/40173790769) : **220 JVM**, deux APK/lint réussis (12 avertissements/1 suggestion, dont DataExtractionRules). Moteur/backend `40173790843` réussi. La correction XML source passe localement le contrôle des trois sections et des neuf exclusions ; actionlint et diff propres. Sa compilation et son exécution Android sont encore à vérifier en CI, sans SDK/AVD local de l’assistant.

Une réussite des tests valide le manifeste et les règles présents dans l’APK debug testé. Elle ne prouve ni une migration physique, ni tous les fabricants/versions Android, ni une release connectable (URL release toujours hors de ce chantier). Ne pas lancer de restauration/uninstall/effacement des données de compte pour ce contrôle. Une autre version APK ou un changement de stockage/politique demande une validation adaptée.

## Suite

Vérifier les trois CI du correctif, dont huit UI et trois tests de politique réellement exécutés, puis enregistrer les résultats et limites dans ce suivi, AGENTS.md, README.md et docs/REPRISE.md avant intégration. PR en brouillon, aucune réussite du correctif annoncée par avance. Pas de nouveau scénario N/O, Keystore/Google, coupure réseau ou match complet à demander pour cette lecture isolée de configuration.
