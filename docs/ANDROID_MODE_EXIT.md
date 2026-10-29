# Accès au solo depuis une session en ligne indisponible

29 octobre 2026 — branche fix/android-online-mode-exit, depuis main 72e7c11.

## Défaut observé

Le build/install/lancement de 72e7c11 est confirmé par le journal PC reçu. La capture privée montre la session et le serveur inaccessibles. L’écran de connexion ne proposait que les contrôles Google/backend, sans sortie visible vers les modes. Le mode ONLINE enregistré peut ramener directement à cet écran au lancement ; le geste Retour Android du parent reste disponible, mais n’était pas expliqué par cette UI. Le parcours exact ayant amené l’utilisateur à ONLINE n’est pas déduit de la capture.

Ce défaut concerne la navigation. La panne du serveur ne doit pas bloquer l’accès au solo local, aux paramètres, au tutoriel ou aux statistiques. Ne pas demander de démarrer le backend, vider les données Android ou recommencer une partie pour retrouver le menu.

## Correction

OnlineModeActions transmet openModes à AtoutiaApp. Le bandeau ModeMenuBar ajoute Retour au menu dans le topBar de Scaffold : authentification en chargement, session indisponible, déconnecté et accueil authentifié. Le bouton reste hors du défilement avec marges système. Le contenu de connexion devient défilant afin que Google et Tester le backend restent atteignables en paysage avec texte agrandi. L’accueil garde son défilement existant ; son bouton est désactivé pendant une déconnexion en cours.

Retour au menu appelle la sélection MENU existante. Le mode ONLINE reste restaurable au démarrage : pas de changement implicite de la reprise multijoueur. Les écrans internes de jeu/salon gardent leurs propres règles de Retour et de soumission. Depuis le menu, le solo reprend le replay enregistré et les paramètres habituels ; aucun nouveau match n’est imposé.

Cette navigation ne lance ni signOut, clearActiveRoomSession, leaveRoom ni startNew. Elle ne supprime ni compte, référence de reprise, replay, statistiques ou préférences. Les abonnements de la composition fermée sont disposés selon leurs effets existants.

La fermeture invalide la visite AtoutiaApp : une réponse tardive restoreAuth/signIn ne peut plus appeler restoreActiveRoomSession ; les retours de récupération de salon et de diagnostic backend ne modifient plus cette ancienne UI. Les requêtes déjà parties et leurs transactions de session existantes ne sont pas annulées ou modifiées par cette barrière. Aucune promesse d’annulation réseau ou de non-écriture d’une transaction d’authentification déjà en cours.

## Régressions ciblées

Quatre tests dans OnlineModeExitInstrumentedTest, appelés explicitement par la CI AVD :

1. Ancienne route ONLINE, auth indisponible puis backend refusé ; sortie fixée en haut à 640 × 320 dp/police 1,3, contrôle réseau atteignable par défilement ; menu puis reprise du vrai moteur JS depuis AtomicFile. Replay/statistiques synthétiques identiques, aucun nouveau seed, moteur démarré seulement à l’ouverture solo.
2. Sortie pendant auth/backend en attente, réponses anciennes après sortie et après réouverture online : aucune récupération de salon supplémentaire et aucune ancienne erreur dans la nouvelle visite.
3. Retour depuis connexion puis accueil authentifié ; bouton immobile pendant défilement ; accès online toujours possible sans logout ni suppression de la référence de reprise.
4. Restauration de l’état Compose après le retour explicite : MENU conservé et aucun nouvel appel d’authentification.

Transport contrôlé et comptes fictifs, aucune connexion à un vrai backend. Le premier cas utilise le bundle APK et un répertoire cache unique ; aucune donnée réelle ou capture publiée. Les 39 instrumentés précédents sont conservés. Ce test ne constitue pas un essai de panne réseau avec le vrai compte ni une preuve de compatibilité de tous les appareils.

## État de validation

Code **8b407dc** validé dans les trois CI de la [PR nº 26](https://github.com/sgramtinne-code/atoutia/pull/26) : [moteur/backend 40958327029](https://github.com/sgramtinne-code/atoutia/actions/runs/40958327029), job **123744223001**, **601 moteur / 620 backend / 26 offline**, typechecks/builds/bundle, simulations et CLI synthétiques réussis ; [Android Kotlin 40958327178](https://github.com/sgramtinne-code/atoutia/actions/runs/40958327178), job **123744223104**, **259 JVM, zéro échec/erreur/ignoré**, deux APK et lint réussis (**13 avertissements/1 suggestion**) ; [Android UI 40958327117](https://github.com/sgramtinne-code/atoutia/actions/runs/40958327117), job **123744222987**, **43/43 instrumentés sur AVD API36** (9 + 3 + 7 + 5 + 3 + 5 + 4 + 3 + 4). Les quatre nouveaux scénarios passent avec le vrai AtoutiaApp et GameModeHost, dont reprise du bundle solo depuis AtomicFile conservant replay/statistiques, écran 640 × 320 dp/police 1,3 et callback auth tardif incapable de lancer une récupération après sortie. Les 39 contrôles antérieurs passent également. Les services online du nouveau test sont contrôlés et sans réseau réel. Moteur, styles, bundle et formats restent identiques à PR25 ; aucun SDK Android local assistant.

Clôture documentaire : sources/tests/bundle identiques à 8b407dc ; nouveaux retours PC de PR25 consignés sans publier les captures ni données de jeu. Les validations fonctionnelles du correctif sont réunies. Vérifier les trois CI du dernier commit de la PR nº 26 avant intégration avec SHA attendu, puis PR/main/arbre et CI de push. Enregistrer fusion et preuves main dans la PR sans commit destiné à inscrire son propre SHA. Donner la récupération complète main/build/install -r, puis Retour au menu → Solo hors ligne/Paramètres ; aucune nouvelle partie complète PC, backend ou ancienne suite N/O requise. Les essais PC du nouveau bouton restent distincts des preuves AVD ; les dernières captures concernent encore 72e7c11. Suite : retour ludique ciblé puis parcours online/bêta ; entraînement RTX5070 ultérieur conservé.

Après validation, installer avec -r puis toucher Retour au menu sur l’écran online, ouvrir Solo hors ligne et Paramètres. Aucune nouvelle fin de match PC ou suite N/O requise. Retour Android est le dépannage immédiat sur 72e7c11. Les captures suivantes montrent le menu retrouvé puis les styles et une partie solo variée progressant jusqu’à la donne suivante en mode avion ; le geste exact du retour au menu n’est pas attesté. Il ne s’agit pas d’une installation du nouveau bouton, encore en validation CI. Aucune comparaison des quatre tables ou fin de match complète n’est déduite ; ne pas redemander une partie complète.

Contrôle documentaire de clôture : 63 liens locaux et 18 blocs shell valides, YAML des workflows et diff vérifiés. Aucune nouvelle exécution Android locale revendiquée.
