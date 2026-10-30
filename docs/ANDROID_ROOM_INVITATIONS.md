# Invitations aux parties privées Android

30 octobre 2026 — branche feat/android-room-invitations, depuis main cfca5e5.

## Parcours livré par ce lot

Dans un salon privé en attente, avec au moins une place libre : Copier l’invitation prépare un texte à transmettre ; Partager ouvre le sélecteur Android. Le joueur choisit ensuite l’application, le destinataire et l’envoi. Le message ne contient que le titre Invitation Atoutia et Code du salon : suivi de l’identifiant. Aucun compte, jeton, siège, score ou adresse de serveur ajouté.

Le destinataire ouvre Atoutia → Jouer en ligne → Jouer → Coller une invitation. Il peut également coller le message entier ou le code seul dans le champ. Le code reconnu prépare la participation ; il faut confirmer avec Rejoindre la partie ou l’action Terminé du clavier. Le backend authentifié décide alors de la place et du résultat. Aucun abonnement, compte ou salon créé automatiquement à la lecture du message.

Il s’agit d’une invitation textuelle à coller dans l’application. Aucun lien web/App Link, inscription de domaine ou filtre d’Intent externe n’est ajouté. L’application doit être installée ; une partie à distance nécessite toujours un serveur commun joignable. Un salon complet ou déjà démarré peut refuser une ancienne invitation : le texte ne réserve pas une place et n’expire pas le salon.

## Format et limites

Le code canonique reste ms1_ suivi de 32 caractères hexadécimaux minuscules, comme matchSessionId.ts. Le parseur RoomInvitation accepte ce code brut ou le message exact généré, avec espaces extérieurs et fins de ligne CRLF normalisés. Entrée limitée à 1 024 caractères avant normalisation, sans troncature silencieuse. Messages arbitraires, plusieurs codes, URI, caractères URL, Unicode de contrôle et champs ajoutés sont refusés. Le format de code et les routes serveur ne changent pas ; les faux identifiants courts de certaines anciennes fixtures HTTP ne sont pas des codes UI canoniques.

Le presse-papiers n’est lu qu’après Coller une invitation et sans coerceToText, récupération d’URI ou exécution d’Intent. Une entrée invalide ou une erreur conserve le champ courant et affiche un message. La copie utilise un ClipData texte et le marque sensible sur Android 13+. Le partage prépare seulement ACTION_SEND, text/plain, EXTRA_TEXT dans le sélecteur Android ; aucune application, personne ou messagerie choisie automatiquement.

Les boutons d’invitation sont disponibles pour les membres d’un salon PRIVATE en attente avec une place libre. Ils sont bloqués pendant démarrage/sortie et lorsque les quatre places sont occupées. Les salons CASUAL/RANKED ne reçoivent pas ce panneau. L’écran Jouer défile en paysage avec police agrandie ; création, collage, jonction et Retour respectent les états de requête existants. Les erreurs de copie/partage sont récupérables. Options de partage ouvertes ne prétend pas qu’un message a été envoyé.

Aucun changement du moteur, des PNJ, DTO, règles, révisions, stockage solo ou authentification. L’invitation est un moyen de transmettre l’identifiant déjà affiché dans le salon ; elle ne remplace pas l’autorité serveur ou ses contrôles d’accès. Ne pas ajouter de jeton de session au message.

## Vérifications prévues

Cinq tests JVM : round-trip de codes canoniques, code brut/espaces/CRLF, rejet des textes et codes malformés, limite sans troncature, refus par le formateur d’une donnée non canonique.

Six tests AVD isolés : vraie copie ClipData sensible et charge utile du partage ; vrai AtoutiaApp recevant le message entier, confirmation explicite, refus puis réessai et enregistrement de la réponse autoritaire ; collage natif refusant une URI et conservant le champ ; contrôles plein/démarrage/sortie/mode ; erreurs de copie/partage puis récupération ; clavier, entrée trop longue, petit paysage 640 × 320 dp et police 1,3.

Les identifiants et comptes sont synthétiques. Aucun backend, compte réel ou destinataire externe utilisé. Les tests du partage inspectent l’Intent préparé sans envoyer de message ni démarrer une messagerie. Les 43 instrumentés existants restent requis. Les échanges réels entre appareils/comptes, l’expérience des messageries tierces et la diffusion publique restent distincts de ces tests.

## État de validation

Implémentation préparée ; Kotlin/JVM, APK debug/instrumenté, lint et exécution des six nouveaux contrôles AVD à obtenir avant intégration. Aucun SDK Android local assistant. Vérifier liens, workflow/shell/Python et diff. Les preuves publiques de base sont les trois CI main de cfca5e5, pas de nouvelles observations issues de données PC privées.

Après intégration : récupérer main et installer -r ; backend local de test sain, un seul émulateur, salon privé avec places libres pour vérifier copie et sélecteur de partage. Conserver les données Android et la vraie SQLite. Ne pas imposer une nouvelle partie complète pour ces boutons ; la validation à quatre entre amis sera un lot bêta distinct. Ne pas présenter le backend local de développement comme accessible à des amis distants.
