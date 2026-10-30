# Configuration HTTPS de la version Android release

30 octobre 2026 — branche feat/android-release-endpoint, base main 5dde517.

L’application de diffusion peut recevoir l’origine de son backend au build, sans modifier MainActivity ni les clients HTTP/WebSocket. Fournir ATOUTIA_RELEASE_API_BASE_URL comme propriété Gradle, sinon comme variable d’environnement. La propriété est prioritaire, y compris vide. Sans valeur, l’URL reste vide comme auparavant : solo disponible, online non configuré. Le debug conserve http://127.0.0.1:3000 et son reverse ADB habituel.

Une valeur renseignée doit être une origine https:// absolue avec un hôte et un port valide si précisé, sans identifiants utilisateur, chemin autre que /, paramètres ou fragment. Une barre finale est retirée. Une valeur non conforme interrompt la configuration Gradle avec une erreur générique, sans recopier sa valeur dans ce message. Ces contrôles syntaxiques ne prouvent ni DNS, certificat TLS, accès réseau, identité du serveur ou configuration d’authentification.

Exemple synthétique pour vérifier un build, à remplacer par le véritable serveur lors de la préparation de la bêta :

```bash
cd /home/morpheus/projects/atoutia/apps/android &&
./gradlew --no-daemon --max-workers=2 :app:assembleRelease \
  -PATOUTIA_RELEASE_API_BASE_URL="https://beta.atoutia.test" \
  -PATOUTIA_GOOGLE_CLIENT_ID="release-check.apps.googleusercontent.com"
```

L’origine .test et le client Google ci-dessus sont des fixtures. Aucun serveur n’est fourni à cette adresse. Une compilation réussie ne livre pas une connexion online opérationnelle. Le résultat est un APK non signé, non destiné à remplacer l’installation debug existante. Ne pas désinstaller ou effacer les données pour installer ce fichier de contrôle.

La variable peut également être fournie au processus Gradle ; ne pas la placer dans une configuration globale si elle doit varier entre environnements. L’origine et le client Google sont des informations embarquées dans l’APK, jamais un emplacement pour une clé privée, un token ou un mot de passe. Les secrets de signature restent hors du dépôt et de ce lot.

## Contrôles automatisés

Le workflow Android CI exécute bash scripts/check-release-config.sh après les contrôles debug habituels. Le script utilise exclusivement des valeurs synthétiques et ne contacte aucun backend. Il vérifie les valeurs du BuildConfig release réellement généré : configuration vide, repli environnement avec normalisation, priorité de la propriété sur l’environnement et autoplay false même si le drapeau de test vaut true.

Neuf entrées invalides sont refusées : texte sans URL, HTTP, identifiants utilisateur, chemin, paramètres, fragment, port hors plage, espace extérieur et valeur composée d’espaces. Chaque refus doit correspondre au message de validation attendu, sans pouvoir être satisfait par une autre panne Gradle.

Un assembleRelease complet produit ensuite l’APK non signé et son manifeste fusionné est contrôlé : usesCleartextTraffic false, debuggable non activé, allowBackup false et sensorLandscape conservé. Les 264 tests JVM et 49 instrumentés de la base restent requis. Le script et son Python embarqué peuvent être contrôlés syntaxiquement en local ; les compilations et assertions Gradle demandent l’Android SDK et doivent être réellement exécutées en CI avant intégration.

## Étape suivante pour la bêta

Choisir l’origine réelle du backend, préparer DNS/TLS et reverse proxy HTTP/WebSocket, authentification Google de production et bootstrap désactivé, puis signature et distribution de l’application. Prévoir les essais entre comptes/appareils réels, la supervision et la sauvegarde/restauration opérationnelle. Ce lot n’installe aucun service, ne modifie pas la vraie SQLite et n’exécute aucune commande sur le VPS. Les invitations restent des messages à coller ; leur texte ne choisit pas le serveur et les participants doivent utiliser le même backend.
