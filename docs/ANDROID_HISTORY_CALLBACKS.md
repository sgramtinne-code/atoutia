# Historique : portée des réponses asynchrones

## État

Branche `fix/android-history-callback-scope`, depuis main `e6def15` (PR nº 12 intégrée et récupération PC propre reçue). Les anciennes validations sont closes, dont main 8 → 7 → 6 → 5, reprise réseau et politique de sauvegarde.

## Constat de code et périmètre

Dans MainActivity, requestMatchHistory applique Loaded, Failed ou SessionExpired à l’état de l’application sans vérifier que la demande appartient encore à l’écran et à la session courants. Les appels HTTP utilisent lifecycleScope de l’Activity, dont la durée n’est pas celle d’une visite de l’historique. Une sortie/retour ou une déconnexion/reconnexion peut donc rendre une réponse obsolète avant son callback UI.

Ce point doit être reproduit avant correction ; aucune occurrence réelle sur le compte du développeur n’est annoncée. Le correctif visera l’application des réponses à l’UI, pas les règles d’authentification serveur, la révocation ou le stockage des tokens. Il ne prétendra pas annuler un HTTP déjà engagé. Les callbacks salon/chargement de partie et les parseurs seront des revues distinctes.

## Reproduction isolée prévue

Le véritable composable AtoutiaApp est hébergé dans une ComponentActivity, avec les dépendances existantes remplacées par des fonctions mémoire. Sa visibilité Kotlin passe de private à internal pour les tests ; aucun comportement n’est corrigé à cette étape. L’hôte de test utilise le portrait pour rendre accessibles les écrans d’accueil/connexion ; sensorLandscape de MainActivity reste intact.

Sept cas contrôlent les clics et l’ordre des réponses :

1. Succès de la demande actuelle affiché.
2. Échec actuel puis Réessayer et succès.
3. Expiration actuelle mène toujours à l’écran déconnecté.
4. Expiration d’historique après Retour ne déconnecte pas l’accueil.
5. Échec d’une ancienne visite ne remplace pas le chargement de la visite suivante.
6. Succès ancien ne remplace pas un échec plus récent.
7. Expiration de l’ancienne session ne déconnecte pas une session recréée après sortie/reconnexion simulées.

Les identités sont synthétiques et la reconnexion est une simple réponse injectée : ni Credential Manager, compte Google, Keystore, stockage privé, backend ni vraie base. Les callbacks sont livrés sur le thread UI comme dans la production ; l’état visible doit rester celui de la demande courante.

Le workflow exécute séparément 8 fixtures UI, 3 tests de politique et ces 7 cas, avec contrôle explicite de chaque total. Aucun lancement de la suite instrumentée globale. CI de reproduction encore à obtenir ; actionlint et diff vérifiés localement, aucun SDK/AVD local assistant.

## Correction ensuite

Après reproduction, lier chaque demande à son identité, à l’écran Historique et à la session authentifiée d’origine. Invalider les réponses lors de la sortie et ne pas appliquer les résultats obsolètes à une nouvelle visite/session. Les réponses actuelles doivent conserver succès, échec/réessai et expiration. Vérifier ensuite les mêmes fixtures, JVM/APK/lint et CI moteur/backend avant intégration ; tenir AGENTS, README et reprise à jour avec les preuves réelles.

Pas de nouvelle partie N/O, restauration de sauvegarde, test de compte réel ou attente de réseau à demander pour cette simulation déterministe de callbacks. Une fixture ne constitue pas un audit de tous les callbacks Android ou un essai de téléphone physique.
