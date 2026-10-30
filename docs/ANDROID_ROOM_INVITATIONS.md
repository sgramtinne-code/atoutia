# Invitations aux parties privées Android

30 octobre 2026 — branche feat/android-room-invitations, depuis main cfca5e5.

## Parcours livré par ce lot

Dans un salon privé en attente, avec au moins une place libre : Copier l’invitation prépare un texte à transmettre ; Partager ouvre le sélecteur Android. Le joueur choisit ensuite l’application, le destinataire et l’envoi. Le message ne contient que le titre Invitation Atoutia et Code du salon : suivi de l’identifiant. Aucun compte, jeton, siège, score ou adresse de serveur ajouté.

Le destinataire ouvre Atoutia → Jouer en ligne → Jouer → Coller une invitation. Il peut également coller le message entier ou le code seul dans le champ. Le code reconnu prépare la participation ; il faut confirmer avec Rejoindre la partie ou l’action Terminé du clavier. Le backend authentifié décide alors de la place et du résultat. Aucun abonnement, compte ou salon créé automatiquement à la lecture du message.

Il s’agit d’une invitation textuelle à coller dans l’application. Aucun lien web/App Link, inscription de domaine ou filtre d’Intent externe n’est ajouté. L’application doit être installée ; une partie à distance nécessite toujours un serveur commun joignable. Un salon complet ou déjà démarré peut refuser une ancienne invitation : le texte ne réserve pas une place et n’expire pas le salon.

## Format et limites

Le code canonique reste ms1_ suivi de 32 caractères hexadécimaux minuscules, comme matchSessionId.ts. Le parseur RoomInvitation accepte ce code brut ou le message exact généré, avec espaces extérieurs et fins de ligne CRLF normalisés. Entrée limitée à 1 024 caractères avant normalisation, sans troncature silencieuse. Messages arbitraires, plusieurs codes, URI, caractères URL, Unicode de contrôle et champs ajoutés sont refusés. Le format de code et les routes serveur ne changent pas ; les faux identifiants courts de certaines anciennes fixtures HTTP ne sont pas des codes UI canoniques.

Le presse-papiers n’est lu qu’après Coller une invitation et sans coerceToText, récupération d’URI ou exécution d’Intent. Une entrée invalide ou une erreur conserve le champ courant et affiche un message. Rejoindre reste bloqué jusqu’à une vraie modification ou un collage valide. Une saisie trop longue est rejetée sans troncature ; un écho IME de la valeur conservée ne masque pas son erreur. La copie utilise un ClipData texte et le marque sensible sur Android 13+. Le partage prépare seulement ACTION_SEND, text/plain, EXTRA_TEXT dans le sélecteur Android ; aucune application, personne ou messagerie choisie automatiquement.

Les boutons d’invitation sont disponibles pour les membres d’un salon PRIVATE en attente avec une place libre. Ils sont bloqués pendant démarrage/sortie et lorsque les quatre places sont occupées. Les salons CASUAL/RANKED ne reçoivent pas ce panneau. L’écran Jouer défile en paysage avec police agrandie ; création, collage, jonction et Retour respectent les états de requête existants. Les erreurs de copie/partage sont récupérables. Options de partage ouvertes ne prétend pas qu’un message a été envoyé.

Aucun changement du moteur, des PNJ, DTO, règles, révisions, stockage solo ou authentification. L’invitation est un moyen de transmettre l’identifiant déjà affiché dans le salon ; elle ne remplace pas l’autorité serveur ou ses contrôles d’accès. Ne pas ajouter de jeton de session au message.

## Vérifications automatisées

Cinq tests JVM : round-trip de codes canoniques, code brut/espaces/CRLF, rejet des textes et codes malformés, limite sans troncature, refus par le formateur d’une donnée non canonique.

Six tests AVD isolés : vraie copie ClipData sensible et charge utile du partage ; vrai AtoutiaApp recevant le message entier, confirmation explicite, refus puis réessai et enregistrement de la réponse autoritaire ; collage natif refusant une URI et conservant le champ ; contrôles plein/démarrage/sortie/mode ; erreurs de copie/partage puis récupération ; clavier, entrée trop longue, petit paysage 640 × 320 dp et police 1,3.

Les identifiants et comptes sont synthétiques. Aucun backend, compte réel ou destinataire externe utilisé. Les tests du partage inspectent l’Intent préparé sans envoyer de message ni démarrer une messagerie. Les 43 instrumentés existants restent requis. Les échanges réels entre appareils/comptes, l’expérience des messageries tierces et la diffusion publique restent distincts de ces tests.

## État de validation

Code **3cc5dbd** de la [PR nº 27](https://github.com/sgramtinne-code/atoutia/pull/27) : [moteur/backend 41101162990](https://github.com/sgramtinne-code/atoutia/actions/runs/41101162990), job **124218488421**, **601 moteur/620 backend/26 offline**, typechecks/builds, bundle:check, simulations bornées et CLI synthétiques réussis dans le journal ; [Kotlin 41101162993](https://github.com/sgramtinne-code/atoutia/actions/runs/41101162993), job **124218488443**, **264 JVM sans échec/erreur/ignoré**, deux APK et lint réussis (**13 avertissements/1 suggestion** conservés) ; [AVD 41101163020](https://github.com/sgramtinne-code/atoutia/actions/runs/41101163020), job **124219862046**, **49/49 instrumentés API36** (9 + 3 + 7 + 5 + 3 + 5 + 4 + 3 + 4 + 6). Les six nouveaux scénarios et les 43 antérieurs réussissent dans le journal AVD. Bundle solo inchangé **6e83cc765603d43c8a1307b3ba9b4bcb69b6b459c562dc25b1842b90351c2650**. Les trois workflows de 3cc5dbd sont conclus success. La clôture ne change que la documentation ; les trois CI de son dernier commit doivent être réussies avant intégration. Aucun SDK Android local assistant ni nouvel essai PC revendiqué.

Après intégration : récupérer main et installer -r ; backend local de test sain, un seul émulateur, salon privé avec places libres pour vérifier copie et sélecteur de partage. Conserver les données Android et la vraie SQLite. Ne pas imposer une nouvelle partie complète pour ces boutons ; la validation à quatre entre amis sera un lot bêta distinct. Ne pas présenter le backend local de développement comme accessible à des amis distants.

## Essai local ciblé après intégration

Mettre main à jour, disposer d’un backend local sain sur 127.0.0.1:3000, puis utiliser le lanceur existant. Il construit avec --no-daemon --max-workers=2, installe -r, configure le reverse ADB et ouvre Android. Répondre N pour PLAYER_0 automatique et N pour les trois PNJ : le salon doit garder des places libres pour inviter. Attendre ATTENTE DU NOUVEAU SALON, puis ouvrir Jouer en ligne → Jouer → Créer une partie. Aucun démarrage de match requis.

```bash
cd /home/morpheus/projects/atoutia &&
ATOUTIA_ADB="/mnt/c/Users/drupy/AppData/Local/Android/Sdk/platform-tools/adb.exe" \
node apps/backend/scripts/dev-android-room.mjs
```

À 1/4, essayer Copier l’invitation, puis Partager : le sélecteur Android peut être annulé. Aucun message réel à envoyer pour ce contrôle. Pour un essai sur le même émulateur, copier l’invitation du nouveau salon à 1/4, utiliser Quitter le salon, puis revenir à Jouer → Coller une invitation. Le texte doit seulement préparer le champ ; confirmer Rejoindre la partie pour revenir dans ce salon avec une place occupée. Cet essai ne démarre aucun match. Les tests automatisés couvrent la jonction, le refus et le réessai avec API contrôlée. L’essai complet entre plusieurs comptes/appareils sur serveur commun reste à organiser pour la bêta. Ne pas publier les invitations, captures ou journaux réels.

## Correction issue du premier passage AVD

Le passage c626c46 a réussi les 43 contrôles existants et quatre nouveaux scénarios, avec deux échecs dans le job 124211442659 ([41098596217](https://github.com/sgramtinne-code/atoutia/actions/runs/41098596217)). Le premier test comparait une sous-chaîne comme un texte entier : les assertions vérifient maintenant les messages complets de copie/partage. Le second a révélé une vraie erreur UI : l’écho IME de la valeur conservée effaçait l’alerte après rejet d’une entrée trop longue. Le correctif 755f44e préserve l’erreur jusqu’à une vraie correction et bloque la jonction ; 3cc5dbd conserve ce correctif et cible les messages de décoration du champ dans l’arbre sémantique non fusionné. Les six scénarios sont conservés et vérifient la récupération, sans test ignoré. Le passage 3cc5dbd confirme 6/6 et 43/43 dans le journal public.
